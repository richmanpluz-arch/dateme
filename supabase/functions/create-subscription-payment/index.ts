import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const planLabels: Record<string, string> = {
  week: "1-week DateMe membership",
  month: "1-month DateMe membership",
  three_months: "3-month DateMe membership",
  six_months: "6-month DateMe membership",
  yearly: "1-year DateMe membership",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json(503, { error: "Payment service is not configured." });

  const authorization = req.headers.get("Authorization");
  if (!authorization) return json(401, { error: "Sign in to purchase a subscription." });

  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) return json(401, { error: "Your session is invalid. Sign in again." });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid request body." }); }

  const planCode = String(body.plan_code ?? "");
  const provider = String(body.provider ?? "");
  const idempotencyKey = String(body.idempotency_key ?? "");
  if (!(planCode in planLabels)) return json(400, { error: "Choose a valid subscription period." });
  if (!["nowpayments", "kora_1voucher"].includes(provider)) return json(400, { error: "Choose crypto or OneVoucher." });
  if (!/^[0-9a-f-]{36}$/i.test(idempotencyKey)) return json(400, { error: "Refresh checkout and try again." });

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: subscription } = await db.from("member_subscriptions").select("status,ends_at").eq("user_id", authData.user.id).maybeSingle();
  if (subscription?.status === "active" && (!subscription.ends_at || new Date(subscription.ends_at).getTime() > Date.now())) {
    return json(409, { error: "You already have an active subscription. You can purchase another plan after it expires." });
  }

  const { data: existing } = await db.from("subscription_payment_orders").select("id,status,checkout_url,amount,currency,provider_reference").eq("user_id", authData.user.id).eq("idempotency_key", idempotencyKey).maybeSingle();
  if (existing) {
    if (existing.status === "pending" && existing.checkout_url) return json(200, { order_id: existing.id, checkout_url: existing.checkout_url, amount: existing.amount, currency: existing.currency, status: existing.status });
    return json(409, { error: "This checkout attempt has already been used. Start a new checkout." });
  }

  const { data: price, error: priceError } = await db.from("subscription_plan_prices").select("price_zar,price_usd,enabled").eq("plan_code", planCode).maybeSingle();
  if (priceError || !price?.enabled) return json(503, { error: "This plan is not available for payment yet. Pricing is being configured." });
  const amount = provider === "nowpayments" ? Number(price.price_usd) : Number(price.price_zar);
  const currency = provider === "nowpayments" ? "USD" : "ZAR";
  if (!Number.isFinite(amount) || amount <= 0) return json(503, { error: `The ${currency} price for this plan has not been configured yet.` });

  const reference = `dateme-${crypto.randomUUID()}`;
  const { data: order, error: insertError } = await db.from("subscription_payment_orders").insert({
    user_id: authData.user.id,
    plan_code: planCode,
    provider,
    amount,
    currency,
    provider_reference: reference,
    idempotency_key: idempotencyKey,
    status: "pending",
  }).select("id").single();
  if (insertError || !order) return json(500, { error: "Could not start checkout. Please try again." });

  const appUrl = (Deno.env.get("APP_URL") ?? "https://dateme.app").replace(/\/$/, "");
  const callbackUrl = `${supabaseUrl}/functions/v1/payment-webhook?provider=${provider}`;
  try {
    if (provider === "nowpayments") {
      const apiKey = Deno.env.get("NOWPAYMENTS_API_KEY");
      if (!apiKey || !Deno.env.get("NOWPAYMENTS_IPN_SECRET")) throw new Error("Crypto payments are not configured.");
      const response = await fetch("https://api.nowpayments.io/v1/invoice", {
        method: "POST",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          price_amount: amount,
          price_currency: "usd",
          order_id: reference,
          order_description: planLabels[planCode],
          ipn_callback_url: callbackUrl,
          success_url: `${appUrl}/?payment=return`,
          cancel_url: `${appUrl}/?payment=cancelled`,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.invoice_url || !payload.id) throw new Error("Crypto provider could not create an invoice.");
      const { error: updateError } = await db.from("subscription_payment_orders").update({
        checkout_url: payload.invoice_url,
        provider_payment_id: String(payload.id),
        provider_payload: { invoice_id: payload.id },
        updated_at: new Date().toISOString(),
      }).eq("id", order.id);
      if (updateError) throw new Error("Could not save the checkout details.");
      return json(200, { order_id: order.id, checkout_url: payload.invoice_url, amount, currency, status: "pending" });
    }

    const secret = Deno.env.get("KORA_SECRET_KEY");
    if (!secret) throw new Error("OneVoucher payments are not configured.");
    const pin = String(body.voucher_pin ?? "").replace(/\s/g, "");
    const phone = String(body.phone_number ?? "").trim();
    if (!/^\d{16}$/.test(pin)) {
      await db.from("subscription_payment_orders").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", order.id);
      return json(400, { error: "Enter the 16-digit OneVoucher PIN." });
    }
    if (!/^\+27\d{9}$/.test(phone)) {
      await db.from("subscription_payment_orders").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", order.id);
      return json(400, { error: "Enter a South African mobile number in +27 format." });
    }
    const response = await fetch("https://api.korapay.com/merchant/api/v1/charge/voucher", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        currency: "ZAR",
        merchant_bears_cost: true,
        notification_url: callbackUrl,
        description: planLabels[planCode],
        reference,
        voucher: { pin, phone_number: phone, provider_code: Deno.env.get("KORA_1VOUCHER_PROVIDER_CODE") ?? "0001" },
        customer: { email: authData.user.email ?? "", name: String(authData.user.user_metadata?.display_name ?? "DateMe member") },
        metadata: { order_id: order.id, plan_code: planCode },
      }),
    });
    const payload = await response.json();
    if (!response.ok || payload.status !== true && payload.status !== "true") {
      await db.from("subscription_payment_orders").update({ status: "failed", provider_payload: { message: String(payload.message ?? "Provider declined request") }, updated_at: new Date().toISOString() }).eq("id", order.id);
      return json(402, { error: "OneVoucher payment was not accepted. Check the PIN and try again." });
    }
    const providerData = payload.data ?? {};
    const { error: updateError } = await db.from("subscription_payment_orders").update({
      provider_payment_id: String(providerData.reference ?? reference),
      provider_payload: { initial_status: providerData.status ?? "pending" },
      updated_at: new Date().toISOString(),
    }).eq("id", order.id);
    if (updateError) throw new Error("Could not save the payment status.");
    const status = String(providerData.status ?? "").toLowerCase();
    if (["success", "successful", "completed"].includes(status)) {
      await db.rpc("finalize_subscription_payment", { p_order_id: order.id, p_provider_payment_id: String(providerData.reference ?? reference) });
      return json(200, { order_id: order.id, status: "succeeded", message: "Payment verified. Your subscription is active." });
    }
    return json(200, { order_id: order.id, status: "pending", message: "OneVoucher is processing the payment. Your plan unlocks only after confirmation." });
  } catch (error) {
    console.error("subscription checkout failed", error instanceof Error ? error.message : "unknown error");
    await db.from("subscription_payment_orders").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", order.id);
    return json(502, { error: error instanceof Error ? error.message : "Payment provider unavailable. Please try again." });
  }
});

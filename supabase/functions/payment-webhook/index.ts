import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const encoder = new TextEncoder();

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(secret: string, value: string, algorithm: "SHA-512" | "SHA-256") {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: algorithm }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function sortedJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(sortedJson).join(",")}]`;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj).sort().map(k => `${JSON.stringify(k)}:${sortedJson(obj[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const provider = new URL(req.url).searchParams.get("provider");
  const raw = await req.text();
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(raw); } catch { return new Response("Invalid JSON", { status: 400 }); }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return new Response("Not configured", { status: 503 });
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let reference = "";
  let paymentId = "";
  let successful = false;
  let failed = false;
  let amount: number | null = null;
  let currency = "";

  if (provider === "nowpayments") {
    const secret = Deno.env.get("NOWPAYMENTS_IPN_SECRET");
    const signature = req.headers.get("x-nowpayments-sig") ?? "";
    if (!secret || !signature) return new Response("Missing signature", { status: 401 });
    const expected = await hmac(secret, sortedJson(payload), "SHA-512");
    if (!safeEqual(expected.toLowerCase(), signature.toLowerCase())) return new Response("Invalid signature", { status: 401 });
    reference = String(payload.order_id ?? "");
    paymentId = String(payload.payment_id ?? payload.invoice_id ?? "");
    const status = String(payload.payment_status ?? "").toLowerCase();
    successful = status === "finished";
    failed = ["failed", "expired", "refunded"].includes(status);
    amount = Number(payload.price_amount ?? NaN);
    currency = String(payload.price_currency ?? "").toUpperCase();
  } else if (provider === "kora_1voucher") {
    const secret = Deno.env.get("KORA_SECRET_KEY");
    const signature = req.headers.get("Kora-Signature") ?? "";
    if (!secret || !signature) return new Response("Missing signature", { status: 401 });
    const expected = await hmac(secret, raw, "SHA-256");
    if (!safeEqual(expected.toLowerCase(), signature.toLowerCase())) return new Response("Invalid signature", { status: 401 });
    const data = (payload.data ?? {}) as Record<string, unknown>;
    reference = String(data.reference ?? "");
    paymentId = reference;
    const status = String(data.status ?? payload.event ?? "").toLowerCase();
    successful = ["success", "successful", "completed", "charge.success"].includes(status);
    failed = ["failed", "failure", "charge.failed"].includes(status);
    amount = Number(data.amount ?? NaN);
    currency = String(data.currency ?? "").toUpperCase();
  } else {
    return new Response("Unsupported provider", { status: 400 });
  }

  if (!reference) return new Response("Missing order reference", { status: 400 });
  const { data: order, error } = await db.from("subscription_payment_orders")
    .select("id,status,amount,currency,provider,provider_reference")
    .eq("provider_reference", reference).maybeSingle();
  if (error || !order) return new Response("Unknown order", { status: 404 });
  if (order.provider !== provider) return new Response("Provider mismatch", { status: 400 });
  if (order.status === "succeeded") return new Response("Already processed", { status: 200 });

  if (successful) {
    if (!Number.isFinite(amount) || Math.abs(amount - Number(order.amount)) > 0.01) return new Response("Amount mismatch", { status: 400 });
    if (currency !== order.currency) return new Response("Currency mismatch", { status: 400 });
    const { error: finalError } = await db.rpc("finalize_subscription_payment", { p_order_id: order.id, p_provider_payment_id: paymentId || null });
    if (finalError) {
      console.error("subscription activation failed", finalError.message);
      return new Response("Could not finalize payment", { status: 500 });
    }
  } else if (failed && order.status === "pending") {
    await db.from("subscription_payment_orders").update({ status: "failed", provider_payment_id: paymentId || null, updated_at: new Date().toISOString() }).eq("id", order.id);
  }

  return new Response("OK", { status: 200 });
});

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './supabase';

type Profile = {
  id: string;
  display_name: string;
  age: number | null;
  city: string | null;
  bio: string | null;
  photo_url: string | null;
  interests?: string[];
  prompt_question?: string | null;
  prompt_answer?: string | null;
  looking_for?: string | null;
  languages?: string[];
};
type Match = { id: string; user_one: string; user_two: string; created_at: string };
type Message = { id: string; match_id: string; sender_id: string; body: string; created_at: string; expires_at?: string; reply_to?: string | null; audio_path?: string | null; deleted_at?: string | null; deleted_by?: string | null; demo?: boolean };
type MessageReceipt = { message_id: string; user_id: string; delivered_at: string | null; read_at: string | null };
type MemberMedia = { id: string; user_id: string; media_type: 'photo' | 'video'; storage_path: string; public_url: string; created_at: string };

const demoLikeCounts: Record<string, number> = { 'ai-sarah': 24, 'ai-mia': 18, 'ai-james': 31 };
const aiProfiles: Profile[] = [
  { id: 'ai-sarah', display_name: 'Sarah', age: 27, city: 'Johannesburg', bio: 'Coffee lover, weekend explorer and fan of honest conversations.', photo_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85', interests: ['Coffee','Travel','Music'] },
  { id: 'ai-mia', display_name: 'Mia', age: 25, city: 'Pretoria', bio: 'Bookshops, music and trying new recipes.', photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85', interests: ['Books','Cooking','Art'] },
  { id: 'ai-james', display_name: 'James', age: 29, city: 'Cape Town', bio: 'Ocean air, live music and finding great food spots.', photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85', interests: ['Ocean','Music','Food'] },
];
const contactPattern = /(?:https?:\/\/|www\.|\b[a-z0-9.-]+\.(?:com|net|org|co\.za|io)\b|\b(?:whats?app|telegram|facebook|instagram|snapchat|tiktok|signal|wechat|dm me|contact me|message me outside|email me|call me|text me|phone number|my number|number is|reach me at)\b|(?:\+?\d[\d\s().-]{6,}\d)|\b(?:zero|one|two|three|four|five|six|seven|eight|nine|oh)\b(?:[\s,.-]+\b(?:zero|one|two|three|four|five|six|seven|eight|nine|oh)\b){6,})/i;
const demoReplies = ['That sounds lovely 😊 What do you enjoy doing on a free day?', 'I like that! Tell me a little more about it.', 'A good conversation is a great start 💛 What would your ideal first date look like?', 'Nice! I would add a coffee stop to that plan ☕'];
const translationLanguages: Array<{ code: string; name: string; speech: string }> = [
  {
    "code": "af",
    "name": "Afrikaans",
    "speech": "af-ZA"
  },
  {
    "code": "sq",
    "name": "Albanian",
    "speech": "sq-AL"
  },
  {
    "code": "am",
    "name": "Amharic",
    "speech": "am-ET"
  },
  {
    "code": "ar",
    "name": "Arabic",
    "speech": "ar-SA"
  },
  {
    "code": "hy",
    "name": "Armenian",
    "speech": "hy-AM"
  },
  {
    "code": "as",
    "name": "Assamese",
    "speech": "as-IN"
  },
  {
    "code": "ay",
    "name": "Aymara",
    "speech": "ay-BO"
  },
  {
    "code": "az",
    "name": "Azerbaijani",
    "speech": "az-AZ"
  },
  {
    "code": "bm",
    "name": "Bambara",
    "speech": "bm-ML"
  },
  {
    "code": "eu",
    "name": "Basque",
    "speech": "eu-ES"
  },
  {
    "code": "be",
    "name": "Belarusian",
    "speech": "be-BY"
  },
  {
    "code": "bn",
    "name": "Bengali",
    "speech": "bn-IN"
  },
  {
    "code": "bho",
    "name": "Bhojpuri",
    "speech": "bho-IN"
  },
  {
    "code": "bs",
    "name": "Bosnian",
    "speech": "bs-BA"
  },
  {
    "code": "bg",
    "name": "Bulgarian",
    "speech": "bg-BG"
  },
  {
    "code": "my",
    "name": "Burmese",
    "speech": "my-MM"
  },
  {
    "code": "ca",
    "name": "Catalan",
    "speech": "ca-ES"
  },
  {
    "code": "ceb",
    "name": "Cebuano",
    "speech": "ceb-PH"
  },
  {
    "code": "ny",
    "name": "Chichewa",
    "speech": "ny-MW"
  },
  {
    "code": "zh-CN",
    "name": "Chinese (Simplified)",
    "speech": "zh-CN"
  },
  {
    "code": "zh-TW",
    "name": "Chinese (Traditional)",
    "speech": "zh-TW"
  },
  {
    "code": "co",
    "name": "Corsican",
    "speech": "co-FR"
  },
  {
    "code": "hr",
    "name": "Croatian",
    "speech": "hr-HR"
  },
  {
    "code": "cs",
    "name": "Czech",
    "speech": "cs-CZ"
  },
  {
    "code": "da",
    "name": "Danish",
    "speech": "da-DK"
  },
  {
    "code": "dv",
    "name": "Dhivehi",
    "speech": "dv-MV"
  },
  {
    "code": "doi",
    "name": "Dogri",
    "speech": "doi-IN"
  },
  {
    "code": "nl",
    "name": "Dutch",
    "speech": "nl-NL"
  },
  {
    "code": "en",
    "name": "English",
    "speech": "en-US"
  },
  {
    "code": "eo",
    "name": "Esperanto",
    "speech": "eo"
  },
  {
    "code": "et",
    "name": "Estonian",
    "speech": "et-EE"
  },
  {
    "code": "ee",
    "name": "Ewe",
    "speech": "ee-GH"
  },
  {
    "code": "fil",
    "name": "Filipino",
    "speech": "fil-PH"
  },
  {
    "code": "fi",
    "name": "Finnish",
    "speech": "fi-FI"
  },
  {
    "code": "fr",
    "name": "French",
    "speech": "fr-FR"
  },
  {
    "code": "fy",
    "name": "Frisian",
    "speech": "fy-NL"
  },
  {
    "code": "gl",
    "name": "Galician",
    "speech": "gl-ES"
  },
  {
    "code": "ka",
    "name": "Georgian",
    "speech": "ka-GE"
  },
  {
    "code": "de",
    "name": "German",
    "speech": "de-DE"
  },
  {
    "code": "el",
    "name": "Greek",
    "speech": "el-GR"
  },
  {
    "code": "gn",
    "name": "Guarani",
    "speech": "gn-PY"
  },
  {
    "code": "gu",
    "name": "Gujarati",
    "speech": "gu-IN"
  },
  {
    "code": "ht",
    "name": "Haitian Creole",
    "speech": "ht-HT"
  },
  {
    "code": "ha",
    "name": "Hausa",
    "speech": "ha-NG"
  },
  {
    "code": "haw",
    "name": "Hawaiian",
    "speech": "haw-US"
  },
  {
    "code": "he",
    "name": "Hebrew",
    "speech": "he-IL"
  },
  {
    "code": "hi",
    "name": "Hindi",
    "speech": "hi-IN"
  },
  {
    "code": "hmn",
    "name": "Hmong",
    "speech": "hmn"
  },
  {
    "code": "hu",
    "name": "Hungarian",
    "speech": "hu-HU"
  },
  {
    "code": "is",
    "name": "Icelandic",
    "speech": "is-IS"
  },
  {
    "code": "ig",
    "name": "Igbo",
    "speech": "ig-NG"
  },
  {
    "code": "ilo",
    "name": "Ilocano",
    "speech": "ilo-PH"
  },
  {
    "code": "id",
    "name": "Indonesian",
    "speech": "id-ID"
  },
  {
    "code": "ga",
    "name": "Irish",
    "speech": "ga-IE"
  },
  {
    "code": "it",
    "name": "Italian",
    "speech": "it-IT"
  },
  {
    "code": "ja",
    "name": "Japanese",
    "speech": "ja-JP"
  },
  {
    "code": "jv",
    "name": "Javanese",
    "speech": "jv-ID"
  },
  {
    "code": "kn",
    "name": "Kannada",
    "speech": "kn-IN"
  },
  {
    "code": "kk",
    "name": "Kazakh",
    "speech": "kk-KZ"
  },
  {
    "code": "km",
    "name": "Khmer",
    "speech": "km-KH"
  },
  {
    "code": "rw",
    "name": "Kinyarwanda",
    "speech": "rw-RW"
  },
  {
    "code": "gom",
    "name": "Konkani",
    "speech": "gom-IN"
  },
  {
    "code": "ko",
    "name": "Korean",
    "speech": "ko-KR"
  },
  {
    "code": "kri",
    "name": "Krio",
    "speech": "kri-SL"
  },
  {
    "code": "ku",
    "name": "Kurdish",
    "speech": "ku-IQ"
  },
  {
    "code": "ky",
    "name": "Kyrgyz",
    "speech": "ky-KG"
  },
  {
    "code": "lo",
    "name": "Lao",
    "speech": "lo-LA"
  },
  {
    "code": "la",
    "name": "Latin",
    "speech": "la"
  },
  {
    "code": "lv",
    "name": "Latvian",
    "speech": "lv-LV"
  },
  {
    "code": "ln",
    "name": "Lingala",
    "speech": "ln-CD"
  },
  {
    "code": "lt",
    "name": "Lithuanian",
    "speech": "lt-LT"
  },
  {
    "code": "lg",
    "name": "Luganda",
    "speech": "lg-UG"
  },
  {
    "code": "lb",
    "name": "Luxembourgish",
    "speech": "lb-LU"
  },
  {
    "code": "mk",
    "name": "Macedonian",
    "speech": "mk-MK"
  },
  {
    "code": "mai",
    "name": "Maithili",
    "speech": "mai-IN"
  },
  {
    "code": "mg",
    "name": "Malagasy",
    "speech": "mg-MG"
  },
  {
    "code": "ms",
    "name": "Malay",
    "speech": "ms-MY"
  },
  {
    "code": "ml",
    "name": "Malayalam",
    "speech": "ml-IN"
  },
  {
    "code": "mt",
    "name": "Maltese",
    "speech": "mt-MT"
  },
  {
    "code": "mi",
    "name": "Maori",
    "speech": "mi-NZ"
  },
  {
    "code": "mr",
    "name": "Marathi",
    "speech": "mr-IN"
  },
  {
    "code": "mni-Mtei",
    "name": "Meiteilon (Manipuri)",
    "speech": "mni-IN"
  },
  {
    "code": "lus",
    "name": "Mizo",
    "speech": "lus-IN"
  },
  {
    "code": "mn",
    "name": "Mongolian",
    "speech": "mn-MN"
  },
  {
    "code": "ne",
    "name": "Nepali",
    "speech": "ne-NP"
  },
  {
    "code": "nso",
    "name": "Northern Sotho",
    "speech": "nso-ZA"
  },
  {
    "code": "no",
    "name": "Norwegian",
    "speech": "nb-NO"
  },
  {
    "code": "or",
    "name": "Odia",
    "speech": "or-IN"
  },
  {
    "code": "om",
    "name": "Oromo",
    "speech": "om-ET"
  },
  {
    "code": "ps",
    "name": "Pashto",
    "speech": "ps-AF"
  },
  {
    "code": "fa",
    "name": "Persian",
    "speech": "fa-IR"
  },
  {
    "code": "pl",
    "name": "Polish",
    "speech": "pl-PL"
  },
  {
    "code": "pt",
    "name": "Portuguese",
    "speech": "pt-PT"
  },
  {
    "code": "pa",
    "name": "Punjabi",
    "speech": "pa-IN"
  },
  {
    "code": "qu",
    "name": "Quechua",
    "speech": "qu-PE"
  },
  {
    "code": "ro",
    "name": "Romanian",
    "speech": "ro-RO"
  },
  {
    "code": "ru",
    "name": "Russian",
    "speech": "ru-RU"
  },
  {
    "code": "sm",
    "name": "Samoan",
    "speech": "sm-WS"
  },
  {
    "code": "sa",
    "name": "Sanskrit",
    "speech": "sa-IN"
  },
  {
    "code": "gd",
    "name": "Scots Gaelic",
    "speech": "gd-GB"
  },
  {
    "code": "sr",
    "name": "Serbian",
    "speech": "sr-RS"
  },
  {
    "code": "st",
    "name": "Sesotho",
    "speech": "st-ZA"
  },
  {
    "code": "sn",
    "name": "Shona",
    "speech": "sn-ZW"
  },
  {
    "code": "sd",
    "name": "Sindhi",
    "speech": "sd-PK"
  },
  {
    "code": "si",
    "name": "Sinhala",
    "speech": "si-LK"
  },
  {
    "code": "sk",
    "name": "Slovak",
    "speech": "sk-SK"
  },
  {
    "code": "sl",
    "name": "Slovenian",
    "speech": "sl-SI"
  },
  {
    "code": "so",
    "name": "Somali",
    "speech": "so-SO"
  },
  {
    "code": "es",
    "name": "Spanish",
    "speech": "es-ES"
  },
  {
    "code": "su",
    "name": "Sundanese",
    "speech": "su-ID"
  },
  {
    "code": "sw",
    "name": "Swahili",
    "speech": "sw-KE"
  },
  {
    "code": "sv",
    "name": "Swedish",
    "speech": "sv-SE"
  },
  {
    "code": "tg",
    "name": "Tajik",
    "speech": "tg-TJ"
  },
  {
    "code": "ta",
    "name": "Tamil",
    "speech": "ta-IN"
  },
  {
    "code": "tt",
    "name": "Tatar",
    "speech": "tt-RU"
  },
  {
    "code": "te",
    "name": "Telugu",
    "speech": "te-IN"
  },
  {
    "code": "th",
    "name": "Thai",
    "speech": "th-TH"
  },
  {
    "code": "ti",
    "name": "Tigrinya",
    "speech": "ti-ET"
  },
  {
    "code": "ts",
    "name": "Tsonga",
    "speech": "ts-ZA"
  },
  {
    "code": "tr",
    "name": "Turkish",
    "speech": "tr-TR"
  },
  {
    "code": "tk",
    "name": "Turkmen",
    "speech": "tk-TM"
  },
  {
    "code": "ak",
    "name": "Twi",
    "speech": "ak-GH"
  },
  {
    "code": "uk",
    "name": "Ukrainian",
    "speech": "uk-UA"
  },
  {
    "code": "ur",
    "name": "Urdu",
    "speech": "ur-PK"
  },
  {
    "code": "ug",
    "name": "Uyghur",
    "speech": "ug-CN"
  },
  {
    "code": "uz",
    "name": "Uzbek",
    "speech": "uz-UZ"
  },
  {
    "code": "vi",
    "name": "Vietnamese",
    "speech": "vi-VN"
  },
  {
    "code": "cy",
    "name": "Welsh",
    "speech": "cy-GB"
  },
  {
    "code": "xh",
    "name": "isiXhosa",
    "speech": "xh-ZA"
  },
  {
    "code": "yi",
    "name": "Yiddish",
    "speech": "yi"
  },
  {
    "code": "yo",
    "name": "Yoruba",
    "speech": "yo-NG"
  },
  {
    "code": "zu",
    "name": "isiZulu",
    "speech": "zu-ZA"
  },
  {"code":"ab","name":"Abkhaz","speech":"ab"},
  {"code":"ace","name":"Acehnese","speech":"ace"},
  {"code":"ach","name":"Acholi","speech":"ach"},
  {"code":"aa","name":"Afar","speech":"aa"},
  {"code":"alz","name":"Alur","speech":"alz"},
  {"code":"av","name":"Avar","speech":"av"},
  {"code":"awa","name":"Awadhi","speech":"awa"},
  {"code":"ban","name":"Balinese","speech":"ban"},
  {"code":"bal","name":"Baluchi","speech":"bal"},
  {"code":"ba","name":"Bashkir","speech":"ba"},
  {"code":"bci","name":"Baoulé","speech":"bci"},
  {"code":"btx","name":"Batak Karo","speech":"btx"},
  {"code":"bts","name":"Batak Simalungun","speech":"bts"},
  {"code":"bbc","name":"Batak Toba","speech":"bbc"},
  {"code":"bem","name":"Bemba","speech":"bem"},
  {"code":"bew","name":"Betawi","speech":"bew"},
  {"code":"bik","name":"Bikol","speech":"bik"},
  {"code":"br","name":"Breton","speech":"br"},
  {"code":"bua","name":"Buryat","speech":"bua"},
  {"code":"yue","name":"Cantonese","speech":"yue"},
  {"code":"ch","name":"Chamorro","speech":"ch"},
  {"code":"ce","name":"Chechen","speech":"ce"},
  {"code":"chk","name":"Chuukese","speech":"chk"},
  {"code":"cv","name":"Chuvash","speech":"cv"},
  {"code":"crh","name":"Crimean Tatar","speech":"crh"},
  {"code":"prs","name":"Dari","speech":"prs"},
  {"code":"din","name":"Dinka","speech":"din"},
  {"code":"dov","name":"Dombe","speech":"dov"},
  {"code":"dyu","name":"Dyula","speech":"dyu"},
  {"code":"dz","name":"Dzongkha","speech":"dz"},
  {"code":"fo","name":"Faroese","speech":"fo"},
  {"code":"fon","name":"Fon","speech":"fon"},
  {"code":"fur","name":"Friulian","speech":"fur"},
  {"code":"ff","name":"Fulfulde","speech":"ff"},
  {"code":"gaa","name":"Ga","speech":"gaa"},
  {"code":"cnh","name":"Hakha Chin","speech":"cnh"},
  {"code":"hil","name":"Hiligaynon","speech":"hil"},
  {"code":"hrx","name":"Hunsrik","speech":"hrx"},
  {"code":"iba","name":"Iban","speech":"iba"},
  {"code":"jam","name":"Jamaican Patois","speech":"jam"},
  {"code":"kac","name":"Jingpo","speech":"kac"},
  {"code":"kl","name":"Kalaallisut","speech":"kl"},
  {"code":"kr","name":"Kanuri","speech":"kr"},
  {"code":"pam","name":"Kapampangan","speech":"pam"},
  {"code":"kha","name":"Khasi","speech":"kha"},
  {"code":"cgg","name":"Kiga","speech":"cgg"},
  {"code":"kg","name":"Kikongo","speech":"kg"},
  {"code":"ktu","name":"Kituba","speech":"ktu"},
  {"code":"trp","name":"Kokborok","speech":"trp"},
  {"code":"kv","name":"Komi","speech":"kv"},
  {"code":"ltg","name":"Latgalian","speech":"ltg"},
  {"code":"lij","name":"Ligurian","speech":"lij"},
  {"code":"li","name":"Limburgish","speech":"li"},
  {"code":"lmo","name":"Lombard","speech":"lmo"},
  {"code":"luo","name":"Luo","speech":"luo"},
  {"code":"mad","name":"Madurese","speech":"mad"},
  {"code":"mak","name":"Makassar","speech":"mak"},
  {"code":"ms-Arab","name":"Malay (Jawi)","speech":"ms-Arab"},
  {"code":"mam","name":"Mam","speech":"mam"},
  {"code":"gv","name":"Manx","speech":"gv"},
  {"code":"mh","name":"Marshallese","speech":"mh"},
  {"code":"mwr","name":"Marwadi","speech":"mwr"},
  {"code":"mfe","name":"Mauritian Creole","speech":"mfe"},
  {"code":"min","name":"Minang","speech":"min"},
  {"code":"nhe","name":"Nahuatl (Eastern Huasteca)","speech":"nhe"},
  {"code":"ndc","name":"Ndau","speech":"ndc"},
  {"code":"nr","name":"Ndebele (South)","speech":"nr"},
  {"code":"new","name":"Nepalbhasa (Newari)","speech":"new"},
  {"code":"nqo","name":"NKo","speech":"nqo"},
  {"code":"nus","name":"Nuer","speech":"nus"},
  {"code":"oc","name":"Occitan","speech":"oc"},
  {"code":"os","name":"Ossetian","speech":"os"},
  {"code":"pag","name":"Pangasinan","speech":"pag"},
  {"code":"pap","name":"Papiamento","speech":"pap"},
  {"code":"pa-Arab","name":"Punjabi (Shahmukhi)","speech":"pa-Arab"},
  {"code":"quc","name":"Q'eqchi'","speech":"quc"},
  {"code":"rom","name":"Romani","speech":"rom"},
  {"code":"rn","name":"Rundi","speech":"rn"},
  {"code":"se","name":"Sami (North)","speech":"se"},
  {"code":"sg","name":"Sango","speech":"sg"},
  {"code":"sat","name":"Santali","speech":"sat"},
  {"code":"crs","name":"Seychellois Creole","speech":"crs"},
  {"code":"shn","name":"Shan","speech":"shn"},
  {"code":"scn","name":"Sicilian","speech":"scn"},
  {"code":"szl","name":"Silesian","speech":"szl"},
  {"code":"sus","name":"Susu","speech":"sus"},
  {"code":"ss","name":"Swati","speech":"ss"},
  {"code":"ty","name":"Tahitian","speech":"ty"},
  {"code":"ber","name":"Tamazight","speech":"ber"},
  {"code":"ber-Tfng","name":"Tamazight (Tifinagh)","speech":"ber-Tfng"},
  {"code":"tet","name":"Tetum","speech":"tet"},
  {"code":"bo","name":"Tibetan","speech":"bo"},
  {"code":"tiv","name":"Tiv","speech":"tiv"},
  {"code":"tpi","name":"Tok Pisin","speech":"tpi"},
  {"code":"to","name":"Tongan","speech":"to"},
  {"code":"tn","name":"Tswana","speech":"tn"},
  {"code":"tcy","name":"Tulu","speech":"tcy"},
  {"code":"tum","name":"Tumbuka","speech":"tum"},
  {"code":"tyv","name":"Tuvan","speech":"tyv"},
  {"code":"udm","name":"Udmurt","speech":"udm"},
  {"code":"ve","name":"Venda","speech":"ve"},
  {"code":"vec","name":"Venetian","speech":"vec"},
  {"code":"war","name":"Waray","speech":"war"},
  {"code":"wo","name":"Wolof","speech":"wo"},
  {"code":"sah","name":"Yakut","speech":"sah"},
  {"code":"zap","name":"Zapotec","speech":"zap"},
  {"code":"af-ZA","name":"Afrikaans (South Africa)","speech":"af-ZA"},
  {"code":"ar-SA","name":"Arabic (Saudi Arabia)","speech":"ar-SA"},
  {"code":"bn-IN","name":"Bengali (India)","speech":"bn-IN"},
  {"code":"bs-Cyrl","name":"Bosnian (Cyrillic)","speech":"bs-Cyrl"},
  {"code":"zh-HK","name":"Chinese (Hong Kong)","speech":"zh-HK"},
  {"code":"zh-Hans","name":"Chinese (Simplified)","speech":"zh-Hans"},
  {"code":"zh-Hant","name":"Chinese (Traditional)","speech":"zh-Hant"},
  {"code":"en-AU","name":"English (Australia)","speech":"en-AU"},
  {"code":"en-CA","name":"English (Canada)","speech":"en-CA"},
  {"code":"en-NZ","name":"English (New Zealand)","speech":"en-NZ"},
  {"code":"en-PH","name":"English (Philippines)","speech":"en-PH"},
  {"code":"en-ZA","name":"English (South Africa)","speech":"en-ZA"},
  {"code":"en-GB","name":"English (United Kingdom)","speech":"en-GB"},
  {"code":"fr-CA","name":"French (Canada)","speech":"fr-CA"},
  {"code":"fr-CH","name":"French (Switzerland)","speech":"fr-CH"},
  {"code":"nl-BE","name":"Dutch (Belgium)","speech":"nl-BE"},
  {"code":"pt-BR","name":"Portuguese (Brazil)","speech":"pt-BR"},
  {"code":"es-AR","name":"Spanish (Argentina)","speech":"es-AR"},
  {"code":"es-CL","name":"Spanish (Chile)","speech":"es-CL"},
  {"code":"es-CO","name":"Spanish (Colombia)","speech":"es-CO"},
  {"code":"es-MX","name":"Spanish (Mexico)","speech":"es-MX"},
  {"code":"es-419","name":"Spanish (Latin America)","speech":"es-419"},
  {"code":"pa-PK","name":"Punjabi (Pakistan)","speech":"pa-PK"}
];

const emptyProfile = (id: string, name = ''): Profile => ({ id, display_name: name, age: null, city: '', bio: '', photo_url: '' });

function DateMeLogo() {
  return <svg className="dateme-logo-art" viewBox="0 0 340 300" role="img" aria-label="DateMe red heart wrapped in navy and emerald ribbons with gold trim">
    <defs>
      <linearGradient id="dm-heart" x1="0" y1="0" x2="0.9" y2="1"><stop offset="0" stopColor="#ff666b"/><stop offset=".38" stopColor="#f31627"/><stop offset="1" stopColor="#9e0010"/></linearGradient>
      <linearGradient id="dm-navy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#183a5b"/><stop offset="1" stopColor="#06182b"/></linearGradient>
      <linearGradient id="dm-green" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#00805c"/><stop offset="1" stopColor="#00402e"/></linearGradient>
    </defs>
    <path d="M170 269 C140 243 47 172 47 104 C47 52 111 38 170 91 C229 38 293 52 293 104 C293 172 200 243 170 269Z" fill="url(#dm-heart)" stroke="#a90010" strokeWidth="4"/>
    <path d="M68 91 C81 62 111 60 132 80 M208 80 C231 59 259 67 272 94" fill="none" stroke="#ffb4b1" strokeWidth="7" strokeLinecap="round"/>
    <path d="M26 111 C82 73 124 83 170 105 C216 83 258 73 314 111 L314 139 C256 109 217 116 170 136 C123 116 84 109 26 139Z" fill="url(#dm-navy)" stroke="#d9b96d" strokeWidth="2.5"/>
    <path d="M13 151 C74 118 122 129 170 150 C218 129 266 118 327 151 L327 180 C267 151 218 162 170 182 C122 162 73 151 13 180Z" fill="url(#dm-green)" stroke="#d9b96d" strokeWidth="2.5"/>
    <path d="M26 198 C83 174 123 182 170 201 C217 182 257 174 314 198 L314 226 C256 205 217 216 170 236 C123 216 84 205 26 226Z" fill="url(#dm-navy)" stroke="#d9b96d" strokeWidth="2.5"/>
    <g fill="#fff4dd" fontFamily="Georgia,serif" fontStyle="italic" fontWeight="bold" fontSize="18" stroke="#fff4dd" strokeWidth=".25"><text x="170" y="171" textAnchor="middle">Date Me</text></g>
    <g fill="#ff3150"><path d="M170 110 C160 98 146 108 154 118 L170 132 L186 118 C194 108 180 98 170 110Z"/><path d="M170 160 C160 148 146 158 154 168 L170 182 L186 168 C194 158 180 148 170 160Z"/><path d="M170 209 C160 197 146 207 154 217 L170 231 L186 217 C194 207 180 197 170 209Z"/></g>
  </svg>;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(Boolean(supabase));
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signup');
  const [showPassword, setShowPassword] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [page, setPage] = useState<'register' | 'home' | 'discover' | 'plans' | 'how' | 'safety' | 'admin'>('register');
  const [pageHistory, setPageHistory] = useState<Array<typeof page>>([]);
  const [selectedPlan, setSelectedPlan] = useState('week');
  const [subscriptionPortalOpen, setSubscriptionPortalOpen] = useState(false);
  const [planPreferences, setPlanPreferences] = useState<Record<string, string[]>>(() => { try { return JSON.parse(localStorage.getItem('dateme-plan-preferences') || '{}') as Record<string, string[]>; } catch { return {}; } });
  const [preferencesLoadedFor, setPreferencesLoadedFor] = useState('');
  const [theme, setTheme] = useState<'rose' | 'navy' | 'green'>('navy');
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [signupAge, setSignupAge] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [subscriptionSubmitting, setSubscriptionSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'nowpayments' | 'kora_1voucher'>('nowpayments');
  const [voucherPin, setVoucherPin] = useState('');
  const [voucherPhone, setVoucherPhone] = useState('');
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [subscriptionPrices, setSubscriptionPrices] = useState<Record<string, { price_zar: number | string | null; price_usd: number | string | null; enabled: boolean }>>({});
  const [profiles, setProfiles] = useState<Profile[]>(aiProfiles);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [memberMedia, setMemberMedia] = useState<MemberMedia[]>([]);
  const [publicMedia, setPublicMedia] = useState<MemberMedia[]>([]);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [liked, setLiked] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('dateme-ai-likes') || '[]') as string[]; } catch { return []; } });
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [galleryProfile, setGalleryProfile] = useState<Profile | null>(null);
  const [expandedGalleryPhoto, setExpandedGalleryPhoto] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageReceipts, setMessageReceipts] = useState<Record<string, MessageReceipt>>({});
  const [voiceAccess, setVoiceAccess] = useState(false);
  const [hiddenMessageIds, setHiddenMessageIds] = useState<string[]>([]);
  const [translationPanel, setTranslationPanel] = useState<{ messageId: string; original: string; translated: string; sourceLanguage: string; loading: boolean; error: string } | null>(null);
  const [translationTarget, setTranslationTarget] = useState('en');
  const [speechSource, setSpeechSource] = useState('en-US');
  const [speechListening, setSpeechListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const speechRecognitionRef = useRef<{ stop: () => void } | null>(null);
  const [messageText, setMessageText] = useState('');
  const [demoChatPerson, setDemoChatPerson] = useState<Profile | null>(null);
  const [demoMessages, setDemoMessages] = useState<Message[]>([]);
  const [demoReplyCount, setDemoReplyCount] = useState(0);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [voicePreview, setVoicePreview] = useState<string | null>(null);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceUrls, setVoiceUrls] = useState<Record<string, string>>({});
  const sendingVoiceRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<BlobPart[]>([]);
  const [activeMatchId, setActiveMatchId] = useState('');
  const [tab, setTab] = useState<'discover' | 'likes' | 'matches' | 'profile'>('discover');
  const [searchText, setSearchText] = useState('');
  const [minAgeFilter, setMinAgeFilter] = useState('');
  const [maxAgeFilter, setMaxAgeFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [adminReports, setAdminReports] = useState<Array<{ id: string; reporter_id: string; reported_user_id: string; reason: string; details: string | null; status: string; created_at: string }>>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [safetyEvents, setSafetyEvents] = useState<Array<{ id: string; user_id: string; original_message: string; detected_reasons: string[]; strike_number: number; action_taken: string; created_at: string }>>([]);
  const [safetyStatus, setSafetyStatus] = useState<Array<{ user_id: string; strike_count: number; suspended_until: string | null; updated_at: string }>>([]);
  const [affiliateCode, setAffiliateCode] = useState('');
  const [referralInput, setReferralInput] = useState(() => new URLSearchParams(window.location.search).get('ref') || localStorage.getItem('dateme-pending-referral') || '');
  const [affiliateReferrals, setAffiliateReferrals] = useState<Array<{ id: string; referred_user_id: string; status: string; qualifying_minutes_today: number; promo_ends_at: string | null; created_at: string }>>([]);
  const [affiliateActivitySeconds, setAffiliateActivitySeconds] = useState(0);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{ plan_code: string; status: string; ends_at: string | null; payment_verified: boolean; promo_chat_until: string | null } | null>(null);
  const [adminSubscriptions, setAdminSubscriptions] = useState<Array<{ user_id: string; plan_code: string; status: string; created_at: string; payment_verified: boolean }>>([]);
  const [adminPlanPrices, setAdminPlanPrices] = useState<Array<{ plan_code: string; price_zar: number | null; price_usd: number | null; enabled: boolean }>>([]);
  const [adminPayments, setAdminPayments] = useState<Array<{ id: string; user_id: string; plan_code: string; provider: string; status: string; amount: number; currency: string; created_at: string; paid_at: string | null }>>([]);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, { price_zar: string; price_usd: string; enabled: boolean }>>({});
  const [priceSaving, setPriceSaving] = useState(false);
  const referralCodeFromUrl = new URLSearchParams(window.location.search).get('ref');

  useEffect(() => {
    if (referralCodeFromUrl) localStorage.setItem('dateme-pending-referral', referralCodeFromUrl);
  }, []);

  useEffect(() => {
    if (!session?.user || !supabase) {
      localStorage.setItem('dateme-plan-preferences', JSON.stringify(planPreferences));
      return;
    }
    const userId = session.user.id;
    if (preferencesLoadedFor !== userId) return;
    localStorage.setItem('dateme-plan-preferences', JSON.stringify(planPreferences));
    const planPairs = [
      { uiKey: 'week', planCode: 'week' },
      { uiKey: 'month', planCode: 'month' },
      { uiKey: 'quarter', planCode: 'three_months' },
      { uiKey: 'half', planCode: 'six_months' },
      { uiKey: 'year', planCode: 'yearly' },
    ];
    void supabase.from('member_plan_preferences').upsert(
      planPairs.map(({ uiKey, planCode }) => ({
        user_id: userId,
        plan_code: planCode,
        preferences: planPreferences[uiKey] || [],
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'user_id,plan_code' },
    ).then(({ error }) => {
      if (error) setNotice('Your plan preferences are saved on this device, but account sync failed. Please try again later.');
    });
  }, [planPreferences, session?.user?.id, preferencesLoadedFor]);

  function navigateTo(nextPage: typeof page) {
    if (page !== nextPage) setPageHistory([...pageHistory.slice(-19), page]);
    setPage(nextPage);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goBackPage() {
    const previousPage = pageHistory[pageHistory.length - 1];
    if (previousPage) {
      setPage(previousPage);
      setPageHistory(pageHistory.slice(0, -1));
    } else {
      setPage(session ? 'discover' : 'register');
      setPageHistory([]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closePage() {
    setSubscriptionPortalOpen(false); setMenuOpen(false); setPageHistory([]);
    setPage(session ? 'discover' : 'register'); setActiveMatchId(''); setReplyTo(null); setDemoChatPerson(null); setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const mediaLimits = useMemo(() => {
    const plan = subscriptionInfo?.status === 'active' && subscriptionInfo.payment_verified && subscriptionInfo.ends_at && new Date(subscriptionInfo.ends_at).getTime() > Date.now() ? subscriptionInfo.plan_code : 'free';
    const limits: Record<string, { photos: number; videos: number }> = { free: { photos: 1, videos: 0 }, week: { photos: 4, videos: 0 }, month: { photos: 8, videos: 1 }, three_months: { photos: 15, videos: 3 }, six_months: { photos: 25, videos: 10 }, yearly: { photos: 50, videos: 20 } };
    return isAdmin ? { photos: 999, videos: 999 } : (limits[plan] || limits.free);
  }, [subscriptionInfo, isAdmin]);

  useEffect(() => {
    if (!supabase || !session?.user) { setMemberMedia([]); setPublicMedia([]); return; }
    let cancelled = false;
    const loadGallery = async () => {
      const { data, error } = await supabase!.from('member_media').select('id,user_id,media_type,storage_path,public_url,created_at').order('created_at', { ascending: false }).limit(500);
      if (cancelled) return;
      if (error) { setNotice('Your photo gallery is not ready yet. Apply the profile gallery migration and try again.'); return; }
      const rows = (data || []) as MemberMedia[];
      const mine = rows.filter((item) => item.user_id === session!.user.id);
      const expired = mine.filter((item) => Date.now() - new Date(item.created_at).getTime() > 30 * 24 * 60 * 60 * 1000);
      const keepFloorIds = new Set(mine.slice(0, 5).map((item) => item.id));
      const toDelete = expired.filter((item) => !keepFloorIds.has(item.id));
      let remaining = rows;
      if (toDelete.length) {
        const { error: storageError } = await supabase!.storage.from('dateme-profile-media').remove(toDelete.map((item) => item.storage_path));
        if (!storageError) {
          const { error: rowsError } = await supabase!.from('member_media').delete().in('id', toDelete.map((item) => item.id));
          if (!rowsError) remaining = rows.filter((item) => !toDelete.some((old) => old.id === item.id));
        }
      }
      setPublicMedia(remaining);
      setMemberMedia(remaining.filter((item) => item.user_id === session!.user.id));
    };
    void loadGallery();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  async function uploadGalleryFiles(files: FileList | null) {
    if (!supabase || !session || !files?.length) return;
    const chosen = Array.from(files);
    const photoCount = memberMedia.filter((item) => item.media_type === 'photo').length;
    const videoCount = memberMedia.filter((item) => item.media_type === 'video').length;
    const allowed = chosen.filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'));
    if (allowed.length !== chosen.length) { setNotice('The gallery accepts image and video files only.'); return; }
    const photos = allowed.filter((file) => file.type.startsWith('image/'));
    const videos = allowed.filter((file) => file.type.startsWith('video/'));
    if (photoCount + photos.length > mediaLimits.photos || videoCount + videos.length > mediaLimits.videos) {
      setNotice(`This plan allows ${mediaLimits.photos} photos and ${mediaLimits.videos} videos. Remove items or choose a larger plan to upload more.`); return;
    }
    if (allowed.some((file) => file.size > (file.type.startsWith('video/') ? 25 : 5) * 1024 * 1024)) { setNotice('Each photo must be 5 MB or smaller; each video must be 25 MB or smaller.'); return; }
    setGalleryBusy(true); setNotice('');
    const uploaded: MemberMedia[] = [];
    for (const file of allowed) {
      const mediaType = file.type.startsWith('video/') ? 'video' : 'photo';
      const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || (mediaType === 'video' ? 'mp4' : 'jpg');
      const path = `${session.user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('dateme-profile-media').upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) { setNotice(`Gallery upload failed: ${uploadError.message}`); break; }
      const publicUrl = supabase.storage.from('dateme-profile-media').getPublicUrl(path).data.publicUrl;
      const { data, error } = await supabase.from('member_media').insert({ user_id: session.user.id, media_type: mediaType, storage_path: path, public_url: publicUrl }).select('id,user_id,media_type,storage_path,public_url,created_at').single();
      if (error) { await supabase.storage.from('dateme-profile-media').remove([path]); setNotice(`Could not save this gallery item: ${error.message}`); break; }
      if (data) uploaded.push(data as MemberMedia);
    }
    setMemberMedia((current) => [...uploaded, ...current]);
    setPublicMedia((current) => [...uploaded, ...current]);
    setGalleryBusy(false);
    if (uploaded.length) setNotice(`${uploaded.length} gallery item${uploaded.length === 1 ? '' : 's'} uploaded successfully.`);
  }

  async function removeGalleryItem(item: MemberMedia) {
    if (!supabase || !session || item.user_id !== session.user.id) return;
    if (!window.confirm('Remove this item from your profile gallery?')) return;
    const { error: storageError } = await supabase.storage.from('dateme-profile-media').remove([item.storage_path]);
    if (storageError) { setNotice(`Could not remove this media file: ${storageError.message}`); return; }
    const { error } = await supabase.from('member_media').delete().eq('id', item.id).eq('user_id', session.user.id);
    if (error) { setNotice('The media file was removed, but its gallery record could not be cleared. Refresh the page and try again.'); return; }
    setMemberMedia((current) => current.filter((row) => row.id !== item.id));
    setPublicMedia((current) => current.filter((row) => row.id !== item.id));
    setNotice('Gallery item removed.');
  }

  function togglePlanPreference(planId: string, preference: string) {
    setPlanPreferences(current => {
      const currentChoices = current[planId] || [];
      return { ...current, [planId]: currentChoices.includes(preference) ? currentChoices.filter(choice => choice !== preference) : [...currentChoices, preference] };
    });
  }

  useEffect(() => {
    if (session?.user) setPage('discover');
    else setPage('register');
  }, [session?.user?.id]);

  useEffect(() => {
    const client = supabase;
    const userId = session?.user?.id;
    if (!client || !userId) {
      setPreferencesLoadedFor('');
      return;
    }
    let cancelled = false;
    setPreferencesLoadedFor('');
    setPlanPreferences({});
    client.from('member_plan_preferences').select('plan_code,preferences').eq('user_id', userId)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setNotice('Could not load your saved plan preferences from your account. Your existing device settings remain available.');
          return;
        }
        const uiKeys: Record<string, string> = { week: 'week', month: 'month', three_months: 'quarter', six_months: 'half', yearly: 'year' };
        const saved = Object.fromEntries((data || []).map(row => [uiKeys[row.plan_code] || row.plan_code, row.preferences || []])) as Record<string, string[]>;
        setPlanPreferences(saved);
        setPreferencesLoadedFor(userId);
      });
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!supabase || !session?.user) { setIsAdmin(false); setVoiceAccess(false); return; }
    supabase!.from('admin_users').select('user_id').eq('user_id', session.user.id).maybeSingle()
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [session?.user?.id]);

  useEffect(() => {
    let cancelled = false;
    if (!supabase || !session?.user || !activeMatchId) { setVoiceAccess(false); return; }
    supabase.rpc('dateme_can_exchange_voice', { p_match_id: activeMatchId })
      .then(({ data }) => { if (!cancelled) setVoiceAccess(data === true); }, () => { if (!cancelled) setVoiceAccess(false); });
    return () => { cancelled = true; };
  }, [session?.user?.id, activeMatchId]);
  
  useEffect(() => {
    const client = supabase;
    if (!client || !session?.user) {
      setAffiliateCode('');
      setAffiliateReferrals([]);
      setAffiliateActivitySeconds(0);
      setSubscriptionInfo(null);
      return;
    }
    let cancelled = false;
    const userId = session.user.id;
    const pendingKey = 'dateme-pending-referral';
    const params = new URLSearchParams(window.location.search);
    const referralFromUrl = params.get('ref');
    const storedReferral = localStorage.getItem(pendingKey);
    const referralCode = referralFromUrl || storedReferral;
    const loadMemberData = async () => {
      const [account, referrals, activity, subscription] = await Promise.all([
        client.from('affiliate_accounts').select('referral_code').eq('user_id', userId).maybeSingle(),
        client.from('affiliate_referrals').select('id,referred_user_id,status,qualifying_minutes_today,promo_ends_at,created_at').eq('referrer_id', userId).order('created_at', { ascending: false }).limit(100),
        client.from('affiliate_activity_daily').select('qualifying_seconds').eq('user_id', userId).eq('activity_date', new Date().toISOString().slice(0, 10)).maybeSingle(),
        client.from('member_subscriptions').select('plan_code,status,ends_at,payment_verified,promo_chat_until').eq('user_id', userId).maybeSingle(),
      ]);
      if (cancelled) return;
      if (account.data?.referral_code) setAffiliateCode(account.data.referral_code);
      if (!account.data && account.error) setNotice('Your affiliate account is still being prepared. Refresh your profile shortly.');
      setAffiliateReferrals((referrals.data || []) as typeof affiliateReferrals);
      setAffiliateActivitySeconds(activity.data?.qualifying_seconds || 0);
      if (subscription.data) setSubscriptionInfo(subscription.data as typeof subscriptionInfo);
      if (referralCode) {
        const { error } = await client.rpc('attach_affiliate_referral', { p_referral_code: referralCode });
        if (!error) {
          localStorage.removeItem(pendingKey);
          if (referralFromUrl) {
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete('ref');
            window.history.replaceState({}, '', cleanUrl.toString());
          }
        } else if (referralFromUrl) {
          localStorage.setItem(pendingKey, referralCode);
        }
      }
    };
    void loadMemberData();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!supabase || !session?.user || page !== 'discover' || tab !== 'matches' || !activeMatchId || document.visibilityState !== 'visible') return;
    let cancelled = false;
    const heartbeat = async () => {
      const { data, error } = await supabase!.rpc('record_affiliate_heartbeat');
      if (cancelled || error) return;
      const seconds = Number((data as { qualifying_seconds_today?: number } | null)?.qualifying_seconds_today);
      if (Number.isFinite(seconds)) setAffiliateActivitySeconds(seconds);
    };
    void heartbeat();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void heartbeat(); }, 60000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [session?.user?.id, page, tab, activeMatchId]);


  useEffect(() => {
    if (!supabase || !session?.user || !isAdmin || page !== 'admin') return;
    let cancelled = false;
    setReportsLoading(true);
    Promise.all([
      supabase!.from('member_reports').select('id, reporter_id, reported_user_id, reason, details, status, created_at').order('created_at', { ascending: false }).limit(100),
      supabase!.from('member_safety_events').select('id, user_id, original_message, detected_reasons, strike_number, action_taken, created_at').order('created_at', { ascending: false }).limit(200),
      supabase!.from('member_safety_status').select('user_id, strike_count, suspended_until, updated_at').order('updated_at', { ascending: false }).limit(200),
      supabase!.from('member_subscriptions').select('user_id,plan_code,status,created_at,payment_verified').eq('status','pending').order('created_at',{ascending:false}).limit(200),
      supabase!.from('subscription_plan_prices').select('plan_code,price_zar,price_usd,enabled').order('plan_code'),
      supabase!.from('subscription_payment_orders').select('id,user_id,plan_code,provider,status,amount,currency,created_at,paid_at').order('created_at',{ascending:false}).limit(100),
    ]).then(([reports, events, statuses, subscriptions, prices, payments]) => {
      if (cancelled) return;
      if (reports.error) setNotice('Could not load reports. Please check administrator policies.');
      else setAdminReports((reports.data || []) as typeof adminReports);
      if (events.error) setNotice('Safety history could not be loaded. Check administrator policies.');
      else setSafetyEvents((events.data || []) as typeof safetyEvents);
      if (statuses.error) setNotice('Safety status could not be loaded. Check administrator policies.');
      else setSafetyStatus((statuses.data || []) as typeof safetyStatus);
      if (!subscriptions.error) setAdminSubscriptions((subscriptions.data || []) as typeof adminSubscriptions);
      if (!prices.error) {
        const rows = (prices.data || []) as typeof adminPlanPrices;
        setAdminPlanPrices(rows);
        setPriceDrafts(Object.fromEntries(rows.map(row => [row.plan_code, { price_zar: row.price_zar == null ? '' : String(row.price_zar), price_usd: row.price_usd == null ? '' : String(row.price_usd), enabled: row.enabled }])));
      } else setNotice('Subscription pricing could not be loaded. Apply the subscription payment migration first.');
      if (!payments.error) setAdminPayments((payments.data || []) as typeof adminPayments);
      else setNotice('Payment history could not be loaded. Apply the subscription payment migration first.');
      setReportsLoading(false);
    });
    return () => { cancelled = true; };
  }, [session?.user?.id, isAdmin, page]);

  async function saveSubscriptionPrice(planCode: string) {
    if (!supabase || !session || !isAdmin || priceSaving) return;
    const draft = priceDrafts[planCode];
    if (!draft) return;
    const zar = draft.price_zar.trim() ? Number(draft.price_zar) : null;
    const usd = draft.price_usd.trim() ? Number(draft.price_usd) : null;
    if ((zar !== null && (!Number.isFinite(zar) || zar <= 0)) || (usd !== null && (!Number.isFinite(usd) || usd <= 0))) {
      setNotice('Prices must be positive amounts, or left blank while you configure them.');
      return;
    }
    if (draft.enabled && (zar === null || usd === null)) {
      setNotice('Enter both the ZAR and USD prices before enabling this plan.');
      return;
    }
    setPriceSaving(true);
    setNotice('');
    const { error } = await supabase.from('subscription_plan_prices').update({
      price_zar: zar, price_usd: usd, enabled: draft.enabled,
      updated_at: new Date().toISOString(),
    }).eq('plan_code', planCode);
    setPriceSaving(false);
    if (error) { setNotice('Could not save prices. Check admin permissions and apply the subscription payment migration.'); return; }
    setAdminPlanPrices(rows => rows.map(row => row.plan_code === planCode ? { ...row, price_zar: zar, price_usd: usd, enabled: draft.enabled } : row));
    setSubscriptionPrices(current => ({ ...current, [planCode]: { price_zar: zar, price_usd: usd, enabled: draft.enabled } }));
    setNotice('Subscription pricing saved.');
  }

  async function loadSubscriptionPrices() {
    if (!supabase) return;
    const { data, error } = await supabase.functions.invoke('subscription-pricing', { method: 'GET' });
    if (error || !data?.plans) {
      setCheckoutMessage('Prices are not available yet. Please try again later.');
      return;
    }
    const next: Record<string, { price_zar: number | string | null; price_usd: number | string | null; enabled: boolean }> = {};
    for (const item of data.plans as Array<{ plan_code: string; price_zar: number | string | null; price_usd: number | string | null; enabled: boolean }>) {
      next[item.plan_code] = { price_zar: item.price_zar, price_usd: item.price_usd, enabled: item.enabled };
    }
    setSubscriptionPrices(next);
  }

  async function submitSubscriptionRequest() {
    if (!supabase || !session) { setNotice('Sign in before purchasing a subscription.'); return; }
    if (subscriptionSubmitting) return;
    if (paymentMethod === 'kora_1voucher' && !/^\d{16}$/.test(voucherPin.replace(/\s/g, ''))) {
      setCheckoutMessage('Enter the 16-digit OneVoucher PIN.');
      return;
    }
    if (paymentMethod === 'kora_1voucher' && !/^\+27\d{9}$/.test(voucherPhone.trim())) {
      setCheckoutMessage('Enter your South African mobile number in +27 format.');
      return;
    }
    const planMap: Record<string, string> = { week: 'week', month: 'month', quarter: 'three_months', half: 'six_months', year: 'yearly' };
    setSubscriptionSubmitting(true);
    setCheckoutMessage('');
    setNotice('');
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-payment', {
        body: {
          plan_code: planMap[selectedPlan] || 'week',
          provider: paymentMethod,
          idempotency_key: crypto.randomUUID(),
          ...(paymentMethod === 'kora_1voucher' ? { voucher_pin: voucherPin.replace(/\s/g, ''), phone_number: voucherPhone.trim() } : {}),
        },
      });
      if (error || !data) {
        setCheckoutMessage(data?.error || error?.message || 'Could not start checkout. Please try again.');
        return;
      }
      if (data.error) {
        setCheckoutMessage(String(data.error));
        return;
      }
      if (data.checkout_url) {
        setCheckoutMessage('Your secure crypto invoice is ready. Redirecting to NOWPayments…');
        window.location.assign(String(data.checkout_url));
        return;
      }
      if (data.status === 'succeeded') {
        setVoucherPin('');
        setCheckoutMessage(String(data.message || 'Payment confirmed. Refreshing your membership status…'));
      } else {
        setVoucherPin('');
        setCheckoutMessage(String(data.message || 'Payment submitted. Your plan stays locked until the provider confirms payment.'));
      }
      const { data: subscription } = await supabase.from('member_subscriptions')
        .select('plan_code,status,ends_at,payment_verified,promo_chat_until')
        .eq('user_id', session.user.id).maybeSingle();
      if (subscription) setSubscriptionInfo(subscription as typeof subscriptionInfo);
    } catch {
      setCheckoutMessage('A network error prevented checkout. Please try again.');
    } finally {
      setSubscriptionSubmitting(false);
    }
  }

  async function refreshSubscriptionStatus() {
    if (!supabase || !session) return;
    const { data, error } = await supabase.from('member_subscriptions')
      .select('plan_code,status,ends_at,payment_verified,promo_chat_until')
      .eq('user_id', session.user.id).maybeSingle();
    if (error) setCheckoutMessage('Could not refresh membership status. Please try again.');
    else if (data) {
      setSubscriptionInfo(data as typeof subscriptionInfo);
      setCheckoutMessage(data.status === 'active' && data.payment_verified
        ? 'Payment verified. Your subscription is active.'
        : 'Payment is still awaiting provider confirmation. Paid features remain locked.');
    }
  }

  async function reviewSubscription(userId: string, planCode: string, approve: boolean) {
    if (!supabase || !session || !isAdmin) return;
    const confirmation = approve
      ? `Confirm you independently verified payment for the ${planCode} plan from member ${userId}. This will activate the subscription immediately.`
      : `Decline the ${planCode} subscription request from member ${userId}?`;
    if (!window.confirm(confirmation)) return;
    const { error } = await supabase!.rpc('admin_set_subscription', { p_user_id: userId, p_plan_code: planCode, p_approve: approve });
    if (error) { setNotice('Subscription review failed. Check administrator permissions.'); return; }
    setAdminSubscriptions(current => current.filter(item => item.user_id !== userId));
    setNotice(approve ? 'Subscription approved and activated.' : 'Subscription request declined.');
  }

  async function updateReportStatus(reportId: string, status: 'reviewing' | 'resolved' | 'dismissed') {
    if (!supabase || !session || !isAdmin) return;
    const { error } = await supabase!.from('member_reports').update({ status }).eq('id', reportId);
    if (error) { setNotice('Could not update this report.'); return; }
    setAdminReports(current => current.map(report => report.id === reportId ? { ...report, status } : report));
    setNotice('Report marked ' + status + '.');
  }

  async function setMemberSuspension(userId: string, suspend: boolean) {
    if (!supabase || !session || !isAdmin) return;
    const label = suspend ? 'suspend this member for 24 hours' : 'lift this member’s suspension';
    if (!window.confirm('Are you sure you want to ' + label + '?')) return;
    const { error } = await supabase.rpc('admin_set_member_suspension', { p_user_id: userId, p_suspend: suspend });
    if (error) {
      setNotice(error.message.includes('Administrator access required') ? 'Your account is not authorized for this action.' : 'Could not update the member suspension. Please try again.');
      return;
    }
    const until = suspend ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;
    setSafetyStatus(current => {
      const existing = current.find(item => item.user_id === userId);
      const nextItem = { user_id: userId, strike_count: existing?.strike_count || 0, suspended_until: until, updated_at: new Date().toISOString() };
      return existing ? current.map(item => item.user_id === userId ? nextItem : item) : [nextItem, ...current];
    });
    setNotice(suspend ? 'Member suspended for 24 hours.' : 'Member suspension lifted.');
  }

  useEffect(() => {
    if (!supabase) { setCheckingSession(false); return; }
    supabase!.auth.getSession().then(({ data, error }) => {
      if (error) setNotice(error.message);
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const profileIds = profiles.filter((profile) => !profile.id.startsWith('ai-')).map((profile) => profile.id);
    if (!profileIds.length) { setLikeCounts({}); return; }
    let cancelled = false;
    supabase.rpc('get_profile_like_counts', { p_profile_ids: profileIds }).then(({ data, error }) => {
      if (cancelled || error || !data) return;
      setLikeCounts(Object.fromEntries((data as Array<{ profile_id: string; like_count: number | string }>).map((row) => [row.profile_id, Number(row.like_count) || 0])));
    });
    return () => { cancelled = true; };
  }, [profiles]);

  useEffect(() => {
    if (!supabase || !session?.user) {
      setMyProfile(null); setMatches([]); setLiked(() => { try { return JSON.parse(localStorage.getItem('dateme-ai-likes') || '[]') as string[]; } catch { return []; } }); setMessages([]);
      setProfiles(aiProfiles);
      return;
    }
    let cancelled = false;
    async function loadMemberData() {
      const userId = session!.user.id;
      const [own, people, sentLikes, matchRows, blocks] = await Promise.all([
        supabase!.from('profiles').select('id, display_name, age, city, bio, photo_url, interests, prompt_question, prompt_answer, looking_for, languages').eq('id', userId).maybeSingle(),
        supabase!.from('profiles').select('id, display_name, age, city, bio, photo_url, interests, prompt_question, prompt_answer, looking_for, languages').neq('id', userId).order('created_at', { ascending: false }).limit(60),
        supabase!.from('likes').select('liked_user_id').eq('user_id', userId),
        supabase!.from('matches').select('id, user_one, user_two, created_at').or(`user_one.eq.${userId},user_two.eq.${userId}`).order('created_at', { ascending: false }),
        supabase!.from('member_blocks').select('blocker_id, blocked_user_id').or(`blocker_id.eq.${userId},blocked_user_id.eq.${userId}`),
      ]);
      if (cancelled) return;
      if (own.data) setMyProfile(own.data as Profile);
      else setMyProfile(emptyProfile(userId, String(session!.user.user_metadata?.display_name || '')));
      setProfiles([...(people.data as Profile[] || []).filter((profile) => !profile.id.startsWith('ai-')), ...aiProfiles]);
      if (sentLikes.data) setLiked(sentLikes.data.map((row) => row.liked_user_id));
      if (matchRows.data) setMatches(matchRows.data as Match[]);
      if (blocks.data) setBlockedIds(blocks.data.map((row) => row.blocker_id === userId ? row.blocked_user_id : row.blocker_id));
      if (own.error || people.error || sentLikes.error || matchRows.error) {
        setNotice('Some account data could not load. Check the Supabase policies and schema setup.');
      }
    }
    void loadMemberData();
    return () => { cancelled = true; };
  }, [session]);

  useEffect(() => {
    if (!supabase || !session || !activeMatchId) { setMessages([]); return; }
    let cancelled = false;
    async function loadMessages() {
      const { data, error } = await supabase!.from('messages').select('id, match_id, sender_id, body, created_at, expires_at, reply_to, audio_path, deleted_at, deleted_by').eq('match_id', activeMatchId).order('created_at', { ascending: true }).limit(200);
      // Expired messages are removed whenever a conversation is opened/refreshed.
      await supabase!.from('messages').delete().eq('match_id', activeMatchId).lt('expires_at', new Date().toISOString());
      if (cancelled) return;
      if (error) setNotice('Could not load this conversation.');
      else {
        const rows = (data || []) as Message[];
        const { data: hiddenRows } = await supabase!.from('message_hidden_for').select('message_id').eq('user_id', session!.user.id);
        const hidden = (hiddenRows || []).map((row) => String(row.message_id));
        if (cancelled) return;
        setHiddenMessageIds(hidden);
        setMessages(rows.filter((message) => !hidden.includes(message.id)));
        if (rows.length) {
          const { data: receiptRows } = await supabase!.from('message_receipts').select('message_id,user_id,delivered_at,read_at').in('message_id', rows.map((message) => message.id));
          if (receiptRows) setMessageReceipts((current) => ({ ...current, ...Object.fromEntries((receiptRows as MessageReceipt[]).map((receipt) => [receipt.message_id, receipt])) }));
          const incoming = rows.filter((message) => message.sender_id !== session!.user.id && !message.deleted_at);
          await Promise.all(incoming.map((message) => supabase!.from('message_receipts').upsert({ message_id: message.id, user_id: session!.user.id, delivered_at: new Date().toISOString(), read_at: new Date().toISOString() }, { onConflict: 'message_id,user_id' })));
        }
      }
    }
    void loadMessages();
    const channel = supabase!.channel(`messages-${activeMatchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${activeMatchId}` }, (payload) => {
        const next = payload.new as Message;
        if (next.expires_at && new Date(next.expires_at).getTime() <= Date.now()) return;
        setMessages((current) => current.some((item) => item.id === next.id) || hiddenMessageIds.includes(next.id) ? current : [...current, next]);
        if (next.sender_id !== session!.user.id) void supabase!.from('message_receipts').upsert({ message_id: next.id, user_id: session!.user.id, delivered_at: new Date().toISOString(), read_at: new Date().toISOString() }, { onConflict: 'message_id,user_id' });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `match_id=eq.${activeMatchId}` }, (payload) => {
        const updated = payload.new as Message;
        setMessages((current) => current.map((message) => message.id === updated.id ? { ...message, ...updated } : message));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_receipts' }, async () => {
        const { data: currentMessages } = await supabase!.from('messages').select('id').eq('match_id', activeMatchId).limit(200);
        const ids = (currentMessages || []).map((message) => message.id);
        if (!ids.length) return;
        const { data } = await supabase!.from('message_receipts').select('message_id,user_id,delivered_at,read_at').in('message_id', ids);
        if (data) setMessageReceipts((current) => ({ ...current, ...Object.fromEntries((data as MessageReceipt[]).map((receipt) => [receipt.message_id, receipt])) }));
      }).subscribe();
    return () => { cancelled = true; void supabase!.removeChannel(channel); };
  }, [session, activeMatchId]);

  const ageFilterError = (() => {
    const minAge = minAgeFilter.trim() ? Number(minAgeFilter) : null;
    const maxAge = maxAgeFilter.trim() ? Number(maxAgeFilter) : null;
    if (minAge !== null && (!Number.isInteger(minAge) || minAge < 18 || minAge > 120)) return 'Minimum age must be a whole number from 18 to 120.';
    if (maxAge !== null && (!Number.isInteger(maxAge) || maxAge < 18 || maxAge > 120)) return 'Maximum age must be a whole number from 18 to 120.';
    if (minAge !== null && maxAge !== null && minAge > maxAge) return 'Minimum age cannot be greater than maximum age.';
    return '';
  })();

  const visibleProfiles = useMemo(
    () => (tab === 'likes' ? profiles.filter((profile) => liked.includes(profile.id)) : profiles).filter((profile) => {
      if (ageFilterError || blockedIds.includes(profile.id)) return false;
      const searchable = (profile.display_name + ' ' + (profile.city || '') + ' ' + (profile.bio || '') + ' ' + (profile.interests || []).join(' ')).toLowerCase();
      if (!searchable.includes(searchText.toLowerCase())) return false;
      const minAge = minAgeFilter ? Number(minAgeFilter) : null;
      const maxAge = maxAgeFilter ? Number(maxAgeFilter) : null;
      if (minAge !== null && (!profile.age || profile.age < minAge)) return false;
      if (maxAge !== null && (!profile.age || profile.age > maxAge)) return false;
      if (cityFilter.trim() && !(profile.city || '').toLowerCase().includes(cityFilter.trim().toLowerCase())) return false;
      return true;
    }),
    [profiles, liked, tab, blockedIds, searchText, minAgeFilter, maxAgeFilter, cityFilter, ageFilterError],
  );
  const activeMatch = matches.find((match) => match.id === activeMatchId) || null;
  const profileCompletion = useMemo(() => {
    if (!myProfile) return { score: 0, completed: [] as string[], missing: [] as string[] };
    const checks = [
      { label: 'Profile photo', done: Boolean(myProfile.photo_url || memberMedia.some((item) => item.media_type === 'photo')) },
      { label: 'About you', done: Boolean(myProfile.bio?.trim()) },
      { label: 'What you are looking for', done: Boolean(myProfile.looking_for) },
      { label: 'Interests', done: Boolean(myProfile.interests?.length) },
      { label: 'Languages', done: Boolean(myProfile.languages?.length) },
      { label: 'Conversation prompt', done: Boolean(myProfile.prompt_question?.trim() && myProfile.prompt_answer?.trim()) },
      { label: 'City', done: Boolean(myProfile.city?.trim()) },
    ];
    const completed = checks.filter((item) => item.done).map((item) => item.label);
    return { score: Math.round((completed.length / checks.length) * 100), completed, missing: checks.filter((item) => !item.done).map((item) => item.label) };
  }, [myProfile, memberMedia]);


  useEffect(() => {
    if (!supabase || !session || !messages.length) { setVoiceUrls({}); return; }
    let cancelled = false;
    async function loadVoiceUrls() {
      const audioMessages = messages.filter((message) => message.audio_path && (!message.expires_at || new Date(message.expires_at).getTime() > Date.now()));
      const pairs = await Promise.all(audioMessages.map(async (message) => {
        const { data } = await supabase!.storage.from('dateme-voice-notes').createSignedUrl(message.audio_path!, 3600);
        return data?.signedUrl ? [message.id, data.signedUrl] as const : null;
      }));
      if (!cancelled) setVoiceUrls(Object.fromEntries(pairs.filter((pair): pair is readonly [string, string] => Boolean(pair))));
    }
    void loadVoiceUrls();
    return () => { cancelled = true; };
  }, [messages, session?.user.id]);
  const activePerson = activeMatch ? profiles.find((profile) => profile.id === (activeMatch.user_one === session?.user.id ? activeMatch.user_two : activeMatch.user_one)) : null;
  useEffect(() => { if (!supabase || !session?.user) return; void supabase.from('member_presence').upsert({ user_id: session.user.id, last_seen_at: new Date().toISOString() }, { onConflict: 'user_id' }); }, [session?.user?.id]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice('');
    if (!supabase) { setNotice('Connect your Supabase project using the setup steps in README.md.'); return; }
    setBusy(true);
    try {
      if (mode === 'forgot') {
        const { error } = await supabase!.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/` });
        if (error) throw error;
        setNotice('If an account exists for that email, a password reset link has been sent. Check your inbox.');
      } else if (mode === 'signup') {
        const enteredReferral = referralInput.trim();
        if (enteredReferral) {
          let referralCode = enteredReferral;
          try {
            const parsed = new URL(enteredReferral);
            referralCode = parsed.searchParams.get('ref') || enteredReferral;
          } catch {
            referralCode = enteredReferral.replace(/^ref=/i, '').trim();
          }
          if (referralCode) localStorage.setItem('dateme-pending-referral', referralCode);
        }
        const age = Number(signupAge);
        if (!Number.isInteger(age) || age < 18 || age > 120) throw new Error('DateMe is for adults aged 18 and over. Please enter a valid age.');
        if (displayName.trim().length < 2) throw new Error('Please enter a name with at least 2 characters.');
        const { data, error } = await supabase!.auth.signUp({ email: email.trim(), password, options: { data: { display_name: displayName.trim(), age } } });
        if (error) throw error;
        if (data.user) {
          const { error: profileError } = await supabase!.from('profiles').upsert({ id: data.user.id, display_name: displayName.trim(), age, city: null, bio: null, photo_url: null }, { onConflict: 'id', ignoreDuplicates: true });
          if (profileError) setNotice('Your account was created, but your profile needs finishing in My profile.');
        }
        if (data.session) setNotice('Welcome to DateMe! Your account is ready.');
        else { setNotice('Check your email for a confirmation link, then come back to sign in.'); setMode('signin'); }
      } else {
        const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        setNotice('You are signed in. Welcome back!');
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  }

  async function handleSignOut() {
    if (!supabase) return;
    const { error } = await supabase!.auth.signOut();
    setNotice(error ? error.message : 'You have signed out.');
    setTab('discover'); setActiveMatchId('');
  }

  async function handleLike(profile: Profile) {
    if (!session || !supabase) {
      setLiked((current) => { const next = current.includes(profile.id) ? current : [...current, profile.id]; try { localStorage.setItem('dateme-ai-likes', JSON.stringify(next.filter((id) => id.startsWith('ai-')))); } catch {} return next; });
      setNotice('Like saved on this device.');
      return;
    }
    if (profile.id.startsWith('ai-')) {
      if (liked.includes(profile.id)) { setNotice(`You have already liked ${profile.display_name}.`); return; }
      setLiked((current) => { const next = [...current, profile.id]; try { localStorage.setItem('dateme-ai-likes', JSON.stringify(next.filter((id) => id.startsWith('ai-')))); } catch {} return next; });
      setNotice(`You liked ${profile.display_name}. This AI profile is a demo profile.`);
      return;
    }
    if (liked.includes(profile.id)) {
      setNotice(`You have already liked ${profile.display_name}.`);
      return;
    }
    const { error } = await supabase!.from('likes').upsert(
      { user_id: session.user.id, liked_user_id: profile.id },
      { onConflict: 'user_id,liked_user_id', ignoreDuplicates: true },
    );
    if (error) { setNotice('Could not save that like. Please try again.'); return; }
    setLiked((current) => current.includes(profile.id) ? current : [...current, profile.id]);
    // The database trigger creates a match on a mutual like. Check matches rather
    // than querying another member's likes, which RLS correctly keeps private.
    const { data: newMatches } = await supabase!.from('matches').select('id, user_one, user_two, created_at').or(`user_one.eq.${session.user.id},user_two.eq.${session.user.id}`).order('created_at', { ascending: false });
    if (newMatches) {
      setMatches(newMatches as Match[]);
      const matched = newMatches.some((match) => match.user_one === profile.id || match.user_two === profile.id);
      if (matched) {
        const match = newMatches.find((item) => item.user_one === profile.id || item.user_two === profile.id);
        if (match) setActiveMatchId(match.id);
        setTab('matches');
        setNotice(`It's a mutual like with ${profile.display_name}! You matched.`);
        return;
      }
    }
    setNotice(`You liked ${profile.display_name}. Fingers crossed!`);
  }

  async function reportMember(profile: Profile) {
    if (!supabase || !session) { setNotice('Sign in to report a profile.'); return; }
    const reason = window.prompt('Why are you reporting this member? (fake profile, harassment, scam, inappropriate content, other)');
    if (!reason?.trim()) return;
    const details = window.prompt('Optional details for the safety team (do not include passwords or financial information):') || '';
    const { error } = await supabase!.from('member_reports').insert({ reporter_id: session.user.id, reported_user_id: profile.id, reason: reason.trim().slice(0, 120), details: details.trim().slice(0, 2000), status: 'open' });
    setNotice(error ? 'Report could not be submitted. Please try again.' : 'Thank you. Your report has been sent for review.');
  }

  async function blockMember(profile: Profile) {
    if (!supabase || !session) { setNotice('Sign in to block a member.'); return; }
    if (!window.confirm('Block ' + profile.display_name + '? Their profile will be hidden from your discovery list.')) return;
    const { error } = await supabase!.from('member_blocks').upsert({ blocker_id: session.user.id, blocked_user_id: profile.id }, { onConflict: 'blocker_id,blocked_user_id', ignoreDuplicates: true });
    if (error) { setNotice('Could not block this member. Please try again.'); return; }
    setBlockedIds((current) => current.includes(profile.id) ? current : [...current, profile.id]);
    setNotice(profile.display_name + ' has been blocked from your discovery list.');
  }

  async function unblockMember(blockedUserId: string) {
    if (!supabase || !session) return;
    const blockedPerson = profiles.find((profile) => profile.id === blockedUserId);
    const displayName = blockedPerson?.display_name || 'This member';
    if (!window.confirm('Unblock ' + displayName + '? Their profile may appear in discovery again.')) return;
    const { error } = await supabase.from('member_blocks').delete()
      .eq('blocker_id', session.user.id).eq('blocked_user_id', blockedUserId);
    if (error) { setNotice('Could not unblock this member. Please try again.'); return; }
    setBlockedIds((current) => current.filter((id) => id !== blockedUserId));
    setNotice(displayName + ' has been unblocked. You can block them again at any time.');
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !session || !myProfile) return;
    setBusy(true); setNotice('');
    let photoUrl = myProfile.photo_url?.trim() || null;
    if (photoFile) {
      const extension = photoFile.name.split('.').pop()?.toLowerCase() || '';
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(photoFile.type) || !['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
        setBusy(false); setNotice('Please choose a JPG, PNG or WebP image.'); return;
      }
      if (photoFile.size > 5 * 1024 * 1024) {
        setBusy(false); setNotice('Your photo must be 5 MB or smaller.'); return;
      }
      const filePath = `${session.user.id}/${crypto.randomUUID()}.${extension === 'jpg' ? 'jpg' : extension}`;
      const { error: uploadError } = await supabase!.storage.from('dateme-avatars').upload(filePath, photoFile, { contentType: photoFile.type, upsert: false });
      if (uploadError) { setBusy(false); setNotice(`Photo upload failed: ${uploadError.message}`); return; }
      photoUrl = supabase!.storage.from('dateme-avatars').getPublicUrl(filePath).data.publicUrl;
    }
    const payload = {
      id: session.user.id,
      display_name: myProfile.display_name.trim(),
      age: myProfile.age,
      city: myProfile.city?.trim() || null,
      bio: myProfile.bio?.trim() || null,
      photo_url: photoUrl,
      interests: myProfile.interests || [],
      prompt_question: myProfile.prompt_question?.trim() || null,
      prompt_answer: myProfile.prompt_answer?.trim() || null,
      looking_for: myProfile.looking_for?.trim() || null,
      languages: myProfile.languages || [],
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase!.from('profiles').upsert(payload, { onConflict: 'id' }).select('id, display_name, age, city, bio, photo_url, interests, prompt_question, prompt_answer, looking_for, languages').single();
    setBusy(false);
    if (error) { setNotice('Could not save your profile. Check that the database schema has been applied.'); return; }
    setMyProfile(data as Profile);
    setPhotoFile(null);
    setProfiles((current) => current.filter((profile) => profile.id !== session.user.id));
    setNotice('Your profile has been saved.');
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = messageText.trim();
    if (!body || body.length > 2000) return;
    if (demoChatPerson && contactPattern.test(body)) {
      setNotice('********* Message hidden: phone numbers, emails, links and social/contact details are not allowed in DateMe chat. Repeated attempts may suspend your account for 24 hours. This is a demo chat.');
      return;
    }
    if (demoChatPerson) {
      const now = new Date().toISOString();
      const mine: Message = { id: crypto.randomUUID(), match_id: demoChatPerson.id, sender_id: 'demo-you', body, created_at: now, demo: true };
      setDemoMessages(current => [...current, mine]);
      setTranslationPanel(null); setSpeechTranscript('');
      setMessageText('');
      const count = demoReplyCount + 1;
      setDemoReplyCount(count);
      const lower = body.toLowerCase();
      const reply = /\b(hi|hello|hey)\b/.test(lower) ? `Hey 😊 I'm ${demoChatPerson.display_name}. How's your day going?` : /\b(work|job|career)\b/.test(lower) ? 'Tell me more about what you do. What do you enjoy most about it? 😊' : /\b(hobby|hobbies|love doing|free time)\b/.test(lower) ? 'That sounds interesting! I enjoy discovering new things too. What got you into that? 💛' : /\b(date|meet|coffee)\b/.test(lower) ? 'A relaxed coffee and a good conversation sounds lovely ☕ What kind of place do you like?' : /\b(sad|bad day|upset|stress)\b/.test(lower) ? "I'm sorry it's been a tough one. Want to tell me what happened? I'm listening 💛" : demoReplies[(count - 1) % demoReplies.length];
      window.setTimeout(() => setDemoMessages(current => [...current, { id: crypto.randomUUID(), match_id: demoChatPerson.id, sender_id: demoChatPerson.id, body: reply, created_at: new Date().toISOString(), demo: true }]), 850);
      return;
    }
    if (!supabase || !session || !activeMatchId) return;
    setTranslationPanel(null); setSpeechTranscript('');
    const { data: matchRow } = await supabase!.from('matches').select('user_one, user_two').eq('id', activeMatchId).maybeSingle();
    if (!matchRow || ![matchRow.user_one, matchRow.user_two].includes(session.user.id)) { setNotice('This conversation is no longer available.'); return; }
    const otherUserId = matchRow.user_one === session.user.id ? matchRow.user_two : matchRow.user_one;
    const { data: blockRows } = await supabase!.from('member_blocks').select('id').or(`and(blocker_id.eq.${session.user.id},blocked_user_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_user_id.eq.${session.user.id})`).limit(1);
    if (blockRows?.length) { setNotice('Messaging is unavailable because one of these accounts has blocked the other.'); return; }
    const { data, error } = await supabase!.from('messages').insert({ match_id: activeMatchId, sender_id: session.user.id, body, reply_to: replyTo?.id || null, expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }).select('id, match_id, sender_id, body, created_at, expires_at, reply_to, audio_path').single();
    if (error) {
      if (error.message?.includes('ACCOUNT_SUSPENDED_24H')) setNotice('Your account has been suspended for 24 hours. Contact the DateMe administrator.');
      else if (error.message?.includes('CONTACT_DETAILS_BLOCKED')) setNotice('Phone numbers and contact details are not allowed in DateMe chat, including numbers written as words.');
      else setNotice('Message could not be sent. Messaging is only available to matched members.');
      return;
    }
    if (data) {
      setMessages((current) => current.some((item) => item.id === data.id) ? current : [...current, data as Message]);
      if (data.body === '*********') setNotice('********* Your message contained blocked contact details or suspicious number/link patterns. It was replaced with asterisks. Repeated attempts may suspend your account for 24 hours. Contact the administrator if suspended.');
    }
    setMessageText(''); setReplyTo(null); setShowEmojiPicker(false);
  }

  function startSpeechTranslation(anchorMessage?: Message) {
    type RecognitionResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
    type RecognitionErrorEvent = { error?: string };
    type BrowserSpeechRecognition = {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      onresult: ((event: RecognitionResultEvent) => void) | null;
      onerror: ((event: RecognitionErrorEvent) => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
    };
    if (speechListening) { speechRecognitionRef.current?.stop(); setSpeechListening(false); return; }
    const targetBase = translationTarget.toLowerCase().replace('_', '-').split('-')[0];
    const sourceBase = speechSource.toLowerCase().replace('_', '-').split('-')[0];
    if (targetBase === sourceBase) {
      setNotice('Choose two different languages: the spoken language and the translation language must not be the same.');
      return;
    }
    const speechWindow = window as unknown as { SpeechRecognition?: new () => BrowserSpeechRecognition; webkitSpeechRecognition?: new () => BrowserSpeechRecognition };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setNotice('Live speech translation is not supported in this browser. Try the latest Chrome browser, or translate a text message instead.');
      return;
    }
    const recognition = new Recognition();
    recognition.lang = speechSource;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() || '';
      setSpeechListening(false);
      if (!transcript) { setNotice('No speech was detected. Please try speaking again.'); return; }
      setSpeechTranscript(transcript);
      void translateMessage(anchorMessage ? { ...anchorMessage, body: transcript } : { id: `speech-${Date.now()}`, match_id: activeMatchId, sender_id: session?.user.id || '', body: transcript, created_at: new Date().toISOString() }, translationTarget);
    };
    recognition.onerror = (event) => {
      setSpeechListening(false);
      setNotice(event.error === 'not-allowed' ? 'Allow microphone access to use Speak & Translate.' : 'Speech recognition could not hear that clearly. Try again or translate a text message.');
    };
    recognition.onend = () => setSpeechListening(false);
    speechRecognitionRef.current = recognition;
    setSpeechTranscript('');
    setNotice('Listening for speech to translate. Speak now; the text will be translated, not sent to your match.');
    try { recognition.start(); setSpeechListening(true); }
    catch { setSpeechListening(false); setNotice('Could not start speech recognition. Please try again.'); }
  }

  async function translateMessage(message: Message, target = translationTarget) {
    setTranslationPanel({ messageId: message.id, original: message.body, translated: '', sourceLanguage: '', loading: true, error: '' });
    try {
      const endpoint = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(message.body)}`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Translation service is temporarily unavailable.');
      const payload = await response.json() as unknown[];
      const segments = Array.isArray(payload[0]) ? payload[0] as unknown[][] : [];
      const translated = segments.map((segment) => typeof segment[0] === 'string' ? segment[0] : '').join('');
      const sourceLanguage = typeof payload[2] === 'string' ? payload[2] : '';
      const normalizeLanguage = (code: string) => code.toLowerCase().replace('_', '-').split('-')[0];
      if (sourceLanguage && normalizeLanguage(sourceLanguage) === normalizeLanguage(target)) {
        const languageName = translationLanguages.find((language) => language.code.toLowerCase() === target.toLowerCase())?.name || translationLanguages.find((language) => normalizeLanguage(language.code) === normalizeLanguage(sourceLanguage))?.name || 'the selected language';
        setTranslationPanel({ messageId: message.id, original: message.body, translated: '', sourceLanguage, loading: false, error: `This message is already in ${languageName}. Choose a different target language to translate it.` });
        return;
      }
      if (!translated) throw new Error('No translation was returned. Try again shortly.');
      setTranslationPanel({ messageId: message.id, original: message.body, translated, sourceLanguage, loading: false, error: '' });
    } catch (error) {
      setTranslationPanel({ messageId: message.id, original: message.body, translated: '', sourceLanguage: '', loading: false, error: error instanceof Error ? error.message : 'Translation is temporarily unavailable. Check your connection or try again.' });
    }
  }

  async function deleteMessage(message: Message, forEveryone: boolean) {
    if (!supabase || !session) return;
    if (forEveryone && message.sender_id !== session.user.id) return;
    const prompt = forEveryone ? 'Delete this message for everyone in this conversation?' : 'Delete this message from your chat only?';
    if (!window.confirm(prompt)) return;
    if (forEveryone) {
      const { error } = await supabase.from('messages').update({ body: 'This message was deleted', audio_path: null, deleted_at: new Date().toISOString(), deleted_by: session.user.id }).eq('id', message.id).eq('sender_id', session.user.id);
      if (error) { setNotice('Could not delete this message for everyone. Please try again.'); return; }
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, body: 'This message was deleted', audio_path: null, deleted_at: new Date().toISOString(), deleted_by: session.user.id } : item));
    } else {
      const { error } = await supabase.from('message_hidden_for').upsert({ message_id: message.id, user_id: session.user.id }, { onConflict: 'message_id,user_id' });
      if (error) { setNotice('Could not delete this message from your view. Please try again.'); return; }
      setHiddenMessageIds((current) => current.includes(message.id) ? current : [...current, message.id]);
      setMessages((current) => current.filter((item) => item.id !== message.id));
      if (translationPanel?.messageId === message.id) setTranslationPanel(null);
    }
    setNotice(forEveryone ? 'Message deleted for everyone.' : 'Message deleted from your chat.');
  }

  async function hasPaidMediaAccess(matchId = activeMatchId): Promise<boolean> {
    if (!supabase || !session || !matchId) return false;
    const { data, error } = await supabase.rpc('dateme_can_exchange_voice', { p_match_id: matchId });
    return !error && data === true;
  }

  async function startVoiceRecording() {
    if (recordingBusy || recording || voiceBlob) return;
    setRecordingBusy(true);
    if (!await hasPaidMediaAccess()) { setNotice('Voice notes require both you and your match to have active, verified one-year subscriptions.'); setRecordingBusy(false); return; }
    if (!navigator.mediaDevices?.getUserMedia || !('MediaRecorder' in window)) { setNotice('Voice recording is not supported in this browser. Try an updated browser with microphone permission.'); setRecordingBusy(false); return; }
    try {
      // Ask the browser/OS to suppress background noise, echo, and uneven microphone levels.
      // These are best-effort constraints: unsupported devices safely fall back to their defaults.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          channelCount: { ideal: 1 },
          sampleRate: { ideal: 48000 },
        },
      });
      // Prefer Opus where available for clearer speech at a small upload size.
      const preferredMimeTypes = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
      const preferredMimeType = preferredMimeTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorderOptions: MediaRecorderOptions = { audioBitsPerSecond: 96000 };
      if (preferredMimeType) recorderOptions.mimeType = preferredMimeType;
      const recorder = new MediaRecorder(stream, recorderOptions);
      recorderRef.current = recorder;
      recorderChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) recorderChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(recorderChunksRef.current, { type: mimeType });
        setVoiceBlob(blob);
        setVoicePreview(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setRecordingBusy(false);
        setNotice(blob.size ? 'Voice note ready. Press the red Send button to send it.' : 'No audio was captured. Please try recording again.');
      };
      recorder.start(250);
      setRecording(true);
      setRecordingBusy(false);
      setNotice('Recording voice note… tap the microphone again when you are finished.');
    } catch {
      setRecording(false);
      setRecordingBusy(false);
      setNotice('Microphone access was blocked. Allow microphone access in your browser settings and try again.');
    }
  }

  function stopVoiceRecording() {
    if (recorderRef.current?.state === 'recording') { setRecordingBusy(true); recorderRef.current.stop(); }
  }

  async function sendVoiceNote() {
    if (!supabase || !session || !activeMatchId || !voiceBlob || recordingBusy || sendingVoiceRef.current) return;
    sendingVoiceRef.current = true;
    setRecordingBusy(true);
    setNotice('');
    let uploadedPath: string | null = null;
    try {
      const { data: canSendVoice, error: accessError } = await supabase.rpc('dateme_can_exchange_voice', { p_match_id: activeMatchId });
      if (accessError) throw new Error(`Could not verify yearly voice-note eligibility: ${accessError.message}`);
      if (canSendVoice !== true) {
        setNotice('Voice notes require both you and your match to have active, verified one-year subscriptions.');
        return;
      }
      if (voiceBlob.size > 5 * 1024 * 1024) {
        setNotice('That voice note is too large. Please record a shorter note (maximum 5 MB).');
        return;
      }
      const { data: matchRow, error: matchError } = await supabase.from('matches').select('user_one, user_two').eq('id', activeMatchId).maybeSingle();
      if (matchError) throw new Error(`Could not verify this conversation: ${matchError.message}`);
      if (!matchRow || ![matchRow.user_one, matchRow.user_two].includes(session.user.id)) {
        setNotice('This conversation is no longer available.');
        return;
      }
      const otherUserId = matchRow.user_one === session.user.id ? matchRow.user_two : matchRow.user_one;
      const { data: blockRows, error: blockError } = await supabase.from('member_blocks').select('id').or(`and(blocker_id.eq.${session.user.id},blocked_user_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_user_id.eq.${session.user.id})`).limit(1);
      if (blockError) throw new Error(`Could not check chat permissions: ${blockError.message}`);
      if (blockRows?.length) {
        setNotice('Sending voice notes is unavailable because one of these accounts has blocked the other.');
        return;
      }

      const mimeType = (voiceBlob.type || 'audio/webm').split(';')[0].trim().toLowerCase();
      const allowedVoiceTypes = new Set(['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/aac', 'audio/x-m4a']);
      if (!allowedVoiceTypes.has(mimeType)) throw new Error(`This browser recorded ${mimeType || 'an unknown audio format'}, which the voice-note storage does not accept. Try Chrome on Android or another supported browser.`);
      const extension = mimeType.includes('mp4') || mimeType.includes('m4a') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mpeg') ? 'mp3' : mimeType.includes('wav') ? 'wav' : mimeType.includes('aac') ? 'aac' : 'webm';
      const path = `${activeMatchId}/${session.user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('dateme-voice-notes').upload(path, voiceBlob, { contentType: mimeType, upsert: false });
      if (uploadError) throw new Error(`Voice note upload failed: ${uploadError.message}. Check the voice-note storage bucket and permissions.`);
      uploadedPath = path;

      const { data, error } = await supabase.from('messages').insert({ match_id: activeMatchId, sender_id: session.user.id, body: '🎙️ Voice note', audio_path: path, reply_to: replyTo?.id || null, expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }).select('id, match_id, sender_id, body, created_at, expires_at, reply_to, audio_path').single();
      if (error) throw new Error(`Voice note uploaded but the chat message could not be saved: ${error.message}`);
      if (data) setMessages((current) => current.some((item) => item.id === data.id) ? current : [...current, data as Message]);
      if (voicePreview) URL.revokeObjectURL(voicePreview);
      setVoicePreview(null);
      setVoiceBlob(null);
      setReplyTo(null);
      setNotice('Voice note sent.');
    } catch (error) {
      if (uploadedPath && supabase) {
        await supabase.storage.from('dateme-voice-notes').remove([uploadedPath]).catch(() => undefined);
      }
      setNotice(error instanceof Error ? error.message : 'Could not send the voice note. Your recording is still available to retry.');
    } finally {
      sendingVoiceRef.current = false;
      setRecordingBusy(false);
    }
  }

  function openChat(match: Match) {
    setActiveMatchId(match.id);
    const otherId = match.user_one === session?.user.id ? match.user_two : match.user_one;
    setNotice('');
    setTab('matches');
    if (!profiles.some((profile) => profile.id === otherId) && supabase) {
      void supabase!.from('profiles').select('id, display_name, age, city, bio, photo_url').eq('id', otherId).maybeSingle()
        .then(({ data }) => { if (data) setProfiles((current) => [...current.filter((p) => p.id !== data.id), data as Profile]); });
    }
  }

  return (
    <div className={`app-shell theme-${theme}`}>
      <header className="topbar">
        <div className="brand-menu-wrap">
          <button className="brand-logo brand-logo-small logo-home-button" onClick={() => { navigateTo(session ? "discover" : "register"); setMenuOpen(false); window.scrollTo(0,0); }} aria-label="DateMe home"><DateMeLogo /></button>
          <button className="portal-toggle" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><span></span><span></span><span></span></button>
          {menuOpen && <nav className="portal-menu" aria-label="DateMe portals">
            <button onClick={() => { navigateTo(session ? 'discover' : 'register'); setMenuOpen(false); window.scrollTo({top:0,behavior:'smooth'}); }}>Main page</button>
            <button onClick={() => { navigateTo(session ? 'discover' : 'register'); setMenuOpen(false); window.scrollTo(0,0); }}>Discover / member portal</button>
            <button onClick={() => { navigateTo('plans'); setMenuOpen(false); window.scrollTo(0,0); }}>Subscription plans</button>
            <button onClick={() => { navigateTo('how'); setMenuOpen(false); window.scrollTo(0,0); }}>How DateMe works</button>
            <button onClick={() => { navigateTo('safety'); setMenuOpen(false); window.scrollTo(0,0); }}>Safety centre</button>
            <button onClick={() => { navigateTo('admin'); setMenuOpen(false); window.scrollTo(0,0); }}>Admin portal</button>
            <button onClick={() => { setTheme(theme === 'rose' ? 'navy' : theme === 'navy' ? 'green' : 'rose'); setMenuOpen(false); }}>Change theme: {theme === 'rose' ? 'Rose' : theme === 'navy' ? 'Navy' : 'Green'}</button>
            {!session && <button onClick={() => { navigateTo('register'); setMenuOpen(false); window.scrollTo({top:0,behavior:'smooth'}); }}>Register / sign in</button>}
          </nav>}
        </div>
        <nav className="top-links" aria-label="Main navigation"><button onClick={() => { navigateTo("how"); setMenuOpen(false); window.scrollTo(0,0); }}>How it works</button><button onClick={() => { navigateTo("safety"); setMenuOpen(false); window.scrollTo(0,0); }}>Your safety</button>{session && <button onClick={() => { navigateTo('plans'); setMenuOpen(false); }}>Membership</button>}</nav>
        <div className="global-page-actions" aria-label="Page controls"><button type="button" onClick={goBackPage} aria-label="Go back to previous page">← Back</button><button type="button" onClick={closePage} aria-label="Close this page and return to the main page">× Close</button></div>
        {session ? <button className="button button-outline top-action" onClick={() => void handleSignOut()}>Sign out</button> : <button className="button button-outline top-action" onClick={() => { navigateTo(session ? 'discover' : 'register'); setMode('signin'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Log in</button>}
      </header>
      <main>
        {page === 'register' && !session && <section className="hero registration-page">
          <div className="hero-copy">
            <span className="eyebrow"><span className="sparkle">✦</span> LESS SWIPING. MORE SPARK.</span>
            <h1>Your next chapter<br />starts <span>with a hello.</span></h1>
            <p className="hero-lede">Meet people who get you. Real connections, good conversations, and the kind of chemistry you can’t plan.</p>
            <div className="hero-points"><span><span className="point-icon">✓</span> Made for real connections</span><span><span className="point-icon">✓</span> You’re in control</span></div>
            <div className="hero-art" aria-hidden="true"><div className="art-orbit orbit-one"></div><div className="art-orbit orbit-two"></div><div className="art-heart">♥</div><span className="art-star star-one">✦</span><span className="art-star star-two">✧</span><span className="art-note note-one">your person is out there</span><span className="art-note note-two">start with a hello ♡</span></div>
          </div>
          <div className="auth-card" id="join">
            <div className="registration-logo"><DateMeLogo /></div>
            <div className="card-heading"><h2>{mode === 'signup' ? 'Create your DateMe account' : mode === 'forgot' ? 'Reset your password' : 'Welcome back'}</h2><p>{mode === 'signup' ? 'Your story starts with a few details.' : mode === 'forgot' ? 'We’ll email you a secure reset link.' : 'Your next chapter is waiting.'}</p></div>
            <div className="auth-switch" role="tablist" aria-label="Account type"><button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setNotice(''); }} role="tab" aria-selected={mode === 'signup'}>Create account</button><button className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setNotice(''); }} role="tab" aria-selected={mode === 'signin'}>Log in</button></div>
            <form onSubmit={handleAuth} className="auth-form" autoComplete="on">
              {mode === 'signup' && <><label>Full name<input autoComplete="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Enter your full name" required minLength={2} maxLength={100} /></label><label>Your age (18+)<input type="number" inputMode="numeric" min={18} max={120} value={signupAge} onChange={(e) => setSignupAge(e.target.value)} placeholder="18 or older" required /></label><label>Referral link or code (optional)<input autoComplete="off" value={referralInput} onChange={(e) => setReferralInput(e.target.value)} placeholder="Paste a DateMe referral link or code" aria-describedby="referral-help" /></label><small id="referral-help">Invited by a DateMe member? Paste their full link or referral code here.</small></>}
              <label>Email address<input type="email" autoComplete={mode === 'signup' ? 'email' : 'username'} name="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></label>
              <>{mode !== 'forgot' && <label>Password<div className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} required /><button className="password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? 'Hide' : 'Show'}</button></div></label>}
              <button className="button button-primary submit-button" type="submit" disabled={busy || checkingSession}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create my account' : mode === 'forgot' ? 'Send reset link' : 'Log in'} <span>→</span></button>
              {mode === 'signin' && <button className="forgot-password" type="button" onClick={() => { setMode('forgot'); setNotice(''); }}>Forgot password?</button>}
              {mode === 'forgot' && <button className="forgot-password" type="button" onClick={() => { setMode('signin'); setNotice(''); }}>Back to log in</button>}</>
              <p className="terms">By continuing, you agree to treat people with kindness and respect.</p>
            </form>
            {notice && <p className="notice" role="status">{notice}</p>}
            {!isSupabaseConfigured && <p className="setup-hint"><span>ⓘ</span> Preview mode: add your Supabase keys to enable real accounts.</p>}
          </div>
        </section>}

        {page === 'discover' && <section className="discover-section" id="discover">
          <div className="section-heading"><div><span className="eyebrow">GOOD PEOPLE, REAL POSSIBILITIES</span><h2>{session ? tab === 'matches' ? 'Your connections' : tab === 'profile' ? 'Your story, your way' : 'People you might like' : 'A little closer to your person'}</h2><p>Start with a smile. See where a conversation takes you.</p></div><span className="section-flower" aria-hidden="true">✳</span></div>
          {session && <div className="discover-search"><span>⌕</span><input aria-label="Search members" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search by name, city or interests…" /><button type="button" onClick={() => setSearchText('')}>Clear</button></div>}
          {session && tab !== 'profile' && <div className="discover-filter-row" aria-label="Profile filters">
            <label>City<input aria-label="Filter by city" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} placeholder="Any city" maxLength={80} /></label>
            <label>Minimum age<input aria-label="Minimum age" type="number" min={18} max={120} value={minAgeFilter} onChange={(e) => setMinAgeFilter(e.target.value)} placeholder="18" /></label>
            <label>Maximum age<input aria-label="Maximum age" type="number" min={18} max={120} value={maxAgeFilter} onChange={(e) => setMaxAgeFilter(e.target.value)} placeholder="120" /></label>
            <button type="button" onClick={() => { setCityFilter(''); setMinAgeFilter(''); setMaxAgeFilter(''); setSearchText(''); }}>Clear filters</button>
            {ageFilterError && <p className="filter-validation" role="alert">{ageFilterError}</p>}
          </div>}
          {session && tab !== 'profile' && !ageFilterError && <p className="filter-result-count" role="status">Showing {visibleProfiles.length} {visibleProfiles.length === 1 ? 'profile' : 'profiles'}{tab === 'likes' ? ' you liked' : ''}.</p>}
          {session && <div className="member-bar"><span>Signed in as <strong>{session.user.email}</strong></span><div className="member-tabs">
            <button className={tab === 'discover' ? 'selected' : ''} onClick={() => { setTab('discover'); setActiveMatchId(''); }}>Discover</button>
            <button className={tab === 'likes' ? 'selected' : ''} onClick={() => { setTab('likes'); setActiveMatchId(''); }}>Likes ({liked.length})</button>
            <button className={tab === 'matches' ? 'selected' : ''} onClick={() => setTab('matches')}>Matches ({matches.length})</button>
            <button className={tab === 'profile' ? 'selected' : ''} onClick={() => { setTab('profile'); setActiveMatchId(''); }}>My profile</button>
          </div></div>}

          {session && tab === 'profile' && <section className="profile-editor affiliate-panel">
            <div className="editor-fields">
              <h2>Your safety controls</h2>
              <p>Manage members you have blocked. Unblocking allows their profile to appear in discovery again; it does not automatically restore a match or conversation.</p>
              <div className="blocked-member-list">
                {blockedIds.length === 0 ? <p>No members blocked.</p> : blockedIds.map((blockedUserId) => {
                  const blockedPerson = profiles.find((profile) => profile.id === blockedUserId);
                  return <div className="report-row" key={blockedUserId}>
                    <strong>{blockedPerson?.display_name || 'Blocked member'}</strong>
                    <small>{blockedPerson?.city || 'Member profile'}</small>
                    <button className="button button-outline" type="button" onClick={() => void unblockMember(blockedUserId)}>Unblock</button>
                  </div>;
                })}
              </div>
              <h2>Your affiliate link</h2>
              <p>Invite people to DateMe with your personal referral link. This promotion is being rolled out; rewards and unlimited-chat eligibility are subject to the activity and subscription rules.</p>
              {affiliateCode ? <><label>Your personal link<input readOnly value={`${window.location.origin}/?ref=${affiliateCode}`} /></label><button className="button button-primary" type="button" onClick={() => { void navigator.clipboard?.writeText(`${window.location.origin}/?ref=${affiliateCode}`).then(() => setNotice('Your affiliate link has been copied.')).catch(() => setNotice('Copy failed. Please copy the link manually.')); }}>Copy my affiliate link</button><p>Referral code: <strong>{affiliateCode}</strong></p></> : <p>Generating your personal referral link…</p>}
              <h3>Your referrals ({affiliateReferrals.length})</h3>
              {affiliateReferrals.length === 0 ? <p>No referrals yet. Share your link to invite your first member.</p> : affiliateReferrals.map((referral) => <div className="report-row" key={referral.id}><strong>{referral.status}</strong><span>{referral.qualifying_minutes_today || 0} qualifying minutes today</span><small>Joined {new Date(referral.created_at).toLocaleDateString()}</small>{referral.promo_ends_at && <small>Promotion ends {new Date(referral.promo_ends_at).toLocaleString()}</small>}</div>)}
              <p>Qualifying chat activity today: {Math.floor(affiliateActivitySeconds / 60)} minutes / 120 minutes. Activity is counted only while you are signed in, the app is visible, and a matched conversation is open.</p>
            </div>
          </section>}
          {session && tab === 'profile' && myProfile && <form className="profile-editor" onSubmit={saveProfile}>
            <div className="editor-photo-column"><div className="editor-photo">{myProfile.photo_url ? <img src={myProfile.photo_url} alt="Your profile" /> : <span>♡</span>}</div><label className="photo-upload-label">Upload photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const file = e.target.files?.[0] || null; setPhotoFile(file); setNotice(file ? `Selected ${file.name}. Save your profile to upload it.` : ''); }} /><small>JPG, PNG or WebP · max 5 MB</small></label></div>
            <div className="editor-fields">
              <section className="profile-completion-card" aria-label="Profile completion">
                <div className="profile-completion-heading"><div><span className="eyebrow">MAKE A GREAT FIRST IMPRESSION</span><h3>Profile strength</h3></div><strong>{profileCompletion.score}%</strong></div>
                <div className="profile-completion-track" role="progressbar" aria-label="Profile completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={profileCompletion.score}><span style={{ width: profileCompletion.score + '%' }} /></div>
                <p>{profileCompletion.score === 100 ? 'Lovely — your profile gives people plenty to start a conversation with.' : 'Profiles with a few personal details give matches more reasons to say hello.'}</p>
                <div className="profile-completion-checks">{profileCompletion.completed.map((item) => <span className="completion-done" key={item}>✓ {item}</span>)}{profileCompletion.missing.map((item) => <span className="completion-missing" key={item}>＋ {item}</span>)}</div>
              </section>
              <label>Display name<input required minLength={2} maxLength={60} value={myProfile.display_name} onChange={(e) => setMyProfile({ ...myProfile, display_name: e.target.value })} placeholder="Your name" /></label>
              <label>Age (18+)<input type="number" min={18} max={120} value={myProfile.age ?? ''} onChange={(e) => setMyProfile({ ...myProfile, age: e.target.value ? Number(e.target.value) : null })} placeholder="Your age" required /></label>
              <label>City<input maxLength={100} value={myProfile.city || ''} onChange={(e) => setMyProfile({ ...myProfile, city: e.target.value })} placeholder="e.g. Johannesburg" /></label>
              <label>Photo URL<input type="url" value={myProfile.photo_url || ''} onChange={(e) => setMyProfile({ ...myProfile, photo_url: e.target.value })} placeholder="https://…" /></label>
              <label className="editor-bio">About you<textarea maxLength={500} rows={4} value={myProfile.bio || ''} onChange={(e) => setMyProfile({ ...myProfile, bio: e.target.value })} placeholder="What do you love? What makes you, you?" /><span>{(myProfile.bio || '').length}/500</span></label>
              <label>What are you looking for?<select value={myProfile.looking_for || ''} onChange={(e) => setMyProfile({ ...myProfile, looking_for: e.target.value })}><option value="">Choose what feels right</option><option>Long-term relationship</option><option>Dating and seeing where it goes</option><option>Friendship first</option><option>Marriage-minded</option><option>Not sure yet</option></select></label>
              <label>Interests <input value={(myProfile.interests || []).join(', ')} onChange={(e) => setMyProfile({ ...myProfile, interests: e.target.value.split(',').map((v) => v.trim()).filter(Boolean).slice(0, 12) })} placeholder="Music, hiking, cooking (comma separated)" /></label>
              <label>Languages <input value={(myProfile.languages || []).join(', ')} onChange={(e) => setMyProfile({ ...myProfile, languages: e.target.value.split(',').map((v) => v.trim()).filter(Boolean).slice(0, 8) })} placeholder="English, isiZulu, Afrikaans…" /></label>
              <label>Profile prompt question<input maxLength={160} value={myProfile.prompt_question || ''} onChange={(e) => setMyProfile({ ...myProfile, prompt_question: e.target.value })} placeholder="A perfect Sunday looks like…" /></label>
              <div className="prompt-idea-panel"><strong>Need a prompt idea?</strong><p>Choose one to add it to your profile, then write your own answer.</p><div className="prompt-idea-buttons">{['A small thing that makes me happy…','My ideal first date would be…','I could talk for hours about…','The green flag I appreciate most…','A weekend well spent looks like…','One thing I want to try this year…'].map((prompt) => <button type="button" key={prompt} onClick={() => setMyProfile({ ...myProfile, prompt_question: prompt })}>{prompt}</button>)}</div></div>
              <label>Prompt answer<textarea maxLength={300} rows={2} value={myProfile.prompt_answer || ''} onChange={(e) => setMyProfile({ ...myProfile, prompt_answer: e.target.value })} placeholder="Give someone an easy conversation starter" /></label>
              <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save my profile'}</button>
            </div>
            <section className="profile-gallery"><div className="gallery-heading"><div><h3>Your profile gallery</h3><p>Other members can view these photos and videos on your profile. Older media than 30 days is cleaned up when your gallery loads, while keeping at least your five newest items.</p></div><span className="gallery-count">{memberMedia.length} items</span></div><div className="gallery-limits"><span>Photos: {memberMedia.filter((item) => item.media_type === 'photo').length} / {mediaLimits.photos}</span><span>Videos: {memberMedia.filter((item) => item.media_type === 'video').length} / {mediaLimits.videos}</span></div><label className="gallery-upload">＋ Add photos or videos<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" multiple disabled={galleryBusy} onChange={(event) => { void uploadGalleryFiles(event.target.files); event.currentTarget.value = ''; }} /><small>Photos up to 5 MB · videos up to 25 MB · limits depend on your active plan</small></label>{memberMedia.length ? <div className="profile-gallery-grid">{memberMedia.map((item) => <article className="gallery-item" key={item.id}>{item.media_type === 'video' ? <video controls preload="metadata" src={item.public_url} /> : <img src={item.public_url} alt="Profile gallery item" loading="lazy" />}<span>{item.media_type === 'video' ? 'VIDEO' : 'PHOTO'}</span><button type="button" onClick={() => void removeGalleryItem(item)} aria-label="Remove gallery item">×</button></article>)}</div> : <p className="gallery-empty">Your gallery is empty. Add a few photos so matches can get to know you.</p>}</section>
          </form>}

          {session && tab === 'matches' && <div className={activeMatchId ? 'match-layout chat-open' : 'match-layout'}>
            <aside className="match-list"><h3>Your matches</h3>{matches.length === 0 ? <p className="muted-copy">When you and another member like each other, your match will appear here.</p> : matches.map((match) => {
              const otherId = match.user_one === session.user.id ? match.user_two : match.user_one;
              const person = profiles.find((p) => p.id === otherId);
              return <div key={match.id} className={activeMatchId === match.id ? 'match-row active' : 'match-row'}><button type="button" className="match-avatar match-avatar-open" aria-label={`View ${person?.display_name || 'match'} photos`} onClick={() => { setGalleryProfile(person || null); setExpandedGalleryPhoto(null); }} >{person?.photo_url ? <img src={person.photo_url} alt="" /> : '♡'}</button><button type="button" className="match-row-details" onClick={() => openChat(match)}><strong>{person?.display_name || 'Your match'}</strong><small>{person?.city || 'Say hello'}</small><small className="match-row-stats">♥ {likeCounts[otherId] ?? 0} likes · {publicMedia.filter((item) => item.user_id === otherId && item.media_type === 'photo').length} photos</small></button><button type="button" className="match-envelope" aria-label={`Open chat with ${person?.display_name || 'match'}`} title="Open chat" onClick={() => openChat(match)}><span>✉</span></button></div>;
            })}</aside>
            <section className="chat-panel">{activeMatch ? <>
              <div className="chat-heading"><button type="button" className="chat-back-button" aria-label="Back to matches" onClick={() => { setActiveMatchId(''); setReplyTo(null); setTranslationPanel(null); }}>←</button><span className="match-avatar">{activePerson?.photo_url ? <img src={activePerson.photo_url} alt="" /> : '♡'}</span><div className="chat-heading-person"><strong>{activePerson?.display_name || 'Your match'}</strong><small>● Private conversation · messages expire after 24 hours</small></div><button type="button" className="chat-header-more" title="Close conversation" onClick={() => { setActiveMatchId(''); setReplyTo(null); setTranslationPanel(null); }}>×</button></div>
              <div className="chat-tools-note">🔒 Private chat · messages expire after 24 hours</div>
              <div className="chat-messages">{messages.filter((m) => !m.expires_at || new Date(m.expires_at).getTime() > Date.now()).length === 0 ? <div className="chat-empty-state"><p className="chat-empty">Every great conversation starts somewhere. Say hello 👋</p><div className="chat-icebreakers"><strong>Try an easy opener</strong>{[activePerson?.interests?.[0] ? `I noticed you like ${activePerson.interests[0].toLowerCase()} — how did you get into it?` : 'What is something that made you smile this week?', activePerson?.prompt_question ? `I liked your profile prompt: “${activePerson.prompt_question}”` : 'What would your ideal relaxed weekend look like?', activePerson?.city ? `What do you enjoy most about living in ${activePerson.city}?` : 'What is a place you would love to visit?'].map((starter) => <button type="button" key={starter} onClick={() => setMessageText(starter)}>{starter} <span>Use opener ↗</span></button>)}</div></div> : messages.filter((m) => !m.expires_at || new Date(m.expires_at).getTime() > Date.now()).map((message) => { const mine = message.sender_id === session.user.id; const receipt = messageReceipts[message.id]; return <div key={message.id} className={mine ? 'message-bubble mine' : 'message-bubble'}>{message.reply_to && <p className="reply-reference">↶ Replying to an earlier message</p>}{message.deleted_at ? <p className="deleted-message">{message.body || 'This message was deleted'}</p> : message.audio_path && supabase ? <audio controls preload="none" src={voiceUrls[message.id] || undefined} /> : <p>{message.body}</p>}<time>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{mine && !message.deleted_at && <span className={receipt?.read_at ? 'message-status read' : receipt?.delivered_at ? 'message-status delivered' : 'message-status sent'} title={receipt?.read_at ? 'Read' : receipt?.delivered_at ? 'Delivered' : 'Sent'} aria-label={receipt?.read_at ? 'Read' : receipt?.delivered_at ? 'Delivered' : 'Sent'}>{receipt?.read_at ? '●' : receipt?.delivered_at ? '●' : '·'}</span>} {!message.deleted_at && ' · disappears in 24h'}</time>{translationPanel?.messageId === message.id && <aside className="translation-panel message-translation-panel" aria-live="polite"><div className="translation-panel-title"><strong>Translation</strong>{translationPanel.sourceLanguage && <small>Detected: {translationPanel.sourceLanguage.toUpperCase()}</small>}<button type="button" onClick={() => setTranslationPanel(null)} aria-label="Close translation">×</button></div><p className="translation-original"><small>Original</small>{translationPanel.original}</p><p className="translation-result"><small>Translated</small>{translationPanel.loading ? 'Translating…' : translationPanel.error || translationPanel.translated}</p></aside>}<details className="message-menu message-menu-below"><summary aria-label="Message options" title="Message options">⋮</summary><div className="message-menu-content"><div className="message-actions"><button type="button" disabled={Boolean(message.deleted_at)} onClick={() => { setReplyTo(message); setMessageText(''); }}>↶ Reply</button><button type="button" disabled={Boolean(message.deleted_at)} onClick={() => { void navigator.clipboard?.writeText(message.body).then(() => setNotice('Message copied.')).catch(() => setNotice('Copy was blocked by your browser.')); }}>Copy</button><button type="button" disabled={Boolean(message.deleted_at) || Boolean(message.audio_path)} onClick={() => void translateMessage(message)}>Translate</button><button type="button" onClick={() => void deleteMessage(message, false)}>Delete for me</button>{mine && !message.deleted_at && <button type="button" onClick={() => void deleteMessage(message, true)}>Delete for everyone</button>}{!mine && session && profiles.some((profile) => profile.id === message.sender_id) && <><button type="button" onClick={() => { const person = profiles.find((profile) => profile.id === message.sender_id); if (person) void reportMember(person); }}>⚑ Report member</button><button type="button" onClick={() => { const person = profiles.find((profile) => profile.id === message.sender_id); if (person) void blockMember(person); }}>⊘ Block member</button></>}</div>{!message.deleted_at && !message.audio_path && <div className="translation-menu-controls"><p>Translate this message</p><label>I'm speaking<select aria-label="Choose spoken language" value={speechSource} onChange={(event) => setSpeechSource(event.target.value)}>{translationLanguages.map((language) => <option key={language.code} value={language.speech}>{language.name}</option>)}</select></label><label>Translate into<select aria-label="Choose translation target language" value={translationTarget} onChange={(event) => { setTranslationTarget(event.target.value); if (translationPanel?.messageId === message.id) void translateMessage(message, event.target.value); }}>{translationLanguages.map((language) => <option key={language.code} value={language.code}>{language.name}</option>)}</select></label><button type="button" className="translation-action-button" onClick={() => void translateMessage(message)}>Translate message</button><button type="button" className="translation-action-button speech-translate-button" onClick={() => startSpeechTranslation(message)}>{speechListening ? '■ Stop listening' : '🎤 Speak & translate'}</button>{speechTranscript && translationPanel?.messageId === message.id && <p className="speech-transcript"><strong>You said:</strong> {speechTranscript}</p>}</div>}</div></details></div>; })}</div>
              {replyTo && <div className="reply-composer"><span>↶ Replying to: {replyTo.body.slice(0, 90)}</span><button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply">×</button></div>}
              {(voicePreview || recording) && <div className="voice-preview">{recording && <span className="recording-status" role="status">● Recording… tap the microphone to finish</span>}{voicePreview && <audio controls src={voicePreview} />}<button type="button" onClick={() => { if (recording) stopVoiceRecording(); if (voicePreview) URL.revokeObjectURL(voicePreview); setVoicePreview(null); setVoiceBlob(null); setNotice('Voice note discarded.'); }} disabled={recordingBusy}>Discard</button></div>}
              {showEmojiPicker && <div className="emoji-picker" aria-label="Emoji picker">{['😀','😂','🥰','😍','😘','😊','😉','❤️','💕','💖','🔥','👏','👍','🙏','🌹','✨','😢','😅','🤗','💋'].map((emoji) => <button type="button" key={emoji} onClick={() => setMessageText((text) => text + emoji)}>{emoji}</button>)}</div>}
              <form className="chat-compose" onSubmit={(event) => { event.preventDefault(); if (voiceBlob) { void sendVoiceNote(); } else { void sendMessage(event); } }}><button type="button" className="chat-tool-button" aria-label="Choose emoji" title="Emoji" onClick={() => setShowEmojiPicker((show) => !show)}>☺</button><input value={messageText} onChange={(e) => setMessageText(e.target.value)} maxLength={2000} placeholder={replyTo ? 'Write a reply…' : 'Write a kind message…'} aria-label="Message" /><button type="button" className={`chat-tool-button voice-record-button ${recording ? 'is-recording' : ''}`} aria-label={recording ? 'Finish voice recording' : 'Record voice note — tap again to finish'} onClick={recording ? stopVoiceRecording : () => void startVoiceRecording()} disabled={recordingBusy || Boolean(voiceBlob)} title={recording ? 'Tap again to finish recording' : voiceBlob ? 'Voice note ready — press Send' : voiceAccess ? 'Tap to record; both matched members must have active yearly subscriptions' : 'Tap to check yearly-subscription eligibility and microphone access'}>{recording ? '■' : '🎙'}</button><button className="button button-primary" type="submit" onClick={(event) => { if (voiceBlob) { event.preventDefault(); void sendVoiceNote(); } }} disabled={recordingBusy || recording || (!voiceBlob && !messageText.trim())}>Send ↗</button></form>
            </> : <div className="chat-placeholder"><span>♡</span><h3>A little hello goes a long way.</h3><p>Choose a match to start your conversation.</p></div>}</section>
          </div>}

          {(tab === 'discover' || tab === 'likes' || !session) && (visibleProfiles.length ? <div className="profile-grid">
            {visibleProfiles.map((profile, index) => <article className="person-card" key={profile.id}>
              <div className="person-photo-wrap">{profile.photo_url ? <img className="person-photo" src={profile.photo_url} alt={`${profile.display_name}'s profile`} loading="eager" decoding="async" /> : <div className="photo-placeholder">♡</div>}<span className="profile-number">{String(index + 1).padStart(2, '0')}</span>{profile.id.startsWith('ai-') && <span className="profile-number" style={{left:'auto',right:'12px',top:'12px'}}>AI DEMO</span>}<span className="profile-like-count" aria-label={profile.id.startsWith('ai-') ? `${demoLikeCounts[profile.id] || 0} simulated likes` : `${likeCounts[profile.id] ?? 0} likes`}>♥ {profile.id.startsWith('ai-') ? demoLikeCounts[profile.id] || 0 : likeCounts[profile.id] ?? 0}{profile.id.startsWith('ai-') ? ' demo' : ''}</span><button className={liked.includes(profile.id) ? 'like-button liked' : 'like-button'} onClick={() => void handleLike(profile)} aria-label={`Like ${profile.display_name}`}>{liked.includes(profile.id) ? '♥' : '♡'}</button></div>
              <div className="person-info"><h3>{profile.display_name}{profile.age ? <span>, {profile.age}</span> : null}</h3><p className="person-city"><span>⌖</span> {profile.city || 'Location not set'}</p><p className="person-bio">{profile.bio || 'A little mystery makes the first hello more fun.'}</p>{profile.prompt_question && <div className="profile-prompt"><small>{profile.prompt_question}</small><p>{profile.prompt_answer}</p></div>}{profile.interests?.length ? <div className="interest-chips">{profile.interests.slice(0,5).map((interest) => <span key={interest}>{interest}</span>)}</div> : null}{session && myProfile && profile.interests?.length && myProfile.interests?.length && profile.interests.some((interest) => myProfile.interests!.some((mine) => mine.trim().toLowerCase() === interest.trim().toLowerCase())) ? <div className="shared-interest-note"><span>✦</span><strong>You have things in common:</strong> {profile.interests.filter((interest) => myProfile.interests!.some((mine) => mine.trim().toLowerCase() === interest.trim().toLowerCase())).slice(0,3).join(', ')}</div> : null}{profile.looking_for && <p className="looking-for">♡ {profile.looking_for}</p>}{publicMedia.some((item) => item.user_id === profile.id) && <div className="member-mini-gallery" aria-label={`${profile.display_name}'s profile gallery`}>{publicMedia.filter((item) => item.user_id === profile.id).slice(0,4).map((item) => item.media_type === 'video' ? <video key={item.id} controls preload="metadata" src={item.public_url} aria-label={`${profile.display_name}'s video`} /> : <img key={item.id} src={item.public_url} alt={`${profile.display_name}'s gallery photo`} loading="lazy" />)}</div>}<button className="say-hello" onClick={() => profile.id.startsWith('ai-') ? (setDemoChatPerson(profile), setDemoMessages([{ id: 'welcome-' + profile.id, match_id: profile.id, sender_id: profile.id, body: `Hi! I'm ${profile.display_name}. 😊 What would you like to talk about today?`, created_at: new Date().toISOString(), demo: true }]), setDemoReplyCount(0), setMessageText('')) : void handleLike(profile)}>{profile.id.startsWith('ai-') ? 'Open AI chat' : liked.includes(profile.id) ? 'Liked' : 'Say hello'} <span>↗</span></button></div>
            </article>)}
          </div> : <div className="empty-state"><span>♡</span><h3>{tab === 'likes' ? 'No likes match these filters' : 'No profiles match yet'}</h3><p>{tab === 'likes' ? 'Try clearing your filters, or explore people and tap the heart on someone who catches your eye.' : 'Try widening the age range, changing the city, or clearing your search filters. New member profiles will show up here as people join DateMe.'}</p><button className="button button-primary" onClick={() => { setCityFilter(''); setMinAgeFilter(''); setMaxAgeFilter(''); setSearchText(''); if (tab === 'likes') setTab('discover'); }}>Clear filters and discover</button></div>)}
          {!session && <div className="ai-demo-entry"><h3>Try a conversation</h3><p>Choose a simulated profile to test the chat. These are automated demos, not real members.</p><div className="ai-demo-buttons">{aiProfiles.map(person => <button key={person.id} className="button button-outline" onClick={() => { setDemoChatPerson(person); setDemoMessages([{ id: 'welcome-' + person.id, match_id: person.id, sender_id: person.id, body: person.display_name === 'Sarah' ? 'Hi! 😊 I’m Sarah. What’s something that always makes your day better?' : 'Hey there! 👋 What do you enjoy doing on weekends?', created_at: new Date().toISOString(), demo: true }]); setDemoReplyCount(0); setMessageText(''); navigateTo('discover'); setTab('discover'); window.scrollTo(0,0); }}>Chat with {person.display_name} · Demo</button>)}</div></div>}
          {demoChatPerson && <section className="demo-chat-panel"><div className="chat-heading"><span className="match-avatar">{demoChatPerson.photo_url ? <img src={demoChatPerson.photo_url} alt="" /> : '♡'}</span><div><strong>{demoChatPerson.display_name} · AI demo</strong><small>Automated practice chat — not a real member</small></div><button className="button button-outline" onClick={() => { setDemoChatPerson(null); setDemoMessages([]); }}>Close</button></div><div className="chat-tools-note">🔒 Simulated chat · contact details are blocked</div><div className="chat-messages">{demoMessages.map(message => <div key={message.id} className={message.sender_id === 'demo-you' ? 'message-bubble mine' : 'message-bubble'}><p>{message.body}</p><time>{new Date(message.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time></div>)}</div><form className="chat-compose" onSubmit={sendMessage}><input value={messageText} onChange={e => setMessageText(e.target.value)} maxLength={2000} placeholder="Try saying hello…" aria-label="Demo chat message" /><button className="button button-primary" type="submit" disabled={!messageText.trim()}>Send ↗</button></form></section>}
          {!session && <p className="demo-caption">Demo profiles and simulated chats are examples only, not real members. Create an account to connect with real members.</p>}
          {notice && session && <p className="notice member-notice" role="status">{notice}</p>}
        </section>}

        {page === 'plans' && <section className="portal-page membership-section" id="membership-plans"><div className="portal-page-actions"><button onClick={goBackPage}>← Back</button><button onClick={closePage}>× Close</button></div><span className="eyebrow">YOUR JOURNEY, YOUR PACE</span><h2>Membership <span>plans.</span></h2><p>Choose a subscription period and pay securely with cryptocurrency or OneVoucher. Paid features unlock only after the payment provider confirms your payment.</p>{session && <p>Your current status: <strong>{subscriptionInfo?.status || 'free'}</strong> · Plan: <strong>{subscriptionInfo?.plan_code || 'free'}</strong>{subscriptionInfo?.ends_at ? ` · Ends ${new Date(subscriptionInfo.ends_at).toLocaleDateString()}` : ''} <button type="button" onClick={() => void refreshSubscriptionStatus()}>Refresh status</button></p>}<div className="plan-periods">{[{id:'week',label:'Per Week',period:'7 days'},{id:'month',label:'Per Month',period:'1 month'},{id:'quarter',label:'3 Months',period:'3 months'},{id:'half',label:'6 Months',period:'6 months'},{id:'year',label:'1 Year',period:'12 months'}].map(plan => <button key={plan.id} className={selectedPlan===plan.id?'plan-period selected':'plan-period'} onClick={() => { setSelectedPlan(plan.id); setSubscriptionPortalOpen(true); setCheckoutMessage(''); setVoucherPin(''); if (!Object.keys(subscriptionPrices).length) void loadSubscriptionPrices(); }}>{plan.label}<small>{plan.period}</small></button>)}</div>{subscriptionPortalOpen ? <div className="plan-detail subscription-plan-detail"><div className="portal-page-actions"><button type="button" onClick={() => setSubscriptionPortalOpen(false)}>← Back to plans</button><button type="button" onClick={closePage}>× Close</button></div><span className="draft-label">SECURE MEMBERSHIP CHECKOUT</span><h3>{{week:'Per Week · 7 days',month:'Per Month',quarter:'3 Months',half:'6 Months',year:'1 Year · 12 months'}[selectedPlan]}</h3><p>{(() => { const code = ({week:'week',month:'month',quarter:'three_months',half:'six_months',year:'yearly'} as Record<string,string>)[selectedPlan]; const price = subscriptionPrices[code]; const amount = paymentMethod==='nowpayments' ? price?.price_usd : price?.price_zar; const currency = paymentMethod==='nowpayments' ? 'USD' : 'ZAR'; return price?.enabled && amount != null && Number(amount)>0 ? `Price: ${new Intl.NumberFormat(paymentMethod==='nowpayments' ? 'en-US' : 'en-ZA',{style:'currency',currency}).format(Number(amount))}` : 'Price is being configured. Checkout will remain unavailable until this plan has an official price.'; })()} Do not send payment to anyone outside this checkout.</p><div className="subscription-promo"><h4>Choose payment method</h4><div className="subscription-preferences plan-preference-controls"><label><input type="radio" name="payment-method" value="nowpayments" checked={paymentMethod==='nowpayments'} onChange={() => { setPaymentMethod('nowpayments'); setCheckoutMessage(''); }} /> Cryptocurrency · NOWPayments</label><label><input type="radio" name="payment-method" value="kora_1voucher" checked={paymentMethod==='kora_1voucher'} onChange={() => { setPaymentMethod('kora_1voucher'); setCheckoutMessage(''); }} /> OneVoucher · South African rand (ZAR)</label></div>{paymentMethod==='kora_1voucher' && <div className="subscription-preferences plan-preference-controls"><label htmlFor="voucher-pin">OneVoucher PIN</label><input id="voucher-pin" type="password" inputMode="numeric" autoComplete="off" maxLength={19} value={voucherPin} onChange={e => setVoucherPin(e.target.value.replace(/[^0-9 ]/g, '').slice(0,19))} placeholder="Enter your 16-digit PIN" /><label htmlFor="voucher-phone">Mobile number used for the voucher</label><input id="voucher-phone" type="tel" autoComplete="tel" value={voucherPhone} onChange={e => setVoucherPhone(e.target.value)} placeholder="+27XXXXXXXXX" /><p>Your voucher PIN is sent directly to the payment provider for processing and is not saved in DateMe payment records.</p></div>}</div><div className="subscription-feature-catalog"><h4>What you get with this plan</h4><p className="catalog-intro">Green checks mean included. Red stars mean locked or not included in this tier. Video calling remains unavailable until in-app calling is implemented.</p>{[{label:'Create and edit your profile',active:true},{label:'Discover members and send likes',active:true},{label:'Matched text conversations',active:true},{label:`Upload up to ${({week:4,month:8,quarter:15,half:25,year:50} as Record<string,number>)[selectedPlan]} profile photos`,active:true},{label:`Upload up to ${({week:0,month:1,quarter:3,half:10,year:20} as Record<string,number>)[selectedPlan]} profile videos`,active:selectedPlan!=='week'},{label:'Voice notes in chat',active:selectedPlan==='year' || isAdmin},{label:'Video calling (not yet available; yearly plan only when launched)',active:false},{label:'Automatic media cleanup after 30 days',active:true}].map((feature) => <div className="catalog-feature" key={feature.label}><span className={feature.active ? 'catalog-status active' : 'catalog-status locked'}>{feature.active ? '✓' : '★'}</span><span>{feature.label}</span></div>)}</div><h4>Your preferences for this plan</h4><p>Save which proposed features matter most to you. These preferences do not activate paid features.</p><div className="subscription-preferences plan-preference-controls">
<label><input type="checkbox" checked={(planPreferences[selectedPlan] || []).includes('text-chat')} onChange={() => togglePlanPreference(selectedPlan, 'text-chat')} /> Text chat (proposed)</label>
<label><input type="checkbox" checked={(planPreferences[selectedPlan] || []).includes('photo-sharing')} onChange={() => togglePlanPreference(selectedPlan, 'photo-sharing')} disabled={selectedPlan==='week'} /> Photo sharing {selectedPlan==='week' ? '(not proposed for this tier)' : '(proposed)'}</label>
<label><input type="checkbox" checked={(planPreferences[selectedPlan] || []).includes('voice-calls')} onChange={() => togglePlanPreference(selectedPlan, 'voice-calls')} disabled={selectedPlan!=='year'} /> Voice calls {selectedPlan==='year' ? '(yearly plan only; feature not yet available)' : '(yearly plan only)'}</label>
<label><input type="checkbox" checked={(planPreferences[selectedPlan] || []).includes('video-calls')} onChange={() => togglePlanPreference(selectedPlan, 'video-calls')} disabled={selectedPlan!=='year'} /> Video calls {selectedPlan==='year' ? '(yearly plan only; feature not yet available)' : '(yearly plan only)'}</label>
<p className="preference-save-note" role="status">{(planPreferences[selectedPlan] || []).length} preferences selected · {session ? 'account sync enabled' : 'saved on this device'}</p>
</div><h4>Included with this plan</h4><ul><li>Create and edit your dating profile</li><li>Discover member profiles and send likes</li><li>Report and block inappropriate behaviour</li><li>Profile gallery with plan-specific media limits</li><li>Chat messages expire after 24 hours</li></ul>{session ? <button className="button button-primary" type="button" onClick={() => void submitSubscriptionRequest()} disabled={subscriptionSubmitting}>{subscriptionSubmitting ? 'Connecting securely…' : paymentMethod==='nowpayments' ? 'Continue to crypto checkout' : 'Pay with OneVoucher'}</button> : <p>Sign in to purchase a subscription.</p>}{checkoutMessage && <p className="notice member-notice" role="status">{checkoutMessage}</p>}<p>Payment confirmation is handled server-side. A browser redirect alone never unlocks paid features. If your payment is processing, use “Refresh status” after the provider confirms it.</p></div> : <div className="plan-detail"><h3>Choose a subscription period</h3><p>Select a plan above to review its proposed benefits and choose your payment method. All five periods support cryptocurrency and OneVoucher when pricing and merchant configuration are complete.</p></div>}</section>}
        {page === 'admin' && <section className="portal-page membership-section"><div className="portal-page-actions"><button onClick={goBackPage}>← Back</button><button onClick={closePage}>× Close</button></div><span className="eyebrow">OWNER ACCESS</span><h2>Administrator <span>portal.</span></h2>{isAdmin ? <div className="plan-detail"><h3>Admin access verified</h3><p>Signed in as {session?.user.email}. The secure admin area is reserved for accounts granted access in the database.</p><p>Review member reports, contact-sharing violations, strike history, and 24-hour suspensions below. Messages containing detected contact details are stored as asterisks for other members; the restricted safety log preserves the original message for administrator review.</p><div className="admin-report-list"><h3>Subscription pricing</h3><p>Set both the South African rand price for OneVoucher and the USD price for crypto checkout. A plan can only be enabled when both prices are set. No default prices have been invented.</p>{adminPlanPrices.length===0 ? <p>No pricing rows loaded. Apply the subscription payment migrations and refresh this page.</p> : adminPlanPrices.map(row => <article className="admin-report" key={row.plan_code}><strong>{({week:'1 week',month:'1 month',three_months:'3 months',six_months:'6 months',yearly:'1 year'} as Record<string,string>)[row.plan_code] || row.plan_code}</strong><div className="editor-fields"><label>OneVoucher price (ZAR)<input type="number" min="0.01" step="0.01" value={priceDrafts[row.plan_code]?.price_zar ?? ''} onChange={e => setPriceDrafts(current => ({...current,[row.plan_code]:{...(current[row.plan_code] || {price_zar:'',price_usd:'',enabled:false}),price_zar:e.target.value}}))} placeholder="e.g. 49.00" /></label><label>Crypto price (USD)<input type="number" min="0.01" step="0.01" value={priceDrafts[row.plan_code]?.price_usd ?? ''} onChange={e => setPriceDrafts(current => ({...current,[row.plan_code]:{...(current[row.plan_code] || {price_zar:'',price_usd:'',enabled:false}),price_usd:e.target.value}}))} placeholder="e.g. 3.00" /></label><label><input type="checkbox" checked={priceDrafts[row.plan_code]?.enabled ?? false} onChange={e => setPriceDrafts(current => ({...current,[row.plan_code]:{...(current[row.plan_code] || {price_zar:'',price_usd:'',enabled:false}),enabled:e.target.checked}}))} /> Enable plan for checkout</label></div><small>Status: {row.enabled ? 'Enabled' : 'Not for sale'} · Existing price: {row.price_zar == null ? 'ZAR not set' : `R${Number(row.price_zar).toFixed(2)}`} / {row.price_usd == null ? 'USD not set' : `${Number(row.price_usd).toFixed(2)}`}</small><div className="admin-report-actions"><button type="button" disabled={priceSaving} onClick={() => void saveSubscriptionPrice(row.plan_code)}>{priceSaving ? 'Saving…' : 'Save prices'}</button></div></article>)}</div><div className="admin-report-list"><h3>Recent subscription payments</h3>{adminPayments.length===0 ? <p>No payment orders recorded yet.</p> : adminPayments.map(payment => <article className="admin-report" key={payment.id}><div className="admin-report-heading"><strong>{payment.plan_code.replace('_',' ')} · {payment.provider==='nowpayments' ? 'Crypto' : 'OneVoucher'}</strong><span className={'report-status status-' + (payment.status==='succeeded' ? 'resolved' : payment.status==='failed' || payment.status==='expired' ? 'dismissed' : 'reviewing')}>{payment.status}</span></div><p>{payment.currency} {Number(payment.amount).toFixed(2)} · Member {payment.user_id}</p><small>Created {new Date(payment.created_at).toLocaleString()}{payment.paid_at ? ` · Paid ${new Date(payment.paid_at).toLocaleString()}` : ''}</small></article>)}</div><div className="admin-report-list"><h3>Subscription approval queue</h3>{adminSubscriptions.length === 0 ? <p>No pending subscription requests.</p> : adminSubscriptions.map(item => <article className="admin-report" key={item.user_id}><strong>Member: {item.user_id}</strong><p>Requested plan: {item.plan_code}</p><small>Requested: {new Date(item.created_at).toLocaleString()}</small><div className="admin-report-actions"><button onClick={() => void reviewSubscription(item.user_id, item.plan_code, true)}>Approve after payment verified</button><button onClick={() => void reviewSubscription(item.user_id, item.plan_code, false)}>Decline</button></div><p>Only approve after independently confirming the payment has been received.</p></article>)}</div><div className="admin-report-list"><h3>Safety history &amp; suspensions</h3>{reportsLoading ? <p>Loading safety history…</p> : safetyEvents.length === 0 ? <p>No contact-sharing violations recorded.</p> : safetyEvents.map(item => <article className="admin-report" key={item.id}><div className="admin-report-heading"><strong>{item.action_taken === 'suspended_24h' ? '24-hour suspension applied' : 'Message redacted · warning issued'}</strong><span className={'report-status ' + (item.action_taken === 'suspended_24h' ? 'status-open' : 'status-reviewing')}>Strike {item.strike_number}</span></div><p><strong>Original message (admin only):</strong> {item.original_message}</p><p><strong>Detection reasons:</strong> {item.detected_reasons.join(', ')}</p><small>Member ID: {item.user_id} · {new Date(item.created_at).toLocaleString()}</small></article>)}<h3>Current safety status</h3>{safetyStatus.length === 0 ? <p>No safety status records yet. Use the suspension controls on a member report to create a safety record.</p> : safetyStatus.map(item => <article className="admin-report" key={item.user_id}><strong>Member ID: {item.user_id}</strong><p>Recent strikes: {item.strike_count}</p><p>Suspended until: {item.suspended_until && new Date(item.suspended_until).getTime() > Date.now() ? new Date(item.suspended_until).toLocaleString() : 'Not currently suspended'}</p><div className="admin-report-actions">{item.suspended_until && new Date(item.suspended_until).getTime() > Date.now() ? <button type="button" onClick={() => void setMemberSuspension(item.user_id, false)}>Lift suspension</button> : <button type="button" onClick={() => void setMemberSuspension(item.user_id, true)}>Suspend for 24 hours</button>}</div><small>Last updated: {new Date(item.updated_at).toLocaleString()}</small></article>)}</div><div className="admin-report-list"><h3>Member safety reports</h3>{reportsLoading ? <p>Loading reports…</p> : adminReports.length === 0 ? <p>No reports have been submitted.</p> : adminReports.map(report => <article className="admin-report" key={report.id}><div className="admin-report-heading"><strong>{report.reason || 'Member report'}</strong><span className={'report-status status-' + report.status}>{report.status}</span></div><p>{report.details || 'No extra details provided.'}</p><small>Reported member: {report.reported_user_id} · Submitted: {new Date(report.created_at).toLocaleString()}</small><div className="admin-report-actions"><button onClick={() => void updateReportStatus(report.id, 'reviewing')}>Mark reviewing</button><button onClick={() => void updateReportStatus(report.id, 'resolved')}>Resolve</button><button onClick={() => void updateReportStatus(report.id, 'dismissed')}>Dismiss</button><button onClick={() => void setMemberSuspension(report.reported_user_id, true)}>Suspend member 24h</button></div></article>)}</div></div> : <div className="plan-detail"><h3>Restricted access</h3><p>Your account has not been granted administrator privileges. For security, admin access cannot be self-assigned from this public page.</p><p>Create a separate owner account below. After you register and confirm its email, send me that email address only so the account can be granted administrator access securely. Do not send your password or verification codes. Admin accounts will be exempt from subscription charges once the owner role is provisioned.</p><div className="admin-report-actions"><button className="button button-primary" onClick={() => { navigateTo('register'); setMode('signup'); setNotice('Register the separate account you want to use as DateMe owner. After email confirmation, send the account email address only so owner access can be provisioned.'); window.scrollTo(0,0); }}>Register owner account</button><button className="button button-outline" onClick={() => { navigateTo('register'); setMode('signin'); setNotice('Sign in with your separate owner account. If it has not yet been granted administrator access, send its email address only.'); window.scrollTo(0,0); }}>Sign in to owner account</button></div></div>}</section>}
        {page === 'how' && <section className="portal-page how-section"><div className="portal-page-actions"><button onClick={goBackPage}>← Back</button><button onClick={closePage}>× Close</button></div><span className="eyebrow">NOT COMPLICATED. JUST HUMAN.</span><h2>Good things start <span>simply.</span></h2><div className="steps-grid"><article><span className="step-num">01</span><h3>Show up as you</h3><p>Create a profile that feels like you.</p></article><article><span className="step-num">02</span><h3>Find your people</h3><p>Discover people you would like to know.</p></article><article><span className="step-num">03</span><h3>Make the first move</h3><p>A kind hello can start a conversation.</p></article></div></section>}
        {page === 'safety' && <section className="portal-page how-section"><div className="portal-page-actions"><button onClick={goBackPage}>← Back</button><button onClick={closePage}>× Close</button></div><span className="eyebrow">ALWAYS YOUR CHOICE</span><h2>Safety <span>centre.</span></h2><p>Protect your personal details, take your time getting to know people, and meet in public places. Report suspicious or abusive behaviour. Never send phone numbers, external links, social handles or contact details in chat. Repeated attempts may be blocked and trigger a temporary account freeze and safety review. Never send money to someone you have not met. Meet in public, tell a trusted person where you are going, and report or block anyone who makes you uncomfortable.</p></section>}

      </main>
      {galleryProfile && <div className="profile-gallery-overlay" role="dialog" aria-modal="true" aria-label={`${galleryProfile.display_name} photo gallery`}><div className="profile-gallery-view"><div className="profile-gallery-toolbar"><button type="button" onClick={() => { if (expandedGalleryPhoto) setExpandedGalleryPhoto(null); else setGalleryProfile(null); }} aria-label="Back">← Back</button><strong>{galleryProfile.display_name}</strong><button type="button" onClick={() => { setGalleryProfile(null); setExpandedGalleryPhoto(null); }} aria-label="Close gallery">× Close</button></div>{expandedGalleryPhoto ? <button type="button" className="profile-gallery-expanded" onClick={() => setExpandedGalleryPhoto(null)} aria-label="Return to photo gallery"><img src={expandedGalleryPhoto} alt={galleryProfile.display_name} /></button> : <><button type="button" className="profile-gallery-hero" onClick={() => galleryProfile.photo_url && setExpandedGalleryPhoto(galleryProfile.photo_url)} aria-label="View main photo full screen">{galleryProfile.photo_url ? <img src={galleryProfile.photo_url} alt={galleryProfile.display_name} /> : <span>♡</span>}<span className="gallery-fullscreen-hint">Tap photo to view full screen ⤢</span></button><div className="profile-gallery-heading"><h2>{galleryProfile.display_name}{galleryProfile.age ? `, ${galleryProfile.age}` : ''}</h2><strong>♥ {likeCounts[galleryProfile.id] ?? (galleryProfile.id.startsWith('ai-') ? demoLikeCounts[galleryProfile.id] || 0 : 0)} likes</strong></div><div className="profile-gallery-tiles">{[...(galleryProfile.photo_url ? [{id:'main-profile-photo', public_url:galleryProfile.photo_url}] : []), ...publicMedia.filter((item) => item.user_id === galleryProfile.id && item.media_type === 'photo')].map((item) => <button type="button" key={item.id} onClick={() => setExpandedGalleryPhoto(item.public_url)} aria-label="Expand photo"><img src={item.public_url} alt={galleryProfile.display_name} loading="lazy" /></button>)}</div><p className="profile-gallery-help">Tap the main photo to enlarge it. Use Back or Close to return.</p></>}</div></div>}
      <footer><a className="brand-logo brand-logo-footer" href="#" aria-label="DateMe home"><DateMeLogo /></a><p>Made for the moments that matter.</p><span>© {new Date().getFullYear()} DateMe</span></footer>
    </div>
  );
}
export type Lang = "en" | "hi";

export type StringKey =
  | "nav_how" | "nav_explore" | "nav_market" | "nav_apply" | "nav_login"
  | "hero_eyebrow" | "hero_title_1" | "hero_title_2" | "hero_sub" | "hero_cta" | "hero_cta2"
  | "verify_title" | "verified" | "not_verified"
  | "woven_by" | "region" | "craft" | "status" | "timeline"
  | "report" | "certificate" | "scanned" | "lang";

const strings: Record<Lang, Record<StringKey, string>> = {
  en: {
    nav_how: "How it works",
    nav_explore: "Explore",
    nav_market: "Marketplace",
    nav_apply: "Become a weaver",
    nav_login: "Sign in",
    hero_eyebrow: "GI handloom provenance",
    hero_title_1: "A birth certificate",
    hero_title_2: "for every Patola and ikat.",
    hero_sub:
      "A Sambalpuri saree takes 45 days on the loom. A Patan Patola, six months. Each gets a tamper-proof provenance passport — weaver name, dye batch, loom location, GI certificate number — all verifiable by scan.",
    hero_cta: "Sign in",
    hero_cta2: "Browse the registry",
    verify_title: "Authenticity report",
    verified: "Authenticity verified",
    not_verified: "Could not verify",
    woven_by: "Woven by",
    region: "Region",
    craft: "Craft",
    status: "Status",
    timeline: "The journey of this textile",
    report: "Report as suspicious",
    certificate: "Download certificate",
    scanned: "verifications",
    lang: "हिन्दी",
  },
  hi: {
    nav_how: "यह कैसे काम करता है",
    nav_explore: "खोजें",
    nav_market: "बाज़ार",
    nav_apply: "बुनकर बनें",
    nav_login: "साइन इन",
    hero_eyebrow: "जीआई हथकरघा प्रमाणन",
    hero_title_1: "हर पटोला और इकाट को",
    hero_title_2: "एक जन्म प्रमाणपत्र।",
    hero_sub:
      "सांभलपुरी साड़ी बनने में 45 दिन लगते हैं। पाटन पटोला, छह महीने। हर वस्त्र को एक सुरक्षित प्रमाणपत्र मिलता है — बुनकर का नाम, रंगाई बैच, करघे का स्थान, जीआई प्रमाणपत्र संख्या।",
    hero_cta: "साइन इन",
    hero_cta2: "रजिस्ट्री देखें",
    verify_title: "प्रामाणिकता रिपोर्ट",
    verified: "प्रामाणिकता सत्यापित",
    not_verified: "सत्यापित नहीं हो सका",
    woven_by: "बुनकर",
    region: "क्षेत्र",
    craft: "शिल्प",
    status: "स्थिति",
    timeline: "इस वस्त्र की यात्रा",
    report: "संदिग्ध रिपोर्ट करें",
    certificate: "प्रमाणपत्र डाउनलोड करें",
    scanned: "सत्यापन",
    lang: "English",
  },
} as const;

export function getString(lang: Lang, key: StringKey): string {
  return strings[lang]?.[key] ?? strings.en[key] ?? key;
}

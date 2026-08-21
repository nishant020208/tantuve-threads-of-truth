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
    hero_eyebrow: "GI handloom traceability",
    hero_title_1: "Every genuine thread",
    hero_title_2: "has a story worth proving.",
    hero_sub:
      "Tantuve gives each GI-protected handloom textile a tamper-evident digital identity — from the loom in Patan or Sambalpur to the person who finally drapes it.",
    hero_cta: "Scan a live example",
    hero_cta2: "Explore verified weaves",
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
    hero_eyebrow: "जीआई हथकरघा ट्रेसबिलिटी",
    hero_title_1: "हर असली धागे की",
    hero_title_2: "एक कहानी होती है।",
    hero_sub:
      "तंतुवे हर जीआई हथकरघा वस्त्र को एक सुरक्षित डिजिटल पहचान देता है — करघे से लेकर उस व्यक्ति तक जो इसे पहनता है।",
    hero_cta: "लाइव उदाहरण स्कैन करें",
    hero_cta2: "सत्यापित बुनाई देखें",
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

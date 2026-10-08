"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Languages } from "lucide-react";
import { supportedLocales, translations, type LocaleCode, type TranslationKey } from "@/i18n/translations";
import { ownerPhrases } from "@/i18n/owner-translations";

const STORAGE_KEY = "jewelry-locale";

const localeTextMap: Record<LocaleCode, Record<string, string>> = {
  en: {
    "Login": "Login",
    "Open Your Store": "Open Your Store",
    "Launch Your Digital Store": "Launch Your Digital Store",
    "View Demo Store": "View Demo Store",
    "Sign in to your dashboard": "Sign in to your dashboard",
    "Create your digital shop": "Create your digital shop",
    "Already have an account?": "Already have an account?",
    "Dashboard": "Dashboard",
    "Shop Settings": "Shop Settings",
    "Overview": "Overview",
    "Products": "Products",
    "Enquiries": "Enquiries",
    "Welcome back": "Welcome back",
    "View Live Shop": "View Live Shop",
    "Latest Collection": "Latest Collection",
    "All Items": "All Items",
    "No products published yet. Check back later!": "No products published yet. Check back later!",
    "Price on Request": "Price on Request",
    "Enquire": "Enquire",
    "About": "About",
    "Contact": "Contact",
    "Live Gold Rates:": "Live Gold Rates:",
    "Store Link Limit Reached": "Store Link Limit Reached",
    "Back to Platform": "Back to Platform",
    "Account Suspended": "Account Suspended",
  },
  hi: {
    "Login": "लॉगिन",
    "Open Your Store": "अपना स्टोर खोलें",
    "Launch Your Digital Store": "अपना डिजिटल स्टोर लॉन्च करें",
    "View Demo Store": "डेमो स्टोर देखें",
    "Sign in to your dashboard": "अपने डैशबोर्ड में साइन इन करें",
    "Create your digital shop": "अपना डिजिटल स्टोर बनाएं",
    "Already have an account?": "पहले से अकाउंट है?",
    "Dashboard": "डैशबोर्ड",
    "Shop Settings": "स्टोर सेटिंग्स",
    "Overview": "ओवरव्यू",
    "Products": "प्रोडक्ट्स",
    "Enquiries": "पुछताछ",
    "Welcome back": "फिर से स्वागत है",
    "View Live Shop": "लाइव स्टोर देखें",
    "Latest Collection": "नवीनतम कलेक्शन",
    "All Items": "सभी आइटम",
    "No products published yet. Check back later!": "अभी तक कोई प्रोडक्ट नहीं है। कुछ देर बाद देखें!",
    "Price on Request": "मांग पर कीमत",
    "Enquire": "पूछताछ करें",
    "About": "हमारे बारे में",
    "Contact": "संपर्क",
    "Live Gold Rates:": "लाइव गोल्ड रेट:",
    "Store Link Limit Reached": "स्टोर लिंक लिमिट पूरी हुई",
    "Back to Platform": "प्लेटफ़ॉर्म पर वापस जाएँ",
    "Account Suspended": "अकाउंट निलंबित",
  },
  gu: {
    "Login": "લૉગિન",
    "Open Your Store": "તમારો સ્ટોર ખોલો",
    "Launch Your Digital Store": "તમારો ડિજિટલ સ્ટોર લોન્ચ કરો",
    "View Demo Store": "ડેમો સ્ટોર જુઓ",
    "Sign in to your dashboard": "તમારા ડેશબોર્ડમાં સાઇન ઈન કરો",
    "Create your digital shop": "તમારો ડિજિટલ સ્ટોર બનાવી શકો છો",
    "Already have an account?": "પહેલેથી એકાઉન્ટ છે?",
    "Dashboard": "ડેશબોર્ડ",
    "Shop Settings": "સ્ટोर સેટિંગ્સ",
    "Overview": "ઓવરવ્યુ",
    "Products": "પ્રોડક્ટ્સ",
    "Enquiries": "પૂછપરછ",
    "Welcome back": "ફરીથી સ્વાગત છે",
    "View Live Shop": "લાઇવ સ્ટોર જુઓ",
    "Latest Collection": "નવીનતમ કલેક્શન",
    "All Items": "બધા આઈટમ્સ",
    "No products published yet. Check back later!": "હજી સુધી કોઈ પ્રોડક્ટ્સ જાહેર નથી થયા. થોડા સમય પછી ફરીથી તપાસો!",
    "Price on Request": "માગણી પર કિંમત",
    "Enquire": "પૂછપરછ કરો",
    "About": "અમારા વિશે",
    "Contact": "સંપર્ક",
    "Live Gold Rates:": "લાઇવ ગોલ્ડ રેટ:",
    "Store Link Limit Reached": "સ્ટોર લિંક લિમિટ પૂરી થઈ",
    "Back to Platform": "પ્લેટફોર્મ પર પાછા જાઓ",
    "Account Suspended": "એકાઉન્ટ સસ્પેન્ડેડ",
  },
  marvadi: {
    "Login": "लॉगिन",
    "Open Your Store": "अपना स्टोर खोलो",
    "Launch Your Digital Store": "अपना डिजिटल स्टोर लॉन्च करो",
    "View Demo Store": "डेमो स्टोर देखो",
    "Sign in to your dashboard": "आपना डैशबोर्ड में साइन इन करो",
    "Create your digital shop": "आपना डिजिटल स्टोर बनाओ",
    "Already have an account?": "पहले से अकाउंट है?",
    "Dashboard": "डैशबोर्ड",
    "Shop Settings": "स्टोर सेटिंग्स",
    "Overview": "ओवरव्यू",
    "Products": "प्रोडक्ट्स",
    "Enquiries": "पूछताछ",
    "Welcome back": "फिर से स्वागत है",
    "View Live Shop": "लाइव स्टोर देखो",
    "Latest Collection": "नवीनतम कलेक्शन",
    "All Items": "सब आइटम",
    "No products published yet. Check back later!": "अभी तक कोई प्रोडक्ट्स नहीं हैं। थोड़ी देर बाद फिर देखें!",
    "Price on Request": "मांग पर कीमत",
    "Enquire": "पूछताछ करो",
    "About": "हमारे बारे में",
    "Contact": "संपर्क",
    "Live Gold Rates:": "लाइव गोल्ड रेट:",
    "Store Link Limit Reached": "स्टोर लिंक लिमिट पूरी हुई",
    "Back to Platform": "प्लेटफ़ॉर्म पर वापस जाओ",
    "Account Suspended": "अकाउंट निलंबित",
  },
};

const reverseLocaleTextMap = Object.fromEntries(
  Object.entries(localeTextMap).map(([locale, map]) => [
    locale,
    Object.fromEntries(
      Object.entries(map).map(([source, target]) => [target, source])
    ),
  ])
) as Record<LocaleCode, Record<string, string>>;

for (const [source, localized] of Object.entries(ownerPhrases)) {
  localeTextMap.en[source] = source;
  localeTextMap.hi[source] = localized.hi;
  localeTextMap.gu[source] = localized.gu;
  localeTextMap.marvadi[source] = localized.marvadi;
}

// Include dictionary-backed phrases so pages using `t()` and pages rendered on
// the server follow the same selected language.
for (const locale of supportedLocales.map((item) => item.code)) {
  for (const key of Object.keys(translations.en) as TranslationKey[]) {
    localeTextMap[locale][translations.en[key]] = translations[locale][key];
  }
}

for (const locale of supportedLocales.map((item) => item.code)) {
  reverseLocaleTextMap[locale] = Object.fromEntries(
    Object.entries(localeTextMap[locale]).map(([source, target]) => [target, source]),
  );
}

function translateValue(value: string, locale: LocaleCode, previousLocale?: LocaleCode) {
  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  const core = value.trim();
  if (!core) return value;

  const previousMap = previousLocale && previousLocale !== locale
    ? reverseLocaleTextMap[previousLocale] ?? {}
    : {};
  const english = previousMap[core] ?? core;
  const translated = localeTextMap[locale]?.[english] ?? english;
  return translated === core ? value : `${leading}${translated}${trailing}`;
}

function applyLocaleToRoot(root: ParentNode, locale: LocaleCode, previousLocale?: LocaleCode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (!parent || ["SCRIPT", "STYLE"].includes(parent.tagName)) continue;
    const value = node.textContent ?? "";
    const updated = translateValue(value, locale, previousLocale);
    if (updated !== value) node.textContent = updated;
  }

  const elements: Element[] = [];
  if (root instanceof Element) elements.push(root);
  elements.push(...Array.from(root.querySelectorAll("[placeholder], [title], [aria-label]")));
  for (const element of elements) {
    for (const attribute of ["placeholder", "title", "aria-label"] as const) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const updated = translateValue(value, locale, previousLocale);
      if (updated !== value) element.setAttribute(attribute, updated);
    }
  }
}

function applyLocaleText(locale: LocaleCode, previousLocale?: LocaleCode) {
  if (typeof document === "undefined") return;

  const root = document.body;
  if (!root) return;

  applyLocaleToRoot(root, locale, previousLocale);
}

interface LocaleContextValue {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  t: (key: TranslationKey) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<LocaleCode>("en");
  const [isReady, setIsReady] = useState(false);
  const previousLocaleRef = useRef<LocaleCode | undefined>(undefined);

  useEffect(() => {
    const initialize = window.setTimeout(() => {
      const saved = window.localStorage.getItem(STORAGE_KEY) as LocaleCode | null;
      if (saved && supportedLocales.some((item) => item.code === saved)) setLocale(saved);
      setIsReady(true);
    }, 0);
    return () => window.clearTimeout(initialize);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const previousLocale = previousLocaleRef.current;
    window.localStorage.setItem(STORAGE_KEY, locale);

    const languageMap: Record<LocaleCode, string> = {
      en: "en",
      hi: "hi",
      gu: "gu",
      marvadi: "mr",
    };

    document.documentElement.lang = languageMap[locale] ?? "en";

    applyLocaleText(locale, previousLocale);
    previousLocaleRef.current = locale;

    // App Router navigation and client state render new nodes without
    // remounting this provider. Observe those nodes so the complete owner UI
    // stays in the chosen language across every page and dialog.
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "characterData") {
          const parent = record.target.parentElement;
          if (parent) applyLocaleToRoot(parent, locale, locale);
          continue;
        }
        for (const node of record.addedNodes) {
          if (node instanceof Element) applyLocaleToRoot(node, locale, locale);
          else if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
            applyLocaleToRoot(node.parentElement, locale, locale);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      if (supportedLocales.some((item) => item.code === event.newValue)) {
        setLocale(event.newValue as LocaleCode);
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", handleStorage);
    };
  }, [isReady, locale]);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale,
    t: (key) => translations[locale]?.[key] ?? translations.en[key],
  }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used inside LocaleProvider");
  return context;
}

export function LanguageSwitcher({ className = "", compact = false, responsive = false }: { className?: string; compact?: boolean; responsive?: boolean }) {
  const { locale, setLocale, t } = useLocale();
  const activeLocale = supportedLocales.find((item) => item.code === locale) ?? supportedLocales[0];
  const compactLabels: Record<LocaleCode, string> = { en: "EN", hi: "हिं", gu: "ગુ", marvadi: "मा" };

  return (
    <label className={`relative inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-amber-300 ${responsive ? "min-h-11" : ""} ${className}`}>
      <span className="sr-only">{t("language")}</span>
      <Languages className="h-4 w-4 text-amber-600" />
      {responsive ? (
        <>
          <span className="sm:hidden">{compactLabels[locale]}</span>
          <span className="hidden sm:inline">{activeLocale.label}</span>
        </>
      ) : (
        <span>{compact ? compactLabels[locale] : activeLocale.label}</span>
      )}
      <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as LocaleCode)}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
        aria-label={t("language")}
      >
        {supportedLocales.map((item) => (
          <option key={item.code} value={item.code}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

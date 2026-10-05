"use client";

import { useEffect, useRef, useState } from "react";
import { supportedLocales, translations, type LocaleCode, type TranslationKey } from "@/i18n/translations";

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

function applyLocaleText(locale: LocaleCode, previousLocale?: LocaleCode) {
  if (typeof document === "undefined") return;

  const root = document.body;
  if (!root) return;

  const previousMap = previousLocale && previousLocale !== locale ? reverseLocaleTextMap[previousLocale] ?? {} : {};
  const replacements = localeTextMap[locale] ?? localeTextMap.en;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (!parent || ["SCRIPT", "STYLE", "INPUT", "TEXTAREA", "SELECT", "OPTION"].includes(parent.tagName)) {
      continue;
    }

    const value = node.textContent ?? "";
    let updated = value;

    Object.entries(previousMap).forEach(([source, target]) => {
      updated = updated.split(source).join(target);
    });

    Object.entries(replacements).forEach(([source, target]) => {
      updated = updated.split(source).join(target);
    });

    if (updated !== value) {
      node.textContent = updated;
    }
  }
}

export function useLocale() {
  const [locale, setLocale] = useState<LocaleCode>(() => {
    if (typeof window === "undefined") {
      return "en";
    }

    const saved = window.localStorage.getItem(STORAGE_KEY) as LocaleCode | null;
    return supportedLocales.some((item) => item.code === saved) ? saved ?? "en" : "en";
  });
  const previousLocaleRef = useRef<LocaleCode | undefined>(undefined);

  useEffect(() => {
    const previousLocale = previousLocaleRef.current;

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, locale);
    }

    const languageMap: Record<LocaleCode, string> = {
      en: "en",
      hi: "hi",
      gu: "gu",
      marvadi: "mr",
    };

    if (typeof document !== "undefined") {
      document.documentElement.lang = languageMap[locale] ?? "en";
    }

    applyLocaleText(locale, previousLocale);
    previousLocaleRef.current = locale;
  }, [locale]);

  const t = (key: TranslationKey) => translations[locale]?.[key] ?? translations.en[key];

  return { locale, setLocale, t };
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <label className={`inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm ${className}`}>
      <span className="sr-only">Language</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as LocaleCode)}
        className="bg-transparent pr-1 outline-none appearance-none text-sm font-medium text-gray-700"
        aria-label="Select language"
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

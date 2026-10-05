"use client";

import { useEffect, useState } from "react";
import { supportedLocales, translations, type LocaleCode, type TranslationKey } from "@/i18n/translations";

const STORAGE_KEY = "jewelry-locale";

export function useLocale() {
  const [locale, setLocale] = useState<LocaleCode>(() => {
    if (typeof window === "undefined") {
      return "en";
    }

    const saved = window.localStorage.getItem(STORAGE_KEY) as LocaleCode | null;
    return supportedLocales.some((item) => item.code === saved) ? saved ?? "en" : "en";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
    const languageMap: Record<LocaleCode, string> = {
      en: "en",
      hi: "hi",
      gu: "gu",
      marvadi: "mr",
    };
    document.documentElement.lang = languageMap[locale] ?? "en";
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

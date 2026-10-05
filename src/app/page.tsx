"use client";

import Link from "next/link";
import { ArrowRight, LogIn, Sparkles, Store, TrendingUp } from "lucide-react";
import { LanguageSwitcher, useLocale } from "@/i18n/useLocale";
import { PwaInstallPrompt } from "@/components/public/PwaInstallPrompt";

export default function Home() {
  const { t } = useLocale();

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-1.5 text-lg font-serif font-bold text-gray-900 sm:gap-2 sm:text-xl">
            <Sparkles className="h-5 w-5 shrink-0 text-amber-500" />
            <span className="truncate">LuxeStore<span className="hidden sm:inline"> SaaS</span></span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <LanguageSwitcher compact />
            <Link href="/login" aria-label={t("login")} className="inline-flex min-h-10 items-center gap-1 rounded-full px-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-black sm:px-3">
              <LogIn className="h-4 w-4 sm:hidden" /> <span className="hidden sm:inline">{t("login")}</span>
            </Link>
            <Link href="/register" aria-label={t("openYourStore")} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-gray-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 sm:px-4">
              <Store className="h-4 w-4 sm:hidden" /> <span className="hidden sm:inline">{t("openYourStore")}</span>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <div className="relative overflow-hidden pb-20 pt-16 sm:pb-40 sm:pt-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <h1 className="mb-6 text-[2.6rem] font-serif font-bold leading-[1.08] tracking-tight text-gray-900 sm:mb-8 sm:text-6xl md:text-7xl">
              <span className="block">{t("premiumHeading")}</span>
              <span className="mt-1 block text-amber-600 italic">{t("premiumJewellers")}</span>
            </h1>
            <p className="mx-auto mb-8 mt-4 max-w-2xl text-base leading-7 text-gray-600 sm:mb-10 sm:text-xl">
              {t("heroCopy")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-colors hover:bg-amber-600 sm:w-auto sm:px-8 sm:py-4 sm:text-lg">
                {t("launchYourStore")} <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/shop/demo" className="flex min-h-11 items-center gap-2 px-6 py-3 font-medium text-gray-600 hover:text-black sm:px-8 sm:py-4">
                {t("viewDemoStore")}
              </Link>
            </div>
          </div>
          <div className="absolute top-0 inset-x-0 h-full bg-gradient-to-b from-amber-50/50 to-white -z-10" />
        </div>

        <div className="py-24 bg-gray-50 border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-12">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <Store className="w-10 h-10 text-amber-500 mb-6" />
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t("premiumCatalog")}</h3>
                <p className="text-gray-600">{t("premiumCatalogText")}</p>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <Sparkles className="w-10 h-10 text-amber-500 mb-6" />
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t("socialFeed")}</h3>
                <p className="text-gray-600">{t("socialFeedText")}</p>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <TrendingUp className="w-10 h-10 text-amber-500 mb-6" />
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t("whatsappIntegration")}</h3>
                <p className="text-gray-600">{t("whatsappIntegrationText")}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <PwaInstallPrompt
        appId="platform"
        appName="LuxeStore"
        description="Install LuxeStore for faster access to jewellery storefronts."
      />
    </div>
  );
}

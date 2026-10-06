"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Sparkles, Loader2, Store } from "lucide-react";
import { signIn } from "next-auth/react";
import { LanguageSwitcher, useLocale } from "@/i18n/useLocale";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    mobile: "",
    password: "",
    shopName: "",
    slug: ""
  });

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
  };

  const handleShopNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData({ ...formData, shopName: val, slug: generateSlug(val) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.username.trim() || !formData.mobile.trim() || !formData.password.trim() || !formData.shopName.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!/^[a-z0-9._-]{3,20}$/.test(formData.username.trim().toLowerCase())) {
      setError("Username must be 3-20 characters using letters, numbers, dots, underscores or hyphens.");
      return;
    }

    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setError("Please enter a valid email address or leave it empty.");
      return;
    }

    if (!/^[+]?\d{8,15}$/.test(formData.mobile.replace(/\s+/g, ""))) {
      setError("Please enter a valid mobile number.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          name: formData.name.trim(),
          username: formData.username.trim().toLowerCase(),
          email: formData.email.trim().toLowerCase(),
          mobile: formData.mobile.trim(),
          shopName: formData.shopName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to register");
      }

      setSuccess("Account created successfully! Logging you in...");

      const signInResult = await signIn("credentials", {
        redirect: false,
        username: formData.username.trim().toLowerCase(),
        password: formData.password,
      });

      if (signInResult?.error) {
        throw new Error("Account created, but we could not log you in automatically. Please sign in manually.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-amber-200/20 blur-3xl" />
        <div className="absolute -bottom-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <Link href="/" className="flex items-center gap-2 text-2xl font-serif font-bold text-gray-900">
            <Sparkles className="w-6 h-6 text-amber-500" />
            LuxeStore
          </Link>
        </div>
        <div className="flex justify-end mb-2">
          <LanguageSwitcher />
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
          {t("openYourStore")}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-amber-600 hover:text-amber-500">
            {t("login")}
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <div className="bg-white/80 backdrop-blur-xl py-8 px-4 shadow-xl shadow-amber-900/5 sm:rounded-2xl sm:px-10 border border-white">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl border border-red-100 text-sm">{error}</div>
            )}
            {success && (
              <div className="bg-green-50 text-green-600 p-3 rounded-xl border border-green-100 text-sm">{success}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700">Owner Name</label>
                <input required type="text" className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input required type="text" className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value.replace(/\s+/g, "")})} placeholder="johnjewels" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email Address (optional)</label>
                <input type="email" className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value.trimStart()})} placeholder="shop@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mobile Number (WhatsApp)</label>
                <input required type="tel" inputMode="numeric" className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value.replace(/[^\d+\s]/g, "")})} placeholder="+1 234 567 8900" />
              </div>
            </div>

            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-gray-700">Password</label>
              <div className="relative mt-1">
                <input
                  id="register-password"
                  required
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  autoComplete="new-password"
                  className="block w-full py-3 pl-3 pr-12 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  onMouseDown={(event) => event.preventDefault()}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  title={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-gray-500 transition-colors hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500"
                >
                  {showPassword ? (
                    <EyeOff aria-hidden="true" className="h-5 w-5" />
                  ) : (
                    <Eye aria-hidden="true" className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-5 mt-5">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2 mb-4">
                <Store className="w-5 h-5 text-amber-500" /> Shop Details
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700">Brand / Shop Name</label>
                <input required type="text" className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  value={formData.shopName} onChange={handleShopNameChange} placeholder="Royal Jewellers" />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Storefront URL</label>
                <div className="mt-1 flex rounded-xl shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                    luxe.com/shop/
                  </span>
                  <input type="text" disabled className="flex-1 min-w-0 block w-full px-3 py-3 rounded-none rounded-r-xl focus:ring-amber-500 focus:border-amber-500 sm:text-sm border-gray-300 bg-gray-100"
                    value={formData.slug} />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-black transition-all disabled:opacity-70">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t("launchYourStore")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

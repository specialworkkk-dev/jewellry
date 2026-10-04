"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Loader2, Store } from "lucide-react";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
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

    if (!formData.name.trim() || !formData.email.trim() || !formData.mobile.trim() || !formData.password.trim() || !formData.shopName.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setError("Please enter a valid email address.");
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
      
      // Auto-login after registration
      setTimeout(async () => {
        await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          callbackUrl: "/dashboard"
        });
      }, 1500);

    } catch (err: any) {
      setError(err.message);
    } finally {
      if (!success) setLoading(false);
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
        <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
          Create your digital shop
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-amber-600 hover:text-amber-500">
            Sign in
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
                <label className="block text-sm font-medium text-gray-700">Mobile Number (WhatsApp)</label>
                <input required type="tel" inputMode="numeric" className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value.replace(/[^\d+\s]/g, "")})} placeholder="+1 234 567 8900" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <input required type="email" className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value.trimStart()})} placeholder="shop@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input required type="password" minLength={8} className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
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
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Launch My Digital Store"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

export function EnquiryForm({ shopId, productId }: { shopId: string, productId: string }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId,
          productId,
          customerName: formData.get("name"),
          customerPhone: formData.get("phone"),
          message: formData.get("message"),
          source: "WEBSITE_FORM",
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to send enquiry");

      setSuccess(true);
      form.reset();
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Unable to send enquiry");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-xl flex flex-col items-center justify-center text-center">
        <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
        <h4 className="text-lg font-bold">Enquiry Sent!</h4>
        <p className="text-sm mt-2 opacity-90">The shop owner will contact you shortly.</p>
        <button onClick={() => setSuccess(false)} className="mt-4 text-sm font-medium text-green-700 hover:underline">
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-4">
      <h3 className="text-xl font-serif font-medium text-gray-900 mb-4">Interested? Get Details</h3>
      
      {error && <p className="text-red-600 text-sm">{error}</p>}
      
      <div>
        <label htmlFor="enquiry-name" className="text-sm font-medium text-gray-700 block mb-1">Your Name</label>
        <input id="enquiry-name" name="name" type="text" minLength={2} maxLength={100} autoComplete="name" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-all" placeholder="John Doe" />
      </div>
      
      <div>
        <label htmlFor="enquiry-phone" className="text-sm font-medium text-gray-700 block mb-1">Phone Number</label>
        <input id="enquiry-phone" name="phone" type="tel" minLength={8} maxLength={24} autoComplete="tel" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-all" placeholder="+91 9876543210" />
      </div>
      
      <div>
        <label htmlFor="enquiry-message" className="text-sm font-medium text-gray-700 block mb-1">Message</label>
        <textarea id="enquiry-message" name="message" rows={3} minLength={3} maxLength={2000} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-all" placeholder="Hi, I'm interested in this piece..."></textarea>
      </div>

      <button type="submit" disabled={loading} className="w-full bg-gray-900 hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 text-white font-medium py-3 rounded-lg flex items-center justify-center transition-colors">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Enquiry Now"}
      </button>
    </form>
  );
}

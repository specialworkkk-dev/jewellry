import type { Metadata } from "next";
import { PwaInstallPrompt } from "@/components/public/PwaInstallPrompt";
import { PwaServiceWorker } from "@/components/public/PwaServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"),
  title: {
    default: "LuxeStore — Digital Jewellery Storefronts",
    template: "%s | LuxeStore",
  },
  description: "Create and share a premium digital storefront for your jewellery business.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#111827" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LuxeStore" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
      </head>
      <body className="font-sans antialiased h-full flex flex-col min-h-screen">
        {children}
        <PwaServiceWorker />
        <PwaInstallPrompt />
      </body>
    </html>
  );
}

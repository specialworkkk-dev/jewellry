import type { Metadata } from "next";
import { PwaServiceWorker } from "@/components/public/PwaServiceWorker";
import { LocaleProvider } from "@/i18n/useLocale";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"),
  title: {
    default: "LuxeStore — Digital Jewellery Storefronts",
    template: "%s | LuxeStore",
  },
  description: "Create and share a premium digital storefront for your jewellery business.",
  manifest: "/manifest.webmanifest",
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "LuxeStore",
    statusBarStyle: "default",
  },
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
      </head>
      <body className="font-sans antialiased h-full flex flex-col min-h-screen">
        <LocaleProvider>
          {children}
          <PwaServiceWorker />
        </LocaleProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { PwaInstallPrompt } from "@/components/public/PwaInstallPrompt";
import { PwaServiceWorker } from "@/components/public/PwaServiceWorker";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-inter" 
});

const playfair = Playfair_Display({ 
  subsets: ["latin"], 
  variable: "--font-playfair" 
});

export const metadata: Metadata = {
  title: "Digital Storefront SaaS",
  description: "Premium Jewellery E-commerce SaaS",
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
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased h-full flex flex-col min-h-screen`}>
        {children}
        <PwaServiceWorker />
        <PwaInstallPrompt />
      </body>
    </html>
  );
}

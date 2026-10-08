import type { Metadata, Viewport } from "next";
import Script from "next/script";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111827",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script id="luxestore-pwa-install-capture" strategy="beforeInteractive">
          {`(function(){
            if(window.__luxestorePwaCaptureReady)return;
            window.__luxestorePwaCaptureReady=true;
            var match=location.pathname.match(/^\\/shop\\/([^\\/?#]+)/);
            if(match){
              var manifest=document.createElement("link");
              manifest.rel="manifest";
              manifest.href="/api/shop/"+encodeURIComponent(match[1])+"/manifest.json";
              document.head.insertBefore(manifest,document.head.firstChild);
            }
            window.addEventListener("beforeinstallprompt",function(event){
              event.preventDefault();
              window.__luxestoreInstallPrompt=event;
              window.dispatchEvent(new Event("luxestore:pwa-install-ready"));
            });
            window.addEventListener("appinstalled",function(){
              delete window.__luxestoreInstallPrompt;
              window.dispatchEvent(new Event("luxestore:pwa-app-installed"));
            });
          })();`}
        </Script>
      </head>
      <body className="font-sans antialiased flex min-h-dvh flex-col">
        <LocaleProvider>
          {children}
          <PwaServiceWorker />
        </LocaleProvider>
      </body>
    </html>
  );
}

import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import Script from "next/script";

export const metadata = {
  title: "Ishi Kidijitali — Agiza. Shea. Pata.",
  description: "Bidhaa kutoka China na Dubai. Shea na upate commission hadi 35%.",
  verification: {
    google: "upffZKGHZ668TseEQUcSR68GIqoO2rXdnonyAFUvBLI",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="sw">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-['Inter']">
        <CartProvider>{children}</CartProvider>

        {/* BOTPRESS AI CHATBOT SCRIPTS */}
        <Script
          src="https://cdn.botpress.cloud/webchat/v5.0/inject.js"
          strategy="afterInteractive"
        />
        <Script
          src="https://files.bpcontent.cloud/2026/09/26/08/20260926080403-7MVOAZ2Y.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
import "./globals.css";
import { CartProvider } from "@/context/CartContext";

export const metadata = {
  title: "Ishi Kidijitali — Agiza. Shea. Pata.",
  description: "Bidhaa kutoka China na Dubai. Shea na upate commission hadi 35%.",
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
      </body>
    </html>
  );
}
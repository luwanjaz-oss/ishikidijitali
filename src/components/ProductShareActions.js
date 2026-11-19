"use client";
import { useState } from "react";

const SITE_URL = "https://ishikidijitali.com";

function fmtTZS(n) {
  return `${Number(n || 0).toLocaleString("en-US")} TZS`;
}

export default function ProductShareActions({ product, compact = false }) {
  const [copied, setCopied] = useState(false);

  function buildSharePayload() {
    const origin =
      typeof window !== "undefined" && window.location.origin.startsWith("http")
        ? window.location.origin
        : SITE_URL;

    const refCode =
      typeof window !== "undefined"
        ? localStorage.getItem("ishiki_ref_code")
        : null;

    const url = new URL(`${origin}/product/${product.id}`);
    if (refCode) {
      url.searchParams.set("ref", refCode);
    }

    const productUrl = url.toString();
    const shareText =
      `🔥 *${product.name}*\n` +
      `💰 Bei: *${fmtTZS(product.price)}*\n` +
      `✅ Agiza sasa kupitia Ishi Kidijitali:\n${productUrl}`;

    return { productUrl, shareText };
  }

  async function handleNativeShare(e) {
    e?.stopPropagation?.();
    const { productUrl, shareText } = buildSharePayload();

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${product.name} — ${fmtTZS(product.price)}`,
          text: shareText,
          url: productUrl,
        });
        return;
      } catch {
        // Kama mtumiaji amefunga share menu, endelea kwenda WhatsApp
      }
    }

    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function handleWhatsAppShare(e) {
    e?.stopPropagation?.();
    const { shareText } = buildSharePayload();
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function handleCopyLink(e) {
    e?.stopPropagation?.();
    const { productUrl } = buildSharePayload();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(productUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleNativeShare}
        title="Share Bidhaa"
        className="bg-gray-100 hover:bg-gray-200 text-[#12182B] text-[11px] font-bold px-2.5 py-2 rounded-xl transition-colors"
      >
        📤 Share
      </button>
    );
  }

  return (
    <div className="pt-3 border-t border-gray-100 space-y-2">
      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
        Sambaza Bidhaa Hii:
      </p>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={handleWhatsAppShare}
          className="bg-[#25D366] hover:bg-[#1ea952] text-white text-xs font-bold py-2.5 px-2 rounded-xl transition-colors"
        >
          💬 WhatsApp
        </button>

        <button
          type="button"
          onClick={handleNativeShare}
          className="bg-[#17A398] hover:bg-[#13847b] text-white text-xs font-bold py-2.5 px-2 rounded-xl transition-colors"
        >
          📤 Share
        </button>

        <button
          type="button"
          onClick={handleCopyLink}
          className="bg-gray-100 hover:bg-gray-200 text-[#12182B] text-xs font-bold py-2.5 px-2 rounded-xl transition-colors"
        >
          {copied ? "✓ Imenakiliwa" : "🔗 Copy Link"}
        </button>
      </div>
    </div>
  );
}
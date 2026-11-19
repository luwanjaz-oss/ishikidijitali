import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import ProductShareActions from "@/components/ProductShareActions";

const SITE_URL = "https://ishikidijitali.com";

function getServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function getPrimaryImage(imageUrlRaw) {
  if (!imageUrlRaw) return null;
  const first = String(imageUrlRaw)
    .split(",")
    .map((s) => s.trim())
    .find(Boolean);
  if (!first) return null;
  if (first.startsWith("http://") || first.startsWith("https://")) return first;
  return `${SITE_URL}${first.startsWith("/") ? "" : "/"}${first}`;
}

function fmtTZS(n) {
  return `${Number(n || 0).toLocaleString("en-US")} TZS`;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = getServerSupabase();

  const { data: product } = await supabase
    .from("products")
    .select("id, name, description, price, image_url, origin")
    .eq("id", id)
    .single();

  if (!product) {
    return {
      title: "Bidhaa Haikupatikana | Ishi Kidijitali",
      description: "Agiza bidhaa bora kutoka Dar es Salaam, China, USA na Dubai kupitia Ishi Kidijitali.",
    };
  }

  const priceText = fmtTZS(product.price);
  const title = `${product.name} — ${priceText} | Ishi Kidijitali`;
  const description = product.description
    ? `${product.description} • Bei: ${priceText} (Pay on Delivery / Agiza sasa Ishi Kidijitali).`
    : `Agiza ${product.name} kwa bei ya ${priceText} kupitia Ishi Kidijitali.`;
  const imageUrl = getPrimaryImage(product.image_url);
  const productUrl = `${SITE_URL}/product/${product.id}`;

  return {
    title,
    description,
    alternates: {
      canonical: productUrl,
    },
    openGraph: {
      title,
      description,
      url: productUrl,
      siteName: "Ishi Kidijitali",
      locale: "sw_TZ",
      type: "website",
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: 1200,
              height: 630,
              alt: product.name,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

export default async function ProductDetailPage({ params }) {
  const { id } = await params;
  const supabase = getServerSupabase();

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (!product) {
    return (
      <main className="min-h-screen bg-[#F7F3EA] text-[#12182B] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-xl font-extrabold mb-2">Bidhaa Haikupatikana</h1>
        <p className="text-xs text-gray-600 mb-5">
          Huenda bidhaa hii imeondolewa au link si sahihi.
        </p>
        <Link
          href="/#duka"
          className="bg-[#12182B] text-white text-xs font-bold px-5 py-3 rounded-xl"
        >
          ← Rudi Duka Kuu
        </Link>
      </main>
    );
  }

  const images = (product.image_url || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <main className="min-h-screen bg-[#F7F3EA] text-[#12182B] py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white border border-[#E4DFD2] rounded-3xl p-5 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <Link
            href="/#duka"
            className="text-xs font-bold text-[#17A398] hover:underline"
          >
            ← Rudi Duka Kuu
          </Link>
          <span className="bg-[#17A398]/10 text-[#0B5852] text-[10px] font-extrabold px-3 py-1 rounded-full uppercase">
            {product.origin || "DSM / China"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="bg-[#F0FAF8] rounded-2xl p-4 flex items-center justify-center aspect-square overflow-hidden">
            {images.length > 0 ? (
              <img
                src={images[0]}
                alt={product.name}
                className="w-full h-full object-contain rounded-xl"
              />
            ) : (
              <span className="text-6xl">{product.emoji || "📦"}</span>
            )}
          </div>

          <div className="space-y-4">
            <h1 className="text-xl sm:text-2xl font-extrabold leading-snug">
              {product.name}
            </h1>

            <div className="flex items-baseline gap-2.5 flex-wrap">
              <span className="text-2xl font-extrabold text-[#17A398]">
                {fmtTZS(product.price)}
              </span>
              {product.original_price &&
                Number(product.original_price) > Number(product.price) && (
                  <span className="text-xs text-gray-400 line-through">
                    {fmtTZS(product.original_price)}
                  </span>
                )}
            </div>

            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              {product.description || "Bidhaa bora kutoka Ishi Kidijitali."}
            </p>

            <div className="p-3 bg-[#17A398]/10 border border-[#17A398]/20 rounded-xl text-xs">
              <p className="font-bold text-[#0B5852]">🛡️ Dhamana & Malipo</p>
              <p className="text-[11px] text-gray-600 mt-0.5">
                {product.warranty_info || "Pay on Delivery • Tunatuma mikoa yote Tanzania."}
              </p>
            </div>

            <Link
              href="/#duka"
              className="block text-center w-full bg-[#12182B] hover:bg-[#17A398] text-white text-xs font-bold py-3.5 rounded-xl transition-colors shadow"
            >
              🛒 Agiza Bidhaa Hii Duka Kuu
            </Link>

            <ProductShareActions product={product} />
          </div>
        </div>
      </div>
    </main>
  );
}
"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/context/CartContext";

function fmtTZS(n) {
  return (n || 0).toLocaleString("en-US") + " TZS";
}

function getProductImages(p) {
  if (!p?.image_url) return [];
  return p.image_url.split(",").map((s) => s.trim()).filter(Boolean);
}

// MACHAGUO YA BIDHAA (size/rangi/aina) YANASOMWA KUTOKA "variants" (jsonb)
// - kolamu halisi kwenye Supabase. Kila kipengele kinaweza kuwa NENO TU, AU
// OBJECT yenye picha na/au bei yake maalum, mfano:
// {
//   "colors": [
//     {"name": "Green", "image": "https://...", "price": 12600},
//     {"name": "Silver", "image": "https://...", "price": 13000},
//     "Blue"
//   ],
//   "sizes": ["S", "M", "L"]
// }
function normalizeVariantList(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((v) => {
      if (typeof v === "string") return { name: v, image: null, price: null, shipping_fee: null };
      if (v && typeof v === "object" && v.name) {
        return {
          name: v.name,
          image: v.image || null,
          price: v.price !== null && v.price !== undefined && v.price !== "" ? Number(v.price) : null,
          shipping_fee: v.shipping_fee !== null && v.shipping_fee !== undefined && v.shipping_fee !== "" ? Number(v.shipping_fee) : null,
        };
      }
      return null;
    })
    .filter(Boolean);
}

function getProductVariants(p) {
  if (!p?.variants) return { sizes: [], colors: [], types: [], options: {} };
  let v = p.variants;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return { sizes: [], colors: [], types: [], options: {} };
    }
  }
  // "options" ni MACHAGUO YA JINA LOLOTE (Watts, Battery, Units, Capacity n.k)
  const options = {};
  if (v.options && typeof v.options === "object" && !Array.isArray(v.options)) {
    Object.entries(v.options).forEach(([label, arr]) => {
      const list = normalizeVariantList(arr);
      if (list.length > 0) options[label] = list;
    });
  }
  return {
    sizes: normalizeVariantList(v.sizes),
    colors: normalizeVariantList(v.colors),
    types: normalizeVariantList(v.types),
    options,
  };
}

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id;
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [added, setAdded] = useState(false);

  // SWIPE - mteja anavuta picha kubadilisha, siyo kubofya thumbnail.
  const swipeStartX = useRef(null);
  function handleSwipeStart(e) {
    swipeStartX.current = e.touches ? e.touches[0].clientX : e.clientX;
  }
  function handleSwipeEnd(e, length) {
    if (swipeStartX.current === null || length <= 1) return;
    const endX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const diff = endX - swipeStartX.current;
    if (Math.abs(diff) > 35) {
      if (diff < 0) setActiveImg((i) => (i + 1) % length);
      else setActiveImg((i) => (i - 1 + length) % length);
    }
    swipeStartX.current = null;
  }

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedOptions, setSelectedOptions] = useState({});
  const [optionError, setOptionError] = useState("");

  const [reviews, setReviews] = useState([]);
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();
      if (!error) {
        setProduct(data);
        const { sizes, colors, types, options } = getProductVariants(data);
        if (sizes.length) setSelectedSize(sizes[0].name);
        if (colors.length) setSelectedColor(colors[0].name);
        if (types.length) setSelectedType(types[0].name);
        const initialOptions = {};
        Object.entries(options).forEach(([label, list]) => {
          initialOptions[label] = list[0]?.name || "";
        });
        setSelectedOptions(initialOptions);
      }
      setLoading(false);
    }
    loadProduct();
  }, [id]);

  useEffect(() => {
    async function loadReviews() {
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", id)
        .order("created_at", { ascending: false });
      if (data) setReviews(data);
    }
    loadReviews();
  }, [id]);

  async function handleReviewSubmit(e) {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        product_id: id,
        customer_name: reviewName.trim(),
        rating: reviewRating,
        comment: reviewComment.trim(),
      })
      .select()
      .single();
    if (!error && data) {
      setReviews((prev) => [data, ...prev]);
      setReviewName("");
      setReviewComment("");
      setReviewRating(5);
    }
    setSubmitting(false);
  }

  const variants = getProductVariants(product);
  const requiresSize = variants.sizes.length > 0;
  const requiresColor = variants.colors.length > 0;
  const requiresType = variants.types.length > 0;
  const optionLabels = Object.keys(variants.options);

  const selectedSizeObj = variants.sizes.find((s) => s.name === selectedSize);
  const selectedColorObj = variants.colors.find((c) => c.name === selectedColor);
  const selectedTypeObj = variants.types.find((t) => t.name === selectedType);
  const selectedOptionObjs = optionLabels.map((label) =>
    variants.options[label].find((o) => o.name === selectedOptions[label])
  );
  // Bei ya mwisho: machaguo maalum (options) > rangi > aina > size > bei ya kawaida
  const variantCandidates = [...selectedOptionObjs, selectedColorObj, selectedTypeObj, selectedSizeObj];
  const variantPrice = variantCandidates.find((c) => c?.price !== null && c?.price !== undefined)?.price ?? null;
  const variantImage = variantCandidates.find((c) => c?.image)?.image ?? null;
  const variantShippingFee = variantCandidates.find((c) => c?.shipping_fee !== null && c?.shipping_fee !== undefined)?.shipping_fee ?? null;
  const displayPrice = variantPrice !== null ? variantPrice : product?.price;

  function handleAdd() {
    if (!product) return;

    if (requiresSize && !selectedSize) {
      setOptionError("Tafadhali chagua Size kwanza kabla ya kuongeza kikapuni!");
      return;
    }
    if (requiresColor && !selectedColor) {
      setOptionError("Tafadhali chagua Rangi kwanza kabla ya kuongeza kikapuni!");
      return;
    }
    if (requiresType && !selectedType) {
      setOptionError("Tafadhali chagua Aina/Uwezo kwanza kabla ya kuongeza kikapuni!");
      return;
    }
    for (const label of optionLabels) {
      if (!selectedOptions[label]) {
        setOptionError(`Tafadhali chagua ${label} kwanza kabla ya kuongeza kikapuni!`);
        return;
      }
    }

    setOptionError("");
    addToCart({
      ...product,
      price: displayPrice,
      basePrice: product.price,
      shipping_fee: variantShippingFee !== null ? variantShippingFee : product.shipping_fee,
      selectedSize: selectedSize || undefined,
      selectedColor: selectedColor || undefined,
      selectedType: selectedType || undefined,
      selectedOptions: { ...selectedOptions },
      variantImage: variantImage,
      qty: 1,
    });
    setAdded(true);
  }

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-5 py-16">
        <p className="text-[#6B7280] text-sm">Inapakia...</p>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="max-w-4xl mx-auto px-5 py-16">
        <p className="text-[#6B7280] text-sm">Bidhaa haikupatikana.</p>
        <Link href="/" className="text-[#17A398] text-sm font-semibold">
          ← Rudi Dukani
        </Link>
      </main>
    );
  }

  const images = getProductImages(product);
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <main className="bg-[#F7F3EA] min-h-screen">
      <header className="sticky top-0 z-50 bg-[#12182B] border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="bg-[#E5383B] text-black font-bold text-sm px-2 py-1 rounded">
              Ishi
            </span>
            <span className="text-lg font-bold text-white">Kidijitali</span>
          </Link>
          <Link href="/" className="text-white/70 hover:text-white text-xs sm:text-sm">
            ← Rudi Dukani
          </Link>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 sm:px-5 py-6 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
          {/* GALLERY - MOBILE FRIENDLY, PICHA ZAIDI YA 5 ZINAWEZEKANA - KUVUTA (SWIPE) */}
          <div>
            <div
              className="w-full h-64 sm:h-96 bg-white rounded-2xl border border-[#E4DFD2] flex items-center justify-center overflow-hidden select-none touch-pan-y"
              onTouchStart={handleSwipeStart}
              onTouchEnd={(e) => !variantImage && handleSwipeEnd(e, images.length)}
            >
              {variantImage ? (
                <img src={variantImage} alt={product.name} className="h-full w-full object-contain pointer-events-none" draggable={false} />
              ) : images[activeImg] ? (
                <img src={images[activeImg]} alt={product.name} className="h-full w-full object-contain pointer-events-none" draggable={false} />
              ) : (
                <span className="text-6xl">{product.emoji || "📦"}</span>
              )}
            </div>
            {!variantImage && images.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-3">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i === activeImg ? "w-5 bg-[#17A398]" : "w-1.5 bg-gray-300"}`}
                  ></span>
                ))}
              </div>
            )}
          </div>

          <div>
            {product.origin && (
              <span className="inline-block bg-[#17A398]/10 text-[#0B5852] text-[10px] font-extrabold uppercase px-3 py-1 rounded-full">
                {product.origin}
              </span>
            )}
            <h1 className="text-xl sm:text-2xl font-bold mt-3 mb-2">{product.name}</h1>
            <div className="text-xl sm:text-2xl font-bold text-[#12182B] mb-3 font-mono flex items-center gap-2">
              {fmtTZS(displayPrice)}
              {variantPrice !== null && variantPrice !== product.price && (
                <span className="text-sm text-gray-400 font-normal line-through">{fmtTZS(product.price)}</span>
              )}
            </div>

            {product.quality_rating != null && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-[#6B7280] mb-1">
                  <span>Ubora uliothibitishwa na muuzaji</span>
                  <span className="font-semibold text-[#12182B]">
                    {product.quality_rating}%
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#17A398]"
                    style={{ width: `${product.quality_rating}%` }}
                  ></div>
                </div>
              </div>
            )}

            {product.description && (
              <p className="text-sm text-[#6B7280] leading-relaxed mb-4">
                {product.description}
              </p>
            )}

            {/* MACHAGUO YA BIDHAA - KUTOKA "variants" JSON - INADILI BIDHAA ZOTE */}
            {requiresSize && (
              <div className="my-4 p-4 bg-white border border-gray-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Chagua Size:
                  </label>
                  {selectedSize && (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      {selectedSize}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {variants.sizes.map((sz) => (
                    <button
                      key={sz.name}
                      type="button"
                      onClick={() => { setSelectedSize(sz.name); setOptionError(""); }}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border transition ${
                        selectedSize === sz.name
                          ? "bg-[#12182B] text-white border-[#12182B] shadow-sm"
                          : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {sz.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {requiresColor && (
              <div className="my-4 p-4 bg-white border border-gray-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Chagua Rangi:
                  </label>
                  {selectedColor && (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      {selectedColor}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {variants.colors.map((clr) => (
                    <button
                      key={clr.name}
                      type="button"
                      onClick={() => { setSelectedColor(clr.name); setOptionError(""); }}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border transition flex items-center gap-1.5 ${
                        selectedColor === clr.name
                          ? "bg-[#12182B] text-white border-[#12182B] shadow-sm"
                          : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {clr.image && (
                        <img src={clr.image} alt="" className="w-4 h-4 rounded-full object-cover" />
                      )}
                      {clr.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {requiresType && (
              <div className="my-4 p-4 bg-white border border-gray-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Chagua Aina / Uwezo (mfano Watts, Voltage, 220V/Battery):
                  </label>
                  {selectedType && (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      {selectedType}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {variants.types.map((tp) => (
                    <button
                      key={tp.name}
                      type="button"
                      onClick={() => { setSelectedType(tp.name); setOptionError(""); }}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border transition ${
                        selectedType === tp.name
                          ? "bg-[#12182B] text-white border-[#12182B] shadow-sm"
                          : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {tp.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {optionLabels.map((label) => (
              <div key={label} className="my-4 p-4 bg-white border border-gray-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Chagua {label}:
                  </label>
                  {selectedOptions[label] && (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      {selectedOptions[label]}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {variants.options[label].map((opt) => (
                    <button
                      key={opt.name}
                      type="button"
                      onClick={() => { setSelectedOptions((prev) => ({ ...prev, [label]: opt.name })); setOptionError(""); }}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border transition ${
                        selectedOptions[label] === opt.name
                          ? "bg-[#12182B] text-white border-[#12182B] shadow-sm"
                          : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {optionError && (
              <p className="text-xs text-red-500 font-medium mb-3">⚠️ {optionError}</p>
            )}

            <div className="flex flex-col gap-2 text-sm mb-5">
              <div className="flex justify-between border-b border-[#E4DFD2] pb-2">
                <span className="text-[#6B7280]">Zilizopo (Quantity)</span>
                <span className="font-semibold">
                  {product.quantity != null ? product.quantity : "Wasiliana nasi"}
                </span>
              </div>
              {product.warranty_info && (
                <div className="flex justify-between border-b border-[#E4DFD2] pb-2 gap-3">
                  <span className="text-[#6B7280] shrink-0">Dhamana (Warranty)</span>
                  <span className="font-semibold text-right">{product.warranty_info}</span>
                </div>
              )}
              {product.commission != null && (
                <div className="flex justify-between border-b border-[#E4DFD2] pb-2">
                  <span className="text-[#6B7280]">Commission ukishea</span>
                  <span className="font-semibold text-[#0B5852]">{product.commission}%</span>
                </div>
              )}
              {product.shipping_fee != null && Number(product.shipping_fee) > 0 && (
                <div className="flex justify-between border-b border-[#E4DFD2] pb-2">
                  <span className="text-[#6B7280]">Gharama ya Usafirishaji</span>
                  <span className="font-semibold">{fmtTZS(product.shipping_fee)}</span>
                </div>
              )}
            </div>

            {!added ? (
              <button
                onClick={handleAdd}
                className="w-full bg-[#12182B] hover:bg-black text-white py-3.5 rounded-lg font-semibold text-sm transition"
              >
                Ongeza kikapuni
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-center text-xs font-bold text-green-600 mb-1">✅ Imeongezwa Kikapuni!</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Link
                    href="/"
                    className="w-full bg-white border-2 border-[#12182B] text-[#12182B] py-3 rounded-lg font-semibold text-xs transition text-center"
                  >
                    🛍️ Endelea Kununua
                  </Link>
                  <Link
                    href="/?cart=1"
                    className="w-full bg-[#17A398] hover:bg-[#13847b] text-white py-3 rounded-lg font-semibold text-xs transition text-center"
                  >
                    🛒 Nenda Kikapuni
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MAONI YA WATEJA */}
        <div className="mt-10 sm:mt-14">
          <h2 className="text-lg sm:text-xl font-bold mb-1">Maoni ya wateja</h2>
          <p className="text-sm text-[#6B7280] mb-6">
            {avgRating
              ? `Wastani: ${avgRating} / 5 kutoka maoni ${reviews.length}`
              : "Bado hakuna maoni — kuwa wa kwanza kutoa maoni."}
          </p>

          <form onSubmit={handleReviewSubmit} className="max-w-md mb-8 space-y-3">
            <input
              placeholder="Jina lako"
              value={reviewName}
              onChange={(e) => setReviewName(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-[#17A398]"
            />
            <select
              value={reviewRating}
              onChange={(e) => setReviewRating(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-xl text-xs bg-white"
            >
              <option value={5}>⭐⭐⭐⭐⭐ Nzuri sana</option>
              <option value={4}>⭐⭐⭐⭐ Nzuri</option>
              <option value={3}>⭐⭐⭐ Wastani</option>
              <option value={2}>⭐⭐ Chini ya wastani</option>
              <option value={1}>⭐ Mbaya</option>
            </select>
            <textarea
              placeholder="Maoni yako kuhusu bidhaa hii"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-[#17A398]"
            ></textarea>
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#17A398] text-white py-2.5 px-5 rounded-lg font-semibold text-sm"
            >
              {submitting ? "Inatuma..." : "Tuma Maoni"}
            </button>
          </form>

          <div className="flex flex-col gap-3">
            {reviews.map((r) => (
              <div key={r.id} className="bg-white p-4 rounded-xl border border-gray-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-sm">{r.customer_name}</span>
                  <span className="text-xs text-[#E8A93B]">
                    {"⭐".repeat(r.rating)}
                  </span>
                </div>
                <p className="text-sm text-[#6B7280] leading-relaxed">{r.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
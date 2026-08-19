"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/context/CartContext";

function fmtTZS(n) {
  return (n || 0).toLocaleString("en-US") + " TZS";
}

// 1. Orodha za Chaguzi (Size za Nguo, Viatu na Aina za Mashine)
const CLOTHING_SIZES = ["S", "M", "L", "XL", "2XL", "3XL"];
const SHOE_SIZES = ["38", "39", "40", "41", "42", "43", "44", "45"];
const MACHINE_OPTIONS = ["Standard / Basic", "Heavy Duty / Pro", "220V / Electric", "Battery / Cordless"];

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id;
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [added, setAdded] = useState(false);

  // State za kuchagua Option na Error
  const [selectedSize, setSelectedSize] = useState("");
  const [sizeError, setSizeError] = useState("");

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
      if (!error) setProduct(data);
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

  // Mfumo wa kutambua kama bidhaa ni Viatu, Nguo au Mashine
  const productName = product?.name?.toLowerCase() || "";
  const productCat = product?.category?.toLowerCase() || "";

  const isShoes =
    productCat.includes("viatu") ||
    productName.includes("viatu") ||
    productName.includes("sneaker") ||
    productName.includes("shoe");

  const isClothing =
    productCat.includes("nguo") ||
    productName.includes("nguo") ||
    productName.includes("shirt") ||
    productName.includes("t-shirt") ||
    productName.includes("trouser") ||
    productName.includes("dress");

  const isMachine =
    productCat.includes("mashine") ||
    productCat.includes("vifaa") ||
    productName.includes("machine") ||
    productName.includes("saw") ||
    productName.includes("chainsaw") ||
    productName.includes("pump") ||
    productName.includes("router") ||
    productName.includes("soundbar");

  // Ni ipi inatakiwa kuonyeshwa?
  const requiresOption = isShoes || isClothing || isMachine;
  let availableOptions = [];
  let optionTitle = "";

  if (isShoes) {
    availableOptions = SHOE_SIZES;
    optionTitle = "Chagua Size (Viatu)";
  } else if (isClothing) {
    availableOptions = CLOTHING_SIZES;
    optionTitle = "Chagua Size (Nguo)";
  } else if (isMachine) {
    availableOptions = MACHINE_OPTIONS;
    optionTitle = "Chagua Model / Aina (Mashine/Kifaa)";
  }

  function handleAdd() {
    // Kama inahitaji mteja achague aina/size na hajachagua:
    if (requiresOption && !selectedSize) {
      setSizeError("Tafadhali chagua kwanza kabla ya kuongeza kikapuni!");
      return;
    }

    setSizeError("");
    addToCart(product.id, selectedSize);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
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

  const images = product.image_url
    ? product.image_url.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <main>
      <header className="sticky top-0 z-50 bg-[#12182B] border-b border-white/10">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="bg-[#E5383B] text-black font-display font-bold text-lg px-2 py-1">
              Ishi
            </span>
            <span className="font-display text-lg font-bold text-white">Kidijitali</span>
          </Link>
          <Link href="/" className="text-white/70 hover:text-white text-sm">
            ← Rudi Dukani
          </Link>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-5 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <div className="product-gallery-main">
              {images[activeImg] ? (
                <img src={images[activeImg]} alt={product.name} />
              ) : (
                <span>{product.emoji}</span>
              )}
            </div>
            {images.length > 1 && (
              <div className="product-thumbs">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`product-thumb ${i === activeImg ? "active" : ""}`}
                  >
                    <img src={img} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <span className={`origin-badge ${product.origin === "china" ? "china" : "dubai"}`}>
              {product.origin}
            </span>
            <h1 className="font-display text-2xl font-bold mt-3 mb-2">{product.name}</h1>
            <div className="font-mono-custom text-2xl font-bold text-[#12182B] mb-3">
              {fmtTZS(product.price)}
            </div>

            {product.quality_rating != null && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-[#6B7280] mb-1">
                  <span>Ubora uliothibitishwa na muuzaji</span>
                  <span className="font-semibold text-[#12182B]">
                    {product.quality_rating}%
                  </span>
                </div>
                <div className="quality-bar-track">
                  <div
                    className="quality-bar-fill"
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

            {/* SEHEMU YA CHAGUZI (SIZE YA NGUO/VIATU AU AINA YA MASHINE) */}
            {requiresOption && (
              <div className="my-5 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    {optionTitle}:
                  </label>
                  {selectedSize && (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      Umechagua: {selectedSize}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {availableOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setSelectedSize(opt);
                        setSizeError("");
                      }}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border transition ${
                        selectedSize === opt
                          ? "bg-[#12182B] text-white border-[#12182B] shadow-sm"
                          : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {sizeError && (
                  <p className="text-xs text-red-500 font-medium mt-2">
                    ⚠️ {sizeError}
                  </p>
                )}
              </div>
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
              <div className="flex justify-between border-b border-[#E4DFD2] pb-2">
                <span className="text-[#6B7280]">Commission ukishea</span>
                <span className="font-semibold text-[#0B5852]">{product.commission}%</span>
              </div>
            </div>

            <button
              onClick={handleAdd}
              className="w-full bg-[#12182B] hover:bg-black text-white py-3.5 rounded-lg font-semibold text-sm transition"
            >
              {added ? "Imeongezwa kikapuni ✓" : "Ongeza kikapuni"}
            </button>
          </div>
        </div>

        {/* MAONI YA WATEJA */}
        <div className="mt-14">
          <h2 className="font-display text-xl font-bold mb-1">Maoni ya wateja</h2>
          <p className="text-sm text-[#6B7280] mb-6">
            {avgRating
              ? `Wastani: ${avgRating} / 5 kutoka maoni ${reviews.length}`
              : "Bado hakuna maoni — kuwa wa kwanza kutoa maoni."}
          </p>

          <form onSubmit={handleReviewSubmit} className="checkout-form max-w-md mb-8">
            <input
              placeholder="Jina lako"
              value={reviewName}
              onChange={(e) => setReviewName(e.target.value)}
            />
            <select
              value={reviewRating}
              onChange={(e) => setReviewRating(Number(e.target.value))}
              className="review-select"
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
              className="review-textarea"
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
              <div key={r.id} className="review-card">
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
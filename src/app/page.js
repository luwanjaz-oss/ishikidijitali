"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useCart } from "../context/CartContext";

const WHATSAPP_NUMBER = "255754282086";
const LIPA_NAMBA = "58176639";
const NBC_ACCOUNT = "106174003449";
const ACCOUNT_NAME = "Zacharia Luwanja";

// Kama bidhaa haina "commission" iliyowekwa Supabase, hii ndiyo default.
const DEFAULT_COMMISSION_RATE = 0.20; // 20%

// COMMISSION INASOMWA MOJA KWA MOJA KUTOKA "products.commission" (Supabase).
// Jedwali la "affiliates" halina kolamu ya commission - kila msambazaji
// anapata commission kulingana na commission ya BIDHAA aliyouza, siyo
// kiwango chake binafsi.
function getProductCommissionRate(item) {
  const raw = item.commission;
  if (raw === null || raw === undefined || raw === "") {
    return DEFAULT_COMMISSION_RATE;
  }
  const num = Number(raw);
  if (Number.isNaN(num)) return DEFAULT_COMMISSION_RATE;
  // Mfano: 20 kwenye DB inamaanisha 20% -> 0.20
  return num > 1 ? num / 100 : num;
}

// MACHAGUO YA BIDHAA (size/rangi/aina) YANASOMWA KUTOKA "variants" (jsonb).
// Kila kipengele kinaweza kuwa NENO TU (mfano "Nyeusi"), AU OBJECT yenye
// picha na/au bei yake maalum, mfano:
// {
//   "colors": [
//     {"name": "Green", "image": "https://...", "price": 12600},
//     {"name": "Silver", "image": "https://...", "price": 13000},
//     "Blue"
//   ],
//   "sizes": ["S", "M", "L"],
//   "types": ["220V", "Battery"]
// }
// "image" na "price" ni HIARI - ukiacha, itatumia picha/bei ya kawaida ya bidhaa.
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
  if (!p?.variants) return { sizes: [], colors: [], types: [] };
  let v = p.variants;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return { sizes: [], colors: [], types: [] };
    }
  }
  return {
    sizes: normalizeVariantList(v.sizes),
    colors: normalizeVariantList(v.colors),
    types: normalizeVariantList(v.types),
  };
}

const MIKOA = [
  "Dar es Salaam", "Arusha", "Mwanza", "Dodoma", "Mbeya",
  "Morogoro", "Tanga", "Kilimanjaro (Moshi)", "Zanzibar",
  "Kigoma", "Tabora", "Iringa", "Ruvuma (Songea)", "Sumbawanga",
  "Mtwara", "Lindi", "Shinyanga", "Kagera (Bukoba)", "Mara (Musoma)"
];

const TRANSPORT_ROUTES = [
  { flag: "🇨🇳", name: "China → Dar es Salaam", days: "Siku 7 - 14 (Air Cargo)", progress: "75%" },
  { flag: "🇺🇸", name: "USA → Dar es Salaam", days: "Siku 10 - 14 (Express)", progress: "60%" },
  { flag: "🇦🇪", name: "Dubai → Dar es Salaam", days: "Siku 5 - 7 (Direct Flight)", progress: "90%" },
  { flag: "🚢", name: "China Meli → Tanzania", days: "Siku 25 - 35 (Heavy Cargo)", progress: "40%" },
  { flag: "🚌", name: "Kariakoo → Mikoani Kote", days: "Siku 1 (Mabasi / Express)", progress: "98%" },
];

// FURSA ZA ISHI KIDIJITALI - inaonyesha kwa mzunguko (animation) kwenye Hero
const FURSA_ZA_ISHIKI = [
  { icon: "💰", title: "Kuwa Msambazaji", desc: "Sambaza link yako, pata commission kwa kila mauzo" },
  { icon: "🏪", title: "Anzisha Biashara", desc: "Anza biashara yako bila mtaji mkubwa" },
  { icon: "🏠", title: "Pambeza Nyumba", desc: "Bidhaa za kipekee za kuipendezesha nyumba yako" },
  { icon: "📈", title: "Kuza Biashara", desc: "Ongeza bidhaa mpya, kuza biashara uliyonayo" },
  { icon: "💡", title: "Ubunifu Mpya", desc: "Vifaa na mashine za kisasa kwa miradi yako" },
];

const SOCIAL_LINKS = {
  pinterest: "https://pin.it/PxxgDcZDk",
  instagram: "https://www.instagram.com/ishikidijitali?igsi=MWhibWk5Nzg0ZDNtcg%3D%3D&utm_source=qr",
  facebook: "https://www.facebook.com/share/1G4nPDXpyA/?mibextid=wwXIfr",
  tiktok: "https://www.tiktok.com/@lifestlyeservices?_r=1&_t=ZS-9943ipbBtPI",
  whatsapp: `https://wa.me/${WHATSAPP_NUMBER}`,
};

const CATEGORIES = [
  { id: "wote", label: "Vyote" },
  { id: "elektroniki", label: "Elektroniki" },
  { id: "vitu_vyote", label: "Zana & Mashine" },
  { id: "fashion", label: "Mavazi & Viatu" },
];

function fmtTZS(n) {
  return (n || 0).toLocaleString("en-US") + " TZS";
}

function getProductImages(p) {
  if (!p?.image_url) return [];
  return p.image_url.split(",").map((s) => s.trim()).filter(Boolean);
}

export default function Home() {
  const cartContext = useCart();
  const cart = cartContext.cart || [];
  const addToCart = cartContext.addToCart;
  const removeFromCart = cartContext.removeFromCart;
  const updateQty = cartContext.updateQty;
  const clearCart = cartContext.clearCart;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerMkoa, setCustomerMkoa] = useState("Dar es Salaam");
  const [customerAddress, setCustomerAddress] = useState("");

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [modalGalleryIdx, setModalGalleryIdx] = useState(0);

  const [routeIdx, setRouteIdx] = useState(0);
  const [fursaIdx, setFursaIdx] = useState(0);
  const [category, setCategory] = useState("wote");

  // TRACKING - inatafuta oda halisi kwenye Supabase kwa namba ya simu
  const [trackingInput, setTrackingInput] = useState("");
  const [trackingResults, setTrackingResults] = useState(null);
  const [trackingError, setTrackingError] = useState("");
  const [trackingLoading, setTrackingLoading] = useState(false);

  const [activeRefCode, setActiveRefCode] = useState("");

  const [checkoutStatus, setCheckoutStatus] = useState("idle");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref") || localStorage.getItem("ishiki_ref_code");
      if (ref) {
        setActiveRefCode(ref);
        localStorage.setItem("ishiki_ref_code", ref);
      }
    }
  }, []);

  useEffect(() => {
    async function loadProducts() {
      if (supabase) {
        const { data } = await supabase.from("products").select("*").order("id", { ascending: true });
        setProducts(data || []);
      }
      setLoading(false);
    }
    loadProducts();
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setRouteIdx((i) => (i + 1) % TRANSPORT_ROUTES.length);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setFursaIdx((i) => (i + 1) % FURSA_ZA_ISHIKI.length);
    }, 2800);
    return () => clearInterval(t);
  }, []);

  const handleOpenProductModal = (product) => {
    setSelectedProduct(product);
    const { sizes, colors, types } = getProductVariants(product);
    setSelectedSize(sizes[0]?.name || "");
    setSelectedColor(colors[0]?.name || "");
    setSelectedType(types[0]?.name || "");
    setModalGalleryIdx(0);
  };

  const handleAddToCartWithOptions = () => {
    if (!selectedProduct) return;
    const { sizes, colors, types } = getProductVariants(selectedProduct);
    const sizeObj = sizes.find((s) => s.name === selectedSize);
    const colorObj = colors.find((c) => c.name === selectedColor);
    const typeObj = types.find((t) => t.name === selectedType);
    // Bei ya mwisho: rangi > aina > size > bei ya kawaida ya bidhaa
    const effectivePrice = colorObj?.price ?? typeObj?.price ?? sizeObj?.price ?? selectedProduct.price;
    const effectiveImage = colorObj?.image || typeObj?.image || sizeObj?.image || null;
    // Shipping fee ya mwisho: rangi > aina > size > shipping_fee ya kawaida ya bidhaa
    const effectiveShippingFee = colorObj?.shipping_fee ?? typeObj?.shipping_fee ?? sizeObj?.shipping_fee ?? selectedProduct.shipping_fee;

    const itemWithOptions = {
      ...selectedProduct,
      price: effectivePrice,
      basePrice: selectedProduct.price,
      shipping_fee: effectiveShippingFee,
      selectedSize,
      selectedColor,
      selectedType,
      variantImage: effectiveImage,
      qty: 1,
    };
    if (addToCart) addToCart(itemWithOptions);
    setSelectedProduct(null);
    setCheckoutStatus("idle");
    setShowCartDrawer(true);
  };

  const handleQtyChange = (identifier, change) => {
    const currentItem = cart.find(
      (i) => (i.cartItemId || i.id) === identifier
    );
    if (!currentItem) return;

    const newQty = (currentItem.qty || 1) + change;

    if (updateQty) {
      updateQty(identifier, newQty);
    } else if (newQty <= 0 && removeFromCart) {
      removeFromCart(identifier);
    }
  };

  const handleWhatsAppCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0 || checkoutStatus === "submitting") return;

    setCheckoutStatus("submitting");

    // SUBTOTAL - jumla ya bei za bidhaa peke yake (bila usafiri)
    let subtotal = 0;
    let totalCommission = 0;
    cart.forEach((item) => {
      const lineTotal = (item.price || 0) * (item.qty || 1);
      subtotal += lineTotal;
      if (activeRefCode) {
        totalCommission += lineTotal * getProductCommissionRate(item);
      }
    });

    // SHIPPING FEE - kwa sasa ni jumla rahisi ya shipping_fee x idadi ya kila
    // bidhaa. TAHADHARI: hii bado HAIZINGATII CBM (meli) wala tofauti ya
    // uzito kwa ndege - itahitaji muundo zaidi baadaye (bado tunajadiliana).
    let shippingFee = 0;
    cart.forEach((item) => {
      const perUnitShipping = Number(item.shipping_fee) || 0;
      shippingFee += perUnitShipping * (item.qty || 1);
    });

    const total = subtotal + shippingFee;

    // ITEMS - orodha ya bidhaa (JSON text) inayohifadhiwa kwenye kolamu "items"
    const itemsSummary = JSON.stringify(
      cart.map((item) => ({
        name: item.name,
        qty: item.qty || 1,
        price: item.price,
        size: item.selectedSize || null,
        color: item.selectedColor || null,
        type: item.selectedType || null,
      }))
    );

    let orderInsertError = null;
    try {
      if (supabase) {
        const { error } = await supabase.from("orders").insert([
          {
            customer_name: customerName,
            customer_phone: customerPhone,
            region: `${customerMkoa}${customerAddress ? " - " + customerAddress : ""}`,
            items: itemsSummary,
            subtotal: subtotal,
            shipping_fee: shippingFee,
            total: total,
            ref_code: activeRefCode || null,
            commission_total: activeRefCode ? Math.round(totalCommission) : 0,
            status: "pending",
          }
        ]);
        if (error) orderInsertError = error;
      }
    } catch (err) {
      orderInsertError = err;
    }

    if (orderInsertError) {
      console.error("Supabase order error:", orderInsertError);
      // Tunamwonya mtumiaji badala ya kuficha kimya kimya - hii inasaidia
      // kubaini haraka ikiwa jina la kolamu halifanani na Supabase.
      alert("Kuna tatizo la kuhifadhi oda Supabase (ingawa WhatsApp itafunguka). Tafadhali mwambie msimamizi: " + (orderInsertError.message || "unknown error"));
    }

    let message = "📦 *ODA MPYA KUTOKA WEBSITE (ISHI KIDIJITALI)*\n\n";
    message += `👤 *Mteja:* ${customerName || "Bila Jina"}\n`;
    message += `📞 *Simu:* ${customerPhone || "Haijawekwa"}\n`;
    message += `📍 *Mkoa:* ${customerMkoa}\n`;
    message += `🏠 *Eneo/Mtaa:* ${customerAddress || "Haikutajwa"}\n`;
    if (activeRefCode) message += `🔗 *Msambazaji Ref:* ${activeRefCode}\n`;
    message += "\n📋 *ORODHA YA BIDHAA:*\n";

    cart.forEach((item, index) => {
      const itemQty = item.qty || 1;
      const itemTotal = item.price * itemQty;
      message += `${index + 1}. *${item.name}*\n`;
      if (item.selectedSize) message += `   • Size: ${item.selectedSize}\n`;
      if (item.selectedColor) message += `   • Rangi: ${item.selectedColor}\n`;
      if (item.selectedType) message += `   • Aina/Uwezo: ${item.selectedType}\n`;
      message += `   • Idadi: ${itemQty} x ${fmtTZS(item.price)} = ${fmtTZS(itemTotal)}\n\n`;
    });

    message += `💰 *Bei ya Bidhaa:* ${fmtTZS(subtotal)}\n`;
    if (shippingFee > 0) message += `🚚 *Gharama ya Usafiri:* ${fmtTZS(shippingFee)}\n`;
    message += `💵 *JUMLA KUU:* ${fmtTZS(total)}\n\n`;
    message += "Tafadhali nithibitishie oda hii na kunipatia maelekezo ya kumalizia!";

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");

    if (clearCart) clearCart();
    setCheckoutStatus("success");
  };

  const closeCheckoutSuccess = () => {
    setShowCartDrawer(false);
    setCheckoutStatus("idle");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
  };

  // TRACKING - Inatafuta oda za kweli kwenye Supabase kwa namba ya simu
  // (au ID ya oda kama mteja anaifahamu).
  const handleTrackOrder = async (e) => {
    e.preventDefault();
    const query = trackingInput.trim();
    if (!query) return;

    setTrackingLoading(true);
    setTrackingError("");
    setTrackingResults(null);

    try {
      let data = null;
      let error = null;

      if (/^\d+$/.test(query) && query.length <= 6) {
        const res = await supabase.from("orders").select("*").eq("id", query);
        data = res.data;
        error = res.error;
      }

      if (!data || data.length === 0) {
        const cleanPhone = query.replace(/\s+/g, "");
        const res = await supabase
          .from("orders")
          .select("*")
          .ilike("customer_phone", `%${cleanPhone}%`)
          .order("created_at", { ascending: false });
        data = res.data;
        error = res.error;
      }

      if (error) throw error;

      if (!data || data.length === 0) {
        setTrackingError("Hatujapata oda yoyote yenye namba hiyo. Hakikisha umeandika namba ya simu uliyotumia wakati wa oda.");
      } else {
        setTrackingResults(data);
      }
    } catch (err) {
      console.error("Tracking error:", err);
      setTrackingError("Imeshindwa kutafuta oda. Tafadhali jaribu tena au wasiliana nasi WhatsApp.");
    } finally {
      setTrackingLoading(false);
    }
  };

  const closeTrackingModal = () => {
    setShowTrackingModal(false);
    setTrackingInput("");
    setTrackingResults(null);
    setTrackingError("");
  };

  const cartCount = cart ? cart.reduce((s, i) => s + (i.qty || 1), 0) : 0;
  const cartTotal = cart ? cart.reduce((s, i) => s + i.price * (i.qty || 1), 0) : 0;
  const filteredProducts = products.filter((p) => category === "wote" || p.category === category);
  const currentRoute = TRANSPORT_ROUTES[routeIdx];
  const currentFursa = FURSA_ZA_ISHIKI[fursaIdx];

  const modalImages = selectedProduct ? getProductImages(selectedProduct) : [];
  const modalVariants = selectedProduct ? getProductVariants(selectedProduct) : { sizes: [], colors: [], types: [] };

  return (
    <main className="bg-[#F7F3EA] min-h-screen relative text-[#12182B]">
      {/* NAVBAR */}
      <header className="sticky top-0 z-40 bg-[#12182B] text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="bg-[#E5383B] text-black font-extrabold text-sm px-2 py-0.5 rounded">Ishi</span>
            <div className="flex flex-col leading-none">
              <span className="text-base font-bold tracking-tight">Kidijitali</span>
              <span className="text-[8px] text-white/50 tracking-widest uppercase">Lifestyle Service</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-white/80">
            <Link href="#duka" className="hover:text-white transition-colors">Duka</Link>
            <a href="#kuhusu" className="hover:text-white transition-colors">Kuhusu Sisi</a>
            <button onClick={() => setShowTrackingModal(true)} className="hover:text-white transition-colors">Fuatilia Mzigo 📦</button>
            <a href="#uwekezaji" className="hover:text-white transition-colors">Wekeza / Lipa Namba 💰</a>
            <Link href="/wasambazaji" className="hover:text-[#17A398] text-[#E8A93B] font-bold transition-colors">Wasambazaji 🤝</Link>
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={() => { setCheckoutStatus("idle"); setShowCartDrawer(true); }} className="bg-[#17A398] hover:bg-[#13847b] text-white px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow flex items-center gap-2">
              <span>🛒 Kikapu</span>
              <span className="bg-white text-[#12182B] px-2 py-0.2 rounded-full text-[10px] font-extrabold">{cartCount}</span>
            </button>
            <button
              onClick={() => setShowMobileMenu((v) => !v)}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white"
              aria-label="Menu"
            >
              {showMobileMenu ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {showMobileMenu && (
          <div className="md:hidden bg-[#12182B] border-t border-white/10 px-4 py-3 flex flex-col gap-3 text-xs font-semibold text-white/80">
            <a href="#duka" onClick={() => setShowMobileMenu(false)} className="py-1">Duka</a>
            <a href="#kuhusu" onClick={() => setShowMobileMenu(false)} className="py-1">Kuhusu Sisi</a>
            <button
              onClick={() => { setShowTrackingModal(true); setShowMobileMenu(false); }}
              className="py-1 text-left"
            >
              Fuatilia Mzigo 📦
            </button>
            <a href="#uwekezaji" onClick={() => setShowMobileMenu(false)} className="py-1">Wekeza / Lipa Namba 💰</a>
            <Link href="/wasambazaji" onClick={() => setShowMobileMenu(false)} className="py-1 text-[#E8A93B] font-bold">
              Wasambazaji 🤝
            </Link>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="bg-[#12182B] text-white px-4 py-10 sm:py-14 border-b border-white/10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="inline-block bg-[#E8A93B]/20 text-[#E8A93B] text-xs font-bold px-3 py-1 rounded-full mb-3 border border-[#E8A93B]/30">
              ⚡ HUDUMA YA HARAKA & YA UHAKIKA
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight mb-4">
              Niagize Vitu Vyovyote Kutoka Dar es Salaam, China, USA na Dubai.
            </h1>
            <p className="text-white/70 text-xs sm:text-sm mb-6 max-w-md">
              Tafuta bidhaa au mashine yoyote - tunakununulia kutoka sokoni Kariakoo au Nje ya Nchi na kukuletea mkoani kwako kwa usalama.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Habari, nataka kuagiza bidhaa/kifaa.")}`} target="_blank" rel="noreferrer" className="bg-[#E8A93B] hover:bg-[#d4962d] text-[#12182B] px-5 py-3 rounded-xl font-bold text-xs transition-colors shadow-lg">
                Agiza Kitu WhatsApp
              </a>
              <Link href="/wasambazaji" className="bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-xl font-semibold text-xs border border-white/20 transition-colors">
                Jiunge Kama Msambazaji
              </Link>
            </div>

            {/* FURSA ZA ISHI KIDIJITALI - INAZUNGUKA (ANIMATION) */}
            <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-4 max-w-sm overflow-hidden">
              <span className="text-[10px] font-bold text-[#E8A93B] uppercase tracking-wider">
                Fursa Zilizopo Ishi Kidijitali
              </span>
              <div key={fursaIdx} className="mt-2 flex items-center gap-3 fursa-fade">
                <span className="text-3xl shrink-0">{currentFursa.icon}</span>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">{currentFursa.title}</p>
                  <p className="text-[11px] text-white/60 leading-snug">{currentFursa.desc}</p>
                </div>
              </div>
              <div className="flex gap-1.5 mt-3">
                {FURSA_ZA_ISHIKI.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1 rounded-full transition-all duration-500 ${
                      i === fursaIdx ? "w-6 bg-[#E8A93B]" : "w-1.5 bg-white/20"
                    }`}
                  ></span>
                ))}
              </div>
            </div>
            <style jsx>{`
              @keyframes fursaFadeIn {
                from { opacity: 0; transform: translateY(6px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .fursa-fade {
                animation: fursaFadeIn 0.5s ease-out;
              }
            `}</style>
          </div>

          <div className="bg-gradient-to-br from-[#1D2440] to-[#17A398]/20 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-[#E8A93B] uppercase tracking-wider flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Live Usafirishaji & Logistics
              </span>
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/70">Real-time Updates</span>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/10 transition-all duration-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{currentRoute.flag}</span>
                <span className="text-xs font-bold text-[#17A398] bg-[#17A398]/10 px-2.5 py-1 rounded-full border border-[#17A398]/30">
                  {currentRoute.days}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mb-1">{currentRoute.name}</h4>
              <p className="text-[11px] text-white/60 mb-3">Mizigo inakaguliwa na kusafirishwa kila siku kwenda mikoa yote.</p>

              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#17A398] h-full transition-all duration-1000 ease-out"
                  style={{ width: currentRoute.progress }}
                ></div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-1.5 text-[11px] text-white/70">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span>💳 Vodacom Lipa Namba: <strong className="text-white">{LIPA_NAMBA}</strong></span>
                <span>🏦 NBC: <strong className="text-white">{NBC_ACCOUNT}</strong></span>
              </div>
              <span className="text-white/50">👤 Jina la Akaunti: <strong className="text-white/80">{ACCOUNT_NAME}</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* KUHUSU SISI */}
      <section id="kuhusu" className="max-w-6xl mx-auto px-4 py-10">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="inline-block bg-[#17A398]/10 text-[#0B5852] text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mb-3">
            Kuhusu Sisi
          </span>
          <h2 className="text-xl sm:text-2xl font-bold mb-3">Ishi Kidijitali ni Nani?</h2>
          <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
            Ishi Kidijitali tunakuletea bidhaa mbalimbali kutoka China, USA, Dubai na hapa Dar es Salaam -
            vitu vinavyokusaidia kuongeza ubunifu kwenye biashara yako, kuishi maisha ya kidijitali,
            kupendezesha nyumba yako, kuanzisha biashara bila mtaji mkubwa, au kukuza biashara uliyonayo
            tayari. Tunashughulikia utafutaji, ununuzi, na usafirishaji - wewe unabaki na kazi ya kuuza
            au kutumia bidhaa hiyo.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white border border-[#E4DFD2] rounded-2xl p-4 text-center">
            <span className="text-2xl block mb-2">💡</span>
            <p className="text-[11px] sm:text-xs font-bold text-[#12182B]">Ubunifu wa Biashara</p>
          </div>
          <div className="bg-white border border-[#E4DFD2] rounded-2xl p-4 text-center">
            <span className="text-2xl block mb-2">🏠</span>
            <p className="text-[11px] sm:text-xs font-bold text-[#12182B]">Kupendezesha Nyumba</p>
          </div>
          <div className="bg-white border border-[#E4DFD2] rounded-2xl p-4 text-center">
            <span className="text-2xl block mb-2">🚀</span>
            <p className="text-[11px] sm:text-xs font-bold text-[#12182B]">Anza Bila Mtaji Mkubwa</p>
          </div>
          <div className="bg-white border border-[#E4DFD2] rounded-2xl p-4 text-center">
            <span className="text-2xl block mb-2">📈</span>
            <p className="text-[11px] sm:text-xs font-bold text-[#12182B]">Kukuza Biashara Yako</p>
          </div>
        </div>
      </section>

      {/* DUKA KUU */}
      <section id="duka" className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Bidhaa Zilizopo Duka Kuu</h2>
            <p className="text-xs text-gray-500">Chagua bidhaa na uagize kwa urahisi</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  category === cat.id ? "bg-[#12182B] text-white shadow" : "bg-white text-gray-600 border border-gray-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-gray-500 py-8 text-center">Inapakia bidhaa...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-xs text-gray-500 py-8 text-center">Hakuna bidhaa kwenye category hii kwa sasa.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
            {filteredProducts.map((p) => {
              const images = getProductImages(p);
              return (
                <div key={p.id} className="bg-white border border-[#E4DFD2] rounded-2xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-all">
                  <Link href={`/product/${p.id}`} className="h-40 sm:h-52 bg-[#F0FAF8] relative flex items-center justify-center p-2">
                    <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-[#17A398] text-white text-[9px] sm:text-[10px] font-bold uppercase px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full z-10">
                      {p.origin || "DSM / China"}
                    </span>
                    {images.length > 1 && (
                      <span className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-black/50 text-white text-[9px] font-bold px-2 py-0.5 rounded-full z-10">
                        📷 {images.length}
                      </span>
                    )}
                    {images.length > 0 ? (
                      <img src={images[0]} alt={p.name} className="h-full object-contain hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <span className="text-4xl sm:text-5xl">{p.emoji || "📦"}</span>
                    )}
                  </Link>

                  <div className="p-3 sm:p-4 flex flex-col gap-2 flex-1">
                    <Link href={`/product/${p.id}`}>
                      <h3 className="text-xs sm:text-sm font-bold text-[#12182B] line-clamp-1">{p.name}</h3>
                    </Link>
                    <p className="text-[11px] sm:text-xs text-[#6B7280] line-clamp-2 leading-relaxed">{p.description}</p>

                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <span className="block font-extrabold text-[#12182B] text-sm sm:text-base">{fmtTZS(p.price)}</span>
                        <span className="text-[9px] sm:text-[10px] text-green-600 font-bold">✓ Pay on Delivery</span>
                      </div>
                      <button
                        onClick={() => handleOpenProductModal(p)}
                        className="bg-[#12182B] hover:bg-[#17A398] text-white text-[11px] sm:text-xs font-bold px-2.5 py-2 sm:px-3 rounded-xl transition-colors"
                      >
                        + Ongeza
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* WEKEZA & MALIPO */}
      <section id="uwekezaji" className="max-w-6xl mx-auto px-4 py-10">
        <div className="bg-[#12182B] text-white rounded-3xl p-6 sm:p-10 border border-white/10 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="bg-[#E8A93B] text-black text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
              Mfumo wa Akiba & Malipo
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold mt-3 leading-tight">
              Lipa Namba ya Vodacom & Akaunti ya NBC
            </h2>
            <p className="text-xs sm:text-sm text-white/70 mt-3 leading-relaxed">
              Tuma malipo au weka akiba kidogo kidogo kuanzia TZS 10,000. Lipa Namba yetu inakaribisha mitandao yote ya simu na benki.
            </p>
          </div>
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-xs text-white/80 space-y-4">
            <div>
              <p className="font-bold text-[#E8A93B] text-sm mb-1">📲 Lipa Namba (Vodacom):</p>
              <p className="text-xl font-black font-mono text-white">{LIPA_NAMBA}</p>
              <p className="text-[10px] text-white/60">Tigo Pesa, M-Pesa, Airtel Money, Halopesa & Benki</p>
            </div>
            <div className="pt-3 border-t border-white/10">
              <p className="font-bold text-[#E8A93B] text-sm mb-1">🏦 NBC Bank Account:</p>
              <p className="text-lg font-black font-mono text-white">{NBC_ACCOUNT}</p>
              <p className="text-[10px] text-white/60">Jina la Akaunti: {ACCOUNT_NAME}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#12182B] text-white border-t border-white/10 py-10 px-4 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <span className="font-bold text-sm text-[#E8A93B]">Ishi Kidijitali</span>
            <p className="text-white/50 text-[11px] mt-1">© {new Date().getFullYear()} Ishi Kidijitali. Haki zote zimehifadhiwa.</p>
          </div>

          <div className="flex items-center gap-3">
            <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 flex items-center justify-center hover:scale-110 transition-transform shadow">
              <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
            <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-[#1877F2] flex items-center justify-center hover:scale-110 transition-transform shadow">
              <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href={SOCIAL_LINKS.tiktok} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-black flex items-center justify-center hover:scale-110 transition-transform shadow border border-white/20">
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.82.56-1.31 1.52-1.28 2.51.02.83.42 1.63 1.07 2.15.77.63 1.8.88 2.76.71 1.05-.16 1.98-.87 2.37-1.87.27-.67.36-1.41.35-2.13V.02z"/></svg>
            </a>
            <a href={SOCIAL_LINKS.pinterest} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-[#E60023] flex items-center justify-center hover:scale-110 transition-transform shadow">
              <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/></svg>
            </a>
            <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center hover:scale-110 transition-transform shadow">
              <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
            </a>
          </div>
        </div>
      </footer>

      {/* PRODUCT VARIATION MODAL - inasoma "variants" JSON kutoka Supabase */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 sm:p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 font-bold text-gray-400 hover:text-black">✕</button>

            {(() => {
              const sizeObj = modalVariants.sizes.find((s) => s.name === selectedSize);
              const colorObj = modalVariants.colors.find((c) => c.name === selectedColor);
              const typeObj = modalVariants.types.find((t) => t.name === selectedType);
              const variantImage = colorObj?.image || typeObj?.image || sizeObj?.image || null;
              const variantPrice = colorObj?.price ?? typeObj?.price ?? sizeObj?.price ?? null;
              const displayImage = variantImage || modalImages[modalGalleryIdx];
              const displayPrice = variantPrice !== null ? variantPrice : selectedProduct.price;

              return (
                <>
                  {(displayImage || modalImages.length > 0) && (
                    <div className="mb-4">
                      <div className="h-44 sm:h-52 bg-[#F0FAF8] rounded-xl flex items-center justify-center overflow-hidden">
                        {displayImage ? (
                          <img src={displayImage} alt={selectedProduct.name} className="h-full object-contain" />
                        ) : null}
                      </div>
                      {!variantImage && modalImages.length > 1 && (
                        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                          {modalImages.map((img, i) => (
                            <button
                              key={i}
                              onClick={() => setModalGalleryIdx(i)}
                              className={`shrink-0 w-12 h-12 rounded-lg border-2 overflow-hidden ${i === modalGalleryIdx ? "border-[#17A398]" : "border-gray-200"}`}
                            >
                              <img src={img} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <h3 className="text-base font-bold text-[#12182B] mb-1">{selectedProduct.name}</h3>
                  <p className="text-xs font-bold text-[#17A398] mb-4">
                    {fmtTZS(displayPrice)}
                    {variantPrice !== null && variantPrice !== selectedProduct.price && (
                      <span className="text-gray-400 font-normal line-through ml-2">{fmtTZS(selectedProduct.price)}</span>
                    )}
                  </p>
                </>
              );
            })()}

            {modalVariants.sizes.length > 0 && (
              <div className="mb-4">
                <label className="text-xs font-bold block mb-1">Chagua Size:</label>
                <div className="flex gap-2 flex-wrap">
                  {modalVariants.sizes.map((sz) => (
                    <button
                      key={sz.name}
                      onClick={() => setSelectedSize(sz.name)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border ${selectedSize === sz.name ? "bg-[#12182B] text-white border-[#12182B]" : "bg-gray-50 border-gray-200"}`}
                    >
                      {sz.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {modalVariants.colors.length > 0 && (
              <div className="mb-4">
                <label className="text-xs font-bold block mb-1">Chagua Rangi:</label>
                <div className="flex gap-2 flex-wrap">
                  {modalVariants.colors.map((clr) => (
                    <button
                      key={clr.name}
                      onClick={() => setSelectedColor(clr.name)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${selectedColor === clr.name ? "bg-[#12182B] text-white border-[#12182B]" : "bg-gray-50 border-gray-200"}`}
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

            {modalVariants.types.length > 0 && (
              <div className="mb-4">
                <label className="text-xs font-bold block mb-1">Chagua Aina / Uwezo (mfano Watts, Voltage, 220V/Battery):</label>
                <div className="flex gap-2 flex-wrap">
                  {modalVariants.types.map((tp) => (
                    <button
                      key={tp.name}
                      onClick={() => setSelectedType(tp.name)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border ${selectedType === tp.name ? "bg-[#12182B] text-white border-[#12182B]" : "bg-gray-50 border-gray-200"}`}
                    >
                      {tp.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleAddToCartWithOptions}
              className="w-full bg-[#17A398] hover:bg-[#13847b] text-white text-xs font-bold py-3 rounded-xl transition-all shadow mt-2"
            >
              Weka Kikapuni 🛒
            </button>
          </div>
        </div>
      )}

      {/* TRACKING MODAL - INATAFUTA ODA HALISI KWENYE SUPABASE */}
      {showTrackingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 relative shadow-2xl max-h-[85vh] overflow-y-auto">
            <button onClick={closeTrackingModal} className="absolute top-4 right-4 font-bold text-gray-400 hover:text-black">✕</button>
            <h3 className="text-base font-bold text-[#12182B] mb-3">📦 Fuatilia Mzigo Wako</h3>
            <p className="text-xs text-gray-500 mb-4">Weka namba ya simu uliyotumia wakati wa kuagiza, tutakuonyesha oda zako.</p>

            <form onSubmit={handleTrackOrder} className="flex gap-2 mb-4">
              <input
                type="text"
                required
                placeholder="0754XXXXXX"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-[#17A398]"
              />
              <button
                type="submit"
                disabled={trackingLoading}
                className="bg-[#12182B] hover:bg-[#17A398] disabled:opacity-60 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
              >
                {trackingLoading ? "..." : "Tafuta"}
              </button>
            </form>

            {trackingError && (
              <p className="text-xs text-red-500 font-medium mb-3">⚠️ {trackingError}</p>
            )}

            {trackingResults && (
              <div className="space-y-3 mb-4">
                {trackingResults.map((order) => (
                  <div key={order.id} className="p-3 bg-[#F7F3EA] rounded-xl text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-[#12182B]">Oda #{order.id}</span>
                      <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full text-[10px] uppercase">
                        {order.status || "pending"}
                      </span>
                    </div>
                    <p className="text-gray-600">📍 {order.region}</p>
                    <p className="text-gray-600">💵 {fmtTZS(order.total)}</p>
                    <p className="text-gray-400 text-[10px] mt-1">
                      {order.created_at ? new Date(order.created_at).toLocaleString("sw-TZ") : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Habari, nataka msaada kuhusu mzigo wangu.")}`}
              target="_blank"
              rel="noreferrer"
              className="block text-center w-full bg-[#25D366] hover:bg-[#1ea952] text-white text-xs font-bold py-3 rounded-xl transition-colors"
            >
              Bado Una Swali? Wasiliana Nasi WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* KIKAPU DRAWER */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md h-full p-5 sm:p-6 flex flex-col justify-between relative shadow-2xl overflow-y-auto">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <h3 className="text-base font-bold text-[#12182B]">
                  {checkoutStatus === "success" ? "🛒 Kikapu Chako" : `🛒 Kikapu Chako (${cartCount})`}
                </h3>
                <button
                  onClick={() => (checkoutStatus === "success" ? closeCheckoutSuccess() : setShowCartDrawer(false))}
                  className="text-gray-400 font-bold hover:text-black"
                >
                  ✕
                </button>
              </div>

              {checkoutStatus === "success" ? (
                <div className="flex flex-col items-center justify-center text-center py-16 px-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <span className="text-3xl">✅</span>
                  </div>
                  <h3 className="text-base font-bold text-[#12182B] mb-2">Ombi Lako Limepokelewa!</h3>
                  <p className="text-xs text-gray-500 mb-6 max-w-xs leading-relaxed">
                    Asante kwa oda yako. Timu yetu imepokea taarifa zote na utataarifiwa hivi karibuni
                    kupitia WhatsApp / Simu kuhusu hatua zinazofuata za usafirishaji.
                  </p>
                  <button
                    onClick={closeCheckoutSuccess}
                    className="bg-[#12182B] hover:bg-[#17A398] text-white text-xs font-bold px-6 py-3 rounded-xl transition-colors"
                  >
                    Sawa, Nimeelewa
                  </button>
                </div>
              ) : cart.length === 0 ? (
                <p className="text-xs text-gray-500 py-10 text-center">Kikapu chako kipo wazi kwa sasa.</p>
              ) : (
                <>
                  <div className="mt-4 space-y-3 max-h-[35vh] overflow-y-auto pr-1 border-b border-gray-100 pb-4">
                    {cart.map((item, idx) => {
                      const itemKey = item.cartItemId || item.id;
                      return (
                        <div key={itemKey || idx} className="p-3 bg-[#F7F3EA] rounded-xl flex items-center justify-between text-xs gap-2">
                          <div className="flex-1 pr-2">
                            <h4 className="font-bold text-[#12182B]">{item.name}</h4>
                            <div className="text-[10px] text-gray-500 flex flex-wrap gap-x-2">
                              {item.selectedSize && <span>Size: {item.selectedSize}</span>}
                              {item.selectedColor && <span>Rangi: {item.selectedColor}</span>}
                              {item.selectedType && <span>Aina: {item.selectedType}</span>}
                            </div>
                            <span className="font-bold text-[#17A398]">{fmtTZS(item.price)}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => handleQtyChange(itemKey, -1)} className="bg-gray-200 text-black px-2 py-0.5 rounded font-bold">-</button>
                            <span className="font-bold">{item.qty || 1}</span>
                            <button onClick={() => handleQtyChange(itemKey, 1)} className="bg-gray-200 text-black px-2 py-0.5 rounded font-bold">+</button>
                            <button onClick={() => removeFromCart && removeFromCart(itemKey)} className="text-red-500 font-bold ml-1">✕</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <form onSubmit={handleWhatsAppCheckout} className="mt-4 space-y-3">
                    <h4 className="text-xs font-extrabold text-[#12182B] uppercase tracking-wider">Taarifa za Mteja & Mkoa</h4>

                    <div>
                      <label className="text-[11px] font-bold block mb-1">Jina Kamili:</label>
                      <input
                        type="text"
                        required
                        placeholder="Mfano: Juma Ally"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-[#17A398]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold block mb-1">Simu (WhatsApp):</label>
                        <input
                          type="tel"
                          required
                          placeholder="0754XXXXXX"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-[#17A398]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold block mb-1">Mkoa Unapokaa:</label>
                        <select
                          value={customerMkoa}
                          onChange={(e) => setCustomerMkoa(e.target.value)}
                          className="w-full px-2 py-2 border rounded-xl text-xs focus:outline-none focus:border-[#17A398] bg-white font-semibold"
                        >
                          {MIKOA.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold block mb-1">Wilaya / Eneo / Mtaa:</label>
                      <input
                        type="text"
                        required
                        placeholder="Mfano: Ubungo, Sinza au Mbeya Mjini"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-[#17A398]"
                      />
                    </div>

                    <div className="pt-3 border-t border-gray-100 space-y-2">
                      <div className="flex justify-between items-center text-sm font-extrabold">
                        <span>Jumla Kuu:</span>
                        <span className="text-[#17A398] text-base">{fmtTZS(cartTotal)}</span>
                      </div>
                      <button
                        type="submit"
                        disabled={checkoutStatus === "submitting"}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow"
                      >
                        <span>
                          {checkoutStatus === "submitting" ? "⏳ Inatuma Oda..." : "💬 Tuma Oda Hii WhatsApp"}
                        </span>
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
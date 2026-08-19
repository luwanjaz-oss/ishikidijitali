"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/context/CartContext";

const WHATSAPP_NUMBER = "255754282086";
const LIPA_NAMBA = "58176639";

// Links za Social Media
const SOCIAL_LINKS = {
  instagram: "https://instagram.com/ishikidijitali",
  facebook: "https://facebook.com/ishikidijitali",
  whatsapp: `https://wa.me/${WHATSAPP_NUMBER}`,
};

const REGIONS = [
  "Dar es Salaam", "Iringa", "Mbeya", "Arusha", "Mwanza", "Dodoma", "Morogoro",
  "Tanga", "Zanzibar", "Kigoma", "Mtwara", "Kilimanjaro", "Ruvuma", "Tabora",
  "Shinyanga", "Mara", "Kagera", "Singida", "Lindi", "Manyara", "Geita",
  "Katavi", "Songwe", "Njombe", "Simiyu", "Pemba"
];

// Banner mpya zisizo na neno 'spares' na zenye picha thabiti
const BANNERS = [
  {
    title: "Agiza Chochote: China, USA, Dubai & Dar es Salaam",
    subtitle: "Bidhaa yoyote au kituu chochote unachohitaji, tunakuletea hadi mlangoni!",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1000&auto=format&fit=crop",
  },
  {
    title: "Lipa Mzigo Unapofika (Pay on Delivery)",
    subtitle: "Agiza kwa amani kabisa, lipia mzigo wako pindi unapoupokea na kujiridhisha",
    image: "https://images.unsplash.com/photo-1556742049-0a67ef8000d7?q=80&w=1000&auto=format&fit=crop",
  },
  {
    title: "Wekeza Kidogo Kidogo",
    subtitle: "Weka akiba polepole hadi ukamilishe manunuzi ya bidhaa yako kwa urahisi",
    image: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=1000&auto=format&fit=crop",
  },
];

const ROUTES = [
  { icon: "🛍️", text: "Dar es Salaam (Kariakoo & Masokoni) → Mikoani Kote Tanzania" },
  { icon: "✈️", text: "China → Dar es Salaam (Ndege - Siku 7-14)" },
  { icon: "✈️", text: "USA → Dar es Salaam (Ndege - Siku 10-14)" },
  { icon: "✈️", text: "Dubai → Dar es Salaam (Ndege - Siku 5-7)" },
  { icon: "🚢", text: "Meli: Mizigo Mizito & Bidhaa za Jumla (Siku 25-35)" },
];

const NIAGIZE_STEPS = [
  {
    title: "1. Kutana na Wataalamu Wetu",
    desc: "Tutumie picha, link, au maelezo ya kitu/bidhaa yoyote unayotafuta kutoka Dar es Salaam (Kariakoo), China, USA au Dubai.",
  },
  {
    title: "2. Kuchagua Njia ya Malipo",
    desc: "Lipa Kidogo Kidogo, au chagua fursa ya **Kulipa Mzigo Unapofika (Pay on Delivery)** kulingana na aina ya mzigo wako.",
  },
  {
    title: "3. Kupokea Mzigo Wako",
    desc: "Tunakununulia, tunakukagulia ubora, na kuisafirisha salama hadi ulipo mkoani kwako kupitia usafiri wa uhakika.",
  },
];

const FAQS = [
  {
    q: "Je, naweza kulipia mzigo wangu pale unapofika (Pay on Delivery)?",
    a: "Ndiyo! Kwa bidhaa zinazopatikana Dar es Salaam au zinazotumwa mkoani, tuna mfumo wa Kulipia Mzigo Unapofika baada ya kuukagua.",
  },
  {
    q: "Je, mnaweza kunitafutia bidhaa yoyote kutoka masoko ya Dar es Salaam (Kariakoo)?",
    a: "Ndiyo kabisa! Kama upo mkoani na unahitaji kitu chochote kilichopo Dar es Salaam, tutumie picha au maelezo na sisi tutakununulia na kukutumia mkoani.",
  },
  {
    q: "Nawezaje kuwekeza au kulipia kidogo kidogo?",
    a: "Kupitia mfumo wetu wa Akiba Kidogo Kidogo, unaweza kuanza kuwekeza kiasi chochote (kuanzia TZS 10,000) kupitia Lipa Namba yetu 58176639. Mzigo wako utaagizwa au kukabidhiwa ukamilishapo.",
  },
  {
    q: "Mzigo unachukua siku ngapi kufika?",
    a: "Kutoka Dar es Salaam kwenda Mkoani ni siku 1 tu. Ndege ya Kimataifa (China/USA/Dubai) ni siku 7-14, na Meli ni siku 25-35.",
  },
];

const CATEGORIES = [
  { id: "wote", label: "Vyote" },
  { id: "elektroniki", label: "Elektroniki" },
  { id: "fashion", label: "Fashion & Vazi" },
  { id: "vitu_vyote", label: "Vitu Vyinginevyo" },
];

const MOCK_TRACKING_DATA = {
  "ISHI-8821": {
    code: "ISHI-8821",
    customer: "Juma Ally",
    phone: "0754000111",
    item: "Mzigo kutoka Dar es Salaam (Kariakoo)",
    destination: "Mbeya",
    statusStep: 3,
    statusText: "Mzigo upo kwenye Basi kuelekea Mbeya 🚌 - Utalipia ukifika!",
    updatedAt: "2026-08-19 14:30 EAT"
  },
  "0712345678": {
    code: "ISHI-1042",
    customer: "Amina Salum",
    phone: "0712345678",
    item: "Simu & Inverter (China)",
    destination: "Arusha",
    statusStep: 2,
    statusText: "Mzigo upo kwenye usafiri wa Ndege kutoka Guangzhou China ✈️",
    updatedAt: "2026-08-18 09:15 EAT"
  }
};

function fmtTZS(n) {
  return (n || 0).toLocaleString("en-US") + " TZS";
}

function getAllImages(imageUrl) {
  if (!imageUrl) return [];
  return imageUrl.split(",").map((img) => img.trim()).filter(Boolean);
}

function ProductImageSlider({ product }) {
  const images = getAllImages(product.image_url);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);

  if (images.length === 0) {
    return <span className="text-5xl">{product.emoji || "📦"}</span>;
  }

  return (
    <div className="relative w-full h-full group">
      <img
        src={images[currentImgIdx]}
        alt={product.name}
        className="w-full h-full object-cover transition-all duration-300"
      />
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20">
          {images.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentImgIdx ? "w-4 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, addToCart, shareProduct }) {
  return (
    <div className="bg-white border border-[#E4DFD2] rounded-2xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
      <div className="h-48 sm:h-52 flex items-center justify-center relative overflow-hidden bg-[#F0FAF8]">
        <span className="absolute top-2.5 left-2.5 bg-[#DDF3F0] text-[#0B5852] text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full z-30">
          {product.origin || "DSM/China"}
        </span>
        <ProductImageSlider product={product} />
      </div>

      <div className="p-3.5 sm:p-4 flex flex-col gap-2 flex-1">
        <Link href={`/bidhaa/${product.id}`}>
          <h3 className="text-sm sm:text-base font-bold leading-snug hover:text-[#17A398] transition-colors text-[#12182B]">
            {product.name}
          </h3>
        </Link>
        <p className="text-xs text-[#6B7280] line-clamp-2 leading-relaxed">
          {product.description}
        </p>

        <div className="flex flex-col gap-1 mt-1">
          <span className="font-bold text-[#12182B] text-base sm:text-lg">
            {fmtTZS(product.price)}
          </span>
          <span className="text-[10px] text-green-600 font-bold">
            ✓ Inawezekana Kulipia Unapofika
          </span>
        </div>

        <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
          <button
            onClick={() => addToCart(product)}
            className="flex-1 bg-[#12182B] text-white text-[11px] sm:text-xs font-semibold py-2.5 rounded-lg hover:bg-black transition-colors"
          >
            Ongeza kikapuni
          </button>
          <button
            onClick={() => shareProduct(product)}
            className="flex-1 bg-[#F7F3EA] text-[#0B5852] border border-[#17A398] text-[11px] sm:text-xs font-semibold py-2.5 rounded-lg hover:bg-[#e8f5f3] transition-colors"
          >
            Shea
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { cart, addToCart, changeQty } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [bannerIdx, setBannerIdx] = useState(0);
  const [routeIdx, setRouteIdx] = useState(0);
  const [category, setCategory] = useState("wote");
  const [openFaq, setOpenFaq] = useState(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerRegion, setCustomerRegion] = useState("");
  const [paymentOption, setPaymentOption] = useState("pod"); // 'pod' (Pay on Delivery) au 'lipa_namba'

  const [trackingInput, setTrackingInput] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingError, setTrackingError] = useState("");

  useEffect(() => {
    async function loadProducts() {
      const { data } = await supabase.from("products").select("*").order("id", { ascending: true });
      setProducts(data || []);
      setLoading(false);
    }
    loadProducts();
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setBannerIdx((i) => (i + 1) % BANNERS.length);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setRouteIdx((i) => (i + 1) % ROUTES.length);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const handleTrackOrder = (e) => {
    e.preventDefault();
    setTrackingError("");
    setTrackingResult(null);

    const query = trackingInput.trim().toUpperCase();
    if (!query) {
      setTrackingError("Tafadhali ingiza Tracking No. au Namba yako ya Simu.");
      return;
    }

    if (MOCK_TRACKING_DATA[query]) {
      setTrackingResult(MOCK_TRACKING_DATA[query]);
    } else {
      setTrackingError("Taarifa hazijapatikana. Hakikisha umeandika kwa usahihi au wasiliana nasi WhatsApp.");
    }
  };

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const filteredProducts = products.filter(
    (p) => category === "wote" || p.category === category
  );

  const niagizeMsg = encodeURIComponent(
    "Habari Ishi Kidijitali, nataka msaada wa kuagiza Vitu / Bidhaa kutoka Dar es Salaam (Kariakoo), China, USA au Dubai."
  );

  const uwekezajiMsg = encodeURIComponent(
    "Habari Ishi Kidijitali, napenda kuanza kuwekeza / kuweka akiba kidogo kidogo kwa ajili ya kuagiza mzigo wangu."
  );

  return (
    <main className="bg-[#F7F3EA] min-h-screen relative overflow-x-hidden">
      {/* HEADER WITH SOCIAL MEDIA LINKS */}
      <header className="sticky top-0 z-40 bg-[#12182B] border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-[#E5383B] text-black font-display font-bold text-base sm:text-lg px-2 py-0.5 sm:py-1">
              Ishi
            </span>
            <div className="flex flex-col leading-none">
              <span className="font-display text-base sm:text-lg font-bold text-white">Kidijitali</span>
              <span className="text-[8px] sm:text-[9px] tracking-widest text-white/50 uppercase">
                Lifestyle Service
              </span>
            </div>
          </div>

          {/* SOCIAL MEDIA ICONS IN HEADER */}
          <div className="hidden lg:flex items-center gap-3 text-xs text-white/80 border-x border-white/10 px-4">
            <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noreferrer" className="hover:text-[#E8A93B] flex items-center gap-1">
              📷 <span>Instagram</span>
            </a>
            <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noreferrer" className="hover:text-[#E8A93B] flex items-center gap-1">
              📘 <span>Facebook</span>
            </a>
            <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noreferrer" className="hover:text-[#25D366] flex items-center gap-1 font-bold">
              💬 <span>WhatsApp</span>
            </a>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            <Link href="/" className="text-white bg-white/10 px-3 py-1.5 rounded-full text-xs font-medium">
              Duka
            </Link>
            <button
              onClick={() => setShowTrackingModal(true)}
              className="text-white/80 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            >
              Fuatilia Mzigo 📦
            </button>
            <a href="#uwekezaji" className="text-white/80 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-full text-xs font-medium transition-colors">
              Wekeza Kidogo 💰
            </a>
            <Link href="/wasambazaji" className="text-white/80 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-full text-xs font-medium transition-colors">
              Wasambazaji
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCart(true)}
              className="relative bg-[#17A398] text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold hover:bg-[#13847b] transition-colors"
            >
              🛒 Kikapu
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#E85D4C] text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white p-1 text-xl focus:outline-none"
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-[#12182B] border-t border-white/10 px-4 py-3 flex flex-col gap-2">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-white text-xs font-medium py-2 border-b border-white/5">
              🏠 Duka
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setShowTrackingModal(true);
              }}
              className="text-white/90 text-left text-xs font-medium py-2 border-b border-white/5"
            >
              📦 Fuatilia Mzigo
            </button>
            <a href="#uwekezaji" onClick={() => setMobileMenuOpen(false)} className="text-white/90 text-xs font-medium py-2 border-b border-white/5">
              💰 Wekeza Kidogo Kidogo
            </a>
            <Link href="/wasambazaji" onClick={() => setMobileMenuOpen(false)} className="text-white/90 text-xs font-medium py-2 border-b border-white/5">
              🤝 Wasambazaji
            </Link>

            {/* MOBILE SOCIAL LINKS */}
            <div className="flex gap-4 pt-2 text-white/80 text-xs font-semibold">
              <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noreferrer">Instagram</a>
              <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noreferrer">Facebook</a>
              <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noreferrer" className="text-[#25D366]">WhatsApp</a>
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="bg-gradient-to-b from-[#12182B] to-[#1D2440] text-white px-4 sm:px-5 py-8 sm:py-14">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-[#E8A93B]/20 border border-[#E8A93B]/40 px-3 py-1 rounded-full text-[10px] font-bold text-[#E8A93B] mb-3">
              <span>🚚 Lipa Unapofika Au Lipa Kidogo Kidogo</span>
            </div>
            <h1 className="font-display text-2xl sm:text-4xl font-bold leading-tight mb-3">
              Niagize Vitu Vyovyote Vile Kutoka Dar es Salaam, China, USA na Dubai.
            </h1>
            <p className="text-white/70 max-w-md mb-6 leading-relaxed text-xs sm:text-sm">
              Tafuta kitu au bidhaa yoyote - tunakununulia kutoka sokoni Kariakoo Dar es Salaam au Nje ya Nchi na kukuletea mkoani kwako. **Lipa ukipokea mzigo wako!**
            </p>
            <div className="flex gap-2.5 flex-wrap">
              <a href="#niagize" className="bg-[#E8A93B] text-[#12182B] px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-bold text-xs text-center flex-1 sm:flex-none">
                Agiza Kitu Chochote
              </a>
              <a href="#uwekezaji" className="border border-white/30 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold text-xs text-center flex-1 sm:flex-none">
                Wekeza Kidogo Kidogo
              </a>
            </div>
          </div>

          {/* CAROUSEL CARD */}
          <div className="relative rounded-2xl overflow-hidden shadow-2xl h-60 sm:h-72 border border-white/10 bg-[#172038]">
            <img
              key={bannerIdx}
              src={BANNERS[bannerIdx].image}
              alt={BANNERS[bannerIdx].title}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
              className="w-full h-full object-cover transition-opacity duration-500"
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d1222] via-[#0d1222]/60 to-transparent flex flex-col justify-end p-5 sm:p-6 z-10">
              <span className="bg-[#E8A93B] text-[#12182B] font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded w-max mb-1.5">
                Ishi Kidijitali Feature
              </span>
              <h3 className="text-lg sm:text-2xl font-bold text-white mb-1 leading-snug">
                {BANNERS[bannerIdx].title}
              </h3>
              <p className="text-xs text-white/80 leading-relaxed max-w-sm">
                {BANNERS[bannerIdx].subtitle}
              </p>
              
              <div className="flex gap-2 mt-4">
                {BANNERS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setBannerIdx(i)}
                    className={`h-2 rounded-full transition-all ${
                      i === bannerIdx ? "w-8 bg-[#E8A93B]" : "w-2 bg-white/30"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ROUTES BANNER */}
        <div className="max-w-6xl mx-auto mt-6 bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-center gap-2 text-center">
          <span className="text-lg sm:text-xl">{ROUTES[routeIdx].icon}</span>
          <span className="text-xs font-medium text-white/90">{ROUTES[routeIdx].text}</span>
        </div>
      </section>

      {/* SECTION YA UWEKEZAJI WA KIDOGO KIDOGO */}
      <section id="uwekezaji" className="max-w-6xl mx-auto px-4 sm:px-5 py-10">
        <div className="bg-gradient-to-br from-[#0B5852] to-[#17A398] text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
          <div className="max-w-2xl relative z-10">
            <span className="bg-white/20 text-white font-bold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
              Mfumo wa Akiba & Uwekezaji
            </span>
            <h2 className="font-display text-xl sm:text-3xl font-bold mt-2">
              Wekeza Kidogo Kidogo Kununua Bidhaa Yoyote Unayotaka
            </h2>
            <p className="text-xs text-white/90 mt-2 leading-relaxed">
              Huna kiasi chote kwa mara moja? Tumia mfumo wetu wa uwekezaji mdogo mdogo. Weka akiba taratibu kupitia Lipa Namba <strong>58176639</strong>, na mara ukimlisha lengo, tunakuletea mzigo wako mahali popote ulipo!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-6">
              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
                <span className="text-lg block mb-1">🎯</span>
                <h4 className="font-bold text-xs">Panga Lengo</h4>
                <p className="text-[10px] text-white/80">Chagua kitu chochote unachotaka kuagiza.</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
                <span className="text-lg block mb-1">💳</span>
                <h4 className="font-bold text-xs">Weka Akiba</h4>
                <p className="text-[10px] text-white/80">Lipia taratibu kuanzia TZS 10,000 kupitia M-Pesa.</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
                <span className="text-lg block mb-1">🚚</span>
                <h4 className="font-bold text-xs">Pokea Mzigo</h4>
                <p className="text-[10px] text-white/80">Tunakukabidhi mzigo wako mara ukamilishapo.</p>
              </div>
            </div>

            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${uwekezajiMsg}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block bg-[#E8A93B] text-[#12182B] px-5 sm:px-6 py-3 rounded-xl font-bold text-xs hover:bg-[#d9982b] transition-colors"
            >
              Anza Kuwekeza Kidogo Kidogo Sasa 💬
            </a>
          </div>
        </div>
      </section>

      {/* HUDUMA YA NIAGIZE DAR ES SALAAM, CHINA, USA & DUBAI */}
      <section id="niagize" className="bg-white border-y border-[#E4DFD2] py-10 sm:py-14 px-4 sm:px-5">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-8 sm:mb-10">
            <span className="bg-[#E8A93B]/20 text-[#8A5E12] font-semibold text-[11px] px-3 py-1 rounded-full uppercase tracking-wider">
              Agiza kitu chochote
            </span>
            <h2 className="font-display text-xl sm:text-3xl font-bold mt-2 text-[#12182B]">
              Niagize Dar es Salaam, China, USA & Dubai
            </h2>
            <p className="text-[#6B7280] text-xs sm:text-sm mt-2 leading-relaxed">
              Upo mkoani na kuna kitu unakihitaji kutoka masoko ya Dar es Salaam (Kariakoo, Madukani, n.k.) au Nje ya nchi? Tutumie maelezo na sisi tutakununulia na kukutumia papo hapo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
            {NIAGIZE_STEPS.map((step, idx) => (
              <div key={idx} className="bg-[#F7F3EA] p-5 rounded-2xl border border-[#E4DFD2]">
                <h3 className="font-bold text-[#12182B] text-sm sm:text-base mb-1.5">{step.title}</h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-[#12182B] text-white p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h4 className="font-bold text-sm sm:text-base">Unahitaji Kitu Chochote Kutoka Dar es Salaam au Nje ya Nchi?</h4>
              <p className="text-xs text-white/70">Wasiliana na timu yetu ya ununuzi kwa msaada wa haraka.</p>
            </div>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${niagizeMsg}`}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto text-center bg-[#17A398] text-white px-6 py-3 rounded-xl font-bold text-xs whitespace-nowrap hover:bg-[#13847b] transition-colors"
            >
              Tuma Maombi ya Kuagiza WhatsApp 💬
            </a>
          </div>
        </div>
      </section>

      {/* DUKA LA BIDHAA */}
      <section id="duka" className="max-w-6xl mx-auto px-4 sm:px-5 py-10">
        <div className="flex justify-between items-end mb-4 sm:mb-6">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold mb-1">Bidhaa Zilizopo Duka Kuu</h2>
            <p className="text-[#6B7280] text-xs sm:text-sm">Chagua au ongeza kikapuni moja kwa moja.</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                category === c.id
                  ? "bg-[#12182B] text-white"
                  : "bg-white text-[#6B7280] border border-[#E4DFD2]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-[#6B7280] text-xs">Inapakia bidhaa...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-[#6B7280] text-xs">Hakuna bidhaa zilizopatikana.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {filteredProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                addToCart={addToCart}
                shareProduct={(prod) => {
                  const msg = `Angalia hii bidhaa Ishi Kidijitali: ${prod.name} - ${fmtTZS(prod.price)}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* FAQ SECTION */}
      <section className="max-w-4xl mx-auto px-4 sm:px-5 py-10">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-center text-[#12182B] mb-6">
          Maswali Yanayoulizwa Mara Kwa Mara (FAQ)
        </h2>
        <div className="flex flex-col gap-2.5">
          {FAQS.map((faq, idx) => (
            <div key={idx} className="bg-white border border-[#E4DFD2] rounded-xl overflow-hidden shadow-sm">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left p-3.5 sm:p-4 font-bold text-xs text-[#12182B] flex justify-between items-center"
              >
                <span>{faq.q}</span>
                <span className="text-sm font-bold text-[#17A398]">{openFaq === idx ? "−" : "+"}</span>
              </button>
              {openFaq === idx && (
                <div className="px-4 pb-4 pt-1 text-xs text-[#6B7280] leading-relaxed border-t border-gray-100 bg-[#FAF8F5]">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER WITH SOCIAL MEDIA LINKS */}
      <footer className="bg-[#12182B] text-white px-4 sm:px-5 py-8 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#E5383B] text-black font-display font-bold text-xs px-1.5 py-0.5">Ishi</span>
              <span className="font-display text-xs font-bold">Kidijitali</span>
            </div>
            <p className="text-white/50 text-xs leading-relaxed max-w-sm">
              Huduma za kuagiza vitu vyovyote kutoka Dar es Salaam, China, USA, Dubai, na Mfumo wa Akiba Kidogo Kidogo au Kulipia Unapofika.
            </p>
          </div>

          {/* SOCIAL MEDIA ON FOOTER */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Tufuate Mtandaoni</h4>
            <div className="flex gap-4 text-xs text-white/70">
              <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noreferrer" className="hover:text-[#E8A93B]">Instagram</a>
              <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noreferrer" className="hover:text-[#E8A93B]">Facebook</a>
              <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noreferrer" className="hover:text-[#25D366]">WhatsApp</a>
            </div>
          </div>

          <div className="text-xs text-white/50 flex flex-col justify-end">
            <p>© {new Date().getFullYear()} Ishi Kidijitali. Haki zote zimehifadhiwa.</p>
          </div>
        </div>
      </footer>

      {/* TRACKING MODAL */}
      {showTrackingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowTrackingModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold flex items-center justify-center hover:bg-gray-200"
            >
              ✕
            </button>

            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-2xl">📦</span>
              <div>
                <h3 className="text-base font-bold text-[#12182B]">Fuatilia Mzigo Wako (Track Order)</h3>
                <p className="text-xs text-gray-500">Ingiza Tracking No. au Namba yako ya Simu.</p>
              </div>
            </div>

            <form onSubmit={handleTrackOrder} className="flex flex-col sm:flex-row gap-2 mt-4">
              <input
                type="text"
                placeholder="INGIZA TRACKING NO. AU SIMU..."
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                className="flex-1 px-4 py-3 bg-[#FAF8F5] border border-gray-300 rounded-xl text-xs focus:outline-none focus:border-[#17A398] font-mono font-bold uppercase"
              />
              <button
                type="submit"
                className="bg-[#12182B] text-white px-5 py-3 rounded-xl text-xs font-bold hover:bg-black transition-colors"
              >
                Fuatilia Sasa
              </button>
            </form>

            {trackingError && (
              <p className="text-xs text-red-500 mt-3 font-semibold bg-red-50 p-3 rounded-lg border border-red-200">
                ⚠️ {trackingError}
              </p>
            )}

            {trackingResult && (
              <div className="mt-4 p-4 bg-[#F0FAF8] border border-[#17A398]/30 rounded-xl">
                <div className="flex justify-between items-start mb-3 border-b border-teal-100 pb-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-teal-700 tracking-wider">
                      Mteja: {trackingResult.customer} ({trackingResult.phone})
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-[#12182B]">
                      Mzigo: {trackingResult.item}
                    </h4>
                  </div>
                  <span className="text-[10px] bg-teal-200 text-teal-800 font-bold px-2 py-0.5 rounded">
                    Lengo: {trackingResult.destination}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center my-3">
                  <div className={`p-2 rounded-lg text-[9px] font-bold ${trackingResult.statusStep >= 1 ? "bg-[#17A398] text-white" : "bg-gray-200 text-gray-500"}`}>
                    1. Imepokelewa 🏢
                  </div>
                  <div className={`p-2 rounded-lg text-[9px] font-bold ${trackingResult.statusStep >= 2 ? "bg-[#17A398] text-white" : "bg-gray-200 text-gray-500"}`}>
                    2. Safari ✈️/🚌
                  </div>
                  <div className={`p-2 rounded-lg text-[9px] font-bold ${trackingResult.statusStep >= 3 ? "bg-[#17A398] text-white" : "bg-gray-200 text-gray-500"}`}>
                    3. Imefika Mkoani 🛃
                  </div>
                  <div className={`p-2 rounded-lg text-[9px] font-bold ${trackingResult.statusStep >= 4 ? "bg-[#17A398] text-white" : "bg-gray-200 text-gray-500"}`}>
                    4. Umekabidhiwa 🤝
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-teal-100">
                  <p className="text-xs font-bold text-[#12182B]">{trackingResult.statusText}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Sasisho: {trackingResult.updatedAt}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CART MODAL WITH PAY ON DELIVERY OPTION */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between p-5 sm:p-6 overflow-y-auto">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <h2 className="text-base sm:text-lg font-bold text-[#12182B]">🛒 Kikapu Chako ({cartCount})</h2>
                <button onClick={() => setShowCart(false)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold">✕</button>
              </div>

              {cart.length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-12">Kikapu chako kipo wazi.</p>
              ) : (
                <div className="flex flex-col gap-4 my-4">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <h4 className="font-bold text-xs">{item.name}</h4>
                        <p className="text-xs text-gray-500">{fmtTZS(item.price)} x {item.qty}</p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <button onClick={() => changeQty(item.id, null, -1)} className="px-2 bg-gray-200 rounded font-bold">-</button>
                        <span className="text-xs font-bold">{item.qty}</span>
                        <button onClick={() => changeQty(item.id, null, 1)} className="px-2 bg-gray-200 rounded font-bold">+</button>
                      </div>
                    </div>
                  ))}

                  {/* SELECTION OF PAYMENT METHOD */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold text-[#12182B]">Aina ya Malipo:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentOption("pod")}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                          paymentOption === "pod"
                            ? "border-[#17A398] bg-[#E8F5F3] text-[#0B5852]"
                            : "border-gray-200 text-gray-600"
                        }`}
                      >
                        🚚 Lipia Unapofika (POD)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentOption("lipa_namba")}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                          paymentOption === "lipa_namba"
                            ? "border-[#E60000] bg-red-50 text-[#E60000]"
                            : "border-gray-200 text-gray-600"
                        }`}
                      >
                        💳 Lipa Namba (M-Pesa)
                      </button>
                    </div>
                  </div>

                  {paymentOption === "lipa_namba" && (
                    <div className="bg-[#FFF5F5] border-2 border-[#E60000]/20 rounded-xl p-3.5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-gray-700">Lipa Kabla ya Kusafirishwa:</span>
                        <span className="bg-[#E60000] text-white text-[10px] font-bold px-2 py-0.5 rounded">M-PESA TILL</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-red-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase block font-semibold">Lipa Namba (Till)</span>
                          <span className="text-lg font-black text-[#E60000] tracking-wider font-mono">{LIPA_NAMBA}</span>
                        </div>
                        <span className="text-[10px] font-bold text-[#E60000] bg-red-50 px-2 py-1 rounded">ISHI KIDIJTALI</span>
                      </div>
                    </div>
                  )}

                  <div className="bg-[#FAF8F5] p-3 rounded-xl border border-gray-200 space-y-2 text-xs">
                    <input type="text" placeholder="Jina Lako Kakamilika" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full p-2 border rounded" />
                    <input type="tel" placeholder="Namba ya Simu (WhatsApp)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full p-2 border rounded" />
                    <select value={customerRegion} onChange={(e) => setCustomerRegion(e.target.value)} className="w-full p-2 border rounded">
                      <option value="">-- Chagua Mkoa Wako --</option>
                      {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm font-bold">
                  <span>Jumla:</span>
                  <span className="text-[#17A398]">{fmtTZS(cart.reduce((s, i) => s + i.price * i.qty, 0))}</span>
                </div>
                <button
                  onClick={() => {
                    if (!customerName || !customerPhone || !customerRegion) {
                      alert("Tafadhali jaza Jina, Namba ya Simu na Mkoa.");
                      return;
                    }
                    const paymentText = paymentOption === "pod" ? "Nitalipia Mzigo Unapofika (Pay on Delivery)" : `Lipa Namba: ${LIPA_NAMBA}`;
                    const msg = `*AGIZO JIPYA ISHI KIDIJTALI*\n👤 Jina: ${customerName}\n📞 Simu: ${customerPhone}\n📍 Mkoa: ${customerRegion}\n💳 Aina ya Malipo: ${paymentText}\n\nJumla: ${fmtTZS(cart.reduce((s, i) => s + i.price * i.qty, 0))}`;
                    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
                  }}
                  className="w-full bg-[#25D366] text-white py-3 rounded-xl font-bold text-xs hover:bg-[#1ebd59] transition-colors"
                >
                  💬 Tuma Agizo WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// Hii inatumika TU kama oda ya zamani haina commission_total iliyohifadhiwa.
const FALLBACK_COMMISSION_RATE = 0.20; // 20%
const ZAWADI_TARGET_SALES = 5; // Idadi ya mauzo yanayohitajika kupata zawadi

function fmtTZS(n) {
  return (n || 0).toLocaleString("en-US") + " TZS";
}

function paymentStatusLabel(value) {
  switch (value) {
    case "amelipa_kamili":
      return "✅ Amelipa Kamili";
    case "amelipa_kidogo":
      return "💰 Amelipa Kidogo (Deposit)";
    case "atalipa_mzigo_ukifika":
      return "📦 Atalipa Mzigo Ukifika";
    default:
      return "❌ Hajalipa Bado";
  }
}

function paymentStatusColor(value) {
  switch (value) {
    case "amelipa_kamili":
      return "bg-green-100 text-green-700 border border-green-200";
    case "amelipa_kidogo":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    case "atalipa_mzigo_ukifika":
      return "bg-blue-100 text-blue-700 border border-blue-200";
    default:
      return "bg-red-100 text-red-700 border border-red-200";
  }
}

function generateRefCode(fullName) {
  const base =
    (fullName || "ISHIKI")
      .trim()
      .split(" ")[0]
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 6) || "ISHIKI";
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${base}-${random}`;
}

export default function WasambajiPage() {
  const [refCode, setRefCode] = useState(null);
  const [affiliate, setAffiliate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [siteUrl, setSiteUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const [orders, setOrders] = useState([]);
  const [totalSales, setTotalSales] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [regError, setRegError] = useState("");
  const [regSubmitting, setRegSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSiteUrl(window.location.origin);
      // Tenga session ya dashboard na ref code ya usambazaji
      const savedAffiliateSession = localStorage.getItem("ishiki_affiliate_session");
      if (savedAffiliateSession) {
        setRefCode(savedAffiliateSession);
      }
    }
    setLoading(false);
  }, []);

  const fetchAffiliateData = async (code) => {
    if (!code) return;

    const { data: affRows } = await supabase
      .from("affiliates")
      .select("*")
      .eq("ref_code", code)
      .order("created_at", { ascending: false })
      .limit(1);

    if (affRows && affRows.length > 0) {
      setAffiliate(affRows[0]);
    } else {
      // Kama code haijapatikana, ondoa session ili kuzuia kuonyesha dashboard isiyo na mhusika
      localStorage.removeItem("ishiki_affiliate_session");
      setRefCode(null);
      return;
    }

    const { data: ordersData, error } = await supabase
      .from("orders")
      .select("*")
      .eq("ref_code", code)
      .order("created_at", { ascending: false });

    if (ordersData && !error) {
      setOrders(ordersData);

      const salesSum = ordersData.reduce(
        (sum, item) => sum + (Number(item.total) || 0),
        0
      );
      setTotalSales(salesSum);

      const commSum = ordersData.reduce((sum, item) => {
        const comm =
          item.commission_total !== null && item.commission_total !== undefined
            ? Number(item.commission_total)
            : (Number(item.total) || 0) * FALLBACK_COMMISSION_RATE;
        return sum + comm;
      }, 0);

      setTotalCommission(commSum);
    }
  };

  useEffect(() => {
    if (!refCode) return;

    fetchAffiliateData(refCode);

    const channel = supabase
      .channel("realtime-orders")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `ref_code=eq.${refCode}`,
        },
        () => {
          fetchAffiliateData(refCode);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refCode]);

  function copyLink() {
    const link = `${siteUrl}/?ref=${refCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const handleRegister = async (e) => {
    e.preventDefault();
    if (regSubmitting) return;

    setRegError("");
    setRegSubmitting(true);

    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();

    try {
      // 1. Kagua kama namba tayari ni Msambazaji aliyepo
      const { data: existingRows, error: lookupErr } = await supabase
        .from("affiliates")
        .select("*")
        .eq("phone", cleanPhone)
        .order("created_at", { ascending: false })
        .limit(1);

      if (lookupErr) throw lookupErr;

      const existing =
        existingRows && existingRows.length > 0 ? existingRows[0] : null;

      if (existing) {
        // Hakikisha namba hii ilishanunua bidhaa kabla ya kuingia
        const { data: userPurchases } = await supabase
          .from("orders")
          .select("id")
          .eq("customer_phone", cleanPhone)
          .limit(1);

        if (!userPurchases || userPurchases.length === 0) {
          setRegError(
            "Akaunti yako haijakamilika. Ni lazima uwe umeshanunua angalau bidhaa moja Ishi Kidijitali ili kuweza kuingia kwenye dashboard ya msambazaji."
          );
          setRegSubmitting(false);
          return;
        }

        localStorage.setItem("ishiki_affiliate_session", existing.ref_code);
        setRefCode(existing.ref_code);
        setRegSubmitting(false);
        return;
      }

      // 2. UKAGUZI WA ODA: Mtu lazima awe amenunua bidhaa kabla ya kujiunga!
      const referringCode =
        typeof window !== "undefined"
          ? localStorage.getItem("ishiki_ref_code")
          : null;

      let purchaseQuery = supabase
        .from("orders")
        .select("id")
        .eq("customer_phone", cleanPhone);

      // Kama alikuja kupitia link ya msambazaji fulani:
      if (referringCode) {
        purchaseQuery = purchaseQuery.eq("ref_code", referringCode);
      }

      const { data: purchaseRows, error: purchaseErr } = await purchaseQuery.limit(1);

      if (purchaseErr) throw purchaseErr;

      // Kama hana oda yoyote, mmnyime fursa ya kujiunga na umpe ujumbe maalum
      if (!purchaseRows || purchaseRows.length === 0) {
        setRegError(
          referringCode
            ? "Kabla ya kujiunga kama msambazaji, ni lazima kwanza ununue bidhaa kupitia link uliyopewa. Baada ya kununua, jaribu kujisajili tena kwa namba hiyo hiyo ya simu."
            : "Ili uwe msambazaji wa Ishi Kidijitali, ni lazima uwe umeshanunua angalau bidhaa 1 kwenye tovuti yetu. Nunua bidhaa kwanza kisha ujisajili tena kwa namba hii ya simu."
        );
        setRegSubmitting(false);
        return;
      }

      // 3. Tengeneza Msambazaji Mpya
      let created = null;
      let lastError = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        const candidateCode = generateRefCode(cleanName);
        const { data: inserted, error: insertErr } = await supabase
          .from("affiliates")
          .insert([
            { full_name: cleanName, phone: cleanPhone, ref_code: candidateCode },
          ])
          .select()
          .maybeSingle();

        if (!insertErr) {
          created =
            inserted || {
              full_name: cleanName,
              phone: cleanPhone,
              ref_code: candidateCode,
            };
          break;
        }

        lastError = insertErr;
        if (insertErr.code !== "23505") break;
      }

      if (!created) throw lastError || new Error("Imeshindwa kujisajili");

      localStorage.setItem("ishiki_affiliate_session", created.ref_code);
      setAffiliate(created);
      setRefCode(created.ref_code);
    } catch (err) {
      console.error("Affiliate registration error:", err);
      setRegError(
        err?.message
          ? `Imeshindwa kujisajili: ${err.message}`
          : "Imeshindwa kujisajili. Tafadhali angalia mtandao wako na ujaribu tena."
      );
    } finally {
      setRegSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-10">
        <div className="w-10 h-10 border-4 border-[#17A398] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs text-gray-500 font-semibold">Inapakia taarifa...</p>
      </div>
    );
  }

  const completedSales = orders.length;
  const isRewardQualified = completedSales >= ZAWADI_TARGET_SALES;
  const progressPercent = Math.min((completedSales / ZAWADI_TARGET_SALES) * 100, 100);

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#12182B]">
      <style jsx global>{`
        @keyframes cardFadeSlide {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-card-in {
          animation: cardFadeSlide 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <header className="sticky top-0 z-50 bg-[#12182B] border-b border-white/10 px-4 sm:px-6 py-4 flex items-center justify-between shadow-md">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="bg-[#E5383B] text-white text-xs font-bold px-2 py-1 rounded group-hover:scale-105 transition-transform">
            Ishi
          </span>
          <span className="text-white font-bold text-base">Kidijitali</span>
        </Link>
      </header>

      {!refCode ? (
        <section className="min-h-[calc(100vh-65px)] flex items-center justify-center px-4 py-10">
          <div className="animate-card-in bg-white border border-gray-200 p-6 sm:p-8 rounded-3xl shadow-xl max-w-md w-full relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#17A398]/10 rounded-full blur-xl pointer-events-none"></div>

            {/* BANNER YA MCHONGO WA ZAWADI (COUPON OFFER) */}
            <div className="mb-6 bg-gradient-to-r from-[#12182B] to-[#17A398] text-white p-4 rounded-2xl border border-amber-400/30 relative">
              <span className="bg-amber-400 text-black text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full mb-2 inline-block shadow">
                🎁 ZAWADI MAALUM YOTE MWEZI HUU!
              </span>
              <p className="text-xs font-extrabold text-white leading-snug">
                Ukiuza bidhaa 5 tu kupitia link yako, utapata:
              </p>
              <ul className="mt-2 text-[11px] text-amber-200 space-y-1 font-semibold">
                <li>🎙️ Wireless Microphone (Mic ya kurekodia)</li>
                <li>👕 T-Shirt Rasmi ya Ishi Kidijitali</li>
                <li>📶 Intaneti ya Wi-Fi + 15GB ya Bure!</li>
              </ul>
            </div>

            <span className="inline-block bg-[#17A398]/10 text-[#17A398] text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mb-3">
              🤝 Jiunge Nasi
            </span>
            <h1 className="text-xl sm:text-2xl font-black mb-1 text-[#12182B]">
              Jisajili Kama Msambazaji
            </h1>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              Jaza taarifa zako ili upate link yako binafsi ya kusambaza na uanze kupata commission kwa kila mauzo!
            </p>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold block mb-1 text-gray-700">Jina Kamili</label>
                <input
                  type="text"
                  required
                  placeholder="Mfano: Juma Ally"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#17A398] focus:ring-2 focus:ring-[#17A398]/20 transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold block mb-1 text-gray-700">Namba ya Simu (WhatsApp)</label>
                <input
                  type="tel"
                  required
                  placeholder="0754XXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#17A398] focus:ring-2 focus:ring-[#17A398]/20 transition-all"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Weka namba uliyotumia kuagiza bidhaa kwenye mfumo.
                </p>
              </div>

              {regError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-[11px] text-red-600 font-semibold leading-relaxed">⚠️ {regError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={regSubmitting}
                className="w-full bg-[#12182B] hover:bg-[#17A398] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
              >
                {regSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span className="text-xs">Inakagua Oda & Inasajili...</span>
                  </>
                ) : (
                  <span>Jisajili / Ingia Sasa 🚀</span>
                )}
              </button>
            </form>

            <p className="text-[10px] text-gray-400 mt-5 text-center leading-relaxed">
              Tayari umeshajisajili awali? Weka namba yako ya simu hapo juu ili kurejesha akaunti yako.
            </p>

            <Link href="/" className="block text-center text-[#17A398] text-xs font-bold hover:underline mt-3">
              ← Rudi Nyumbani
            </Link>
          </div>
        </section>
      ) : (
        <section className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
          <div className="space-y-6">
            {/* AKAUNTI HEADER */}
            <div className="animate-card-in bg-white border border-gray-200 p-5 sm:p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">
                  Hujambo, {affiliate?.full_name || affiliate?.name || "Msambazaji"} 👋
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                  Namba ya Simu: {affiliate?.phone || "—"} | Code: <strong className="text-[#17A398]">{refCode}</strong>
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  Commission hutofautiana kwa kila bidhaa (angalia % kwenye ukurasa wa bidhaa husika)
                </p>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem("ishiki_affiliate_session");
                  setRefCode(null);
                  setAffiliate(null);
                  setOrders([]);
                  setTotalSales(0);
                  setTotalCommission(0);
                }}
                className="text-[10px] text-gray-400 hover:text-red-500 font-semibold underline whitespace-nowrap self-start transition-colors"
              >
                Badilisha Akaunti / Ondoka
              </button>
            </div>

            {/* KADI YA KUPONI YA ZAWADI */}
            <div className="animate-card-in bg-gradient-to-br from-[#12182B] via-[#1A233D] to-[#17A398] text-white p-5 sm:p-6 rounded-3xl shadow-xl relative overflow-hidden border border-amber-400/30">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="bg-amber-400 text-black text-[10px] font-black uppercase px-3 py-1 rounded-full shadow">
                  🎁 KADI YA ZAWADI / REWARD COUPON
                </span>
                <span className="text-xs font-bold text-amber-200">
                  {completedSales} / {ZAWADI_TARGET_SALES} Mauzo
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-white mb-1">
                Uza Bidhaa 5 Ujinyakulie Zawadi Kabambe!
              </h2>
              <p className="text-xs text-white/80 mb-4">
                Zawadi yako inajumuisha: <strong className="text-amber-300">🎙️ Wireless Mic</strong> + <strong className="text-amber-300">👕 Ishi Kidijitali T-Shirt</strong> + <strong className="text-amber-300">📶 Wi-Fi Plus 15GB Internet</strong>.
              </p>

              {/* PROGRESS BAR */}
              <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden mb-3 p-0.5 border border-white/20">
                <div
                  className="bg-gradient-to-r from-amber-400 to-green-400 h-full rounded-full transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>

              {isRewardQualified ? (
                <div className="p-4 bg-green-500/20 border border-green-400/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                  <div>
                    <p className="text-xs font-extrabold text-green-300">🎉 HUREEE! UMEFIKISHA MAUZO 5!</p>
                    <p className="text-[11px] text-white/90">Zawadi yako ipo tayari kuchukuliwa. Wasiliana na Admin sasa.</p>
                  </div>
                  <a
                    href={`https://wa.me/255754282086?text=${encodeURIComponent(`Habari, nimefikisha mauzo 5 kama msambazaji (${refCode})! Nataka kuchukua zawadi yangu ya Mic, T-shirt na Wi-Fi 15GB.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-amber-400 hover:bg-amber-500 text-black font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-lg transition-colors whitespace-nowrap"
                  >
                    🎁 Chukua Zawadi WhatsApp
                  </a>
                </div>
              ) : (
                <p className="text-[11px] text-amber-200/90 italic">
                  ⚡ Bado unahitaji mauzo <strong>{ZAWADI_TARGET_SALES - completedSales}</strong> tu ili ufungue zawadi hii!
                </p>
              )}
            </div>

            {/* DASHBOARD CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="animate-card-in bg-white border border-gray-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <p className="text-xs text-gray-500 font-medium">Mauzo Yaliyofanyika</p>
                <h3 className="text-2xl font-bold text-[#12182B] mt-2">
                  {orders.length} Oda
                </h3>
              </div>
              <div className="animate-card-in bg-white border border-gray-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <p className="text-xs text-gray-500 font-medium">Thamani ya Mauzo Yote</p>
                <h3 className="text-2xl font-bold text-blue-600 mt-2">
                  {fmtTZS(totalSales)}
                </h3>
              </div>
              <div className="animate-card-in bg-white border border-gray-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <p className="text-xs text-gray-500 font-medium">Commission Yako</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-2">
                  {fmtTZS(totalCommission)}
                </h3>
              </div>
            </div>

            {/* MALIPO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="animate-card-in bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
                <p className="text-xs text-gray-500 font-medium">Kiasi Ulicholipwa</p>
                <h3 className="text-xl font-bold text-blue-600 mt-2">
                  {fmtTZS(affiliate?.total_paid || 0)}
                </h3>
              </div>
              <div className="animate-card-in bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
                <p className="text-xs text-gray-500 font-medium">Unachodai (Salio)</p>
                <h3 className={`text-xl font-bold mt-2 ${totalCommission - (affiliate?.total_paid || 0) > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {fmtTZS(Math.max(totalCommission - (affiliate?.total_paid || 0), 0))}
                </h3>
                {totalCommission - (affiliate?.total_paid || 0) <= 0 && totalCommission > 0 && (
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">✓ Umelipwa Kamili</p>
                )}
              </div>
            </div>

            {/* LINK BOX */}
            <div className="animate-card-in bg-[#12182B] text-white p-5 sm:p-6 rounded-3xl shadow-xl relative overflow-hidden">
              <h3 className="text-sm font-bold">Link Yako ya Kusambaza</h3>
              <p className="text-xs text-gray-400 mt-1 mb-4">
                Mtu akinunua kupitia link hii, commission inajipiga papo hapo kwenye akaunti yako.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  readOnly
                  value={`${siteUrl}/?ref=${refCode}`}
                  className="bg-white/10 text-amber-300 text-xs font-mono px-4 py-3 rounded-xl flex-1 outline-none overflow-x-auto"
                />
                <button
                  onClick={copyLink}
                  className={`font-bold text-xs px-6 py-3 rounded-xl transition-all shadow active:scale-95 flex items-center justify-center gap-2 ${
                    copied
                      ? "bg-green-500 text-white"
                      : "bg-amber-400 text-black hover:bg-amber-500"
                  }`}
                >
                  {copied ? "✓ Imenakiliwa!" : "📋 Nakili Link"}
                </button>
              </div>
            </div>

            {/* HISTORIA YA MAUZO */}
            <div className="animate-card-in bg-white border border-gray-200 p-5 sm:p-6 rounded-3xl shadow-sm">
              <h3 className="font-bold text-base mb-3">Historia ya Mauzo & Commission</h3>
              {orders.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-4">
                  Bado hujapata mauzo kupitia link yako. Sambaza link uanze kupata commission!
                </p>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => {
                    const comm =
                      order.commission_total !== null && order.commission_total !== undefined
                        ? Number(order.commission_total)
                        : (Number(order.total) || 0) * FALLBACK_COMMISSION_RATE;
                    return (
                      <div
                        key={order.id}
                        className="flex justify-between items-start p-3 bg-gray-50/50 hover:bg-gray-50 rounded-xl text-xs gap-2 transition-colors border border-gray-100"
                      >
                        <div>
                          <p className="font-bold text-gray-800">
                            Oda #{order.id}
                          </p>
                          <p className="text-gray-400 text-[10px]">
                            {order.created_at ? new Date(order.created_at).toLocaleDateString("sw-TZ") : ""}
                          </p>
                          <span className={`inline-block mt-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${paymentStatusColor(order.payment_status)}`}>
                            {paymentStatusLabel(order.payment_status)}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-600">
                            Gharama: {fmtTZS(order.total)}
                          </p>
                          <p className="font-bold text-emerald-600 text-xs mt-0.5">
                            Com: +{fmtTZS(comm)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
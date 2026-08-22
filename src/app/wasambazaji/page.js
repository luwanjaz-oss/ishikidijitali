"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// Hii inatumika TU kama oda ya zamani haina commission_total iliyohifadhiwa.
// Oda mpya zote zinatumia commission_total iliyokokotolewa wakati wa checkout
// kutoka kwenye "commission" ya kila bidhaa (angalia app/page.js).
const FALLBACK_COMMISSION_RATE = 0.20; // 20%

function fmtTZS(n) {
  return (n || 0).toLocaleString("en-US") + " TZS";
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
      const saved = localStorage.getItem("ishiki_ref_code");
      if (saved) {
        setRefCode(saved);
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

    if (affRows && affRows.length > 0) setAffiliate(affRows[0]);

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

      // Kila oda tayari ina commission_total iliyokokotolewa kwa usahihi
      // kutoka kwenye commission ya kila bidhaa iliyouzwa (checkout time).
      const commSum = ordersData.reduce((sum, item) => {
        const comm = item.commission_total !== null && item.commission_total !== undefined
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
      const { data: existingRows, error: lookupErr } = await supabase
        .from("affiliates")
        .select("*")
        .eq("phone", cleanPhone)
        .order("created_at", { ascending: false })
        .limit(1);

      if (lookupErr) throw lookupErr;

      const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;

      if (existing) {
        localStorage.setItem("ishiki_ref_code", existing.ref_code);
        setRefCode(existing.ref_code);
        setRegSubmitting(false);
        return;
      }

      let created = null;
      let lastError = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        const candidateCode = generateRefCode(cleanName);
        const { data: inserted, error: insertErr } = await supabase
          .from("affiliates")
          .insert([{ full_name: cleanName, phone: cleanPhone, ref_code: candidateCode }])
          .select()
          .maybeSingle();

        if (!insertErr) {
          created = inserted || { full_name: cleanName, phone: cleanPhone, ref_code: candidateCode };
          break;
        }

        lastError = insertErr;
        if (insertErr.code !== "23505") break;
      }

      if (!created) throw lastError || new Error("Imeshindwa kujisajili");

      localStorage.setItem("ishiki_ref_code", created.ref_code);
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
    return <p className="text-center p-10 text-gray-500">Inapakia...</p>;
  }

  if (!refCode) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] text-[#12182B] flex items-center justify-center px-4 py-10">
        <div className="bg-white border border-gray-200 p-6 sm:p-8 rounded-2xl shadow-sm max-w-md w-full">
          <span className="inline-block bg-[#17A398]/10 text-[#17A398] text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mb-3">
            Jiunge Nasi
          </span>
          <h1 className="text-xl font-bold mb-1">Jisajili Kama Msambazaji</h1>
          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            Jaza taarifa zako ili upate link yako binafsi ya kusambaza na uanze kupata
            commission kwa kila mauzo yanayofanyika kupitia link yako.
          </p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold block mb-1">Jina Kamili</label>
              <input
                type="text"
                required
                placeholder="Mfano: Juma Ally"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-[#17A398]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold block mb-1">Namba ya Simu (WhatsApp)</label>
              <input
                type="tel"
                required
                placeholder="0754XXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-[#17A398]"
              />
            </div>

            {regError && (
              <p className="text-[11px] text-red-500 font-semibold">{regError}</p>
            )}

            <button
              type="submit"
              disabled={regSubmitting}
              className="w-full bg-[#12182B] hover:bg-[#17A398] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-xs transition-colors"
            >
              {regSubmitting ? "Inasajili..." : "Jisajili Sasa 🤝"}
            </button>
          </form>

          <p className="text-[10px] text-gray-400 mt-4 text-center leading-relaxed">
            Tayari umeshajisajili awali kwenye kifaa kingine? Weka namba yako ya simu
            hapo juu ili turejeshe akaunti yako.
          </p>

          <Link href="/" className="block text-center text-[#17A398] text-xs font-bold underline mt-4">
            Rudi Nyumbani
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#12182B]">
      <header className="sticky top-0 z-50 bg-[#12182B] border-b border-white/10 px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="bg-[#E5383B] text-white text-xs font-bold px-2 py-1 rounded">
            Ishi
          </span>
          <span className="text-white font-bold text-base">Kidijitali</span>
        </Link>
      </header>

      <section className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 p-5 sm:p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">
                Hujambo, {affiliate?.full_name || affiliate?.name || "Msambazaji"} 👋
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Namba ya Simu: {affiliate?.phone || "—"} | Code: <strong>{refCode}</strong>
              </p>
              <p className="text-[10px] text-gray-400 mt-1">
                Commission hutofautiana kwa kila bidhaa (angalia % kwenye ukurasa wa bidhaa husika)
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("ishiki_ref_code");
                setRefCode(null);
                setAffiliate(null);
                setOrders([]);
                setTotalSales(0);
                setTotalCommission(0);
              }}
              className="text-[10px] text-gray-400 hover:text-red-500 font-semibold underline whitespace-nowrap self-start"
            >
              Badilisha Akaunti
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
              <p className="text-xs text-gray-500 font-medium">Mauzo Yaliyofanyika</p>
              <h3 className="text-2xl font-bold text-[#12182B] mt-2">
                {orders.length} Oda
              </h3>
            </div>
            <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
              <p className="text-xs text-gray-500 font-medium">Thamani ya Mauzo Yote</p>
              <h3 className="text-2xl font-bold text-blue-600 mt-2">
                {fmtTZS(totalSales)}
              </h3>
            </div>
            <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
              <p className="text-xs text-gray-500 font-medium">Commission Yako</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-2">
                {fmtTZS(totalCommission)}
              </h3>
            </div>
          </div>

          <div className="bg-[#12182B] text-white p-5 sm:p-6 rounded-2xl">
            <h3 className="text-sm font-semibold">Link Yako ya Kusambaza</h3>
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
                className="bg-amber-400 text-black font-bold text-xs px-6 py-3 rounded-xl hover:bg-amber-500 transition"
              >
                {copied ? "Imenakiliwa!" : "Nakili Link"}
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-5 sm:p-6 rounded-2xl shadow-sm">
            <h3 className="font-bold text-base mb-3">Historia ya Mauzo & Commission</h3>
            {orders.length === 0 ? (
              <p className="text-xs text-gray-400 italic">
                Bado hujapata mauzo kupitia link yako. Sambaza link uanze kupata commission!
              </p>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const comm = order.commission_total !== null && order.commission_total !== undefined
                    ? Number(order.commission_total)
                    : (Number(order.total) || 0) * FALLBACK_COMMISSION_RATE;
                  return (
                    <div
                      key={order.id}
                      className="flex justify-between items-center p-3 border-b border-gray-100 text-xs gap-2"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">
                          Oda #{order.id}
                        </p>
                        <p className="text-gray-400">
                          {order.created_at ? new Date(order.created_at).toLocaleDateString() : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-600">
                          Gharama: {fmtTZS(order.total)}
                        </p>
                        <p className="font-bold text-emerald-600">
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
    </main>
  );
}
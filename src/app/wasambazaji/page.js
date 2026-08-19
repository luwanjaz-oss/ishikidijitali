"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return "ISHIKI-" + code;
}

function fmtTZS(n) {
  return (n || 0).toLocaleString("en-US") + " TZS";
}

export default function WasambazajiPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [refCode, setRefCode] = useState(null);
  const [affiliate, setAffiliate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [siteUrl, setSiteUrl] = useState("");
  const [ordersCount, setOrdersCount] = useState(0);
  const [commissionSum, setCommissionSum] = useState(0);

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

  useEffect(() => {
    if (!refCode) return;

    // Fetch taarifa za Msambazaji kutoka meza ya affiliates
    supabase
      .from("affiliates")
      .select("*")
      .eq("ref_code", refCode)
      .maybeSingle()
      .then(({ data, error }) => {
        if (data) {
          setAffiliate({
            ...data,
            name: data.full_name || data.name || "Msambazaji",
          });
        }
        if (error) console.error("Error fetching affiliate:", error);
      });

    // Fetch mauzo kutoka meza ya orders (kama ipo)
    supabase
      .from("orders")
      .select("commission_amount")
      .eq("ref_code", refCode)
      .then(({ data, error }) => {
        if (data && !error) {
          setOrdersCount(data.length);
          const totalComm = data.reduce(
            (sum, order) => sum + (order.commission_amount || 0),
            0
          );
          setCommissionSum(totalComm);
        }
      });
  }, [refCode]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError("Jaza jina na namba ya simu.");
      return;
    }
    setError("");
    setSubmitting(true);

    let success = false;
    let attempt = 0;
    let hardError = null;

    while (attempt < 4 && !success) {
      const code = generateCode();

      // Tunatuma full_name na hatutumii .select() kuzuia 400 Bad Request
      const { error: insertError } = await supabase
        .from("affiliates")
        .insert({
          full_name: name.trim(),
          phone: phone.trim(),
          ref_code: code,
        });

      if (!insertError) {
        setRefCode(code);
        setAffiliate({
          full_name: name.trim(),
          name: name.trim(),
          phone: phone.trim(),
          ref_code: code,
        });
        localStorage.setItem("ishiki_ref_code", code);
        success = true;
      } else if (insertError.code === "23505") {
        // Unique constraint violation kwenye ref_code - inajaribu tena
        attempt++;
      } else {
        console.error("SUPABASE ERROR:", insertError);
        hardError = insertError;
        break;
      }
    }

    if (!success) {
      setError(
        hardError?.message || "Kuna tatizo la mtandao, jaribu tena."
      );
    }
    setSubmitting(false);
  }

  function copyLink() {
    const link = `${siteUrl}/?ref=${refCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const waShareMsg = encodeURIComponent(
    `Karibu Ishi Kidijitali! Nunua bidhaa nzuri kutoka China, USA na Dubai: ${siteUrl}/?ref=${refCode}`
  );

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#12182B]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#12182B] border-b border-white/10">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="bg-[#E5383B] text-white font-bold text-lg px-2 py-1 rounded">
              Ishi
            </span>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-bold text-white">Kidijitali</span>
              <span className="text-[9px] tracking-widest text-white/50 uppercase hidden sm:block">
                Lifestyle Service
              </span>
            </div>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/"
              className="text-white/70 hover:text-white hover:bg-white/10 px-4 py-2 rounded-full text-sm font-medium transition"
            >
              Duka
            </Link>
            <Link
              href="/wasambazaji"
              className="text-white bg-white/10 px-4 py-2 rounded-full text-sm font-medium"
            >
              Wasambazaji
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <section className="max-w-3xl mx-auto px-5 py-12">
        {loading ? (
          <p className="text-center text-gray-500 text-sm">Inapakia...</p>
        ) : !refCode ? (
          <div className="max-w-md mx-auto bg-white border border-gray-200 shadow-sm rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-2">Jiunge kuwa Msambazaji</h2>
            <p className="text-sm text-gray-600 mb-6">
              Jaza taarifa zako upate link yako ya kipekee ya kushea na kupata
              commission hadi 35%.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Jina Lako Kamili
                </label>
                <input
                  type="text"
                  placeholder="Mfano: Zacharia Luwanja"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#12182B]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Namba ya Simu
                </label>
                <input
                  type="tel"
                  placeholder="07XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#12182B]"
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-200">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#12182B] hover:bg-black text-white py-3 rounded-lg font-semibold text-sm transition disabled:opacity-50"
              >
                {submitting ? "Inasajili..." : "Pata Link Yangu"}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
            <h2 className="text-2xl font-bold mb-1">
              Karibu, {affiliate?.name || affiliate?.full_name || name || "Msambazaji"} 👋
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              Shea link yako, kila mauzo yanayotokana nayo yanakupatia commission.
            </p>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                <div className="text-xs text-gray-500 font-medium">
                  Mauzo yaliyotokana na link yako
                </div>
                <div className="text-2xl font-bold text-[#12182B] mt-1">
                  {ordersCount}
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                <div className="text-xs text-gray-500 font-medium">
                  Commission uliyopata (jumla)
                </div>
                <div className="text-2xl font-bold text-green-600 mt-1">
                  {fmtTZS(commissionSum)}
                </div>
              </div>
            </div>

            {/* Link Box */}
            <div className="bg-[#12182B] text-white p-5 rounded-xl mb-6">
              <div className="text-xs text-gray-400 mb-2">
                Link yako ya kipekee
              </div>
              <div className="text-sm font-mono bg-white/10 p-3 rounded-lg text-amber-300 break-all mb-4">
                {siteUrl}/?ref={refCode}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={copyLink}
                  className="bg-amber-400 hover:bg-amber-500 text-black px-4 py-2.5 rounded-lg font-semibold text-sm transition"
                >
                  {copied ? "Imenakiliwa ✓" : "Nakili link"}
                </button>
                <a
                  href={`https://wa.me/?text=${waShareMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition"
                >
                  Shea WhatsApp
                </a>
              </div>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Malipo ya commission yatafanywa na Ishi Kidijitali moja kwa moja kwako
              (kupitia namba yako ya simu: <strong>{affiliate?.phone || phone}</strong>) baada ya mauzo kuthibitishwa.
            </p>
          </div>
        )}
      </section>

      <footer className="bg-[#12182B] text-white px-5 py-8 mt-12">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-white/40 text-xs">
            © 2026 Ishi Kidijitali — Lifestyle Service
          </p>
        </div>
      </footer>
    </main>
  );
}
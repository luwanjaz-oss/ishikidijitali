"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// TAHADHARI: Hii ni ulinzi rahisi (password moja) kwa matumizi ya ndani tu.
// Usishiriki link hii ya /admin hadharani. Ukitaka ubadilishe password,
// badilisha thamani hii tu.
const ADMIN_PASSWORD = "ishiki2026";

const STATUS_OPTIONS = [
  { value: "pending", label: "⏳ Pending (Mpya)" },
  { value: "inasindikwa", label: "🛒 Inasindikwa (Tunatafuta/Kununua)" },
  { value: "inasafirishwa", label: "🚚 Inasafirishwa" },
  { value: "imefika_mkoani", label: "📍 Imefika Mkoani" },
  { value: "delivered", label: "✅ Imekamilika (Delivered)" },
  { value: "cancelled", label: "❌ Imeghairiwa" },
];

function fmtTZS(n) {
  return (n || 0).toLocaleString("en-US") + " TZS";
}

function statusLabel(value) {
  const found = STATUS_OPTIONS.find((s) => s.value === value);
  return found ? found.label : value || "pending";
}

function statusColor(value) {
  switch (value) {
    case "delivered":
      return "bg-green-100 text-green-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    case "inasafirishwa":
      return "bg-blue-100 text-blue-700";
    case "imefika_mkoani":
      return "bg-purple-100 text-purple-700";
    case "inasindikwa":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function parseItems(itemsRaw) {
  if (!itemsRaw) return [];
  try {
    const parsed = typeof itemsRaw === "string" ? JSON.parse(itemsRaw) : itemsRaw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const [statusFilter, setStatusFilter] = useState("wote");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("ishiki_admin_authed");
      if (saved === "yes") setAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  async function loadOrders() {
    setLoading(true);
    setLoadError("");
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Admin load orders error:", err);
      setLoadError("Imeshindwa kupakia oda. Tafadhali jaribu tena.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogin(e) {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setAuthError("");
      if (typeof window !== "undefined") {
        sessionStorage.setItem("ishiki_admin_authed", "yes");
      }
    } else {
      setAuthError("Password si sahihi. Jaribu tena.");
    }
  }

  function handleLogout() {
    setAuthenticated(false);
    setPasswordInput("");
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("ishiki_admin_authed");
    }
  }

  async function handleStatusChange(orderId, newStatus) {
    setUpdatingId(orderId);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);
      if (error) throw error;
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err) {
      console.error("Status update error:", err);
      alert("Imeshindwa kubadilisha status: " + (err.message || "unknown error"));
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === "wote" || (o.status || "pending") === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (o.customer_name || "").toLowerCase().includes(q) ||
      (o.customer_phone || "").includes(q) ||
      String(o.id).includes(q);
    return matchesStatus && matchesSearch;
  });

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-[#12182B] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl">
          <h1 className="text-lg font-bold text-[#12182B] mb-1">🔐 Admin - Ishi Kidijitali</h1>
          <p className="text-xs text-gray-500 mb-5">Weka password kuona na kusimamia oda.</p>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="password"
              required
              autoFocus
              placeholder="Password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-[#17A398]"
            />
            {authError && <p className="text-xs text-red-500 font-medium">{authError}</p>}
            <button
              type="submit"
              className="w-full bg-[#12182B] hover:bg-[#17A398] text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
            >
              Ingia
            </button>
          </form>
          <Link href="/" className="block text-center text-[#17A398] text-xs font-bold underline mt-4">
            Rudi Nyumbani
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#12182B]">
      <header className="sticky top-0 z-50 bg-[#12182B] border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-[#E5383B] text-white text-xs font-bold px-2 py-1 rounded">Ishi</span>
          <span className="text-white font-bold text-sm">Admin - Oda</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-white/60 hover:text-white text-xs font-semibold underline"
        >
          Toka
        </button>
      </header>

      <section className="max-w-4xl mx-auto px-4 py-5">
        {/* SEARCH & FILTER */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="text"
            placeholder="Tafuta kwa jina, namba ya simu, au ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-xl text-xs bg-white focus:outline-none focus:border-[#17A398]"
          />
          <button
            onClick={loadOrders}
            className="bg-[#17A398] hover:bg-[#13847b] text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
          >
            🔄 Sasisha
          </button>
        </div>

        <div className="flex gap-2 flex-wrap mb-5">
          <button
            onClick={() => setStatusFilter("wote")}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold ${
              statusFilter === "wote" ? "bg-[#12182B] text-white" : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            Zote ({orders.length})
          </button>
          {STATUS_OPTIONS.map((s) => {
            const count = orders.filter((o) => (o.status || "pending") === s.value).length;
            return (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                  statusFilter === s.value ? "bg-[#12182B] text-white" : "bg-white text-gray-600 border border-gray-200"
                }`}
              >
                {s.label} ({count})
              </button>
            );
          })}
        </div>

        {loading ? (
          <p className="text-xs text-gray-500 text-center py-10">Inapakia oda...</p>
        ) : loadError ? (
          <p className="text-xs text-red-500 text-center py-10">{loadError}</p>
        ) : filteredOrders.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-10">Hakuna oda zinazofanana na utafutaji huu.</p>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const items = parseItems(order.items);
              const isExpanded = expandedId === order.id;
              return (
                <div key={order.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm">Oda #{order.id}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${statusColor(order.status)}`}>
                          {statusLabel(order.status)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {order.customer_name || "Bila Jina"} • {order.customer_phone || "—"}
                      </p>
                      <p className="text-xs text-gray-500">📍 {order.region || "—"}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {order.created_at ? new Date(order.created_at).toLocaleString("sw-TZ") : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-[#17A398] text-sm">{fmtTZS(order.total)}</p>
                      {order.ref_code && (
                        <p className="text-[10px] text-gray-400">Ref: {order.ref_code}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    className="text-[11px] text-[#17A398] font-semibold mt-2 underline"
                  >
                    {isExpanded ? "Ficha maelezo" : "Ona bidhaa & maelezo zaidi"}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-xs space-y-2">
                      {items.length > 0 && (
                        <div>
                          <p className="font-bold text-gray-700 mb-1">Bidhaa:</p>
                          {items.map((it, i) => (
                            <p key={i} className="text-gray-600">
                              • {it.name} {it.size ? `(Size: ${it.size})` : ""} {it.color ? `(Rangi: ${it.color})` : ""} {it.type ? `(${it.type})` : ""} — {it.qty} x {fmtTZS(it.price)}
                            </p>
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-600">
                        <span>Bei ya Bidhaa:</span>
                        <span className="text-right">{fmtTZS(order.subtotal)}</span>
                        <span>Usafiri:</span>
                        <span className="text-right">{fmtTZS(order.shipping_fee)}</span>
                        <span className="font-bold text-[#12182B]">Jumla:</span>
                        <span className="text-right font-bold text-[#12182B]">{fmtTZS(order.total)}</span>
                        {order.ref_code && (
                          <>
                            <span>Commission:</span>
                            <span className="text-right">{fmtTZS(order.commission_total)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                      Badilisha Status:
                    </label>
                    <select
                      value={order.status || "pending"}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      disabled={updatingId === order.id}
                      className="w-full px-3 py-2 border rounded-xl text-xs bg-white font-semibold disabled:opacity-50"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {order.customer_phone && (
                    <a
                      href={`https://wa.me/255${order.customer_phone.replace(/^0/, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-center mt-2 bg-[#25D366] hover:bg-[#1ea952] text-white text-xs font-bold py-2 rounded-xl transition-colors"
                    >
                      💬 Wasiliana na Mteja WhatsApp
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
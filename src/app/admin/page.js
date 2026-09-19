"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { downloadReceipt } from "@/lib/receipt";

const ADMIN_PASSWORD = "ishiki2026";

const STATUS_OPTIONS = [
  { value: "pending", label: "⏳ Pending (Mpya)" },
  { value: "inasindikwa", label: "🛒 Inasindikwa (Tunatafuta/Kununua)" },
  { value: "imenunuliwa", label: "🧾 Imenunuliwa Nje (Inasubiri Kusafirishwa)" },
  { value: "inasafirishwa_nje", label: "✈️ Inasafirishwa Kutoka Nje (Ndege/Meli)" },
  { value: "forodha_dsm", label: "🛃 Forodha DSM (Import Duties)" },
  { value: "imefika_dsm", label: "📦 Imefika Dar es Salaam" },
  { value: "inasafirishwa_mkoani", label: "🚚 Inasafirishwa Kwenda Mkoani" },
  { value: "imefika_mkoani", label: "📍 Imefika Mkoani" },
  { value: "delivered", label: "✅ Imekamilika (Delivered)" },
  { value: "cancelled", label: "❌ Imeghairiwa" },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "hajalipa", label: "❌ Hajalipa" },
  { value: "atalipa_mzigo_ukifika", label: "📦 Atalipa Mzigo Ukifika (COD)" },
  { value: "amelipa_kidogo", label: "💰 Amelipa Kidogo (Deposit)" },
  { value: "amelipa_kamili", label: "✅ Amelipa Kamili" },
];

function paymentStatusLabel(value) {
  const found = PAYMENT_STATUS_OPTIONS.find((s) => s.value === value);
  return found ? found.label : "❌ Hajalipa";
}

function paymentStatusColor(value) {
  switch (value) {
    case "amelipa_kamili":
      return "bg-green-100 text-green-700";
    case "amelipa_kidogo":
      return "bg-amber-100 text-amber-700";
    case "atalipa_mzigo_ukifika":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-red-100 text-red-700";
  }
}

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

function orderToReceiptShape(order) {
  const items = parseItems(order.items).map((it) => ({
    name: it.name,
    qty: it.qty || 1,
    price: it.price,
    selectedSize: it.size || null,
    selectedColor: it.color || null,
    selectedType: it.type || null,
    selectedOptions: it.options || null,
  }));
  return {
    id: order.id,
    date: order.created_at,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    customerMkoa: order.region,
    customerAddress: "",
    items,
    subtotal: order.subtotal,
    shippingFee: order.shipping_fee,
    total: order.total,
  };
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

  const [affiliatesMap, setAffiliatesMap] = useState({});
  const [paidDrafts, setPaidDrafts] = useState({});
  const [savingPaidRefCode, setSavingPaidRefCode] = useState(null);
  const [showPayoutPanel, setShowPayoutPanel] = useState(false);

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [savingProductId, setSavingProductId] = useState(null);
  const [soldCountDrafts, setSoldCountDrafts] = useState({});
  const [recalculating, setRecalculating] = useState(false);
  const [showSoldPanel, setShowSoldPanel] = useState(false);

  // PRODUCT & VARIANT BUILDER STATES
  const [showProductManager, setShowProductManager] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodCategory, setProdCategory] = useState("elektroniki");
  const [prodOrigin, setProdOrigin] = useState("China");
  const [prodImage, setProdImage] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [variantOptions, setVariantOptions] = useState([
    { label: "Uwezo / Watts", list: [{ name: "500W", price: "" }, { name: "800W", price: "" }] }
  ]);
  const [savingProduct, setSavingProduct] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("ishiki_admin_authed");
      if (saved === "yes") setAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    loadOrders();
    loadAffiliates();
    loadProducts();
  }, [authenticated]);

  async function loadAffiliates() {
    try {
      const { data, error } = await supabase.from("affiliates").select("id, ref_code, phone, full_name, total_paid");
      if (error) throw error;
      const map = {};
      (data || []).forEach((a) => {
        map[a.ref_code] = { id: a.id, phone: a.phone, full_name: a.full_name, total_paid: a.total_paid || 0 };
      });
      setAffiliatesMap(map);
      const drafts = {};
      (data || []).forEach((a) => {
        drafts[a.ref_code] = a.total_paid || 0;
      });
      setPaidDrafts(drafts);
    } catch (err) {
      console.error("Load affiliates error:", err);
    }
  }

  async function handleSavePaid(refCode) {
    setSavingPaidRefCode(refCode);
    try {
      const affId = affiliatesMap[refCode]?.id;
      if (!affId) throw new Error("Affiliate haijapatikana");
      const newPaid = Number(paidDrafts[refCode]) || 0;
      const { error } = await supabase.from("affiliates").update({ total_paid: newPaid }).eq("id", affId);
      if (error) throw error;
      setAffiliatesMap((prev) => ({
        ...prev,
        [refCode]: { ...prev[refCode], total_paid: newPaid },
      }));
    } catch (err) {
      console.error("Save total_paid error:", err);
      alert("Imeshindwa kuhifadhi: " + (err.message || "unknown error"));
    } finally {
      setSavingPaidRefCode(null);
    }
  }

  async function loadProducts() {
    setProductsLoading(true);
    try {
      const { data, error } = await supabase.from("products").select("*").order("id", { ascending: true });
      if (error) throw error;
      setProducts(data || []);
      const drafts = {};
      (data || []).forEach((p) => {
        drafts[p.id] = p.sold_count ?? 0;
      });
      setSoldCountDrafts(drafts);
    } catch (err) {
      console.error("Load products error:", err);
    } finally {
      setProductsLoading(false);
    }
  }

  // EDITS / ADDS PRODUCTS & VARIANTS
  const handleEditProductClick = (p) => {
    setEditingProduct(p);
    setProdName(p.name || "");
    setProdPrice(p.price || "");
    setProdCategory(p.category || "elektroniki");
    setProdOrigin(p.origin || "China");
    setProdImage(p.image_url || "");
    setProdDesc(p.description || "");

    let parsedVariants = { options: {} };
    if (p.variants) {
      try {
        parsedVariants = typeof p.variants === "string" ? JSON.parse(p.variants) : p.variants;
      } catch {}
    }

    if (parsedVariants.options && Object.keys(parsedVariants.options).length > 0) {
      const opts = Object.entries(parsedVariants.options).map(([label, list]) => ({
        label,
        list: Array.isArray(list) ? list.map(v => typeof v === 'string' ? { name: v, price: "" } : v) : []
      }));
      setVariantOptions(opts);
    } else {
      setVariantOptions([]);
    }
  };

  const handleAddOptionGroup = () => {
    setVariantOptions([...variantOptions, { label: "Option Mpya (mf. Voltage)", list: [{ name: "Value 1", price: "" }] }]);
  };

  const handleAddValueToGroup = (groupIndex) => {
    const updated = [...variantOptions];
    updated[groupIndex].list.push({ name: "", price: "" });
    setVariantOptions(updated);
  };

  const handleSaveProductComplete = async (e) => {
    e.preventDefault();
    setSavingProduct(true);

    const optionsObj = {};
    variantOptions.forEach((opt) => {
      if (opt.label && opt.list.length > 0) {
        optionsObj[opt.label] = opt.list.filter(item => item.name.trim() !== "").map(item => ({
          name: item.name,
          price: item.price !== "" && item.price !== null ? Number(item.price) : null
        }));
      }
    });

    const variantsJSON = { options: optionsObj };

    const payload = {
      name: prodName,
      price: Number(prodPrice),
      category: prodCategory,
      origin: prodOrigin,
      image_url: prodImage,
      description: prodDesc,
      variants: JSON.stringify(variantsJSON),
    };

    try {
      if (editingProduct) {
        const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);
        if (error) throw error;
        alert("Bidhaa imesahihishwa kikamilifu!");
      } else {
        const { error } = await supabase.from("products").insert([payload]);
        if (error) throw error;
        alert("Bidhaa mpya imeongezwa kikamilifu!");
      }
      setEditingProduct(null);
      loadProducts();
    } catch (err) {
      console.error("Save product error:", err);
      alert("Kosa: " + err.message);
    } finally {
      setSavingProduct(false);
    }
  };

  async function handleSaveSoldCount(productId) {
    setSavingProductId(productId);
    try {
      const newCount = Number(soldCountDrafts[productId]) || 0;
      const { error } = await supabase.from("products").update({ sold_count: newCount }).eq("id", productId);
      if (error) throw error;
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, sold_count: newCount } : p)));
    } catch (err) {
      console.error("Save sold_count error:", err);
      alert("Imeshindwa kuhifadhi: " + (err.message || "unknown error"));
    } finally {
      setSavingProductId(null);
    }
  }

  async function handleRecalculateFromOrders() {
    setRecalculating(true);
    try {
      const counts = {};
      orders.forEach((o) => {
        const items = parseItems(o.items);
        items.forEach((it) => {
          const key = (it.name || "").trim().toLowerCase();
          if (!key) return;
          counts[key] = (counts[key] || 0) + (it.qty || 1);
        });
      });

      const updates = products.map((p) => {
        const key = (p.name || "").trim().toLowerCase();
        return { id: p.id, sold_count: counts[key] || 0 };
      });

      for (const u of updates) {
        await supabase.from("products").update({ sold_count: u.sold_count }).eq("id", u.id);
      }

      await loadProducts();
      alert("Imekamilika! Idadi za mauzo zimekokotolewa kutoka oda halisi.");
    } catch (err) {
      console.error("Recalculate error:", err);
      alert("Imeshindwa kukokotoa: " + (err.message || "unknown error"));
    } finally {
      setRecalculating(false);
    }
  }

  useEffect(() => {
    if (!authenticated) return;

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const channel = supabase
      .channel("admin-new-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const newOrder = payload.new;
          try {
            const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
            audio.play().catch(() => {});
          } catch {}

          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification("📦 Oda Mpya - Ishi Kidijitali", {
              body: `${newOrder.customer_name || "Mteja"} - ${newOrder.customer_phone || ""}`,
            });
          }
          setOrders((prev) => [newOrder, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  async function handlePaymentStatusChange(orderId, newPaymentStatus) {
    setUpdatingId(`pay-${orderId}`);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ payment_status: newPaymentStatus })
        .eq("id", orderId);
      if (error) throw error;
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, payment_status: newPaymentStatus } : o))
      );
    } catch (err) {
      console.error("Payment status update error:", err);
      alert("Imeshindwa kubadilisha hali ya malipo: " + (err.message || "unknown error"));
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

  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalOrders = orders.length;
  const totalItemsSold = orders.reduce((sum, o) => sum + parseItems(o.items).reduce((s, it) => s + (it.qty || 1), 0), 0);

  const refCodeStats = {};
  orders.forEach((o) => {
    if (!o.ref_code) return;
    if (!refCodeStats[o.ref_code]) {
      refCodeStats[o.ref_code] = { ref_code: o.ref_code, orders: 0, revenue: 0, commission: 0 };
    }
    refCodeStats[o.ref_code].orders += 1;
    refCodeStats[o.ref_code].revenue += Number(o.total) || 0;
    refCodeStats[o.ref_code].commission += Number(o.commission_total) || 0;
  });
  const topAffiliates = Object.values(refCodeStats).sort((a, b) => b.revenue - a.revenue);

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
          <span className="text-white font-bold text-sm">Admin Dashboard</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-white/60 hover:text-white text-xs font-semibold underline"
        >
          Toka
        </button>
      </header>

      <section className="max-w-4xl mx-auto px-4 py-5">
        {/* MANAGEMENT PANELS TOGGLE */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-5 shadow-sm">
          <button
            onClick={() => setShowProductManager((v) => !v)}
            className="w-full flex items-center justify-between"
          >
            <p className="text-xs font-bold text-[#12182B] flex items-center gap-2">
              <span>🛠️</span> Simamia Bidhaa & Machaguo (Variants Builder)
            </p>
            <span className="text-gray-400 text-xs">{showProductManager ? "▲" : "▼"}</span>
          </button>

          {showProductManager && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <form onSubmit={handleSaveProductComplete} className="space-y-3 bg-[#F7F9FC] p-4 rounded-xl border border-gray-200">
                <h4 className="text-xs font-extrabold text-[#12182B] uppercase">
                  {editingProduct ? `Edit Bidhaa: ${editingProduct.name}` : "➕ Ongeza Bidhaa Mpya"}
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold block mb-1">Jina la Bidhaa:</label>
                    <input
                      type="text"
                      required
                      placeholder="mf. Portable Power Station"
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      className="w-full px-2 py-1.5 border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold block mb-1">Bei ya Kawaida (TZS):</label>
                    <input
                      type="number"
                      required
                      placeholder="335000"
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      className="w-full px-2 py-1.5 border rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold block mb-1">Category:</label>
                    <select
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      className="w-full px-2 py-1.5 border rounded-lg text-xs bg-white"
                    >
                      <option value="elektroniki">Elektroniki</option>
                      <option value="vitu_vyote">Zana & Mashine</option>
                      <option value="fashion">Mavazi & Viatu</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold block mb-1">Origin (Inakotoka):</label>
                    <input
                      type="text"
                      placeholder="China / DSM / USA"
                      value={prodOrigin}
                      onChange={(e) => setProdOrigin(e.target.value)}
                      className="w-full px-2 py-1.5 border rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold block mb-1">Link ya Picha (Image URL):</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={prodImage}
                    onChange={(e) => setProdImage(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold block mb-1">Maelezo ya Bidhaa (Description):</label>
                  <textarea
                    rows={2}
                    placeholder="Maelezo fupi ya bidhaa..."
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-lg text-xs"
                  />
                </div>

                {/* VARIANT BUILDER */}
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[11px] font-extrabold text-[#17A398]">
                      ⚡ Machaguo ya Bidhaa (Watts / Volts / Color / Size):
                    </label>
                    <button
                      type="button"
                      onClick={handleAddOptionGroup}
                      className="bg-[#12182B] text-white text-[10px] font-bold px-2 py-1 rounded"
                    >
                      + Group Mpya
                    </button>
                  </div>

                  {variantOptions.map((group, groupIdx) => (
                    <div key={groupIdx} className="bg-white p-3 rounded-lg border border-gray-200 mb-2 space-y-2">
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Jina la Group (mf. Uwezo au Volts)"
                          value={group.label}
                          onChange={(e) => {
                            const updated = [...variantOptions];
                            updated[groupIdx].label = e.target.value;
                            setVariantOptions(updated);
                          }}
                          className="flex-1 px-2 py-1 border rounded text-xs font-bold text-[#17A398]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setVariantOptions(variantOptions.filter((_, i) => i !== groupIdx));
                          }}
                          className="text-red-500 font-bold text-xs"
                        >
                          ✕
                        </button>
                      </div>

                      {group.list.map((item, itemIdx) => (
                        <div key={itemIdx} className="flex gap-2 items-center pl-2">
                          <input
                            type="text"
                            placeholder="Option (mf. 500W au 800W)"
                            value={item.name}
                            onChange={(e) => {
                              const updated = [...variantOptions];
                              updated[groupIdx].list[itemIdx].name = e.target.value;
                              setVariantOptions(updated);
                            }}
                            className="flex-1 px-2 py-1 border rounded text-xs"
                          />
                          <input
                            type="number"
                            placeholder="Bei Maalum (Hiari)"
                            value={item.price || ""}
                            onChange={(e) => {
                              const updated = [...variantOptions];
                              updated[groupIdx].list[itemIdx].price = e.target.value;
                              setVariantOptions(updated);
                            }}
                            className="w-28 px-2 py-1 border rounded text-xs"
                          />
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleAddValueToGroup(groupIdx)}
                        className="text-[10px] text-[#17A398] font-bold underline pl-2 block"
                      >
                        + Ongeza Kipengele
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={savingProduct}
                    className="flex-1 bg-[#17A398] hover:bg-[#13847b] text-white font-bold py-2 rounded-lg text-xs"
                  >
                    {savingProduct ? "Inahifadhi..." : editingProduct ? "Hifadhi Mabadiliko" : "Ongeza Bidhaa"}
                  </button>
                  {editingProduct && (
                    <button
                      type="button"
                      onClick={() => setEditingProduct(null)}
                      className="bg-gray-300 text-black font-bold px-3 py-2 rounded-lg text-xs"
                    >
                      Acha
                    </button>
                  )}
                </div>
              </form>

              {/* LIST OF PRODUCTS TO EDIT */}
              <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                <p className="text-[10px] font-bold text-gray-500 uppercase">Orodha ya Bidhaa Zilizopo (Bonyeza Kuedit):</p>
                {products.map((p) => (
                  <div key={p.id} className="flex justify-between items-center bg-white p-2 rounded-lg border text-xs">
                    <span className="font-bold text-[#12182B] truncate max-w-[200px]">{p.name}</span>
                    <button
                      onClick={() => handleEditProductClick(p)}
                      className="bg-[#12182B] text-white px-2 py-1 rounded text-[10px] font-bold"
                    >
                      ✏️ Edit Machaguo
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MUHTASARI WA JUMLA */}
        {!loading && orders.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-500 font-medium">Jumla ya Oda</p>
              <p className="text-lg font-extrabold text-[#12182B]">{totalOrders}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-500 font-medium">Bidhaa Zilizouzwa</p>
              <p className="text-lg font-extrabold text-[#12182B]">{totalItemsSold}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-500 font-medium">Mapato Yote</p>
              <p className="text-sm font-extrabold text-[#17A398]">{fmtTZS(totalRevenue)}</p>
            </div>
          </div>
        )}

        {/* WASAMBAZAJI / LINK ZILIZOONGOZA KWA MAUZO */}
        {!loading && topAffiliates.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-5">
            <p className="text-xs font-bold text-[#12182B] mb-3">🏆 Wasambazaji Bora (kwa Mauzo)</p>
            <div className="space-y-2">
              {topAffiliates.map((a, i) => (
                <div key={a.ref_code} className="flex items-center justify-between gap-2 text-xs border-b border-gray-50 pb-2 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-gray-400 w-4 shrink-0">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-[#12182B] truncate">{a.ref_code}</p>
                      <p className="text-[10px] text-gray-400">{a.orders} oda</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-[#17A398]">{fmtTZS(a.revenue)}</p>
                    <p className="text-[10px] text-gray-400">Comm: {fmtTZS(a.commission)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MALIPO YA WASAMBAZAJI */}
        {!loading && topAffiliates.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-5">
            <button
              onClick={() => setShowPayoutPanel((v) => !v)}
              className="w-full flex items-center justify-between"
            >
              <p className="text-xs font-bold text-[#12182B]">💰 Malipo ya Wasambazaji (Commission Payouts)</p>
              <span className="text-gray-400 text-xs">{showPayoutPanel ? "▲" : "▼"}</span>
            </button>

            {showPayoutPanel && (
              <div className="mt-3 space-y-3">
                {topAffiliates.map((a) => {
                  const info = affiliatesMap[a.ref_code] || {};
                  const paid = Number(paidDrafts[a.ref_code] ?? info.total_paid ?? 0);
                  const balance = a.commission - paid;
                  return (
                    <div key={a.ref_code} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-xs font-bold text-[#12182B]">{info.full_name || a.ref_code}</p>
                          <p className="text-[10px] text-gray-400">{a.ref_code} • {info.phone || "—"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-gray-400">Commission Jumla</p>
                          <p className="text-xs font-bold text-[#17A398]">{fmtTZS(a.commission)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-400 block mb-0.5">Kiasi Alicholipwa (TZS)</label>
                          <input
                            type="number"
                            min="0"
                            value={paidDrafts[a.ref_code] ?? info.total_paid ?? 0}
                            onChange={(e) =>
                              setPaidDrafts((prev) => ({ ...prev, [a.ref_code]: e.target.value }))
                            }
                            className="w-full px-2 py-1.5 border rounded-lg text-xs"
                          />
                        </div>
                        <button
                          onClick={() => handleSavePaid(a.ref_code)}
                          disabled={savingPaidRefCode === a.ref_code}
                          className="bg-[#12182B] hover:bg-[#1c2540] disabled:opacity-50 text-white text-[10px] font-bold px-3 py-2 rounded-lg transition-colors whitespace-nowrap self-end"
                        >
                          {savingPaidRefCode === a.ref_code ? "..." : "Hifadhi"}
                        </button>
                      </div>

                      <p className={`text-xs font-bold mt-2 ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
                        {balance > 0 ? `Anadai: ${fmtTZS(balance)}` : balance < 0 ? `Umelipa Zaidi: ${fmtTZS(Math.abs(balance))}` : "Amelipwa Kamili ✓"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* BIDHAA ZILIZOUZWA */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-5">
          <button
            onClick={() => setShowSoldPanel((v) => !v)}
            className="w-full flex items-center justify-between"
          >
            <p className="text-xs font-bold text-[#12182B]">🔥 Bidhaa Zilizouzwa (Sold Count)</p>
            <span className="text-gray-400 text-xs">{showSoldPanel ? "▲" : "▼"}</span>
          </button>

          {showSoldPanel && (
            <div className="mt-3">
              <button
                onClick={handleRecalculateFromOrders}
                disabled={recalculating}
                className="w-full mb-3 bg-[#12182B] hover:bg-[#1c2540] disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl transition-colors"
              >
                {recalculating ? "Inakokotoa..." : "🔄 Kokotoa Kiotomatiki Kutoka Oda Halisi"}
              </button>

              {productsLoading ? (
                <p className="text-xs text-gray-400 text-center py-4">Inapakia bidhaa...</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {products.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 border-b border-gray-50 pb-2 last:border-0">
                      <p className="text-xs text-gray-700 flex-1 truncate">{p.name}</p>
                      <input
                        type="number"
                        min="0"
                        value={soldCountDrafts[p.id] ?? 0}
                        onChange={(e) =>
                          setSoldCountDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        className="w-20 px-2 py-1.5 border rounded-lg text-xs text-center"
                      />
                      <button
                        onClick={() => handleSaveSoldCount(p.id)}
                        disabled={savingProductId === p.id}
                        className="bg-[#17A398] hover:bg-[#13847b] disabled:opacity-50 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                      >
                        {savingProductId === p.id ? "..." : "Hifadhi"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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
                      Badilisha Status (Usafirishaji):
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

                  <div className="mt-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                      Hali ya Malipo:
                    </label>
                    <select
                      value={order.payment_status || "hajalipa"}
                      onChange={(e) => handlePaymentStatusChange(order.id, e.target.value)}
                      disabled={updatingId === `pay-${order.id}`}
                      className="w-full px-3 py-2 border rounded-xl text-xs bg-white font-semibold disabled:opacity-50"
                    >
                      {PAYMENT_STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <span className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${paymentStatusColor(order.payment_status)}`}>
                      {paymentStatusLabel(order.payment_status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {order.customer_phone && (
                      <a
                        href={`https://wa.me/255${order.customer_phone.replace(/^0/, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-center bg-[#25D366] hover:bg-[#1ea952] text-white text-xs font-bold py-2 rounded-xl transition-colors"
                      >
                        💬 Mteja WhatsApp
                      </a>
                    )}
                    {order.ref_code && affiliatesMap[order.ref_code]?.phone && (
                      <a
                        href={`https://wa.me/255${affiliatesMap[order.ref_code].phone.replace(/^0/, "")}?text=${encodeURIComponent(
                          `Habari ${affiliatesMap[order.ref_code].full_name || "Msambazaji"}, kuhusu Oda #${order.id}: hali ya malipo ni "${paymentStatusLabel(order.payment_status).replace(/[^\w\s()]/g, "").trim()}".`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-center bg-[#12182B] hover:bg-[#1c2540] text-white text-xs font-bold py-2 rounded-xl transition-colors"
                      >
                        💬 Msambazaji WhatsApp
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => downloadReceipt(orderToReceiptShape(order))}
                    className="w-full mt-2 bg-[#E8A93B] hover:bg-[#d4962d] text-[#12182B] text-xs font-bold py-2 rounded-xl transition-colors"
                  >
                    📥 Pakua Risiti (Admin Copy)
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
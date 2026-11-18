import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import Navbar from "./Navbar.jsx";

const STATUS_CONFIG = {
    Pending:            { color: "#f59e0b", bg: "#fef3c7", icon: "🕐" },
    Processing:         { color: "#3b82f6", bg: "#dbeafe", icon: "⚙️" },
    Shipped:            { color: "#8b5cf6", bg: "#ede9fe", icon: "🚚" },
    "Out for Delivery": { color: "#06b6d4", bg: "#cffafe", icon: "🛵" },
    Delivered:          { color: "#10b981", bg: "#d1fae5", icon: "✅" },
    Cancelled:          { color: "#ef4444", bg: "#fee2e2", icon: "❌" },
};

function Orders() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [cartCount] = useState(0);

    const getToken = () => sessionStorage.getItem("access_token") || localStorage.getItem("access_token");

    const getUser = () => {
        try {
            const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    };

    useEffect(() => {
        const token = getToken();
        const user = getUser();
        if (!token || !user) {
            toast.info("Please sign in to view your orders.");
            navigate("/login");
            return;
        }
        const fetchOrders = async () => {
            try {
                const res = await axios.get("http://127.0.0.1:8000/api/orders/", {
                    headers: { Authorization: "Bearer " + token },
                });
                const data = res.data?.results ?? res.data;
                setOrders(Array.isArray(data) ? data : []);
            } catch (err) {
                if (err.response?.status === 401) {
                    toast.error("Session expired. Please sign in again.");
                    navigate("/login");
                } else {
                    toast.error("Failed to load orders. Please try again.");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [navigate]);

    const toggleExpand = (id) => setExpandedOrder(prev => prev === id ? null : id);

    const formatDate = (iso) => {
        if (!iso) return "-";
        return new Date(iso).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    const formatPrice = (val) => {
        const num = parseFloat(val || 0);
        return String.fromCodePoint(8377) + num.toLocaleString("en-IN", { minimumFractionDigits: 2 });
    };

    const handleDownloadInvoice = async (e, orderId) => {
        e.stopPropagation();
        const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
        try {
            const res = await axios.get(`http://127.0.0.1:8000/api/orders/${orderId}/invoice_pdf/`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: "blob",
            });
            const blob = new Blob([res.data], { type: "application/pdf" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `petworld_invoice_order_${orderId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success(`Invoice #${orderId} downloaded!`);
        } catch {
            toast.error("Could not download invoice.");
        }
    };

    if (loading) {
        return (
            <>
                <Navbar cartCount={cartCount} />
                <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #f0fdf9 0%, #ecfdf5 100%)" }}>
                    <div style={{ width: 56, height: 56, border: "4px solid #d1fae5", borderTop: "4px solid #134e4a", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    <p style={{ marginTop: 16, color: "#134e4a", fontWeight: 600, fontSize: 15 }}>Loading your orders...</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar cartCount={cartCount} />
            <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f0fdf9 0%, #f8fafc 100%)", paddingBottom: 60 }}>

                <div style={{ background: "linear-gradient(135deg, #134e4a 0%, #0f766e 100%)", padding: "48px 24px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.05) 0%, transparent 60%)" }} />
                    <div style={{ position: "relative", zIndex: 1 }}>
                        <span style={{ fontSize: 40 }}>📦</span>
                        <h1 style={{ margin: "10px 0 6px", color: "#ffffff", fontSize: 28, fontWeight: 800 }}>My Orders</h1>
                        <p style={{ color: "rgba(255,255,255,0.7)", margin: 0, fontSize: 14 }}>Track and review everything you have ordered</p>
                    </div>
                </div>

                <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 16px 0" }}>
                    {orders.length === 0 ? (
                        <div style={{ background: "#fff", borderRadius: 20, padding: "64px 32px", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
                            <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
                            <h2 style={{ color: "#134e4a", fontWeight: 700, marginBottom: 8 }}>No orders yet</h2>
                            <p style={{ color: "#6b7280", marginBottom: 24, fontSize: 15 }}>You have not placed any orders. Start shopping and they will appear here.</p>
                            <button
                                onClick={() => navigate("/pets")}
                                style={{ background: "linear-gradient(135deg, #134e4a, #0f766e)", color: "#fff", border: "none", borderRadius: 50, padding: "12px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
                            >
                                Shop Now
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <p style={{ color: "#6b7280", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                                {orders.length} {orders.length === 1 ? "Order" : "Orders"} Found
                            </p>
                            {orders.map((order) => {
                                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.Pending;
                                const isOpen = expandedOrder === order.id;
                                return (
                                    <div
                                        key={order.id}
                                        style={{
                                            background: "#fff",
                                            borderRadius: 16,
                                            boxShadow: isOpen ? "0 8px 32px rgba(19,78,74,0.12)" : "0 2px 12px rgba(0,0,0,0.06)",
                                            border: isOpen ? "1.5px solid #a7f3d0" : "1.5px solid transparent",
                                            transition: "box-shadow 0.25s, border-color 0.25s",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <button
                                            onClick={() => toggleExpand(order.id)}
                                            style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "20px 24px", textAlign: "left", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}
                                        >
                                            <div style={{ width: 44, height: 44, borderRadius: 12, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                                                {cfg.icon}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 140 }}>
                                                <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 3 }}>Order #{order.id}</div>
                                                <div style={{ fontSize: 12, color: "#9ca3af" }}>{formatDate(order.created_at)}</div>
                                            </div>
                                            <div style={{ textAlign: "right", minWidth: 90 }}>
                                                <div style={{ fontWeight: 800, fontSize: 16, color: "#134e4a", marginBottom: 3 }}>{formatPrice(order.total_amount)}</div>
                                                <div style={{ fontSize: 12, color: "#9ca3af" }}>{order.items?.length ?? 0} {order.items?.length === 1 ? "item" : "items"}</div>
                                            </div>
                                            <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: "4px 14px", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                                                {order.status}
                                            </span>
                                            <span style={{ fontSize: 11, color: "#9ca3af", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
                                                ▼
                                            </span>
                                        </button>

                                        {isOpen && (
                                            <div style={{ borderTop: "1px solid #f3f4f6", padding: "20px 24px 24px" }}>
                                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
                                                    <div style={{ background: "#f9fafb", borderRadius: 10, padding: "12px 16px" }}>
                                                        <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Shipping Address</div>
                                                        <div style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{order.shipping_address || "Not provided"}</div>
                                                    </div>
                                                    <div style={{ background: "#f9fafb", borderRadius: 10, padding: "12px 16px" }}>
                                                        <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Phone</div>
                                                        <div style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{order.phone || "Not provided"}</div>
                                                    </div>
                                                    <div style={{ background: "#f9fafb", borderRadius: 10, padding: "12px 16px" }}>
                                                        <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Last Updated</div>
                                                        <div style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{formatDate(order.updated_at)}</div>
                                                    </div>
                                                </div>

                                                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                                                    Items in this order
                                                </div>
                                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                                    {order.items && order.items.length > 0 ? order.items.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f0fdf9", borderRadius: 10, padding: "10px 16px", gap: 12, flexWrap: "wrap" }}
                                                        >
                                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                                <span style={{ background: "#d1fae5", color: "#065f46", borderRadius: 8, padding: "3px 9px", fontWeight: 700, fontSize: 12 }}>x{item.quantity}</span>
                                                                <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{item.product_name}</span>
                                                            </div>
                                                            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                                                <span style={{ fontSize: 12, color: "#9ca3af" }}>{formatPrice(item.unit_price)} each</span>
                                                                <span style={{ fontWeight: 700, fontSize: 14, color: "#134e4a" }}>{formatPrice(item.unit_price * item.quantity)}</span>
                                                            </div>
                                                        </div>
                                                    )) : (
                                                        <p style={{ color: "#9ca3af", fontSize: 13 }}>No item details available.</p>
                                                    )}
                                                </div>

                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 12, borderTop: "1px solid #e5e7eb", flexWrap: "wrap", gap: 12 }}>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleDownloadInvoice(e, order.id)}
                                                        style={{
                                                            background: "#f0fdf4",
                                                            border: "1px solid #bbf7d0",
                                                            color: "#166534",
                                                            borderRadius: 50,
                                                            padding: "6px 16px",
                                                            fontSize: 13,
                                                            fontWeight: 600,
                                                            cursor: "pointer",
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: 6
                                                        }}
                                                    >
                                                        <span>📄</span>
                                                        <span>Download Invoice (PDF)</span>
                                                    </button>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>Order Total</span>
                                                        <span style={{ fontSize: 20, fontWeight: 800, color: "#134e4a" }}>{formatPrice(order.total_amount)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default Orders;

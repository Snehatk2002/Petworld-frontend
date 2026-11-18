import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const STATUS_OPTIONS = [
    { value: "Pending", label: "Pending", bg: "#fef3c7", color: "#d97706", icon: "🕐" },
    { value: "Processing", label: "Processing", bg: "#dbeafe", color: "#2563eb", icon: "⚙️" },
    { value: "Shipped", label: "Shipped", bg: "#ede9fe", color: "#7c3aed", icon: "🚚" },
    { value: "Out for Delivery", label: "Out for Delivery", bg: "#cffafe", color: "#0891b2", icon: "🛵" },
    { value: "Delivered", label: "Delivered", bg: "#d1fae5", color: "#059669", icon: "✅" },
    { value: "Cancelled", label: "Cancelled", bg: "#fee2e2", color: "#dc2626", icon: "❌" },
];

function AdminOrders() {
    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [updatingOrderId, setUpdatingOrderId] = useState(null);

    const getAuthHeaders = () => {
        const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
        return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    };

    const fetchOrders = async () => {
        const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
        if (!token) {
            toast.error("Please log in as an administrator.");
            navigate("/admin");
            return;
        }

        setLoading(true);
        try {
            const res = await axios.get("http://127.0.0.1:8000/api/orders/", getAuthHeaders());
            const data = res.data?.results || res.data;
            if (Array.isArray(data)) {
                setOrders(data);
            } else {
                setOrders([]);
            }
        } catch (err) {
            if (err.response?.status === 401 || err.response?.status === 403) {
                toast.error("Admin access required.");
                navigate("/admin");
            } else {
                toast.error("Failed to fetch customer orders.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleUpdateStatus = async (orderId, newStatus) => {
        const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
        if (!token) {
            toast.error("Authentication expired.");
            navigate("/admin");
            return;
        }

        setUpdatingOrderId(orderId);
        try {
            let updatedOrder = null;
            try {
                const res = await axios.patch(
                    `http://127.0.0.1:8000/api/orders/${orderId}/update_status/`,
                    { status: newStatus },
                    getAuthHeaders()
                );
                updatedOrder = res.data;
            } catch {
                const fallbackRes = await axios.patch(
                    `http://127.0.0.1:8000/api/orders/${orderId}/`,
                    { status: newStatus },
                    getAuthHeaders()
                );
                updatedOrder = fallbackRes.data;
            }

            setOrders((prev) =>
                prev.map((ord) => (ord.id === orderId ? { ...ord, status: updatedOrder.status } : ord))
            );
            toast.success(`Order #${orderId} marked as "${newStatus}"!`);
        } catch (err) {
            const errorMsg =
                err.response?.data?.status ||
                err.response?.data?.detail ||
                "Failed to update order status.";
            toast.error(typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg));
        } finally {
            setUpdatingOrderId(null);
        }
    };

    const handleExportExcel = async () => {
        const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
        try {
            const res = await axios.get("http://127.0.0.1:8000/api/orders/export_excel/", {
                headers: { Authorization: `Bearer ${token}` },
                responseType: "blob",
            });
            const blob = new Blob([res.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "petworld_orders.xlsx";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success("Orders exported to Excel successfully!");
        } catch {
            toast.error("Could not export orders.");
        }
    };

    const handleDownloadInvoice = async (orderId) => {
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

    const handleLogout = () => {
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("refresh_token");
        sessionStorage.removeItem("user");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        toast.info("Logged out of Admin Console");
        navigate("/admin");
    };

    const formatDate = (isoString) => {
        if (!isoString) return "-";
        try {
            return new Date(isoString).toLocaleString("en-IN", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return "-";
        }
    };

    const formatPrice = (val) => {
        const num = parseFloat(val || 0);
        return "$" + num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getStatusMeta = (status) => {
        const found = STATUS_OPTIONS.find(
            (s) => s.value.toLowerCase() === (status || "").toLowerCase()
        );
        return found || { value: status, label: status, bg: "#f3f4f6", color: "#374151", icon: "📦" };
    };

    const filteredOrders = orders.filter((ord) => {
        const matchesStatus =
            statusFilter === "all" ||
            ord.status.toLowerCase() === statusFilter.toLowerCase();

        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            !searchTerm.trim() ||
            String(ord.id).includes(searchLower) ||
            (ord.customer_name && ord.customer_name.toLowerCase().includes(searchLower)) ||
            (ord.user_email && ord.user_email.toLowerCase().includes(searchLower)) ||
            (ord.phone && ord.phone.toLowerCase().includes(searchLower)) ||
            (ord.shipping_address && ord.shipping_address.toLowerCase().includes(searchLower));

        return matchesStatus && matchesSearch;
    });

    const pendingCount = orders.filter((o) => (o.status || "").toLowerCase() === "pending").length;
    const shippedCount = orders.filter((o) => (o.status || "").toLowerCase() === "shipped").length;
    const outForDeliveryCount = orders.filter((o) => (o.status || "").toLowerCase() === "out for delivery").length;
    const deliveredCount = orders.filter((o) => (o.status || "").toLowerCase() === "delivered").length;
    const totalSales = orders
        .filter((o) => o.status !== "Cancelled")
        .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

    return (
        <div className="container-fluid p-0 d-flex min-vh-100" style={{ backgroundColor: "#0b0f19", color: "#f3f4f6" }}>
            <aside
                className="d-flex flex-column justify-content-between p-3 border-end"
                style={{
                    width: "260px",
                    backgroundColor: "#0f172a",
                    borderColor: "rgba(255, 255, 255, 0.08)",
                    minHeight: "100vh",
                }}
            >
                <div>
                    <div className="d-flex align-items-center gap-2 px-2 py-3 mb-3 border-bottom border-secondary border-opacity-25">
                        <div
                            className="rounded-3 d-flex align-items-center justify-content-center shadow-sm"
                            style={{
                                width: "42px",
                                height: "42px",
                                background: "linear-gradient(135deg, #10b981 0%, #0d6efd 100%)",
                                fontSize: "22px",
                            }}
                        >
                            🐾
                        </div>
                        <div>
                            <h5 className="fw-bold mb-0 text-white">PetWorld</h5>
                            <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-25 py-0 px-2" style={{ fontSize: "10px" }}>
                                ADMIN PANEL
                            </span>
                        </div>
                    </div>

                    <nav className="nav flex-column gap-1">
                        <Link
                            to="/admin/dashboard"
                            className="nav-link text-start text-secondary rounded-3 px-3 py-2 d-flex align-items-center gap-2"
                            style={{ fontSize: "14px", fontWeight: "500" }}
                        >
                            <span>📊</span>
                            <span>Dashboard Overview</span>
                        </Link>

                        <Link
                            to="/admin/pets"
                            className="nav-link text-start text-secondary rounded-3 px-3 py-2 d-flex align-items-center gap-2"
                            style={{ fontSize: "14px", fontWeight: "500" }}
                        >
                            <span>🐶</span>
                            <span>Pets Catalog</span>
                        </Link>

                        <Link
                            to="/admin/orders"
                            className="nav-link text-start bg-primary text-white rounded-3 px-3 py-2 d-flex align-items-center gap-2 shadow-sm"
                            style={{ fontSize: "14px", fontWeight: "500" }}
                        >
                            <span>📦</span>
                            <span>Orders Management</span>
                        </Link>

                        <Link
                            to="/admin/feedback"
                            className="nav-link text-start text-secondary rounded-3 px-3 py-2 d-flex align-items-center gap-2"
                            style={{ fontSize: "14px", fontWeight: "500" }}
                        >
                            <span>💬</span>
                            <span>Customer Feedbacks</span>
                        </Link>

                        <Link
                            to="/admin/users"
                            className="nav-link text-start text-secondary rounded-3 px-3 py-2 d-flex align-items-center gap-2"
                            style={{ fontSize: "14px", fontWeight: "500" }}
                        >
                            <span>👥</span>
                            <span>User Accounts</span>
                        </Link>

                        <Link
                            to="/"
                            className="nav-link text-start text-secondary rounded-3 px-3 py-2 d-flex align-items-center gap-2 mt-2"
                            style={{ fontSize: "14px" }}
                        >
                            <span>🛍️</span>
                            <span>Visit Storefront</span>
                        </Link>
                    </nav>
                </div>

                <div className="pt-3 border-top border-secondary border-opacity-25">
                    <div className="d-flex align-items-center gap-2 mb-3 px-2">
                        <div
                            className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-bold"
                            style={{ width: "36px", height: "36px", fontSize: "14px" }}
                        >
                            AD
                        </div>
                        <div className="overflow-hidden">
                            <div className="fw-semibold text-white small text-truncate">System Admin</div>
                            <div className="text-secondary small text-truncate" style={{ fontSize: "11px" }}>admin@petworld.com</div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="btn btn-outline-danger w-100 btn-sm py-2 rounded-3 d-flex align-items-center justify-content-center gap-2"
                        style={{ fontSize: "13px" }}
                    >
                        <span>🚪</span>
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            <main className="flex-grow-1 p-4 overflow-auto" style={{ maxHeight: "100vh" }}>
                <header className="d-flex flex-wrap justify-content-between align-items-center gap-3 pb-3 mb-4 border-bottom border-secondary border-opacity-25">
                    <div>
                        <h3 className="fw-bold text-white mb-1">Customer Orders Management</h3>
                        <p className="text-secondary small mb-0">
                            Track live purchases, verify customer addresses, and update fulfillment states
                        </p>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            className="btn btn-sm btn-outline-success rounded-3 text-success border-success d-flex align-items-center gap-1"
                            style={{ fontSize: "13px" }}
                        >
                            <span>📊</span>
                            <span>Export Excel</span>
                        </button>
                        <button
                            type="button"
                            onClick={fetchOrders}
                            className="btn btn-sm btn-outline-secondary rounded-3 text-light border-secondary"
                            style={{ fontSize: "13px" }}
                        >
                            🔄 Refresh
                        </button>
                        <Link
                            to="/admin/pets"
                            className="btn btn-sm text-white fw-semibold rounded-3 px-3 py-2 text-decoration-none"
                            style={{ background: "linear-gradient(135deg, #10b981 0%, #0d6efd 100%)", fontSize: "13px" }}
                        >
                            Pets Catalog →
                        </Link>
                    </div>
                </header>

                <div className="row g-3 mb-4">
                    <div className="col-12 col-sm-6 col-xl-2">
                        <div className="card border-0 rounded-4 p-3 shadow-sm" style={{ backgroundColor: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <span className="text-secondary small fw-semibold">TOTAL ORDERS</span>
                            <h4 className="fw-bold text-white mt-1 mb-0">{orders.length}</h4>
                        </div>
                    </div>

                    <div className="col-12 col-sm-6 col-xl-2">
                        <div className="card border-0 rounded-4 p-3 shadow-sm" style={{ backgroundColor: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <span className="text-warning small fw-semibold">PENDING</span>
                            <h4 className="fw-bold text-warning mt-1 mb-0">{pendingCount}</h4>
                        </div>
                    </div>

                    <div className="col-12 col-sm-6 col-xl-2">
                        <div className="card border-0 rounded-4 p-3 shadow-sm" style={{ backgroundColor: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <span className="text-primary small fw-semibold">SHIPPED</span>
                            <h4 className="fw-bold text-primary mt-1 mb-0">{shippedCount}</h4>
                        </div>
                    </div>

                    <div className="col-12 col-sm-6 col-xl-3">
                        <div className="card border-0 rounded-4 p-3 shadow-sm" style={{ backgroundColor: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <span className="text-info small fw-semibold">OUT FOR DELIVERY</span>
                            <h4 className="fw-bold text-info mt-1 mb-0">{outForDeliveryCount}</h4>
                        </div>
                    </div>

                    <div className="col-12 col-sm-6 col-xl-3">
                        <div className="card border-0 rounded-4 p-3 shadow-sm" style={{ backgroundColor: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <span className="text-success small fw-semibold">DELIVERED (SALES)</span>
                            <h4 className="fw-bold text-success mt-1 mb-0">{formatPrice(totalSales)}</h4>
                        </div>
                    </div>
                </div>

                <div className="card border-0 rounded-4 shadow-sm overflow-hidden" style={{ backgroundColor: "#111827" }}>
                    <div className="p-3 d-flex flex-wrap justify-content-between align-items-center gap-3 border-bottom border-secondary border-opacity-25">
                        <div className="d-flex flex-wrap align-items-center gap-2">
                            {["all", "pending", "processing", "shipped", "out for delivery", "delivered", "cancelled"].map((st) => (
                                <button
                                    key={st}
                                    type="button"
                                    onClick={() => setStatusFilter(st)}
                                    className={`btn btn-sm text-capitalize rounded-pill px-3 fw-semibold ${
                                        statusFilter === st ? "btn-primary" : "btn-outline-secondary text-secondary"
                                    }`}
                                    style={{ fontSize: "12px" }}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>

                        <div className="input-group" style={{ maxWidth: "320px" }}>
                            <span className="input-group-text bg-dark border-secondary text-secondary">🔍</span>
                            <input
                                type="text"
                                className="form-control form-control-sm text-white bg-dark border-secondary"
                                placeholder="Search by customer, phone, ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading orders...</span>
                            </div>
                            <h6 className="mt-3 text-secondary">Loading live orders from database...</h6>
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="text-center py-5">
                            <div className="display-4 mb-2">📦</div>
                            <h5 className="fw-bold text-white mb-1">No Orders Found</h5>
                            <p className="text-secondary small mb-3">No customer orders matching the current filter or search criteria.</p>
                            <button
                                type="button"
                                onClick={() => {
                                    setStatusFilter("all");
                                    setSearchTerm("");
                                }}
                                className="btn btn-outline-primary btn-sm rounded-pill px-4"
                            >
                                Reset Filters
                            </button>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-dark table-hover align-middle mb-0" style={{ backgroundColor: "#111827" }}>
                                <thead className="text-secondary small border-secondary">
                                    <tr>
                                        <th>ORDER</th>
                                        <th>CUSTOMER</th>
                                        <th>ITEMS ORDERED</th>
                                        <th>DELIVERY ADDRESS</th>
                                        <th>PAYMENT</th>
                                        <th>TOTAL</th>
                                        <th>STATUS</th>
                                        <th className="text-end">CHANGE STATUS</th>
                                    </tr>
                                </thead>
                                <tbody className="small">
                                    {filteredOrders.map((ord) => {
                                        const meta = getStatusMeta(ord.status);
                                        const isUpdating = updatingOrderId === ord.id;
                                        return (
                                            <tr key={ord.id} className="border-secondary border-opacity-25">
                                                <td>
                                                    <div className="fw-bold text-white">#{ord.id}</div>
                                                    <div className="text-secondary" style={{ fontSize: "11px" }}>
                                                        {formatDate(ord.created_at)}
                                                    </div>
                                                </td>

                                                <td>
                                                    <div className="fw-semibold text-white">
                                                        {ord.customer_name || ord.user_email?.split("@")[0] || "Customer"}
                                                    </div>
                                                    <div className="text-secondary" style={{ fontSize: "11px" }}>
                                                        {ord.user_email}
                                                    </div>
                                                    {ord.phone && (
                                                        <div className="text-muted" style={{ fontSize: "11px" }}>
                                                            📞 {ord.phone}
                                                        </div>
                                                    )}
                                                </td>

                                                <td>
                                                    <div className="d-flex flex-column gap-1">
                                                        {ord.items && ord.items.length > 0 ? (
                                                            ord.items.map((it) => (
                                                                <div key={it.id} className="d-flex align-items-center gap-2">
                                                                    {it.product_image && (
                                                                        <img
                                                                            src={
                                                                                it.product_image.startsWith("http")
                                                                                    ? it.product_image
                                                                                    : `http://127.0.0.1:8000${it.product_image}`
                                                                            }
                                                                            alt={it.product_name}
                                                                            className="rounded-2"
                                                                            style={{ width: "24px", height: "24px", objectFit: "cover" }}
                                                                        />
                                                                    )}
                                                                    <span className="text-white fw-semibold">{it.product_name}</span>
                                                                    <span className="badge bg-secondary-subtle text-white-50 py-0 px-1" style={{ fontSize: "10px" }}>
                                                                        x{it.quantity}
                                                                    </span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <span className="text-muted">No items</span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td style={{ maxWidth: "220px" }}>
                                                    <div className="text-secondary small text-truncate" title={ord.shipping_address}>
                                                        {ord.shipping_address || "No address specified"}
                                                    </div>
                                                </td>

                                                <td>
                                                    <div className="d-flex flex-column gap-1">
                                                        <span className="badge bg-dark border border-secondary text-light py-1 px-2 text-capitalize">
                                                            {ord.payment_method === "gpay"
                                                                ? "🔵 Google Pay"
                                                                : ord.payment_method === "card"
                                                                ? "💳 Card"
                                                                : "💵 Cash on Delivery"}
                                                        </span>
                                                        <span
                                                            className={`badge py-0 px-2 ${
                                                                ord.payment_status === "paid" ? "bg-success" : "bg-warning text-dark"
                                                            }`}
                                                            style={{ fontSize: "10px" }}
                                                        >
                                                            {ord.payment_status === "paid" ? "Paid" : "Unpaid"}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="text-success fw-bold fs-6">
                                                    {formatPrice(ord.total_amount)}
                                                </td>

                                                <td>
                                                    <span
                                                        className="badge rounded-pill px-3 py-1 fw-bold"
                                                        style={{ backgroundColor: meta.bg, color: meta.color }}
                                                    >
                                                        {meta.icon} {ord.status}
                                                    </span>
                                                </td>

                                                <td className="text-end">
                                                    <div className="d-inline-flex align-items-center gap-2">
                                                        <select
                                                            className="form-select form-select-sm bg-dark text-white border-secondary rounded-3 fw-semibold"
                                                            style={{ width: "175px", fontSize: "12px" }}
                                                            value={ord.status}
                                                            disabled={isUpdating}
                                                            onChange={(e) => handleUpdateStatus(ord.id, e.target.value)}
                                                        >
                                                            <option value="Pending">🕐 Pending</option>
                                                            <option value="Processing">⚙️ Processing</option>
                                                            <option value="Shipped">🚚 Shipped</option>
                                                            <option value="Out for Delivery">🛵 Out for Delivery</option>
                                                            <option value="Delivered">✅ Delivered</option>
                                                            <option value="Cancelled">❌ Cancelled</option>
                                                        </select>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDownloadInvoice(ord.id)}
                                                            className="btn btn-sm btn-outline-light rounded-pill px-2"
                                                            title="Download PDF Invoice"
                                                            style={{ fontSize: "11px" }}
                                                        >
                                                            📄 PDF
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default AdminOrders;


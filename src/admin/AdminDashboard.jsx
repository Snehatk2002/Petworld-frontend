import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    PieChart,
    Pie,
    Cell
} from "recharts";

const AdminDashboard = () => {
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState("overview");
    const [loading, setLoading] = useState(true);

    const [stats, setStats] = useState({
        total_sales: 0,
        total_orders: 0,
        pending_orders: 0,
        total_products: 0,
        total_users: 0,
        categories: [],
        monthly_sales: [],
        recent_orders: [],
    });

    const [users, setUsers] = useState([]);

    const getAuthHeaders = () => {
        const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
        return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    };

    const fetchDashboardData = async () => {
        const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
        if (!token) {
            navigate("/admin");
            return;
        }

        setLoading(true);
        try {
            const statsRes = await axios.get(
                "http://127.0.0.1:8000/api/orders/admin/dashboard-stats/",
                getAuthHeaders()
            );
            if (statsRes.data) {
                setStats(statsRes.data);
            }

            try {
                const usersRes = await axios.get(
                    "http://127.0.0.1:8000/api/users/",
                    getAuthHeaders()
                );
                const uList = usersRes.data?.results || usersRes.data;
                if (Array.isArray(uList)) {
                    setUsers(uList);
                }
            } catch {
                setUsers([]);
            }
        } catch (err) {
            if (err.response?.status === 401 || err.response?.status === 403) {
                toast.error("Administrator access required.");
                navigate("/admin");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const handleLogout = () => {
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("refresh_token");
        sessionStorage.removeItem("user");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        toast.info("Signed out of Admin Console");
        navigate("/admin");
    };

    const handleToggleUserBlock = async (userId) => {
        try {
            const user = users.find((u) => u.id === userId);
            if (!user) return;
            const updatedBlocked = !user.is_blocked;

            await axios.patch(
                `http://127.0.0.1:8000/api/users/${userId}/`,
                { is_blocked: updatedBlocked },
                getAuthHeaders()
            );

            setUsers(users.map((u) => (u.id === userId ? { ...u, is_blocked: updatedBlocked } : u)));
            toast.warning(`User account ${updatedBlocked ? "Blocked" : "Unblocked"}`);
        } catch {
            toast.error("Failed to update user status.");
        }
    };

    const handleExport = (type) => {
        toast.info(`Generating ${type} report for download...`);
    };

    const formatDate = (isoString) => {
        if (!isoString) return "-";
        try {
            return new Date(isoString).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
            });
        } catch {
            return "-";
        }
    };

    const formatPrice = (val) => {
        const num = parseFloat(val || 0);
        return "$" + num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const defaultMonthlySales = [
        { month: "May", sales: 12400, orders: 340 },
        { month: "Jun", sales: 15600, orders: 420 },
        { month: "Jul", sales: 18900, orders: 510 },
        { month: "Aug", sales: 22400, orders: 630 },
        { month: "Sep", sales: 26800, orders: 740 },
        { month: "Oct", sales: 31200, orders: 860 }
    ];

    const chartSalesData = stats.monthly_sales && stats.monthly_sales.length > 0
        ? stats.monthly_sales
        : defaultMonthlySales;

    const defaultCategories = [
        { name: "Dog Supplies", value: 42, color: "#10b981" },
        { name: "Cat Care", value: 28, color: "#0d6efd" },
        { name: "Aquatics", value: 14, color: "#f59e0b" },
        { name: "Accessories", value: 16, color: "#8b5cf6" }
    ];

    const chartCategoryData = stats.categories && stats.categories.length > 0
        ? stats.categories
        : defaultCategories;

    return (
        <div className="container-fluid p-0 d-flex min-vh-100" style={{ backgroundColor: "#0b0f19", color: "#f3f4f6" }}>
            <aside
                className="d-flex flex-column justify-content-between p-3 border-end"
                style={{
                    width: "260px",
                    backgroundColor: "#0f172a",
                    borderColor: "rgba(255, 255, 255, 0.08)",
                    minHeight: "100vh"
                }}
            >
                <div>
                    <div className="d-flex align-items-center gap-2 px-2 py-3 mb-3 border-bottom border-secondary border-opacity-25">
                        <div
                            className="rounded-3 d-flex align-items-center justify-content-center shadow-sm"
                            style={{ width: "42px", height: "42px", background: "linear-gradient(135deg, #10b981 0%, #0d6efd 100%)", fontSize: "22px" }}
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
                        <button
                            type="button"
                            onClick={() => setActiveTab("overview")}
                            className={`nav-link text-start rounded-3 px-3 py-2 d-flex align-items-center gap-2 border-0 ${activeTab === "overview" ? "bg-primary text-white shadow-sm" : "text-secondary bg-transparent"}`}
                            style={{ fontSize: "14px", fontWeight: "500" }}
                        >
                            <span>📊</span>
                            <span>Dashboard Overview</span>
                        </button>

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
                            className="nav-link text-start text-secondary rounded-3 px-3 py-2 d-flex align-items-center gap-2"
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
                        <h3 className="fw-bold text-white mb-1">
                            {activeTab === "overview" && "Executive Dashboard"}
                            {activeTab === "users" && "User & Role Management"}
                        </h3>
                        <p className="text-secondary small mb-0">PetWorld E-Commerce Full-Stack Control Portal</p>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleExport("PDF")}
                            className="btn btn-sm btn-outline-secondary rounded-3 text-light border-secondary"
                            style={{ fontSize: "13px" }}
                        >
                            📄 Export PDF
                        </button>
                        <button
                            type="button"
                            onClick={() => handleExport("Excel")}
                            className="btn btn-sm btn-outline-secondary rounded-3 text-light border-secondary"
                            style={{ fontSize: "13px" }}
                        >
                            📊 Export Excel
                        </button>
                        <Link
                            to="/admin/orders"
                            className="btn btn-sm text-white fw-semibold rounded-3 px-3 py-2 text-decoration-none"
                            style={{ background: "linear-gradient(135deg, #10b981 0%, #0d6efd 100%)", fontSize: "13px" }}
                        >
                            All Orders Panel →
                        </Link>
                    </div>
                </header>

                <div className="row g-3 mb-4">
                    <div className="col-12 col-sm-6 col-xl-3">
                        <div
                            className="card border-0 rounded-4 p-3 shadow-sm"
                            style={{ backgroundColor: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
                        >
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-secondary small fw-semibold">TOTAL SALES</span>
                                <span className="badge bg-success bg-opacity-25 text-success">Live</span>
                            </div>
                            <h4 className="fw-bold text-white mb-1">{formatPrice(stats.total_sales)}</h4>
                            <span className="text-secondary small" style={{ fontSize: "12px" }}>Real-time revenue</span>
                        </div>
                    </div>

                    <div className="col-12 col-sm-6 col-xl-3">
                        <Link to="/admin/orders" className="text-decoration-none">
                            <div
                                className="card border-0 rounded-4 p-3 shadow-sm"
                                style={{ backgroundColor: "#111827", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}
                            >
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="text-secondary small fw-semibold">ACTIVE ORDERS</span>
                                    <span className="badge bg-primary bg-opacity-25 text-primary">{stats.pending_orders} Pending</span>
                                </div>
                                <h4 className="fw-bold text-white mb-1">{stats.total_orders} Orders</h4>
                                <span className="text-secondary small" style={{ fontSize: "12px" }}>Click to manage fulfillment →</span>
                            </div>
                        </Link>
                    </div>

                    <div className="col-12 col-sm-6 col-xl-3">
                        <Link
                            to="/admin/pets"
                            className="text-decoration-none"
                        >
                            <div
                                className="card border-0 rounded-4 p-3 shadow-sm h-100"
                                style={{ backgroundColor: "#111827", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}
                            >
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="text-secondary small fw-semibold">INVENTORY COUNT</span>
                                    <span className="badge bg-warning bg-opacity-25 text-warning">{stats.total_products} Pets</span>
                                </div>
                                <h4 className="fw-bold text-white mb-1">Products Hub →</h4>
                                <span className="text-secondary small" style={{ fontSize: "12px" }}>View & edit inventory</span>
                            </div>
                        </Link>
                    </div>

                    <div className="col-12 col-sm-6 col-xl-3">
                        <div
                            className="card border-0 rounded-4 p-3 shadow-sm"
                            style={{ backgroundColor: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
                        >
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-secondary small fw-semibold">REGISTERED USERS</span>
                                <span className="badge bg-info bg-opacity-25 text-info">Active</span>
                            </div>
                            <h4 className="fw-bold text-white mb-1">{stats.total_users || users.length} Customers</h4>
                            <span className="text-secondary small" style={{ fontSize: "12px" }}>Role-based auth active</span>
                        </div>
                    </div>
                </div>

                {activeTab === "overview" && (
                    <>
                        <div className="row g-3 mb-4">
                            <div className="col-12 col-lg-8">
                                <div
                                    className="card border-0 rounded-4 p-4 shadow-sm h-100"
                                    style={{ backgroundColor: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
                                >
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h6 className="fw-bold text-white mb-0">Monthly Revenue & Sales Growth</h6>
                                        <span className="text-secondary small">Live Platform Data</span>
                                    </div>
                                    <div style={{ width: "100%", height: "260px" }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartSalesData}>
                                                <defs>
                                                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                                <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                                                <YAxis stroke="#9ca3af" fontSize={12} />
                                                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", color: "#fff" }} />
                                                <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#salesGrad)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-lg-4">
                                <div
                                    className="card border-0 rounded-4 p-4 shadow-sm h-100"
                                    style={{ backgroundColor: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
                                >
                                    <h6 className="fw-bold text-white mb-3">Category Distribution</h6>
                                    <div style={{ width: "100%", height: "180px" }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={chartCategoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4}>
                                                    {chartCategoryData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", color: "#fff" }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-2">
                                        {chartCategoryData.map((cat, idx) => (
                                            <div key={idx} className="d-flex justify-content-between align-items-center py-1">
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className="rounded-circle" style={{ width: "8px", height: "8px", backgroundColor: cat.color }}></span>
                                                    <span className="small text-secondary">{cat.name}</span>
                                                </div>
                                                <span className="small fw-semibold text-white">{cat.value}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card border-0 rounded-4 shadow-sm overflow-hidden" style={{ backgroundColor: "#111827" }}>
                            <div className="p-3 d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-25">
                                <h6 className="fw-bold text-white mb-0">Recent Customer Orders</h6>
                                <Link to="/admin/orders" className="btn btn-sm btn-link text-decoration-none text-primary p-0">
                                    Manage in Orders Panel →
                                </Link>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-dark table-hover align-middle mb-0" style={{ backgroundColor: "#111827" }}>
                                    <thead className="text-secondary small">
                                        <tr>
                                            <th>ORDER ID</th>
                                            <th>CUSTOMER</th>
                                            <th>ITEMS</th>
                                            <th>TOTAL</th>
                                            <th>PAYMENT</th>
                                            <th>STATUS</th>
                                            <th>DATE</th>
                                            <th className="text-end">ACTION</th>
                                        </tr>
                                    </thead>
                                    <tbody className="small">
                                        {stats.recent_orders && stats.recent_orders.length > 0 ? (
                                            stats.recent_orders.map((order) => (
                                                <tr key={order.id}>
                                                    <td className="fw-semibold text-white">#{order.id}</td>
                                                    <td>{order.customer_name || order.user_email}</td>
                                                    <td>{order.items?.length || 0} items</td>
                                                    <td className="text-success fw-semibold">{formatPrice(order.total_amount)}</td>
                                                    <td>
                                                        <span className="badge bg-secondary-subtle text-light text-capitalize">
                                                            {order.payment_method || "COD"}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={`badge rounded-pill ${
                                                                order.status === "Delivered"
                                                                    ? "bg-success"
                                                                    : order.status === "Shipped" || order.status === "Out for Delivery"
                                                                    ? "bg-primary"
                                                                    : "bg-warning text-dark"
                                                            }`}
                                                        >
                                                            {order.status}
                                                        </span>
                                                    </td>
                                                    <td className="text-secondary">{formatDate(order.created_at)}</td>
                                                    <td className="text-end">
                                                        <Link
                                                            to="/admin/orders"
                                                            className="btn btn-sm btn-outline-primary py-0 px-2 rounded-2"
                                                        >
                                                            View / Update
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="8" className="text-center py-4 text-secondary">
                                                    No recent customer orders found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === "users" && (
                    <div className="card border-0 rounded-4 shadow-sm overflow-hidden" style={{ backgroundColor: "#111827" }}>
                        <div className="p-3 border-bottom border-secondary border-opacity-25">
                            <h6 className="fw-bold text-white mb-0">Registered User Accounts & Access Control</h6>
                        </div>
                        <div className="table-responsive">
                            <table className="table table-dark table-hover align-middle mb-0" style={{ backgroundColor: "#111827" }}>
                                <thead className="text-secondary small">
                                    <tr>
                                        <th>USER ID</th>
                                        <th>NAME</th>
                                        <th>EMAIL</th>
                                        <th>ROLE</th>
                                        <th>STATUS</th>
                                        <th className="text-end">ACCESS CONTROL</th>
                                    </tr>
                                </thead>
                                <tbody className="small">
                                    {users.map((usr) => (
                                        <tr key={usr.id}>
                                            <td className="text-secondary">#{usr.id}</td>
                                            <td className="fw-semibold text-white">{usr.username}</td>
                                            <td className="text-secondary">{usr.email}</td>
                                            <td>
                                                <span className="badge bg-info bg-opacity-25 text-info text-capitalize">
                                                    {usr.role || "Customer"}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${usr.is_blocked ? "bg-danger" : "bg-success"}`}>
                                                    {usr.is_blocked ? "Blocked" : "Active"}
                                                </span>
                                            </td>
                                            <td className="text-end">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleUserBlock(usr.id)}
                                                    className={`btn btn-sm py-1 px-3 rounded-pill ${usr.is_blocked ? "btn-outline-success" : "btn-outline-danger"}`}
                                                >
                                                    {usr.is_blocked ? "Unblock Account" : "Block Account"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminDashboard;

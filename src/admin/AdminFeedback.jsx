import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

function AdminFeedback() {
    const navigate = useNavigate();

    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [ratingFilter, setRatingFilter] = useState("all");
    const [updatingId, setUpdatingId] = useState(null);

    const getAuthHeaders = () => {
        const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
        return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    };

    const fetchFeedbacks = async () => {
        const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
        if (!token) {
            navigate("/admin");
            return;
        }

        setLoading(true);
        try {
            const res = await axios.get(
                "http://127.0.0.1:8000/api/feedback/admin_list/",
                getAuthHeaders()
            );
            const data = res.data?.results || res.data;
            if (Array.isArray(data)) {
                setFeedbacks(data);
            } else {
                setFeedbacks([]);
            }
        } catch (err) {
            if (err.response?.status === 401 || err.response?.status === 403) {
                toast.error("Administrator access required.");
                navigate("/admin");
            } else {
                try {
                    const fallbackRes = await axios.get(
                        "http://127.0.0.1:8000/api/feedback/",
                        getAuthHeaders()
                    );
                    const fb = fallbackRes.data?.results || fallbackRes.data;
                    setFeedbacks(Array.isArray(fb) ? fb : []);
                } catch {
                    toast.error("Could not load feedback records.");
                    setFeedbacks([]);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedbacks();
    }, []);

    const handleToggleApproval = async (feedbackId, currentStatus) => {
        setUpdatingId(feedbackId);
        try {
            const res = await axios.patch(
                `http://127.0.0.1:8000/api/feedback/${feedbackId}/moderate/`,
                { is_approved: !currentStatus },
                getAuthHeaders()
            );
            const updated = res.data;
            setFeedbacks((prev) =>
                prev.map((item) => (item.id === feedbackId ? { ...item, is_approved: updated.is_approved } : item))
            );
            toast.success(
                updated.is_approved
                    ? `Feedback #${feedbackId} is now Approved & Public.`
                    : `Feedback #${feedbackId} is now Hidden from storefront.`
            );
        } catch (err) {
            console.error("Moderation error:", err);
            toast.error("Failed to update feedback status.");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDeleteFeedback = async (feedbackId) => {
        if (!window.confirm(`Are you sure you want to permanently delete Feedback #${feedbackId}?`)) {
            return;
        }
        try {
            await axios.delete(
                `http://127.0.0.1:8000/api/feedback/${feedbackId}/`,
                getAuthHeaders()
            );
            setFeedbacks((prev) => prev.filter((item) => item.id !== feedbackId));
            toast.info(`Feedback #${feedbackId} was deleted.`);
        } catch (err) {
            console.error("Delete error:", err);
            toast.error("Could not delete feedback.");
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

    const totalFeedbacks = feedbacks.length;
    const approvedCount = feedbacks.filter((f) => f.is_approved).length;
    const pendingCount = feedbacks.filter((f) => !f.is_approved).length;
    const avgRating = totalFeedbacks > 0
        ? (feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / totalFeedbacks).toFixed(1)
        : "5.0";

    const filteredFeedbacks = feedbacks.filter((f) => {
        let matchesStatus = true;
        if (statusFilter === "approved") {
            matchesStatus = f.is_approved === true;
        } else if (statusFilter === "pending") {
            matchesStatus = f.is_approved === false;
        }

        const matchesRating = ratingFilter === "all" || String(f.rating) === String(ratingFilter);

        const search = searchTerm.toLowerCase();
        const matchesSearch =
            !searchTerm.trim() ||
            String(f.id).includes(search) ||
            (f.user_name && f.user_name.toLowerCase().includes(search)) ||
            (f.user_email && f.user_email.toLowerCase().includes(search)) ||
            (f.product_name && f.product_name.toLowerCase().includes(search)) ||
            (f.comment && f.comment.toLowerCase().includes(search));

        return matchesStatus && matchesRating && matchesSearch;
    });

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
                            className="nav-link text-start text-secondary rounded-3 px-3 py-2 d-flex align-items-center gap-2"
                            style={{ fontSize: "14px", fontWeight: "500" }}
                        >
                            <span>📦</span>
                            <span>Orders Management</span>
                        </Link>

                        <Link
                            to="/admin/feedback"
                            className="nav-link text-start bg-primary text-white rounded-3 px-3 py-2 d-flex align-items-center gap-2 shadow-sm"
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
                            <div className="text-secondary small text-truncate" style={{ fontSize: "11px" }}>
                                admin@petworld.com
                            </div>
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
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 pb-2 border-bottom border-secondary border-opacity-25">
                    <div>
                        <h2 className="fw-bold mb-1 text-white">Customer Reviews & Feedbacks</h2>
                        <p className="text-secondary mb-0 small">
                            Monitor customer experiences, verify ratings, and moderate public product reviews.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={fetchFeedbacks}
                        className="btn btn-sm btn-outline-secondary rounded-pill px-3 d-flex align-items-center gap-2"
                    >
                        <span>🔄</span>
                        <span>Refresh Data</span>
                    </button>
                </div>

                <div className="row g-3 mb-4">
                    <div className="col-12 col-sm-6 col-xl-3">
                        <div className="p-3 rounded-4 bg-dark bg-opacity-50 border border-secondary border-opacity-25 h-100">
                            <div className="text-secondary small mb-1">Total Feedbacks</div>
                            <div className="d-flex align-items-center justify-content-between">
                                <span className="fs-3 fw-bold text-white">{totalFeedbacks}</span>
                                <span className="fs-4">💬</span>
                            </div>
                            <div className="text-muted small mt-2">All submitted reviews</div>
                        </div>
                    </div>

                    <div className="col-12 col-sm-6 col-xl-3">
                        <div className="p-3 rounded-4 bg-dark bg-opacity-50 border border-secondary border-opacity-25 h-100">
                            <div className="text-secondary small mb-1">Approved & Public</div>
                            <div className="d-flex align-items-center justify-content-between">
                                <span className="fs-3 fw-bold text-success">{approvedCount}</span>
                                <span className="fs-4">✅</span>
                            </div>
                            <div className="text-muted small mt-2">Visible on storefront</div>
                        </div>
                    </div>

                    <div className="col-12 col-sm-6 col-xl-3">
                        <div className="p-3 rounded-4 bg-dark bg-opacity-50 border border-secondary border-opacity-25 h-100">
                            <div className="text-secondary small mb-1">Pending / Hidden</div>
                            <div className="d-flex align-items-center justify-content-between">
                                <span className="fs-3 fw-bold text-warning">{pendingCount}</span>
                                <span className="fs-4">⏳</span>
                            </div>
                            <div className="text-muted small mt-2">Requires moderation</div>
                        </div>
                    </div>

                    <div className="col-12 col-sm-6 col-xl-3">
                        <div className="p-3 rounded-4 bg-dark bg-opacity-50 border border-secondary border-opacity-25 h-100">
                            <div className="text-secondary small mb-1">Average Score</div>
                            <div className="d-flex align-items-center justify-content-between">
                                <span className="fs-3 fw-bold text-info">{avgRating} / 5</span>
                                <span className="fs-4">⭐</span>
                            </div>
                            <div className="text-muted small mt-2">Overall customer satisfaction</div>
                        </div>
                    </div>
                </div>

                <div className="p-3 rounded-4 bg-dark bg-opacity-50 border border-secondary border-opacity-25 mb-4">
                    <div className="row g-3 align-items-center">
                        <div className="col-12 col-md-5">
                            <input
                                type="text"
                                className="form-control form-control-sm bg-dark text-white border-secondary border-opacity-50 rounded-pill px-3"
                                placeholder="Search by customer, pet name, email, or comment..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="col-12 col-md-7 d-flex flex-wrap gap-2 justify-content-md-end">
                            <div className="btn-group btn-group-sm" role="group">
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter("all")}
                                    className={`btn ${statusFilter === "all" ? "btn-primary" : "btn-outline-secondary text-secondary"}`}
                                >
                                    All ({totalFeedbacks})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter("approved")}
                                    className={`btn ${statusFilter === "approved" ? "btn-success" : "btn-outline-secondary text-secondary"}`}
                                >
                                    Approved ({approvedCount})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter("pending")}
                                    className={`btn ${statusFilter === "pending" ? "btn-warning text-dark" : "btn-outline-secondary text-secondary"}`}
                                >
                                    Pending ({pendingCount})
                                </button>
                            </div>

                            <select
                                className="form-select form-select-sm bg-dark text-white border-secondary border-opacity-50 rounded-pill"
                                style={{ width: "auto" }}
                                value={ratingFilter}
                                onChange={(e) => setRatingFilter(e.target.value)}
                            >
                                <option value="all">All Stars</option>
                                <option value="5">5 Stars</option>
                                <option value="4">4 Stars</option>
                                <option value="3">3 Stars</option>
                                <option value="2">2 Stars</option>
                                <option value="1">1 Star</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="card border-0 rounded-4 overflow-hidden bg-dark bg-opacity-50 border-secondary border-opacity-25 shadow-sm">
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading feedbacks...</span>
                            </div>
                        </div>
                    ) : filteredFeedbacks.length === 0 ? (
                        <div className="text-center py-5 text-secondary">
                            <div className="fs-2 mb-2">💬</div>
                            <h6 className="fw-semibold text-white">No feedbacks found</h6>
                            <p className="small mb-0">Try adjusting your search query or status filter.</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-dark table-hover align-middle mb-0" style={{ fontSize: "14px" }}>
                                <thead className="border-secondary border-opacity-25" style={{ backgroundColor: "#1e293b" }}>
                                    <tr>
                                        <th className="py-3 px-3">ID</th>
                                        <th className="py-3 px-3">Customer</th>
                                        <th className="py-3 px-3">Pet Companion</th>
                                        <th className="py-3 px-3">Rating</th>
                                        <th className="py-3 px-3" style={{ minWidth: "260px" }}>Review Comment</th>
                                        <th className="py-3 px-3">Date</th>
                                        <th className="py-3 px-3">Status</th>
                                        <th className="py-3 px-3 text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredFeedbacks.map((rev) => (
                                        <tr key={rev.id} className="border-secondary border-opacity-25">
                                            <td className="px-3 fw-bold text-secondary">#{rev.id}</td>
                                            <td className="px-3">
                                                <div className="fw-semibold text-white">{rev.user_name || "Customer"}</div>
                                                <div className="text-secondary small">{rev.user_email}</div>
                                            </td>
                                            <td className="px-3">
                                                <span className="badge bg-secondary bg-opacity-25 text-white border border-secondary border-opacity-25">
                                                    🐾 {rev.product_name || `Pet #${rev.product}`}
                                                </span>
                                            </td>
                                            <td className="px-3 text-warning">
                                                {"★".repeat(rev.rating)}
                                                {"☆".repeat(5 - rev.rating)}
                                                <span className="ms-1 small text-secondary">({rev.rating})</span>
                                            </td>
                                            <td className="px-3 text-white-50" style={{ whiteSpace: "pre-line" }}>
                                                {rev.comment || <em className="text-muted">No text comment</em>}
                                            </td>
                                            <td className="px-3 text-secondary small">{formatDate(rev.created_at)}</td>
                                            <td className="px-3">
                                                {rev.is_approved ? (
                                                    <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-25 py-1 px-2 rounded-pill">
                                                        ✓ Approved
                                                    </span>
                                                ) : (
                                                    <span className="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-25 py-1 px-2 rounded-pill">
                                                        ⏳ Hidden
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 text-end">
                                                <div className="d-inline-flex gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={updatingId === rev.id}
                                                        onClick={() => handleToggleApproval(rev.id, rev.is_approved)}
                                                        className={`btn btn-sm rounded-pill px-3 fw-semibold ${
                                                            rev.is_approved ? "btn-outline-warning" : "btn-outline-success"
                                                        }`}
                                                    >
                                                        {updatingId === rev.id
                                                            ? "..."
                                                            : rev.is_approved
                                                            ? "Hide"
                                                            : "Approve"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteFeedback(rev.id)}
                                                        className="btn btn-sm btn-outline-danger rounded-pill px-2"
                                                        title="Delete Review"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default AdminFeedback;


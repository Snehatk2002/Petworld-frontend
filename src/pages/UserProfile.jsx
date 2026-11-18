import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import Navbar from "./Navbar.jsx";
import { getCartCount, subscribeToCart } from "../utils/cart.js";

function UserProfile() {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [activeTab, setActiveTab] = useState("info"); // "info", "security", "orders"

    const [cartCount, setCartCount] = useState(getCartCount());
    const [recentOrders, setRecentOrders] = useState([]);

    // Profile form state
    const [profile, setProfile] = useState({
        id: "",
        username: "",
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        role: "customer",
        profile_photo: null,
        date_joined: "",
        orders_count: 0,
    });

    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);

    // Password change form state
    const [passwordForm, setPasswordForm] = useState({
        old_password: "",
        new_password: "",
        confirm_password: "",
    });

    const getToken = () => sessionStorage.getItem("access_token") || localStorage.getItem("access_token");

    // Subscribe to cart changes
    useEffect(() => {
        const unsubscribe = subscribeToCart((_, count) => setCartCount(count));
        return () => unsubscribe();
    }, []);

    // Load user profile & recent orders
    useEffect(() => {
        const token = getToken();
        if (!token) {
            toast.info("Please sign in to view your profile.");
            navigate("/login");
            return;
        }

        const fetchProfileData = async () => {
            setLoading(true);
            try {
                // Fetch profile details
                const profileRes = await axios.get("http://127.0.0.1:8000/api/users/me/", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = profileRes.data;

                setProfile({
                    id: data.id,
                    username: data.username || "",
                    first_name: data.first_name || "",
                    last_name: data.last_name || "",
                    email: data.email || "",
                    phone: data.phone || "",
                    role: data.role || "customer",
                    profile_photo: data.profile_photo || null,
                    date_joined: data.date_joined || "",
                    orders_count: data.orders_count || 0,
                });

                if (data.profile_photo) {
                    const fullPhotoUrl = data.profile_photo.startsWith("http")
                        ? data.profile_photo
                        : `http://127.0.0.1:8000${data.profile_photo}`;
                    setPhotoPreview(fullPhotoUrl);
                }

                // Fetch recent orders for quick summary
                try {
                    const ordersRes = await axios.get("http://127.0.0.1:8000/api/orders/", {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const ordersData = ordersRes.data?.results || ordersRes.data;
                    if (Array.isArray(ordersData)) {
                        setRecentOrders(ordersData.slice(0, 3));
                    }
                } catch {
                    setRecentOrders([]);
                }
            } catch (err) {
                console.error("Failed to fetch user profile", err);
                if (err.response?.status === 401) {
                    toast.error("Session expired. Please log in again.");
                    navigate("/login");
                } else {
                    toast.error("Unable to load profile data.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfile((prev) => ({ ...prev, [name]: value }));
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        const token = getToken();
        if (!token) return;

        setSaving(true);
        try {
            const formData = new FormData();
            formData.append("username", profile.username.trim());
            formData.append("first_name", profile.first_name.trim());
            formData.append("last_name", profile.last_name.trim());
            formData.append("phone", profile.phone.trim());

            if (photoFile) {
                formData.append("profile_photo", photoFile);
            }

            const res = await axios.patch("http://127.0.0.1:8000/api/users/me/", formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });

            const updated = res.data;
            setProfile((prev) => ({
                ...prev,
                username: updated.username,
                first_name: updated.first_name,
                last_name: updated.last_name,
                phone: updated.phone,
                profile_photo: updated.profile_photo,
            }));

            // Sync updated profile to session/local storage
            const savedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
            if (savedUser) {
                try {
                    const parsed = JSON.parse(savedUser);
                    const newUserData = {
                        ...parsed,
                        username: updated.username,
                        first_name: updated.first_name,
                        last_name: updated.last_name,
                        phone: updated.phone,
                    };
                    sessionStorage.setItem("user", JSON.stringify(newUserData));
                    if (localStorage.getItem("user")) {
                        localStorage.setItem("user", JSON.stringify(newUserData));
                    }
                } catch {
                    // Ignore parse error
                }
            }

            toast.success("Profile updated successfully!");
        } catch (err) {
            console.error("Profile update failed:", err);
            const errData = err.response?.data;
            if (errData?.username) {
                toast.error(`Username error: ${errData.username[0]}`);
            } else if (errData?.phone) {
                toast.error(`Phone error: ${errData.phone[0]}`);
            } else {
                toast.error("Failed to update profile. Please check your inputs.");
            }
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordForm((prev) => ({ ...prev, [name]: value }));
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        const token = getToken();
        if (!token) return;

        if (passwordForm.new_password !== passwordForm.confirm_password) {
            toast.warning("New password and confirm password do not match.");
            return;
        }

        if (passwordForm.new_password.length < 8) {
            toast.warning("New password must be at least 8 characters long.");
            return;
        }

        setChangingPassword(true);
        try {
            await axios.post(
                "http://127.0.0.1:8000/api/users/change-password/",
                {
                    old_password: passwordForm.old_password,
                    new_password: passwordForm.new_password,
                    confirm_password: passwordForm.confirm_password,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            toast.success("Password changed successfully!");
            setPasswordForm({
                old_password: "",
                new_password: "",
                confirm_password: "",
            });
        } catch (err) {
            console.error("Password change failed:", err);
            const data = err.response?.data;
            if (data?.old_password) {
                toast.error(data.old_password[0]);
            } else if (data?.new_password) {
                toast.error(data.new_password[0]);
            } else if (data?.detail) {
                toast.error(data.detail);
            } else {
                toast.error("Failed to change password. Please verify current password.");
            }
        } finally {
            setChangingPassword(false);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("refresh_token");
        sessionStorage.removeItem("user");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        toast.info("Logged out successfully");
        navigate("/login");
    };

    const formatDate = (isoString) => {
        if (!isoString) return "-";
        try {
            return new Date(isoString).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
            });
        } catch {
            return "-";
        }
    };

    const formatPrice = (val) => {
        const num = parseFloat(val || 0);
        return "$" + num.toLocaleString("en-US", { minimumFractionDigits: 2 });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "Delivered":
                return "bg-success text-white";
            case "Shipped":
                return "bg-primary text-white";
            case "Out for Delivery":
                return "bg-info text-dark";
            case "Processing":
                return "bg-info text-dark";
            case "Cancelled":
                return "bg-danger text-white";
            default:
                return "bg-warning text-dark";
        }
    };

    if (loading) {
        return (
            <div className="bg-light min-vh-100 d-flex flex-column">
                <Navbar cartCount={cartCount} />
                <div className="container py-5 my-auto text-center">
                    <div
                        className="spinner-border text-teal"
                        style={{ color: "#0f766e", width: "3.5rem", height: "3.5rem" }}
                        role="status"
                    >
                        <span className="visually-hidden">Loading Profile...</span>
                    </div>
                    <h4 className="fw-bold mt-4 text-dark">Loading Your Profile...</h4>
                    <p className="text-muted small">Retrieving account settings</p>
                </div>
            </div>
        );
    }

    const displayName =
        profile.first_name || profile.last_name
            ? `${profile.first_name} ${profile.last_name}`.trim()
            : profile.username || "Pet Customer";

    const initial = (profile.first_name?.[0] || profile.username?.[0] || "U").toUpperCase();

    return (
        <div className="bg-light min-vh-100 d-flex flex-column">
            <Navbar cartCount={cartCount} />

            {/* Header Banner */}
            <div
                className="text-white py-4 shadow-sm"
                style={{ background: "linear-gradient(135deg, #134e4a 0%, #0f766e 100%)" }}
            >
                <div className="container py-2">
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb mb-2 small text-white-50">
                            <li className="breadcrumb-item">
                                <Link to="/" className="text-white-50 text-decoration-none">
                                    Home
                                </Link>
                            </li>
                            <li className="breadcrumb-item active text-white" aria-current="page">
                                My Profile
                            </li>
                        </ol>
                    </nav>
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                        <div className="d-flex align-items-center gap-3">
                            <div
                                className="rounded-circle bg-white text-dark d-flex align-items-center justify-content-center shadow"
                                style={{
                                    width: "60px",
                                    height: "60px",
                                    fontSize: "24px",
                                    fontWeight: "bold",
                                    color: "#0f766e",
                                    overflow: "hidden",
                                }}
                            >
                                {photoPreview ? (
                                    <img
                                        src={photoPreview}
                                        alt={displayName}
                                        className="w-100 h-100"
                                        style={{ objectFit: "cover" }}
                                    />
                                ) : (
                                    <span>{initial}</span>
                                )}
                            </div>
                            <div>
                                <h2 className="fw-bold mb-0 text-white">{displayName}</h2>
                                <div className="text-white-50 small d-flex align-items-center gap-2">
                                    <span>{profile.email}</span>
                                    <span>•</span>
                                    <span className="badge bg-white text-dark rounded-pill px-2 py-1" style={{ fontSize: "11px" }}>
                                        {profile.role === "admin" ? "🛡️ Administrator" : "🐾 Customer Member"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            <Link
                                to="/orders"
                                className="btn btn-outline-light rounded-pill px-3 py-2 fw-semibold btn-sm d-flex align-items-center gap-1"
                            >
                                <span>📦</span>
                                <span>My Orders ({profile.orders_count})</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Content */}
            <div className="container py-5">
                <div className="row g-4">
                    {/* Left Column: Profile Card & Quick Actions */}
                    <div className="col-12 col-lg-4">
                        <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
                            <div className="text-center pb-3 border-bottom mb-3">
                                <div
                                    className="mx-auto rounded-circle d-flex align-items-center justify-content-center mb-3 shadow-sm border border-3 border-white position-relative"
                                    style={{
                                        width: "100px",
                                        height: "100px",
                                        backgroundColor: "#f0fdf9",
                                        fontSize: "36px",
                                        fontWeight: "bold",
                                        color: "#0f766e",
                                        overflow: "hidden",
                                    }}
                                >
                                    {photoPreview ? (
                                        <img
                                            src={photoPreview}
                                            alt={displayName}
                                            className="w-100 h-100"
                                            style={{ objectFit: "cover" }}
                                        />
                                    ) : (
                                        <span>{initial}</span>
                                    )}
                                </div>
                                <h5 className="fw-bold text-dark mb-1">{displayName}</h5>
                                <p className="text-muted small mb-2">{profile.email}</p>
                                <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-1">
                                    ✓ Active Account
                                </span>
                            </div>

                            {/* Summary Metrics */}
                            <div className="d-flex flex-column gap-3 mb-4">
                                <div className="d-flex justify-content-between align-items-center small text-secondary">
                                    <span>Username:</span>
                                    <strong className="text-dark">@{profile.username}</strong>
                                </div>
                                <div className="d-flex justify-content-between align-items-center small text-secondary">
                                    <span>Phone:</span>
                                    <strong className="text-dark">{profile.phone || "Not set"}</strong>
                                </div>
                                <div className="d-flex justify-content-between align-items-center small text-secondary">
                                    <span>Orders Placed:</span>
                                    <span className="badge bg-light text-dark border px-2 py-1 fw-bold">
                                        {profile.orders_count}
                                    </span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center small text-secondary">
                                    <span>Member Since:</span>
                                    <strong className="text-dark">{formatDate(profile.date_joined)}</strong>
                                </div>
                            </div>

                            <hr className="my-2 text-muted opacity-25" />

                            {/* Navigation Tabs */}
                            <div className="d-flex flex-column gap-2 mt-3">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("info")}
                                    className={`btn text-start rounded-3 px-3 py-2 fw-semibold d-flex align-items-center gap-2 ${
                                        activeTab === "info"
                                            ? "btn-success"
                                            : "btn-light text-secondary"
                                    }`}
                                    style={activeTab === "info" ? { backgroundColor: "#0f766e", border: "none" } : {}}
                                >
                                    <span>👤</span>
                                    <span>Edit Personal Info</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("security")}
                                    className={`btn text-start rounded-3 px-3 py-2 fw-semibold d-flex align-items-center gap-2 ${
                                        activeTab === "security"
                                            ? "btn-success"
                                            : "btn-light text-secondary"
                                    }`}
                                    style={activeTab === "security" ? { backgroundColor: "#0f766e", border: "none" } : {}}
                                >
                                    <span>🔒</span>
                                    <span>Password & Security</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("orders")}
                                    className={`btn text-start rounded-3 px-3 py-2 fw-semibold d-flex align-items-center gap-2 ${
                                        activeTab === "orders"
                                            ? "btn-success"
                                            : "btn-light text-secondary"
                                    }`}
                                    style={activeTab === "orders" ? { backgroundColor: "#0f766e", border: "none" } : {}}
                                >
                                    <span>📦</span>
                                    <span>Recent Orders ({recentOrders.length})</span>
                                </button>

                                <div className="pt-3 border-top mt-2">
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="btn btn-outline-danger w-100 rounded-pill py-2 fw-semibold small d-flex align-items-center justify-content-center gap-2"
                                    >
                                        <span>🚪</span>
                                        <span>Sign Out</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Tabbed Forms */}
                    <div className="col-12 col-lg-8">
                        {/* Tab 1: Personal Information */}
                        {activeTab === "info" && (
                            <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 bg-white">
                                <div className="d-flex align-items-center justify-content-between mb-4 pb-2 border-bottom">
                                    <div>
                                        <h4 className="fw-bold text-dark mb-1">Personal Details</h4>
                                        <p className="text-muted small mb-0">
                                            Update your contact information and public profile
                                        </p>
                                    </div>
                                    <span className="badge bg-light text-secondary border small">Account ID: #{profile.id}</span>
                                </div>

                                <form onSubmit={handleProfileSubmit}>
                                    <div className="row g-3 mb-4">
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">
                                                First Name
                                            </label>
                                            <input
                                                type="text"
                                                name="first_name"
                                                className="form-control rounded-3"
                                                placeholder="e.g. John"
                                                value={profile.first_name}
                                                onChange={handleInputChange}
                                            />
                                        </div>

                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">
                                                Last Name
                                            </label>
                                            <input
                                                type="text"
                                                name="last_name"
                                                className="form-control rounded-3"
                                                placeholder="e.g. Doe"
                                                value={profile.last_name}
                                                onChange={handleInputChange}
                                            />
                                        </div>

                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">
                                                Username *
                                            </label>
                                            <input
                                                type="text"
                                                name="username"
                                                className="form-control rounded-3"
                                                value={profile.username}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>

                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">
                                                Phone Number
                                            </label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                className="form-control rounded-3"
                                                placeholder="e.g. 9876543210"
                                                value={profile.phone}
                                                onChange={handleInputChange}
                                            />
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label small fw-semibold text-secondary">
                                                Email Address
                                            </label>
                                            <input
                                                type="email"
                                                className="form-control rounded-3 bg-light text-muted"
                                                value={profile.email}
                                                disabled
                                                title="Email address cannot be changed directly."
                                            />
                                            <div className="form-text" style={{ fontSize: "12px" }}>
                                                Email address is bound to your authentication identity.
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label small fw-semibold text-secondary">
                                                Profile Photo
                                            </label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="form-control rounded-3"
                                                onChange={handlePhotoChange}
                                            />
                                            <div className="form-text" style={{ fontSize: "12px" }}>
                                                Supports JPG, PNG or WEBP formats.
                                            </div>
                                        </div>
                                    </div>

                                    <div className="d-flex justify-content-end gap-2">
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="btn btn-success rounded-pill px-5 py-2 fw-bold"
                                            style={{ backgroundColor: "#0f766e", border: "none" }}
                                        >
                                            {saving ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                    Saving Changes...
                                                </>
                                            ) : (
                                                "Save Profile"
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Tab 2: Password & Security */}
                        {activeTab === "security" && (
                            <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 bg-white">
                                <div className="mb-4 pb-2 border-bottom">
                                    <h4 className="fw-bold text-dark mb-1">Change Password</h4>
                                    <p className="text-muted small mb-0">
                                        Ensure your account uses a secure password of at least 8 characters
                                    </p>
                                </div>

                                <form onSubmit={handlePasswordSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">
                                            Current Password *
                                        </label>
                                        <input
                                            type="password"
                                            name="old_password"
                                            className="form-control rounded-3"
                                            placeholder="Enter your existing password"
                                            value={passwordForm.old_password}
                                            onChange={handlePasswordChange}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">
                                            New Password *
                                        </label>
                                        <input
                                            type="password"
                                            name="new_password"
                                            className="form-control rounded-3"
                                            placeholder="At least 8 characters"
                                            value={passwordForm.new_password}
                                            onChange={handlePasswordChange}
                                            required
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="form-label small fw-semibold text-secondary">
                                            Confirm New Password *
                                        </label>
                                        <input
                                            type="password"
                                            name="confirm_password"
                                            className="form-control rounded-3"
                                            placeholder="Re-type new password"
                                            value={passwordForm.confirm_password}
                                            onChange={handlePasswordChange}
                                            required
                                        />
                                    </div>

                                    <div className="d-flex justify-content-end">
                                        <button
                                            type="submit"
                                            disabled={changingPassword}
                                            className="btn btn-success rounded-pill px-5 py-2 fw-bold"
                                            style={{ backgroundColor: "#0f766e", border: "none" }}
                                        >
                                            {changingPassword ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                    Updating Password...
                                                </>
                                            ) : (
                                                "Update Password"
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Tab 3: Recent Orders Snapshot */}
                        {activeTab === "orders" && (
                            <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 bg-white">
                                <div className="d-flex align-items-center justify-content-between mb-4 pb-2 border-bottom">
                                    <div>
                                        <h4 className="fw-bold text-dark mb-1">Recent Orders</h4>
                                        <p className="text-muted small mb-0">
                                            Track your recently placed pet and supply orders
                                        </p>
                                    </div>
                                    <Link
                                        to="/orders"
                                        className="btn btn-outline-success btn-sm rounded-pill px-3 fw-semibold"
                                    >
                                        View All Orders →
                                    </Link>
                                </div>

                                {recentOrders.length === 0 ? (
                                    <div className="text-center py-5 bg-light rounded-4 p-4">
                                        <div className="display-4 mb-3">🛒</div>
                                        <h5 className="fw-bold text-dark">No Orders Placed Yet</h5>
                                        <p className="text-muted small mb-4">
                                            You haven't placed any orders yet. Discover our companion catalog to start!
                                        </p>
                                        <Link
                                            to="/pets"
                                            className="btn btn-success rounded-pill px-4 fw-bold"
                                            style={{ backgroundColor: "#0f766e", border: "none" }}
                                        >
                                            Shop Pets Catalog
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column gap-3">
                                        {recentOrders.map((ord) => (
                                            <div
                                                key={ord.id}
                                                className="p-3 rounded-3 border bg-light bg-opacity-50 d-flex flex-wrap align-items-center justify-content-between gap-3"
                                            >
                                                <div>
                                                    <div className="fw-bold text-dark mb-1">
                                                        Order #{ord.id}
                                                    </div>
                                                    <div className="text-muted small">
                                                        Date: {formatDate(ord.created_at)} • {ord.items?.length || 0} item(s)
                                                    </div>
                                                </div>

                                                <div className="text-end">
                                                    <div className="fw-bold text-success mb-1">
                                                        {formatPrice(ord.total_amount)}
                                                    </div>
                                                    <span className={`badge rounded-pill px-2 py-1 small ${getStatusBadge(ord.status)}`}>
                                                        {ord.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}

                                        <div className="text-center mt-3 pt-2">
                                            <Link
                                                to="/orders"
                                                className="btn btn-primary rounded-pill px-4 fw-semibold btn-sm"
                                                style={{ backgroundColor: "#0f766e", border: "none" }}
                                            >
                                                Manage All Orders in Orders Page
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-dark text-white pt-5 pb-4 mt-auto">
                <div className="container">
                    <div className="row g-4 pb-4 border-bottom border-secondary">
                        <div className="col-12 col-md-4">
                            <div className="d-flex align-items-center gap-2 fw-bold fs-4 mb-2">
                                <span>🐾</span> PetWorld
                            </div>
                            <p className="text-secondary small">
                                Dedicated pet marketplace connecting pet companions with loving homes.
                            </p>
                        </div>
                        <div className="col-6 col-md-4">
                            <h6 className="fw-bold mb-3 text-white">Quick Links</h6>
                            <ul className="list-unstyled small text-secondary d-flex flex-column gap-2 mb-0">
                                <li>
                                    <Link to="/" className="text-decoration-none text-secondary">
                                        Home
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/pets" className="text-decoration-none text-secondary">
                                        All Pets
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/orders" className="text-decoration-none text-secondary">
                                        My Orders
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div className="col-6 col-md-4">
                            <h6 className="fw-bold mb-3 text-white">Customer Support</h6>
                            <ul className="list-unstyled small text-secondary d-flex flex-column gap-2 mb-0">
                                <li>Email: care@petworld.com</li>
                                <li>Toll Free: 1-800-PET-LOVE</li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-3 text-center text-secondary small">
                        &copy; {new Date().getFullYear()} PetWorld Platform.
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default UserProfile;


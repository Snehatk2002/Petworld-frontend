import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const AdminLogin = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleQuickFill = () => {
        setEmail("admin@petworld.com");
        setPassword("Admin@123");
        setErrorMessage("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("");

        if (!email.trim() || !password.trim()) {
            setErrorMessage("Please enter both administrator email and password.");
            toast.error("Please fill in all required fields.");
            return;
        }

        setIsLoading(true);

        try {
            const res = await axios.post("http://127.0.0.1:8000/api/admin/token/", {
                email: email.trim(),
                password: password.trim()
            });

            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem("access_token", res.data.access);
            storage.setItem("refresh_token", res.data.refresh);
            storage.setItem("user", JSON.stringify(res.data.user));

            if (rememberMe) {
                sessionStorage.setItem("access_token", res.data.access);
                sessionStorage.setItem("refresh_token", res.data.refresh);
                sessionStorage.setItem("user", JSON.stringify(res.data.user));
            }

            toast.success("Administrator authentication verified!");
            navigate("/admin/dashboard");
        } catch (err) {
            const message = err.response?.data?.detail || "Invalid email, password, or unauthorized role.";
            setErrorMessage(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="min-vh-100 d-flex align-items-center justify-content-center p-3"
            style={{
                backgroundColor: "#0b0f19",
                backgroundImage: "radial-gradient(at 0% 0%, rgba(13, 110, 253, 0.18) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.15) 0px, transparent 50%)",
                backgroundAttachment: "fixed"
            }}
        >
            <div className="w-100" style={{ maxWidth: "460px" }}>
                <div className="text-center mb-4">
                    <div
                        className="d-inline-flex align-items-center justify-content-center rounded-4 shadow-sm mb-3"
                        style={{
                            width: "68px",
                            height: "68px",
                            background: "linear-gradient(135deg, #10b981 0%, #0d6efd 100%)",
                            boxShadow: "0 10px 25px rgba(13, 110, 253, 0.35)"
                        }}
                    >
                        <span style={{ fontSize: "32px" }}>🐾</span>
                    </div>

                    <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                        <span
                            className="badge text-uppercase px-3 py-2 rounded-pill fw-bold"
                            style={{
                                background: "rgba(16, 185, 129, 0.15)",
                                color: "#34d399",
                                border: "1px solid rgba(16, 185, 129, 0.3)",
                                fontSize: "11px",
                                letterSpacing: "1px"
                            }}
                        >
                            Staff Access Only
                        </span>
                    </div>

                    <h2 className="text-white fw-bold mb-1 fs-3">PetWorld Admin Portal</h2>
                    <p className="text-secondary small mb-0">
                        Management console for catalog, orders, and system analytics
                    </p>
                </div>

                <div
                    className="card border-0 rounded-4 shadow-lg overflow-hidden"
                    style={{
                        backgroundColor: "#111827",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)"
                    }}
                >
                    <div
                        className="px-4 py-3 d-flex align-items-center justify-content-between"
                        style={{
                            background: "rgba(255, 255, 255, 0.02)",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.06)"
                        }}
                    >
                        <div className="d-flex align-items-center gap-2">
                            <span
                                className="rounded-circle d-inline-block"
                                style={{ width: "9px", height: "9px", backgroundColor: "#10b981" }}
                            ></span>
                            <span className="text-light small fw-medium">Secured DRF Gateway</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleQuickFill}
                            className="btn btn-sm btn-outline-secondary py-1 px-2 border-0 rounded-2 text-decoration-none"
                            style={{ fontSize: "12px", color: "#9ca3af" }}
                            title="Auto-fill sample credentials"
                        >
                            ⚡ Demo Admin
                        </button>
                    </div>

                    <div className="card-body p-4 p-sm-5">
                        {errorMessage && (
                            <div
                                className="alert py-2 px-3 rounded-3 small d-flex align-items-center gap-2 mb-4"
                                style={{
                                    backgroundColor: "rgba(239, 68, 68, 0.15)",
                                    border: "1px solid rgba(239, 68, 68, 0.3)",
                                    color: "#fca5a5"
                                }}
                                role="alert"
                            >
                                <span>⚠️</span>
                                <div>{errorMessage}</div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} noValidate>
                            <div className="mb-3">
                                <label className="form-label small fw-semibold text-secondary mb-1">
                                    Admin Email
                                </label>
                                <div className="input-group">
                                    <span
                                        className="input-group-text border-0 text-secondary"
                                        style={{ backgroundColor: "#1f2937", borderTopLeftRadius: "10px", borderBottomLeftRadius: "10px" }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="2" y="4" width="20" height="16" rx="2" />
                                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                        </svg>
                                    </span>
                                    <input
                                        type="email"
                                        className="form-control border-0 text-white shadow-none"
                                        style={{
                                            backgroundColor: "#1f2937",
                                            borderTopRightRadius: "10px",
                                            borderBottomRightRadius: "10px",
                                            fontSize: "14px",
                                            padding: "12px 14px"
                                        }}
                                        placeholder="admin@petworld.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="mb-3">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <label className="form-label small fw-semibold text-secondary mb-0">
                                        Password
                                    </label>
                                    <span className="text-secondary small" style={{ fontSize: "12px" }}>
                                        Role: Superuser / Staff
                                    </span>
                                </div>
                                <div className="input-group">
                                    <span
                                        className="input-group-text border-0 text-secondary"
                                        style={{ backgroundColor: "#1f2937", borderTopLeftRadius: "10px", borderBottomLeftRadius: "10px" }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                    </span>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="form-control border-0 text-white shadow-none"
                                        style={{
                                            backgroundColor: "#1f2937",
                                            fontSize: "14px",
                                            padding: "12px 14px"
                                        }}
                                        placeholder="Enter administrator password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="input-group-text border-0 text-secondary"
                                        style={{
                                            backgroundColor: "#1f2937",
                                            borderTopRightRadius: "10px",
                                            borderBottomRightRadius: "10px",
                                            cursor: "pointer"
                                        }}
                                    >
                                        {showPassword ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                <line x1="1" y1="1" x2="23" y2="23" />
                                            </svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="d-flex align-items-center justify-content-between mb-4">
                                <div className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="adminRememberMe"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        style={{ backgroundColor: rememberMe ? "#10b981" : "#1f2937", borderColor: "#374151" }}
                                    />
                                    <label className="form-check-label text-secondary small" htmlFor="adminRememberMe">
                                        Stay signed in
                                    </label>
                                </div>
                                <span className="text-secondary small" style={{ fontSize: "12px" }}>
                                    256-Bit SSL Encrypted
                                </span>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn w-100 py-3 text-white fw-semibold rounded-3 d-flex align-items-center justify-content-center gap-2 shadow"
                                style={{
                                    background: "linear-gradient(135deg, #10b981 0%, #0d6efd 100%)",
                                    border: "none",
                                    fontSize: "15px",
                                    letterSpacing: "0.3px",
                                    transition: "all 0.2s ease"
                                }}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                        <span>Authenticating Admin...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Sign In to Admin Dashboard</span>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M5 12h14" />
                                            <path d="m12 5 7 7-7 7" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div
                        className="card-footer px-4 py-3 text-center"
                        style={{
                            backgroundColor: "rgba(0, 0, 0, 0.2)",
                            borderTop: "1px solid rgba(255, 255, 255, 0.06)"
                        }}
                    >
                        <div className="d-flex align-items-center justify-content-between text-secondary small">
                            <Link to="/login" className="text-decoration-none text-secondary">
                                Customer Login
                            </Link>
                            <span>•</span>
                            <Link to="/" className="text-decoration-none" style={{ color: "#34d399" }}>
                                ← Back to Storefront
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="text-center mt-4">
                    <p className="text-secondary small mb-0" style={{ fontSize: "12px" }}>
                        PetWorld Full-Stack Administration System &copy; {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { syncCartWithBackend } from "../utils/cart.js";

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await axios.post("http://127.0.0.1:8000/api/token/", {
                email: formData.email,
                password: formData.password,
            });

            sessionStorage.setItem("access_token", res.data.access);
            sessionStorage.setItem("refresh_token", res.data.refresh);
            sessionStorage.setItem("user", JSON.stringify(res.data.user));

            // Sync user cart from backend upon login
            try {
                await syncCartWithBackend();
            } catch {
                // Ignore sync errors
            }

            toast.success("Login successful!");
            const returnUrl = location.state?.returnUrl || location.state?.from?.pathname || "/";
            navigate(returnUrl);
        } catch (err) {
            const message = err.response?.data?.detail || "Invalid email or password.";
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light py-5">
            <div className="row justify-content-center w-100">
                <div className="col-12 col-sm-10 col-md-8 col-lg-5 col-xl-4">
                    <div className="card shadow-lg border-0 rounded-4 overflow-hidden">
                        <div
                            className="card-header border-0 text-white text-center py-4"
                            style={{
                                background: "linear-gradient(135deg, #198754 0%, #0d6efd 100%)",
                            }}
                        >
                            <div
                                className="d-inline-flex align-items-center justify-content-center bg-white text-primary rounded-circle mb-2 shadow-sm"
                                style={{ width: "60px", height: "60px", fontSize: "28px" }}
                            >
                                🐾
                            </div>
                            <h3 className="fw-bold mb-1">PetWorld</h3>
                            <p className="mb-0 text-white-50 small">
                                Sign in to your account
                            </p>
                        </div>

                        <div className="card-body p-4 p-md-5 bg-white">
                            {error && (
                                <div className="alert alert-danger py-2 small" role="alert">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label htmlFor="email" className="form-label fw-semibold text-secondary small">
                                        Email Address
                                    </label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-light text-muted border-end-0 rounded-start-3">
                                            ✉️
                                        </span>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="form-control bg-light border-start-0 rounded-end-3"
                                            placeholder="Enter your email"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <label htmlFor="password" className="form-label fw-semibold text-secondary small">
                                            Password
                                        </label>
                                        <a href="/forgot-password" className="text-decoration-none small text-primary">
                                            Forgot password?
                                        </a>
                                    </div>
                                    <div className="input-group">
                                        <span className="input-group-text bg-light text-muted border-end-0 rounded-start-3">
                                            🔒
                                        </span>
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="form-control bg-light border-start-0 rounded-end-3"
                                            placeholder="Enter password"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <div className="form-check">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="rememberMe"
                                        />
                                        <label className="form-check-label text-muted small" htmlFor="rememberMe">
                                            Remember me
                                        </label>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn btn-primary w-100 py-2 rounded-3 fw-semibold shadow-sm"
                                    style={{
                                        background: "linear-gradient(135deg, #198754 0%, #0d6efd 100%)",
                                        border: "none",
                                    }}
                                >
                                    {loading ? "Signing In..." : "Sign In"}
                                </button>
                            </form>

                            <div className="text-center mt-4 pt-3 border-top">
                                <p className="text-muted small mb-0">
                                    Don't have an account?{" "}
                                    <Link to="/register" className="fw-semibold text-primary text-decoration-none">
                                        Create an account
                                    </Link>
                                </p>
                                <div className="mt-2">
                                    <Link to="/" className="text-secondary small text-decoration-none">
                                        ← Back to PetWorld Home
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
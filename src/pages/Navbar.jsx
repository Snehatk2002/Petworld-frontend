import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { getCartCount, subscribeToCart } from "../utils/cart.js";

const Navbar = ({ cartCount: propCartCount }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const [user, setUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [petsDropdownOpen, setPetsDropdownOpen] = useState(false);
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const [cartCount, setCartCount] = useState(propCartCount ?? getCartCount());

    const animalCategories = [
        { name: "Dogs", icon: "🐶", filter: "Dogs" },
        { name: "Cats", icon: "🐱", filter: "Cats" },
        { name: "Birds", icon: "🦜", filter: "Birds" },
    ];

    const petsDropdownRef = useRef(null);
    const userDropdownRef = useRef(null);

    useEffect(() => {
        setCartCount(getCartCount());
        const unsubscribe = subscribeToCart((_, count) => {
            setCartCount(count);
        });
        return () => unsubscribe();
    }, []);

    const loadUserFromStorage = () => {
        try {
            const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
            setUser(raw ? JSON.parse(raw) : null);
        } catch {
            setUser(null);
        }
    };

    useEffect(() => {
        loadUserFromStorage();
    }, [location.pathname]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (petsDropdownRef.current && !petsDropdownRef.current.contains(e.target)) {
                setPetsDropdownOpen(false);
            }
            if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
                setUserDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/pets?search=${encodeURIComponent(searchTerm.trim())}`);
        } else {
            navigate("/pets");
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("refresh_token");
        sessionStorage.removeItem("user");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        localStorage.removeItem("petworld_cart");
        window.dispatchEvent(new Event("cart-updated"));
        setUser(null);
        setUserDropdownOpen(false);
        toast.info("Logged out successfully");
        navigate("/");
    };

    const handleSelectAnimal = (filterName) => {
        setPetsDropdownOpen(false);
        navigate(`/pets?category=${encodeURIComponent(filterName)}`);
    };

    return (
        <nav className="navbar navbar-expand-lg navbar-dark sticky-top py-2 shadow-sm" style={{ backgroundColor: "#134e4a", zIndex: 1040 }}>
            <div className="container">
                <Link to="/" className="navbar-brand d-flex align-items-center gap-2 fw-bold fs-4 me-lg-3 text-decoration-none">
                    <span
                        className="bg-white text-dark rounded-circle d-inline-flex align-items-center justify-content-center shadow-sm"
                        style={{ width: "38px", height: "38px", fontSize: "20px" }}
                    >
                        🐾
                    </span>
                    <span className="text-white">PetWorld</span>
                </Link>

                <form onSubmit={handleSearchSubmit} className="d-flex flex-grow-1 my-2 my-lg-0 mx-lg-2" style={{ maxWidth: "320px" }}>
                    <div className="input-group">
                        <span className="input-group-text bg-white border-0 text-muted rounded-start-pill ps-3">
                            🔍
                        </span>
                        <input
                            type="text"
                            className="form-control border-0 shadow-none ps-2"
                            placeholder="Search pet food, toys, accessories..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ fontSize: "14px" }}
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                className="btn btn-white bg-white border-0 text-muted"
                                onClick={() => setSearchTerm("")}
                            >
                                ✕
                            </button>
                        )}
                        <button
                            type="submit"
                            className="btn btn-dark rounded-end-pill px-3 fw-semibold"
                            style={{ backgroundColor: "#0f766e", border: "none", fontSize: "13px" }}
                        >
                            Search
                        </button>
                    </div>
                </form>

                <button
                    className="navbar-toggler border-0"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#customerNavbar"
                    aria-controls="customerNavbar"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className="collapse navbar-collapse justify-content-end" id="customerNavbar">
                    <ul className="navbar-nav align-items-lg-center gap-1 gap-xl-2 mb-2 mb-lg-0">
                        <li className="nav-item">
                            <Link
                                to="/"
                                className={`nav-link px-2 px-xl-3 fw-medium ${location.pathname === "/" ? "text-white active fw-bold" : "text-white-50"}`}
                            >
                                Home
                            </Link>
                        </li>

                        <li className="nav-item position-relative" ref={petsDropdownRef}>
                            <button
                                type="button"
                                onClick={() => setPetsDropdownOpen(!petsDropdownOpen)}
                                className="nav-link btn btn-link text-decoration-none px-2 px-xl-3 fw-medium d-flex align-items-center gap-1 text-white border-0 bg-transparent"
                            >
                                <span>Pets</span>
                                <span style={{ fontSize: "10px", transform: petsDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                                    ▼
                                </span>
                            </button>

                            {petsDropdownOpen && (
                                <div
                                    className="dropdown-menu show shadow-lg border-0 rounded-3 p-2 position-absolute"
                                    style={{
                                        top: "100%",
                                        left: 0,
                                        minWidth: "190px",
                                        backgroundColor: "#ffffff",
                                        zIndex: 1050
                                    }}
                                >
                                    <div className="px-2 py-1 small fw-bold text-muted text-uppercase" style={{ fontSize: "11px" }}>
                                        Browse by Animal
                                    </div>
                                    {animalCategories.map((animal) => (
                                        <button
                                            key={animal.name}
                                            type="button"
                                            onClick={() => handleSelectAnimal(animal.filter)}
                                            className="dropdown-item rounded-2 py-2 d-flex align-items-center gap-2 text-dark"
                                            style={{ fontSize: "14px" }}
                                        >
                                            <span style={{ fontSize: "18px" }}>{animal.icon}</span>
                                            <span>{animal.name}</span>
                                        </button>
                                    ))}
                                    <div className="dropdown-divider"></div>
                                    <Link
                                        to="/pets"
                                        onClick={() => setPetsDropdownOpen(false)}
                                        className="dropdown-item rounded-2 py-2 text-primary small fw-semibold"
                                    >
                                        View All Pets →
                                    </Link>
                                </div>
                            )}
                        </li>

                        <li className="nav-item">
                            <Link
                                to="/orders"
                                className={`nav-link px-2 px-xl-3 fw-medium ${location.pathname === "/orders" ? "text-white active fw-bold" : "text-white-50"}`}
                            >
                                My Orders
                            </Link>
                        </li>

                        <li className="nav-item">
                            <Link
                                to="/feedback"
                                className={`nav-link px-2 px-xl-3 fw-medium ${location.pathname === "/feedback" ? "text-white active fw-bold" : "text-white-50"}`}
                            >
                                Feedback
                            </Link>
                        </li>

                        <li className="nav-item">
                            <Link
                                to="/about"
                                className={`nav-link px-2 px-xl-3 fw-medium ${location.pathname === "/about" ? "text-white active fw-bold" : "text-white-50"}`}
                            >
                                About Us
                            </Link>
                        </li>

                        <li className="nav-item">
                            <Link
                                to="/cart"
                                className="btn btn-outline-light position-relative rounded-pill px-3 py-1 d-flex align-items-center gap-2 border-opacity-50"
                                title="View Shopping Cart"
                                onClick={(e) => {
                                    const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
                                    if (!user || !token) {
                                        e.preventDefault();
                                        toast.info("Please sign in to access your cart.");
                                        navigate("/login", { state: { returnUrl: "/cart" } });
                                    }
                                }}
                            >
                                <span>🛒</span>
                                <span className="small">Cart</span>
                                {cartCount > 0 && (
                                    <span
                                        className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger shadow-sm"
                                        style={{ fontSize: "11px" }}
                                    >
                                        {cartCount}
                                    </span>
                                )}
                            </Link>
                        </li>

                        {user ? (
                            <li className="nav-item position-relative ms-lg-2" ref={userDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                                    className="btn btn-light rounded-pill px-3 py-1 d-flex align-items-center gap-2 fw-semibold text-dark shadow-sm border-0"
                                    style={{ fontSize: "13px" }}
                                >
                                    <span
                                        className="rounded-circle bg-success text-white d-inline-flex align-items-center justify-content-center"
                                        style={{ width: "24px", height: "24px", fontSize: "12px" }}
                                    >
                                        👤
                                    </span>
                                    <span>{user.username || user.email?.split("@")[0]}</span>
                                    <span style={{ fontSize: "9px" }}>▼</span>
                                </button>

                                {userDropdownOpen && (
                                    <div
                                        className="dropdown-menu dropdown-menu-end show shadow-lg border-0 rounded-4 p-2 position-absolute"
                                        style={{
                                            top: "100%",
                                            right: 0,
                                            minWidth: "220px",
                                            backgroundColor: "#ffffff",
                                            zIndex: 1050
                                        }}
                                    >
                                        <div className="px-3 py-2 border-bottom mb-1">
                                            <div className="fw-bold text-dark small">{user.username || "Pet Customer"}</div>
                                            <div className="text-muted small text-truncate" style={{ fontSize: "12px" }}>
                                                {user.email}
                                            </div>
                                            <span className="badge bg-success bg-opacity-10 text-success rounded-pill mt-1" style={{ fontSize: "10px" }}>
                                                {user.role === "admin" ? "Administrator" : "Customer Member"}
                                            </span>
                                        </div>

                                        <Link
                                            to="/profile"
                                            onClick={() => setUserDropdownOpen(false)}
                                            className="dropdown-item rounded-3 py-2 d-flex align-items-center gap-2 text-dark small"
                                        >
                                            <span>👤</span>
                                            <span>My Profile</span>
                                        </Link>

                                        <Link
                                            to="/orders"
                                            onClick={() => setUserDropdownOpen(false)}
                                            className="dropdown-item rounded-3 py-2 d-flex align-items-center gap-2 text-dark small"
                                        >
                                            <span>📦</span>
                                            <span>My Orders</span>
                                        </Link>

                                        <Link
                                            to="/feedback"
                                            onClick={() => setUserDropdownOpen(false)}
                                            className="dropdown-item rounded-3 py-2 d-flex align-items-center gap-2 text-dark small"
                                        >
                                            <span>💬</span>
                                            <span>Feedback</span>
                                        </Link>

                                        {(user.role === "admin" || user.is_staff) && (
                                            <Link
                                                to="/admin/dashboard"
                                                onClick={() => setUserDropdownOpen(false)}
                                                className="dropdown-item rounded-3 py-2 d-flex align-items-center gap-2 text-primary small fw-semibold"
                                            >
                                                <span>🛡️</span>
                                                <span>Admin Console</span>
                                            </Link>
                                        )}

                                        <div className="dropdown-divider my-1"></div>

                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className="dropdown-item rounded-3 py-2 d-flex align-items-center gap-2 text-danger small fw-semibold"
                                        >
                                            <span>🚪</span>
                                            <span>Sign Out</span>
                                        </button>
                                    </div>
                                )}
                            </li>
                        ) : (
                            <li className="nav-item ms-lg-2">
                                <Link
                                    to="/login"
                                    className="btn btn-light text-dark fw-bold rounded-pill px-4 py-1 shadow-sm"
                                    style={{ fontSize: "13px" }}
                                >
                                    Sign In
                                </Link>
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Navbar from "./Navbar.jsx";
import {
    getCart,
    getCartCount,
    updateQuantity,
    removeFromCart,
    clearCart,
    subscribeToCart,
    fetchBackendCart,
} from "../utils/cart.js";

function Cart() {
    const navigate = useNavigate();

    const [cartItems, setCartItems] = useState(getCart());
    const [cartCount, setCartCount] = useState(getCartCount());
    const [loading, setLoading] = useState(true);

    const getUser = () => {
        try {
            const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    };

    const getToken = () =>
        sessionStorage.getItem("access_token") || localStorage.getItem("access_token");

    useEffect(() => {
        const token = getToken();
        if (!token) {
            toast.info("Please sign in to access your shopping cart.");
            navigate("/login", { state: { returnUrl: "/cart" } });
            return;
        }

        const loadRealCart = async () => {
            setLoading(true);
            const items = await fetchBackendCart();
            setCartItems(items);
            const count = items.reduce((total, item) => total + (parseInt(item.quantity, 10) || 1), 0);
            setCartCount(count);
            setLoading(false);
        };

        loadRealCart();

        const unsubscribe = subscribeToCart((items, count) => {
            setCartItems(items);
            setCartCount(count);
        });

        return () => unsubscribe();
    }, []);

    const handleQuantityChange = async (item, delta) => {
        const nextQty = item.quantity + delta;
        if (nextQty <= 0) {
            await handleRemoveItem(item);
            return;
        }

        const maxStock = typeof item.stock === "number" ? item.stock : 999;
        if (nextQty > maxStock) {
            toast.warning(`Only ${maxStock} units available in stock.`);
            return;
        }

        await updateQuantity(item.id, nextQty, item.cart_item_id);
    };

    const handleRemoveItem = async (item) => {
        await removeFromCart(item.id, item.cart_item_id);
        toast.info(`Removed "${item.name}" from your cart.`);
    };

    const handleClearCart = async () => {
        if (window.confirm("Are you sure you want to empty your shopping cart?")) {
            await clearCart();
            toast.info("Your shopping cart has been cleared.");
        }
    };

    const subtotal = cartItems.reduce(
        (total, item) => total + (parseFloat(item.price || 0) * (parseInt(item.quantity, 10) || 1)),
        0
    );

    const formatPrice = (val) => {
        const num = parseFloat(val || 0);
        return "$" + num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const user = getUser();

    return (
        <div className="bg-light min-vh-100 d-flex flex-column">
            <Navbar cartCount={cartCount} />

            <div className="bg-white border-bottom py-3">
                <div className="container">
                    <ol className="breadcrumb mb-0 small">
                        <li className="breadcrumb-item">
                            <Link to="/" className="text-decoration-none text-muted">
                                Home
                            </Link>
                        </li>
                        <li className="breadcrumb-item">
                            <Link to="/pets" className="text-decoration-none text-muted">
                                Pets Catalog
                            </Link>
                        </li>
                        <li className="breadcrumb-item active text-dark fw-semibold" aria-current="page">
                            Shopping Cart
                        </li>
                    </ol>
                </div>
            </div>

            <main className="container py-4 py-lg-5 flex-grow-1">
                {loading ? (
                    <div className="text-center py-5 my-5">
                        <div
                            className="spinner-border text-teal"
                            style={{ color: "#0f766e", width: "3.5rem", height: "3.5rem" }}
                            role="status"
                        >
                            <span className="visually-hidden">Loading Cart...</span>
                        </div>
                        <h5 className="fw-bold mt-4 text-dark">Loading your shopping cart...</h5>
                    </div>
                ) : cartItems.length === 0 ? (
                    <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white mx-auto my-4" style={{ maxWidth: "560px" }}>
                        <div className="display-1 mb-3">🛒</div>
                        <h2 className="fw-bold text-dark mb-2">Your Cart is Empty</h2>
                        <p className="text-muted mb-4">
                            You currently have no items in your cart. Explore our companions to find your next family member.
                        </p>
                        <div className="d-flex justify-content-center gap-3">
                            <Link
                                to="/pets"
                                className="btn btn-success rounded-pill px-5 py-2 fw-bold"
                                style={{ backgroundColor: "#0f766e", border: "none" }}
                            >
                                🐾 Browse Pets Catalog
                            </Link>
                            <Link to="/" className="btn btn-outline-secondary rounded-pill px-4 py-2 fw-semibold">
                                Home
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="d-flex align-items-center justify-content-between mb-4">
                            <div>
                                <h1 className="fw-bold text-dark display-6 mb-1">Shopping Cart</h1>
                                <p className="text-muted small mb-0">
                                    You have <strong>{cartCount}</strong> {cartCount === 1 ? "item" : "items"} in your cart
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleClearCart}
                                className="btn btn-outline-danger btn-sm rounded-pill px-3 fw-semibold"
                            >
                                Clear Entire Cart
                            </button>
                        </div>

                        <div className="row g-4">
                            <div className="col-12 col-lg-8">
                                <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden p-3 p-md-4">
                                    <div className="d-flex flex-column gap-3">
                                        {cartItems.map((item) => {
                                            const itemSubtotal = parseFloat(item.price || 0) * item.quantity;
                                            return (
                                                <div
                                                    key={`${item.id}-${item.cart_item_id || ""}`}
                                                    className="p-3 rounded-4 border bg-light bg-opacity-50 d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3"
                                                >
                                                    <div className="d-flex align-items-center gap-3">
                                                        {item.image ? (
                                                            <img
                                                                src={item.image}
                                                                alt={item.name}
                                                                className="rounded-3 shadow-2xs"
                                                                style={{ width: "80px", height: "80px", objectFit: "cover" }}
                                                            />
                                                        ) : (
                                                            <div
                                                                className="rounded-3 bg-secondary-subtle d-flex align-items-center justify-content-center text-muted"
                                                                style={{ width: "80px", height: "80px", fontSize: "28px" }}
                                                            >
                                                                🐾
                                                            </div>
                                                        )}

                                                        <div>
                                                            <Link
                                                                to={`/pets/${item.id}`}
                                                                className="fw-bold text-dark text-decoration-none fs-6 mb-1 d-block hover-underline"
                                                            >
                                                                {item.name}
                                                            </Link>
                                                            <span className="badge bg-white text-secondary border small mb-1">
                                                                {item.category_name}
                                                            </span>
                                                            <div className="text-muted small">
                                                                Unit Price: <strong>{formatPrice(item.price)}</strong>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="d-flex align-items-center justify-content-between justify-content-sm-end gap-3 pt-2 pt-sm-0 border-top border-sm-0">
                                                        <div className="d-flex align-items-center border rounded-pill overflow-hidden bg-white shadow-2xs">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleQuantityChange(item, -1)}
                                                                className="btn btn-light btn-sm px-3 py-1 fw-bold border-0"
                                                                title="Decrease quantity"
                                                            >
                                                                −
                                                            </button>
                                                            <span className="px-3 fw-bold small text-center" style={{ minWidth: "30px" }}>
                                                                {item.quantity}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleQuantityChange(item, 1)}
                                                                className="btn btn-light btn-sm px-3 py-1 fw-bold border-0"
                                                                disabled={typeof item.stock === "number" && item.quantity >= item.stock}
                                                                title="Increase quantity"
                                                            >
                                                                +
                                                            </button>
                                                        </div>

                                                        <div className="text-end" style={{ minWidth: "90px" }}>
                                                            <div className="fw-bold fs-6" style={{ color: "#0f766e" }}>
                                                                {formatPrice(itemSubtotal)}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveItem(item)}
                                                                className="btn btn-link text-danger p-0 small text-decoration-none"
                                                                style={{ fontSize: "12px" }}
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                                        <Link
                                            to="/pets"
                                            className="btn btn-outline-dark rounded-pill px-4 fw-semibold btn-sm d-inline-flex align-items-center gap-2"
                                        >
                                            <span>←</span>
                                            <span>Continue Shopping</span>
                                        </Link>
                                        <span className="text-muted small">
                                            Subtotal: <strong className="text-dark fs-6">{formatPrice(subtotal)}</strong>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-lg-4">
                                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white sticky-top" style={{ top: "85px", zIndex: 10 }}>
                                    <h5 className="fw-bold text-dark mb-3 pb-2 border-bottom">Order Summary</h5>

                                    <div className="d-flex flex-column gap-2 small text-secondary mb-3">
                                        <div className="d-flex justify-content-between">
                                            <span>Items Subtotal:</span>
                                            <strong className="text-dark">{formatPrice(subtotal)}</strong>
                                        </div>
                                        <div className="d-flex justify-content-between">
                                            <span>Total Items:</span>
                                            <span className="text-dark fw-bold">{cartCount}</span>
                                        </div>
                                        <div className="d-flex justify-content-between">
                                            <span>Estimated Delivery:</span>
                                            <span className="text-success fw-bold">FREE</span>
                                        </div>
                                    </div>

                                    <div className="d-flex justify-content-between align-items-baseline pt-3 border-top mb-4">
                                        <span className="fw-bold text-dark fs-6">Estimated Total:</span>
                                        <span className="fw-bold fs-4" style={{ color: "#0f766e" }}>
                                            {formatPrice(subtotal)}
                                        </span>
                                    </div>

                                    {!user ? (
                                        <div className="p-3 rounded-4 bg-light text-center border">
                                            <p className="small text-secondary mb-3">
                                                Please sign in to proceed with checkout.
                                            </p>
                                            <Link
                                                to="/login"
                                                state={{ returnUrl: "/cart" }}
                                                className="btn btn-success w-100 rounded-pill py-2 fw-bold"
                                                style={{ backgroundColor: "#0f766e", border: "none" }}
                                            >
                                                Sign In to Checkout
                                            </Link>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => navigate("/payment", { state: { items: cartItems } })}
                                            className="btn btn-success w-100 rounded-pill py-3 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                                            style={{
                                                background: "linear-gradient(135deg, #0f766e 0%, #047857 100%)",
                                                border: "none",
                                            }}
                                        >
                                            <span>Proceed to Checkout</span>
                                            <span>→</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

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
                            <h6 className="fw-bold mb-3 text-white">Explore</h6>
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

export default Cart;

import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import Navbar from "./Navbar.jsx";
import {
    getCart,
    getCartCount,
    clearCart,
    subscribeToCart,
    syncCartWithBackend,
} from "../utils/cart.js";

function Checkout() {
    const navigate = useNavigate();
    const location = useLocation();

    const buyNowItem = location.state?.item || null;
    const initialQty = location.state?.quantity ? parseInt(location.state.quantity, 10) : 1;

    const [isBuyNow, setIsBuyNow] = useState(Boolean(buyNowItem));
    const [directItem, setDirectItem] = useState(buyNowItem);
    const [directQuantity, setDirectQuantity] = useState(initialQty > 0 ? initialQty : 1);

    const [cartItems, setCartItems] = useState([]);
    const [cartCount, setCartCount] = useState(getCartCount());
    const [loadingCart, setLoadingCart] = useState(!buyNowItem);

    const [currentStep, setCurrentStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(null);

    const [addressForm, setAddressForm] = useState({
        fullName: "",
        phone: "",
        street: "",
        city: "",
        state: "",
        postalCode: "",
        notes: "",
    });

    const [paymentMethod, setPaymentMethod] = useState("gpay");

    const [gpayForm, setGpayForm] = useState({
        upiId: "",
    });

    const [cardForm, setCardForm] = useState({
        cardNumber: "",
        cardHolder: "",
        expiry: "",
        cvv: "",
    });

    const getToken = () =>
        sessionStorage.getItem("access_token") || localStorage.getItem("access_token");

    const getUser = () => {
        try {
            const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    };

    useEffect(() => {
        const token = getToken();
        const user = getUser();

        if (!token || !user) {
            toast.info("Please sign in to proceed with checkout.");
            navigate("/login", { state: { returnUrl: "/payment" } });
            return;
        }

        setAddressForm((prev) => ({
            ...prev,
            fullName: prev.fullName || user.username || "",
            phone: prev.phone || user.phone || "",
        }));

        axios
            .get("http://127.0.0.1:8000/api/users/me/", {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                const profile = res.data;
                setAddressForm((prev) => ({
                    ...prev,
                    fullName:
                        prev.fullName ||
                        (profile.first_name || profile.last_name
                            ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
                            : profile.username || ""),
                    phone: prev.phone || profile.phone || "",
                }));
            })
            .catch(() => {});

        if (!buyNowItem) {
            const loadCartItems = async () => {
                setLoadingCart(true);
                const items = await syncCartWithBackend();
                setCartItems(items);
                setCartCount(getCartCount());
                setLoadingCart(false);
            };
            loadCartItems();
        }

        const unsubscribe = subscribeToCart((items, count) => {
            if (!buyNowItem) {
                setCartItems(items);
            }
            setCartCount(count);
        });

        return () => unsubscribe();
    }, [navigate, buyNowItem]);

    const handleAddressChange = (e) => {
        const { name, value } = e.target;
        setAddressForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleGpayChange = (e) => {
        const { name, value } = e.target;
        setGpayForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleCardChange = (e) => {
        const { name, value } = e.target;

        if (name === "cardNumber") {
            const digits = value.replace(/\D/g, "").slice(0, 16);
            const formatted = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
            setCardForm((prev) => ({ ...prev, cardNumber: formatted }));
            return;
        }

        if (name === "expiry") {
            const digits = value.replace(/\D/g, "").slice(0, 4);
            let formatted = digits;
            if (digits.length > 2) {
                formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
            }
            setCardForm((prev) => ({ ...prev, expiry: formatted }));
            return;
        }

        if (name === "cvv") {
            const digits = value.replace(/\D/g, "").slice(0, 4);
            setCardForm((prev) => ({ ...prev, cvv: digits }));
            return;
        }

        setCardForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleQuantityChange = (delta) => {
        if (!directItem) return;
        setDirectQuantity((prev) => {
            const next = prev + delta;
            if (next < 1) return 1;
            const maxStock = typeof directItem.stock === "number" ? directItem.stock : 99;
            if (next > maxStock) {
                toast.warning(`Only ${maxStock} items available in stock.`);
                return maxStock;
            }
            return next;
        });
    };

    const checkoutItems = useMemo(() => {
        if (isBuyNow && directItem) {
            return [
                {
                    id: directItem.id,
                    product_id: directItem.id,
                    name: directItem.name,
                    price: parseFloat(directItem.price || 0),
                    image: directItem.image || "",
                    category_name: directItem.category || directItem.category_name || "Companion",
                    stock: directItem.stock,
                    quantity: directQuantity,
                },
            ];
        }
        return cartItems;
    }, [isBuyNow, directItem, directQuantity, cartItems]);

    const subtotal = useMemo(() => {
        return checkoutItems.reduce((acc, item) => {
            const p = parseFloat(item.price || 0);
            const q = parseInt(item.quantity, 10) || 1;
            return acc + p * q;
        }, 0);
    }, [checkoutItems]);

    const grandTotal = subtotal;

    const formatPrice = (val) => {
        const num = parseFloat(val || 0);
        return "$" + num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handleNextToPayment = (e) => {
        e.preventDefault();

        if (!addressForm.fullName.trim()) {
            toast.warning("Please enter your full name.");
            return;
        }
        if (!addressForm.phone.trim()) {
            toast.warning("Please enter your phone number.");
            return;
        }
        if (!addressForm.street.trim()) {
            toast.warning("Please enter your street address.");
            return;
        }
        if (!addressForm.city.trim()) {
            toast.warning("Please enter your city.");
            return;
        }

        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePlaceOrder = async () => {
        const token = getToken();
        const user = getUser();

        if (!token || !user) {
            toast.error("Please sign in to complete your checkout.");
            navigate("/login", { state: { returnUrl: "/payment" } });
            return;
        }

        if (checkoutItems.length === 0) {
            toast.error("No items found to checkout.");
            return;
        }

        const addressParts = [
            addressForm.fullName.trim(),
            addressForm.street.trim(),
            addressForm.city.trim(),
            addressForm.state.trim(),
            addressForm.postalCode.trim(),
        ].filter(Boolean);

        const shippingAddressString =
            addressParts.join(", ") + (addressForm.notes ? ` (Note: ${addressForm.notes.trim()})` : "");

        setSubmitting(true);

        try {
            let createdOrder = null;

            if (isBuyNow && directItem) {
                const orderPayload = {
                    shipping_address: shippingAddressString,
                    phone: addressForm.phone.trim(),
                    payment_method: paymentMethod,
                    payment_status: paymentMethod === "cod" ? "unpaid" : "paid",
                    total_amount: parseFloat(grandTotal.toFixed(2)),
                    items: [
                        {
                            product: directItem.id,
                            quantity: directQuantity,
                            unit_price: directItem.price,
                        },
                    ],
                };

                const res = await axios.post("http://127.0.0.1:8000/api/orders/", orderPayload, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                });
                createdOrder = res.data;
            } else {
                const cartPayload = {
                    shipping_address: shippingAddressString,
                    phone: addressForm.phone.trim(),
                    payment_method: paymentMethod,
                };

                try {
                    const res = await axios.post("http://127.0.0.1:8000/api/cart/checkout/", cartPayload, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    });
                    createdOrder = res.data;
                } catch {
                    const fallbackPayload = {
                        shipping_address: shippingAddressString,
                        phone: addressForm.phone.trim(),
                        payment_method: paymentMethod,
                        payment_status: paymentMethod === "cod" ? "unpaid" : "paid",
                        items: checkoutItems.map((item) => ({
                            product: item.id || item.product_id,
                            quantity: item.quantity,
                            unit_price: item.price,
                        })),
                    };
                    const fallbackRes = await axios.post(
                        "http://127.0.0.1:8000/api/orders/",
                        fallbackPayload,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                                "Content-Type": "application/json",
                            },
                        }
                    );
                    createdOrder = fallbackRes.data;
                }

                await clearCart();
            }

            if (paymentMethod === "cod") {
                setOrderSuccess(createdOrder);
                setSubmitting(false);
                toast.success(`🎉 Order #${createdOrder.id} placed successfully!`);
                window.scrollTo({ top: 0, behavior: "smooth" });
                return;
            }

            let razorpayOrderData = null;
            try {
                const rpRes = await axios.post(
                    "http://127.0.0.1:8000/api/payments/create/",
                    { order_id: createdOrder.id },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                razorpayOrderData = rpRes.data;
            } catch (err) {
                console.warn("Razorpay order creation fallback:", err.message);
            }

            const scriptLoaded = await loadRazorpayScript();

            if (scriptLoaded && window.Razorpay && razorpayOrderData?.key_id) {
                const options = {
                    key: razorpayOrderData.key_id,
                    amount: razorpayOrderData.amount,
                    currency: razorpayOrderData.currency || "INR",
                    name: "PetWorld",
                    description: `Order #${createdOrder.id}`,
                    order_id: razorpayOrderData.razorpay_order_id,
                    prefill: {
                        name: addressForm.fullName,
                        email: user.email,
                        contact: addressForm.phone,
                        method: paymentMethod === "gpay" ? "upi" : "card",
                    },
                    theme: { color: "#0f766e" },
                    handler: async function (response) {
                        try {
                            const verifyRes = await axios.post(
                                "http://127.0.0.1:8000/api/payments/verify/",
                                {
                                    razorpay_order_id: response.razorpay_order_id,
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_signature: response.razorpay_signature,
                                },
                                { headers: { Authorization: `Bearer ${token}` } }
                            );
                            setOrderSuccess(verifyRes.data || createdOrder);
                            toast.success("Payment verified and order confirmed!");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        } catch {
                            setOrderSuccess(createdOrder);
                            toast.success("Order placed successfully!");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        } finally {
                            setSubmitting(false);
                        }
                    },
                    modal: {
                        ondismiss: function () {
                            setSubmitting(false);
                            toast.info("Payment window dismissed. Your order is registered in orders.");
                            setOrderSuccess(createdOrder);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        },
                    },
                };

                const rzp = new window.Razorpay(options);
                rzp.on("payment.failed", function (resp) {
                    toast.error(resp.error.description || "Payment failed");
                    setSubmitting(false);
                });
                rzp.open();
            } else {
                setOrderSuccess(createdOrder);
                setSubmitting(false);
                toast.success(`🎉 Order #${createdOrder.id} placed successfully!`);
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        } catch (err) {
            console.error("Order submission failed:", err);
            const errMsg =
                err.response?.data?.detail ||
                err.response?.data?.stock ||
                err.response?.data?.items ||
                err.response?.data?.shipping_address ||
                "Failed to place order. Please check your information and try again.";
            toast.error(typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg));
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-light min-vh-100 d-flex flex-column">
            <Navbar cartCount={cartCount} />

            <div className="bg-white border-bottom py-3">
                <div className="container">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                        <ol className="breadcrumb mb-0 small">
                            <li className="breadcrumb-item">
                                <Link to="/" className="text-decoration-none text-muted">
                                    Home
                                </Link>
                            </li>
                            <li className="breadcrumb-item">
                                <Link to="/pets" className="text-decoration-none text-muted">
                                    Pets
                                </Link>
                            </li>
                            {isBuyNow && directItem ? (
                                <li className="breadcrumb-item">
                                    <Link to={`/pets/${directItem.id}`} className="text-decoration-none text-muted">
                                        {directItem.name}
                                    </Link>
                                </li>
                            ) : (
                                <li className="breadcrumb-item">
                                    <Link to="/cart" className="text-decoration-none text-muted">
                                        Cart
                                    </Link>
                                </li>
                            )}
                            <li className="breadcrumb-item active text-dark fw-semibold" aria-current="page">
                                Payment
                            </li>
                        </ol>

                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="btn btn-link btn-sm text-decoration-none text-secondary p-0 d-inline-flex align-items-center gap-1"
                        >
                            <span>←</span>
                            <span>Back</span>
                        </button>
                    </div>
                </div>
            </div>

            <main className="container py-4 py-lg-5 flex-grow-1">
                {orderSuccess ? (
                    <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 text-center bg-white mx-auto my-3" style={{ maxWidth: "660px" }}>
                        <div className="display-1 text-success mb-3">🎉</div>
                        <h2 className="fw-bold text-dark mb-2">Order Confirmed!</h2>
                        <p className="text-muted mb-4">
                            Your order <strong>#{orderSuccess.id}</strong> has been registered successfully.
                        </p>

                        <div className="p-4 bg-light rounded-4 text-start mb-4 border">
                            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                                <span className="text-muted small">Order Number:</span>
                                <strong className="text-dark">#{orderSuccess.id}</strong>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                                <span className="text-muted small">Total Amount:</span>
                                <strong className="text-success fs-5">{formatPrice(orderSuccess.total_amount || grandTotal)}</strong>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                                <span className="text-muted small">Payment Method:</span>
                                <span className="badge bg-secondary-subtle text-dark text-capitalize px-3 py-2 fw-semibold">
                                    {orderSuccess.payment_method === "gpay"
                                        ? "Google Pay (UPI / Razorpay)"
                                        : orderSuccess.payment_method === "card"
                                        ? "Credit / Debit Card"
                                        : "Cash on Delivery"}
                                </span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                                <span className="text-muted small">Payment Status:</span>
                                <span
                                    className={`badge px-3 py-1 rounded-pill ${
                                        orderSuccess.payment_status === "paid" ? "bg-success" : "bg-warning text-dark"
                                    }`}
                                >
                                    {orderSuccess.payment_status === "paid" ? "✓ Paid" : "Due on Delivery"}
                                </span>
                            </div>
                            <div>
                                <span className="text-muted small d-block mb-1">Delivering To:</span>
                                <div className="text-dark small fw-semibold">{orderSuccess.shipping_address}</div>
                                {orderSuccess.phone && <div className="text-muted small">Contact: {orderSuccess.phone}</div>}
                            </div>
                        </div>

                        <div className="d-flex flex-wrap justify-content-center gap-3">
                            <Link
                                to="/orders"
                                className="btn btn-primary rounded-pill px-4 py-2 fw-bold"
                                style={{ backgroundColor: "#0f766e", border: "none" }}
                            >
                                📦 View My Orders
                            </Link>
                            <Link to="/pets" className="btn btn-outline-secondary rounded-pill px-4 py-2 fw-semibold">
                                🐾 Continue Shopping
                            </Link>
                        </div>
                    </div>
                ) : loadingCart ? (
                    <div className="text-center py-5 my-5">
                        <div
                            className="spinner-border text-teal"
                            style={{ color: "#0f766e", width: "3.5rem", height: "3.5rem" }}
                            role="status"
                        >
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <h5 className="fw-bold mt-4 text-dark">Loading Details...</h5>
                    </div>
                ) : checkoutItems.length === 0 ? (
                    <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white mx-auto my-4" style={{ maxWidth: "560px" }}>
                        <div className="display-1 mb-3">🛒</div>
                        <h3 className="fw-bold text-dark mb-2">No Items Found</h3>
                        <p className="text-muted mb-4">
                            You haven't selected any pets or supplies to purchase. Visit our catalog to find your companion.
                        </p>
                        <div className="d-flex justify-content-center gap-3">
                            <Link
                                to="/pets"
                                className="btn btn-success rounded-pill px-4 py-2 fw-bold"
                                style={{ backgroundColor: "#0f766e", border: "none" }}
                            >
                                🐾 Browse Pets
                            </Link>
                            <Link to="/" className="btn btn-outline-secondary rounded-pill px-4 py-2 fw-semibold">
                                Return Home
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div style={{ maxWidth: "860px", margin: "0 auto" }}>
                        <div className="d-flex align-items-center justify-content-between mb-4">
                            <div className="d-flex align-items-center gap-3">
                                <div
                                    className={`rounded-circle d-flex align-items-center justify-content-center fw-bold text-white ${
                                        currentStep === 1 ? "bg-dark" : "bg-success"
                                    }`}
                                    style={{ width: "36px", height: "36px", backgroundColor: currentStep === 1 ? "#0f766e" : "#10b981" }}
                                >
                                    {currentStep > 1 ? "✓" : "1"}
                                </div>
                                <div>
                                    <h6 className="fw-bold mb-0 text-dark">Step 1: Order Summary & Address</h6>
                                    <small className="text-muted">Review items and provide delivery location</small>
                                </div>
                            </div>

                            <span className="text-muted fs-5">→</span>

                            <div className="d-flex align-items-center gap-3">
                                <div
                                    className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                                    style={{
                                        width: "36px",
                                        height: "36px",
                                        backgroundColor: currentStep === 2 ? "#0f766e" : "#e2e8f0",
                                        color: currentStep === 2 ? "#ffffff" : "#64748b",
                                    }}
                                >
                                    2
                                </div>
                                <div>
                                    <h6 className="fw-bold mb-0 text-dark">Step 2: Payment</h6>
                                    <small className="text-muted">Google Pay, Card, or Cash on Delivery</small>
                                </div>
                            </div>
                        </div>

                        {currentStep === 1 && (
                            <form onSubmit={handleNextToPayment}>
                                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
                                    <div className="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom">
                                        <h5 className="fw-bold text-dark mb-0">📋 Order Summary</h5>
                                        <span className="badge bg-light text-secondary border">
                                            {checkoutItems.length} {checkoutItems.length === 1 ? "Item" : "Items"}
                                        </span>
                                    </div>

                                    <div className="d-flex flex-column gap-3 mb-4">
                                        {checkoutItems.map((item) => (
                                            <div
                                                key={item.id}
                                                className="p-3 rounded-4 bg-light bg-opacity-50 border d-flex gap-3 align-items-center"
                                            >
                                                {item.image ? (
                                                    <img
                                                        src={item.image}
                                                        alt={item.name}
                                                        className="rounded-3 shadow-2xs"
                                                        style={{ width: "72px", height: "72px", objectFit: "cover" }}
                                                    />
                                                ) : (
                                                    <div
                                                        className="rounded-3 bg-white border d-flex align-items-center justify-content-center text-muted"
                                                        style={{ width: "72px", height: "72px", fontSize: "28px" }}
                                                    >
                                                        🐾
                                                    </div>
                                                )}

                                                <div className="flex-grow-1 min-w-0">
                                                    <h6 className="fw-bold text-dark mb-1 text-truncate">{item.name}</h6>
                                                    <div className="d-flex align-items-center gap-2 mb-2">
                                                        <span className="badge bg-white text-secondary border small">
                                                            {item.category_name}
                                                        </span>
                                                        <span className="text-muted small">
                                                            Unit: {formatPrice(item.price)}
                                                        </span>
                                                    </div>

                                                    {isBuyNow ? (
                                                        <div className="d-flex align-items-center gap-2">
                                                            <span className="small text-muted">Quantity:</span>
                                                            <div className="d-flex align-items-center border rounded-pill bg-white overflow-hidden shadow-2xs">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleQuantityChange(-1)}
                                                                    disabled={directQuantity <= 1}
                                                                    className="btn btn-light btn-sm px-2 py-0 fw-bold border-0"
                                                                >
                                                                    −
                                                                </button>
                                                                <span className="px-2 small fw-bold">{directQuantity}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleQuantityChange(1)}
                                                                    disabled={typeof item.stock === "number" && directQuantity >= item.stock}
                                                                    className="btn btn-light btn-sm px-2 py-0 fw-bold border-0"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="badge bg-white text-dark border small">
                                                            Quantity: {item.quantity}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="text-end fw-bold fs-6 text-teal" style={{ color: "#0f766e", minWidth: "85px" }}>
                                                    {formatPrice(item.price * item.quantity)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-3 rounded-3 bg-light d-flex justify-content-between align-items-center">
                                        <span className="fw-bold text-dark">Order Subtotal:</span>
                                        <span className="fw-bold fs-5 text-teal" style={{ color: "#0f766e" }}>
                                            {formatPrice(grandTotal)}
                                        </span>
                                    </div>
                                </div>

                                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
                                    <div className="pb-3 mb-3 border-bottom">
                                        <h5 className="fw-bold text-dark mb-0">🏠 Add Delivery Address</h5>
                                    </div>

                                    <div className="row g-3">
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">
                                                Full Name *
                                            </label>
                                            <input
                                                type="text"
                                                name="fullName"
                                                className="form-control rounded-3"
                                                placeholder="e.g. John Doe"
                                                value={addressForm.fullName}
                                                onChange={handleAddressChange}
                                                required
                                            />
                                        </div>

                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">
                                                Contact Phone Number *
                                            </label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                className="form-control rounded-3"
                                                placeholder="e.g. 9876543210"
                                                value={addressForm.phone}
                                                onChange={handleAddressChange}
                                                required
                                            />
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label small fw-semibold text-secondary">
                                                Street Address / House No. / Landmark *
                                            </label>
                                            <input
                                                type="text"
                                                name="street"
                                                className="form-control rounded-3"
                                                placeholder="e.g. 124 Pet Care Avenue, Green Hills"
                                                value={addressForm.street}
                                                onChange={handleAddressChange}
                                                required
                                            />
                                        </div>

                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">
                                                City *
                                            </label>
                                            <input
                                                type="text"
                                                name="city"
                                                className="form-control rounded-3"
                                                placeholder="e.g. Mumbai"
                                                value={addressForm.city}
                                                onChange={handleAddressChange}
                                                required
                                            />
                                        </div>

                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">
                                                State
                                            </label>
                                            <input
                                                type="text"
                                                name="state"
                                                className="form-control rounded-3"
                                                placeholder="e.g. Maharashtra"
                                                value={addressForm.state}
                                                onChange={handleAddressChange}
                                            />
                                        </div>

                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">
                                                PIN Code
                                            </label>
                                            <input
                                                type="text"
                                                name="postalCode"
                                                className="form-control rounded-3"
                                                placeholder="e.g. 400001"
                                                value={addressForm.postalCode}
                                                onChange={handleAddressChange}
                                            />
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label small fw-semibold text-secondary">
                                                Delivery Instructions (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                name="notes"
                                                className="form-control rounded-3"
                                                placeholder="e.g. Ring doorbell, safe pet carrier delivery"
                                                value={addressForm.notes}
                                                onChange={handleAddressChange}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="d-flex justify-content-between align-items-center">
                                    <button
                                        type="button"
                                        onClick={() => navigate(-1)}
                                        className="btn btn-outline-secondary rounded-pill px-4 fw-semibold"
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-success rounded-pill px-5 py-3 fw-bold shadow-sm d-flex align-items-center gap-2"
                                        style={{ backgroundColor: "#0f766e", border: "none" }}
                                    >
                                        <span>Proceed to Payment</span>
                                        <span>Next →</span>
                                    </button>
                                </div>
                            </form>
                        )}

                        {currentStep === 2 && (
                            <div>
                                <div className="card border-0 shadow-sm rounded-4 p-3 bg-white mb-4 d-flex flex-row justify-content-between align-items-center">
                                    <div>
                                        <div className="small text-muted">Delivering To:</div>
                                        <div className="fw-bold text-dark small">
                                            {addressForm.fullName} • {addressForm.phone}
                                        </div>
                                        <div className="text-secondary small text-truncate" style={{ maxWidth: "500px" }}>
                                            {addressForm.street}, {addressForm.city}
                                        </div>
                                    </div>
                                    <div className="text-end">
                                        <div className="small text-muted">Payable Amount:</div>
                                        <div className="fw-bold fs-5" style={{ color: "#0f766e" }}>
                                            {formatPrice(grandTotal)}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentStep(1)}
                                            className="btn btn-link btn-sm p-0 text-decoration-none text-teal fw-semibold"
                                            style={{ color: "#0f766e" }}
                                        >
                                            Edit Address
                                        </button>
                                    </div>
                                </div>

                                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
                                    <div className="pb-3 mb-3 border-bottom">
                                        <h5 className="fw-bold text-dark mb-1">💳 Choose Payment Setting</h5>
                                        <p className="text-muted small mb-0">
                                            Secured through Razorpay payment gateway
                                        </p>
                                    </div>

                                    <div className="d-flex flex-column gap-3 mb-4">
                                        <label
                                            className={`border rounded-4 p-3 d-flex flex-column cursor-pointer ${
                                                paymentMethod === "gpay"
                                                    ? "border-2 border-teal bg-teal-subtle"
                                                    : "border-light-subtle bg-light"
                                            }`}
                                            style={{
                                                borderColor: paymentMethod === "gpay" ? "#0f766e" : "#e2e8f0",
                                                backgroundColor: paymentMethod === "gpay" ? "#f0fdf9" : "#ffffff",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div className="d-flex align-items-center gap-3">
                                                    <input
                                                        type="radio"
                                                        name="paymentMethod"
                                                        value="gpay"
                                                        checked={paymentMethod === "gpay"}
                                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                                        className="form-check-input mt-0"
                                                        style={{ accentColor: "#0f766e" }}
                                                    />
                                                    <div>
                                                        <div className="fw-bold text-dark d-flex align-items-center gap-2">
                                                            <span>Google Pay (GPay / UPI)</span>
                                                            <span className="badge bg-primary text-white small px-2 py-1 rounded-pill">
                                                                Fast & Direct
                                                            </span>
                                                        </div>
                                                        <div className="text-muted small">
                                                            Pay instantly via Google Pay or UPI using Razorpay
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="fs-3">📱</span>
                                            </div>

                                            {paymentMethod === "gpay" && (
                                                <div className="mt-3 pt-3 border-top">
                                                    <label className="form-label small fw-semibold text-secondary">
                                                        Google Pay UPI ID (Optional)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="upiId"
                                                        className="form-control rounded-3"
                                                        placeholder="yourname@okhdfcbank or 9876543210@upi"
                                                        value={gpayForm.upiId}
                                                        onChange={handleGpayChange}
                                                    />
                                                    <div className="form-text" style={{ fontSize: "12px" }}>
                                                        Razorpay payment gateway will open to complete the transaction safely.
                                                    </div>
                                                </div>
                                            )}
                                        </label>

                                        <label
                                            className={`border rounded-4 p-3 d-flex flex-column cursor-pointer ${
                                                paymentMethod === "card"
                                                    ? "border-2 border-teal bg-teal-subtle"
                                                    : "border-light-subtle bg-light"
                                            }`}
                                            style={{
                                                borderColor: paymentMethod === "card" ? "#0f766e" : "#e2e8f0",
                                                backgroundColor: paymentMethod === "card" ? "#f0fdf9" : "#ffffff",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div className="d-flex align-items-center gap-3">
                                                    <input
                                                        type="radio"
                                                        name="paymentMethod"
                                                        value="card"
                                                        checked={paymentMethod === "card"}
                                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                                        className="form-check-input mt-0"
                                                        style={{ accentColor: "#0f766e" }}
                                                    />
                                                    <div>
                                                        <div className="fw-bold text-dark d-flex align-items-center gap-2">
                                                            <span>Credit / Debit Card</span>
                                                            <span className="badge bg-light text-secondary border small">
                                                                Visa • Mastercard • RuPay
                                                            </span>
                                                        </div>
                                                        <div className="text-muted small">
                                                            Secure online payment with debit or credit cards
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="fs-3">💳</span>
                                            </div>

                                            {paymentMethod === "card" && (
                                                <div className="mt-3 pt-3 border-top">
                                                    <div className="row g-3">
                                                        <div className="col-12 col-md-7">
                                                            <label className="form-label small fw-semibold text-secondary">
                                                                Card Number
                                                            </label>
                                                            <input
                                                                type="text"
                                                                name="cardNumber"
                                                                className="form-control rounded-3 font-monospace"
                                                                placeholder="1234 5678 9012 3456"
                                                                value={cardForm.cardNumber}
                                                                onChange={handleCardChange}
                                                            />
                                                        </div>

                                                        <div className="col-12 col-md-5">
                                                            <label className="form-label small fw-semibold text-secondary">
                                                                Cardholder Name
                                                            </label>
                                                            <input
                                                                type="text"
                                                                name="cardHolder"
                                                                className="form-control rounded-3"
                                                                placeholder="JOHN DOE"
                                                                value={cardForm.cardHolder}
                                                                onChange={handleCardChange}
                                                            />
                                                        </div>

                                                        <div className="col-6 col-md-6">
                                                            <label className="form-label small fw-semibold text-secondary">
                                                                Expiry (MM/YY)
                                                            </label>
                                                            <input
                                                                type="text"
                                                                name="expiry"
                                                                className="form-control rounded-3 font-monospace"
                                                                placeholder="12/28"
                                                                value={cardForm.expiry}
                                                                onChange={handleCardChange}
                                                            />
                                                        </div>

                                                        <div className="col-6 col-md-6">
                                                            <label className="form-label small fw-semibold text-secondary">
                                                                CVV
                                                            </label>
                                                            <input
                                                                type="password"
                                                                name="cvv"
                                                                maxLength={4}
                                                                className="form-control rounded-3 font-monospace"
                                                                placeholder="•••"
                                                                value={cardForm.cvv}
                                                                onChange={handleCardChange}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </label>

                                        <label
                                            className={`border rounded-4 p-3 d-flex flex-column cursor-pointer ${
                                                paymentMethod === "cod"
                                                    ? "border-2 border-teal bg-teal-subtle"
                                                    : "border-light-subtle bg-light"
                                            }`}
                                            style={{
                                                borderColor: paymentMethod === "cod" ? "#0f766e" : "#e2e8f0",
                                                backgroundColor: paymentMethod === "cod" ? "#f0fdf9" : "#ffffff",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div className="d-flex align-items-center gap-3">
                                                    <input
                                                        type="radio"
                                                        name="paymentMethod"
                                                        value="cod"
                                                        checked={paymentMethod === "cod"}
                                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                                        className="form-check-input mt-0"
                                                        style={{ accentColor: "#0f766e" }}
                                                    />
                                                    <div>
                                                        <div className="fw-bold text-dark d-flex align-items-center gap-2">
                                                            <span>Cash On Delivery (COD)</span>
                                                            <span className="badge bg-secondary-subtle text-secondary small">
                                                                Pay at Handover
                                                            </span>
                                                        </div>
                                                        <div className="text-muted small">
                                                            Pay cash or scan QR when your companion arrives at your door
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="fs-3">💵</span>
                                            </div>

                                            {paymentMethod === "cod" && (
                                                <div className="mt-3 pt-3 border-top small text-secondary">
                                                    No advance payment required. You can inspect your pet and make payment upon doorstep delivery.
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                <div className="d-flex justify-content-between align-items-center">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep(1)}
                                        disabled={submitting}
                                        className="btn btn-outline-secondary rounded-pill px-4 fw-semibold"
                                    >
                                        ← Back to Address
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handlePlaceOrder}
                                        disabled={submitting}
                                        className="btn btn-success rounded-pill px-5 py-3 fw-bold shadow d-flex align-items-center gap-2"
                                        style={{ backgroundColor: "#0f766e", border: "none" }}
                                    >
                                        {submitting ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm" role="status"></span>
                                                <span>Processing Payment...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>
                                                    {paymentMethod === "gpay"
                                                        ? `⚡ Pay ${formatPrice(grandTotal)} with Google Pay`
                                                        : paymentMethod === "card"
                                                        ? `🔒 Pay ${formatPrice(grandTotal)} with Card`
                                                        : `Confirm Cash On Delivery (${formatPrice(grandTotal)})`}
                                                </span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <footer className="bg-dark text-white pt-4 pb-3 mt-auto">
                <div className="container text-center small text-secondary">
                    &copy; {new Date().getFullYear()} PetWorld Platform.
                </div>
            </footer>
        </div>
    );
}

export default Checkout;

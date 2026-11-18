import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import Navbar from "./Navbar.jsx";
import { addToCart, getCartCount, subscribeToCart } from "../utils/cart.js";

const PET_PLACEHOLDER =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='45%25' font-size='80' text-anchor='middle' dominant-baseline='middle'%3E🐾%3C/text%3E%3Ctext x='50%25' y='72%25' font-size='22' fill='%2394a3b8' text-anchor='middle' font-family='sans-serif'%3ENo Image Available%3C/text%3E%3C/svg%3E";

function PetListing() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [pet, setPet] = useState(null);
    const [relatedPets, setRelatedPets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [quantity, setQuantity] = useState(1);
    const [cartCount, setCartCount] = useState(getCartCount());

    const [showBuyModal, setShowBuyModal] = useState(false);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [orderSubmitting, setOrderSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(null);

    const [shippingForm, setShippingForm] = useState({
        shipping_address: "",
        phone: "",
        payment_method: "cod",
    });

    const [reviews, setReviews] = useState([]);
    const [feedbackStats, setFeedbackStats] = useState({ average_rating: 0, total_reviews: 0 });
    const [userReview, setUserReview] = useState(null);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);
    const [loadingReviews, setLoadingReviews] = useState(true);

    const getUser = () => {
        try {
            const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    };

    const getToken = () => sessionStorage.getItem("access_token") || localStorage.getItem("access_token");

    useEffect(() => {
        const unsubscribe = subscribeToCart((_, count) => setCartCount(count));
        return () => unsubscribe();
    }, []);

    const fetchFeedback = async () => {
        setLoadingReviews(true);
        try {
            const token = getToken();
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await axios.get(`http://127.0.0.1:8000/api/feedback/product/${id}/`, { headers });
            setReviews(res.data.reviews || []);
            setFeedbackStats({
                average_rating: res.data.average_rating || 0,
                total_reviews: res.data.total_reviews || 0,
            });
            if (res.data.user_review) {
                setUserReview(res.data.user_review);
                setReviewRating(res.data.user_review.rating);
                setReviewComment(res.data.user_review.comment || "");
            } else {
                setUserReview(null);
                setReviewRating(5);
                setReviewComment("");
            }
        } catch {
            setReviews([]);
        } finally {
            setLoadingReviews(false);
        }
    };

    useEffect(() => {
        const fetchPetDetails = async () => {
            setLoading(true);
            setError(null);
            setQuantity(1);
            setOrderSuccess(null);
            setShowBuyModal(false);

            try {
                const res = await axios.get(`http://127.0.0.1:8000/api/pets/items/${id}/`);
                const data = res.data;

                const formattedPet = {
                    id: data.id,
                    name: data.name,
                    category: data.category_name || "General",
                    category_slug: data.category_slug || "",
                    price: parseFloat(data.price),
                    stock: typeof data.stock === "number" ? data.stock : 0,
                    description: data.description || "",
                    image: data.image
                        ? data.image.startsWith("http")
                            ? data.image
                            : `http://127.0.0.1:8000${data.image}`
                        : PET_PLACEHOLDER,
                    created_at: data.created_at,
                    updated_at: data.updated_at,
                    is_active: data.is_active,
                };
                setPet(formattedPet);

                try {
                    const relatedRes = await axios.get(`http://127.0.0.1:8000/api/pets/items/${id}/related/`);
                    const relatedData = relatedRes.data?.results || relatedRes.data;
                    if (Array.isArray(relatedData) && relatedData.length > 0) {
                        const formattedRelated = relatedData.map((p) => ({
                            id: p.id,
                            name: p.name,
                            category: p.category_name || "General",
                            price: parseFloat(p.price),
                            stock: p.stock,
                            image: p.image
                                ? p.image.startsWith("http")
                                    ? p.image
                                    : `http://127.0.0.1:8000${p.image}`
                                : PET_PLACEHOLDER,
                        }));
                        setRelatedPets(formattedRelated);
                    } else {
                        fetchFallbackRelated(data.id);
                    }
                } catch {
                    fetchFallbackRelated(data.id);
                }
            } catch (err) {
                console.error("Error fetching pet details:", err);
                setError("Unable to find pet details. This pet may not exist or has been removed.");
            } finally {
                setLoading(false);
            }
        };

        const fetchFallbackRelated = async (currentId) => {
            try {
                const listRes = await axios.get("http://127.0.0.1:8000/api/pets/items/");
                const all = listRes.data?.results || listRes.data;
                if (Array.isArray(all)) {
                    const others = all
                        .filter((p) => String(p.id) !== String(currentId))
                        .slice(0, 4)
                        .map((p) => ({
                            id: p.id,
                            name: p.name,
                            category: p.category_name || "General",
                            price: parseFloat(p.price),
                            stock: p.stock,
                            image: p.image
                                ? p.image.startsWith("http")
                                    ? p.image
                                    : `http://127.0.0.1:8000${p.image}`
                                : PET_PLACEHOLDER,
                        }));
                    setRelatedPets(others);
                }
            } catch {
                setRelatedPets([]);
            }
        };

        fetchPetDetails();
        fetchFeedback();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [id]);

    const handleQuantityChange = (delta) => {
        if (!pet) return;
        setQuantity((prev) => {
            const next = prev + delta;
            if (next < 1) return 1;
            if (next > pet.stock) {
                toast.warning(`Only ${pet.stock} item(s) available in stock.`);
                return pet.stock;
            }
            return next;
        });
    };

    const handleAddToCart = () => {
        if (!pet) return;
        if (pet.stock <= 0) {
            toast.error("Sorry, this pet is currently out of stock.");
            return;
        }

        const user = getUser();
        const token = getToken();
        if (!user || !token) {
            toast.info("Please sign in to add this pet to your cart.");
            setShowLoginPrompt(true);
            return;
        }

        addToCart(pet, quantity);
        toast.success(`Added ${quantity} × "${pet.name}" to cart! 🐾`, {
            icon: "🛒",
        });
    };

    const handleBuyNowClick = () => {
        if (!pet) return;
        if (pet.stock <= 0) {
            toast.error("Sorry, this pet is currently out of stock.");
            return;
        }

        const user = getUser();
        const token = getToken();

        if (!user || !token) {
            toast.info("Please sign in to buy this pet.");
            setShowLoginPrompt(true);
            return;
        }

        navigate("/payment", {
            state: {
                item: {
                    id: pet.id,
                    name: pet.name,
                    price: pet.price,
                    image: pet.image,
                    category: pet.category,
                    stock: pet.stock,
                    description: pet.description,
                },
                quantity: quantity,
            },
        });
    };

    const handleShippingChange = (e) => {
        setShippingForm({ ...shippingForm, [e.target.name]: e.target.value });
    };

    const handleConfirmOrder = async (e) => {
        e.preventDefault();
        const token = getToken();
        const user = getUser();

        if (!token || !user) {
            toast.error("Please log in to complete your purchase.");
            navigate("/login", { state: { returnUrl: location.pathname } });
            return;
        }

        if (!shippingForm.shipping_address.trim()) {
            toast.warning("Please provide a valid shipping address.");
            return;
        }

        if (!shippingForm.phone.trim()) {
            toast.warning("Please provide a contact phone number.");
            return;
        }

        setOrderSubmitting(true);
        try {
            const totalAmount = (pet.price * quantity).toFixed(2);
            const payload = {
                shipping_address: shippingForm.shipping_address.trim(),
                phone: shippingForm.phone.trim(),
                total_amount: parseFloat(totalAmount),
                items: [
                    {
                        product: pet.id,
                        quantity: quantity,
                        unit_price: pet.price,
                    },
                ],
            };

            const res = await axios.post("http://127.0.0.1:8000/api/orders/", payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            const createdOrder = res.data;
            setOrderSuccess(createdOrder);
            toast.success(`🎉 Order #${createdOrder.id} placed successfully!`);

            setPet((prev) => ({
                ...prev,
                stock: Math.max(0, prev.stock - quantity),
            }));
            setQuantity(1);
        } catch (err) {
            console.error("Order creation failed:", err);
            const errMsg =
                err.response?.data?.stock ||
                err.response?.data?.items ||
                err.response?.data?.detail ||
                "Failed to place order. Please check your information and try again.";
            toast.error(typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg));
        } finally {
            setOrderSubmitting(false);
        }
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        const token = getToken();
        const user = getUser();

        if (!token || !user) {
            toast.info("Please sign in to submit a review.");
            setShowLoginPrompt(true);
            return;
        }

        if (!reviewComment.trim()) {
            toast.warning("Please write a comment describing your experience.");
            return;
        }

        setSubmittingReview(true);
        try {
            if (userReview) {
                await axios.patch(
                    `http://127.0.0.1:8000/api/feedback/${userReview.id}/`,
                    {
                        rating: reviewRating,
                        comment: reviewComment.trim(),
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    }
                );
                toast.success("Your review was updated successfully! 🐾");
            } else {
                await axios.post(
                    "http://127.0.0.1:8000/api/feedback/",
                    {
                        product: pet.id,
                        rating: reviewRating,
                        comment: reviewComment.trim(),
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    }
                );
                toast.success("Thank you for sharing your feedback! 🐾");
            }
            fetchFeedback();
        } catch (err) {
            console.error("Failed to submit feedback:", err);
            toast.error("Could not save your review. Please try again.");
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleDeleteReview = async () => {
        if (!userReview) return;
        const token = getToken();
        try {
            await axios.delete(`http://127.0.0.1:8000/api/feedback/${userReview.id}/`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            toast.info("Your review was removed.");
            setUserReview(null);
            setReviewRating(5);
            setReviewComment("");
            fetchFeedback();
        } catch (err) {
            console.error("Failed to delete review:", err);
            toast.error("Could not delete review.");
        }
    };

    const formatPrice = (val) => {
        const num = parseFloat(val || 0);
        return "$" + num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
                        <span className="visually-hidden">Loading Pet Details...</span>
                    </div>
                    <h4 className="fw-bold mt-4 text-dark">Loading Pet Details...</h4>
                    <p className="text-muted small">Fetching information from server</p>
                </div>
            </div>
        );
    }

    if (error || !pet) {
        return (
            <div className="bg-light min-vh-100 d-flex flex-column">
                <Navbar cartCount={cartCount} />
                <div className="container py-5 my-auto">
                    <div className="card border-0 shadow-sm rounded-4 p-5 text-center mx-auto bg-white" style={{ maxWidth: "560px" }}>
                        <div className="display-1 mb-3">🐾</div>
                        <h2 className="fw-bold text-dark mb-2">Pet Not Found</h2>
                        <p className="text-muted mb-4">{error || "The pet you are looking for does not exist."}</p>
                        <div className="d-flex justify-content-center gap-3">
                            <Link
                                to="/pets"
                                className="btn btn-primary rounded-pill px-4 fw-semibold"
                                style={{ background: "#0f766e", border: "none" }}
                            >
                                Browse All Pets
                            </Link>
                            <Link to="/" className="btn btn-outline-secondary rounded-pill px-4 fw-semibold">
                                Return Home
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const subtotal = pet.price * quantity;

    return (
        <div className="bg-light min-vh-100 d-flex flex-column">
            <Navbar cartCount={cartCount} />

            <nav className="bg-white border-bottom py-3">
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
                            <li className="breadcrumb-item">
                                <Link
                                    to={`/pets?category=${encodeURIComponent(pet.category)}`}
                                    className="text-decoration-none text-muted"
                                >
                                    {pet.category}
                                </Link>
                            </li>
                            <li className="breadcrumb-item active text-dark fw-semibold" aria-current="page">
                                {pet.name}
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
            </nav>

            <main className="container py-4 py-lg-5">
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white mb-5">
                    <div className="row g-0">
                        <div className="col-12 col-lg-6 p-4 p-md-5 d-flex flex-column justify-content-center bg-light bg-opacity-50 border-end">
                            <div className="position-relative text-center rounded-4 overflow-hidden bg-white shadow-sm p-3">
                                <div className="position-absolute top-0 start-0 m-3 z-2">
                                    {pet.stock > 0 ? (
                                        <span className="badge bg-success px-3 py-2 rounded-pill fw-bold shadow-sm">
                                            ✓ In Stock ({pet.stock})
                                        </span>
                                    ) : (
                                        <span className="badge bg-danger px-3 py-2 rounded-pill fw-bold shadow-sm">
                                            ✕ Out of Stock
                                        </span>
                                    )}
                                </div>

                                <img
                                    src={pet.image}
                                    alt={pet.name}
                                    className="img-fluid rounded-3 w-100"
                                    style={{
                                        maxHeight: "440px",
                                        objectFit: "cover",
                                    }}
                                />
                            </div>
                        </div>

                        <div className="col-12 col-lg-6 p-4 p-md-5 d-flex flex-column">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <Link
                                    to={`/pets?category=${encodeURIComponent(pet.category)}`}
                                    className="badge bg-success bg-opacity-10 text-success text-decoration-none px-3 py-2 rounded-pill fw-bold"
                                >
                                    🐾 {pet.category}
                                </Link>
                                <span className="text-muted small">Item ID: #{pet.id}</span>
                            </div>

                            <h1 className="fw-bold text-dark display-6 mb-2">{pet.name}</h1>

                            <div className="d-flex align-items-center gap-2 mb-3">
                                <span className="text-warning fs-5">
                                    {"★".repeat(Math.round(feedbackStats.average_rating || 5))}
                                    {"☆".repeat(5 - Math.round(feedbackStats.average_rating || 5))}
                                </span>
                                <span className="fw-bold text-dark">
                                    {feedbackStats.total_reviews > 0 ? feedbackStats.average_rating : "New"}
                                </span>
                                <span className="text-muted small">
                                    ({feedbackStats.total_reviews} {feedbackStats.total_reviews === 1 ? "review" : "reviews"})
                                </span>
                            </div>

                            <div className="p-3 rounded-4 mb-4" style={{ backgroundColor: "#f0fdf9", border: "1px solid #ccfbf1" }}>
                                <div className="d-flex align-items-baseline gap-2">
                                    <span className="display-6 fw-bold" style={{ color: "#0f766e" }}>
                                        {formatPrice(pet.price)}
                                    </span>
                                </div>
                            </div>

                            <div className="row g-2 mb-4">
                                <div className="col-6">
                                    <div className="p-3 rounded-3 bg-light border">
                                        <div className="text-muted small text-uppercase" style={{ fontSize: "11px" }}>
                                            Category
                                        </div>
                                        <div className="fw-bold text-dark">{pet.category}</div>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="p-3 rounded-3 bg-light border">
                                        <div className="text-muted small text-uppercase" style={{ fontSize: "11px" }}>
                                            Available Stock
                                        </div>
                                        <div className="fw-bold text-dark">
                                            {pet.stock > 0 ? `${pet.stock} Units` : "0 (Out of stock)"}
                                        </div>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="p-3 rounded-3 bg-light border">
                                        <div className="text-muted small text-uppercase" style={{ fontSize: "11px" }}>
                                            Date Added
                                        </div>
                                        <div className="fw-bold text-dark">{formatDate(pet.created_at)}</div>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="p-3 rounded-3 bg-light border">
                                        <div className="text-muted small text-uppercase" style={{ fontSize: "11px" }}>
                                            Status
                                        </div>
                                        <div className="fw-bold text-dark">
                                            {pet.stock > 0 ? "Available for Purchase" : "Currently Unavailable"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4">
                                <h6 className="fw-bold text-dark mb-2">Description</h6>
                                <p className="text-secondary leading-relaxed mb-0" style={{ whiteSpace: "pre-line" }}>
                                    {pet.description || "No description provided for this item."}
                                </p>
                            </div>

                            <hr className="my-2 text-muted opacity-25" />

                            {pet.stock > 0 && (
                                <div className="my-4">
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
                                        <label className="fw-bold text-dark small mb-0">Quantity:</label>
                                        <div className="d-flex align-items-center border rounded-pill overflow-hidden bg-white">
                                            <button
                                                type="button"
                                                onClick={() => handleQuantityChange(-1)}
                                                disabled={quantity <= 1}
                                                className="btn btn-light rounded-0 px-3 py-1 fw-bold border-0 text-dark"
                                                style={{ minWidth: "40px" }}
                                            >
                                                −
                                            </button>
                                            <span className="px-3 fw-bold text-center" style={{ minWidth: "40px" }}>
                                                {quantity}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleQuantityChange(1)}
                                                disabled={quantity >= pet.stock}
                                                className="btn btn-light rounded-0 px-3 py-1 fw-bold border-0 text-dark"
                                                style={{ minWidth: "40px" }}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center px-3 py-2 bg-light rounded-3 text-secondary small">
                                        <span>Subtotal ({quantity} {quantity === 1 ? "item" : "items"}):</span>
                                        <span className="fw-bold text-dark fs-6">{formatPrice(subtotal)}</span>
                                    </div>
                                </div>
                            )}

                            <div className="mt-auto pt-2">
                                <div className="row g-3">
                                    <div className="col-12 col-sm-6">
                                        <button
                                            type="button"
                                            onClick={handleAddToCart}
                                            disabled={pet.stock <= 0}
                                            className="btn btn-outline-dark w-100 rounded-pill py-3 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                                            style={{
                                                borderColor: "#0f766e",
                                                color: "#0f766e",
                                                transition: "all 0.2s ease",
                                            }}
                                            onMouseEnter={(e) => {
                                                if (pet.stock > 0) {
                                                    e.currentTarget.style.backgroundColor = "#0f766e";
                                                    e.currentTarget.style.color = "#ffffff";
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (pet.stock > 0) {
                                                    e.currentTarget.style.backgroundColor = "transparent";
                                                    e.currentTarget.style.color = "#0f766e";
                                                }
                                            }}
                                        >
                                            <span className="fs-5">🛒</span>
                                            <span>Add To Cart</span>
                                        </button>
                                    </div>

                                    <div className="col-12 col-sm-6">
                                        <button
                                            type="button"
                                            onClick={handleBuyNowClick}
                                            disabled={pet.stock <= 0}
                                            className="btn w-100 rounded-pill py-3 fw-bold text-white d-flex align-items-center justify-content-center gap-2 shadow"
                                            style={{
                                                background:
                                                    pet.stock > 0
                                                        ? "linear-gradient(135deg, #0f766e 0%, #047857 100%)"
                                                        : "#94a3b8",
                                                border: "none",
                                            }}
                                        >
                                            <span className="fs-5">⚡</span>
                                            <span>Buy Now</span>
                                        </button>
                                    </div>
                                </div>

                                {pet.stock <= 0 && (
                                    <div className="alert alert-warning py-2 px-3 small rounded-3 mt-3 mb-0 text-center">
                                        This pet is currently out of stock.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <section className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white p-4 p-md-5 mb-5">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 pb-3 border-bottom">
                        <div>
                            <span className="badge bg-success bg-opacity-10 text-success fw-bold px-3 py-2 rounded-pill mb-2">
                                REVIEWS & FEEDBACK
                            </span>
                            <h3 className="fw-bold text-dark mb-1">Customer Reviews</h3>
                            <p className="text-muted small mb-0">
                                Real experiences shared by customers who adopted or purchased this companion.
                            </p>
                        </div>

                        <div className="d-flex align-items-center gap-3 bg-light p-3 rounded-4 border">
                            <div className="text-center pe-3 border-end">
                                <div className="display-6 fw-bold text-dark mb-0">
                                    {feedbackStats.average_rating > 0 ? feedbackStats.average_rating : "5.0"}
                                </div>
                                <div className="text-warning small">
                                    {"★".repeat(Math.round(feedbackStats.average_rating || 5))}
                                    {"☆".repeat(5 - Math.round(feedbackStats.average_rating || 5))}
                                </div>
                            </div>
                            <div>
                                <div className="fw-bold small text-dark">
                                    {feedbackStats.total_reviews} Total {feedbackStats.total_reviews === 1 ? "Review" : "Reviews"}
                                </div>
                                <div className="text-muted small" style={{ fontSize: "12px" }}>
                                    Verified Customer Feedback
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="row g-4 mb-5">
                        <div className="col-12 col-lg-7">
                            <h5 className="fw-bold text-dark mb-3">
                                {userReview ? "Edit Your Review" : "Write a Review"}
                            </h5>

                            {getUser() ? (
                                <form onSubmit={handleReviewSubmit} className="bg-light p-4 rounded-4 border">
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">
                                            Select Rating *
                                        </label>
                                        <div className="d-flex gap-2 align-items-center">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => setReviewRating(star)}
                                                    className="btn btn-link p-0 text-decoration-none fs-3"
                                                    style={{ color: star <= reviewRating ? "#f59e0b" : "#cbd5e1", lineHeight: 1 }}
                                                >
                                                    ★
                                                </button>
                                            ))}
                                            <span className="ms-2 fw-bold text-dark small">
                                                {reviewRating} of 5 Stars
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">
                                            Your Experience & Feedback *
                                        </label>
                                        <textarea
                                            rows="4"
                                            className="form-control rounded-3"
                                            placeholder="Write your review here... How is the pet's temperament, health, and care?"
                                            value={reviewComment}
                                            onChange={(e) => setReviewComment(e.target.value)}
                                            required
                                        ></textarea>
                                    </div>

                                    <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
                                        <button
                                            type="submit"
                                            disabled={submittingReview}
                                            className="btn text-white rounded-pill px-4 fw-bold"
                                            style={{ backgroundColor: "#0f766e", border: "none" }}
                                        >
                                            {submittingReview
                                                ? "Submitting..."
                                                : userReview
                                                ? "Update Review"
                                                : "Submit Review"}
                                        </button>

                                        {userReview && (
                                            <button
                                                type="button"
                                                onClick={handleDeleteReview}
                                                className="btn btn-outline-danger btn-sm rounded-pill px-3 fw-semibold"
                                            >
                                                Delete My Review
                                            </button>
                                        )}
                                    </div>
                                </form>
                            ) : (
                                <div className="p-4 rounded-4 bg-light border text-center">
                                    <p className="text-secondary mb-3">
                                        Sign in to your PetWorld account to leave your review and feedback for this pet companion.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => navigate("/login", { state: { returnUrl: location.pathname } })}
                                        className="btn btn-primary rounded-pill px-4 fw-semibold"
                                        style={{ backgroundColor: "#0f766e", border: "none" }}
                                    >
                                        Sign In to Review
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="col-12 col-lg-5">
                            <div className="p-4 rounded-4 bg-light border h-100">
                                <h6 className="fw-bold text-dark mb-3">Review Policy</h6>
                                <ul className="list-unstyled small text-secondary d-flex flex-column gap-2 mb-0">
                                    <li className="d-flex gap-2">
                                        <span>✓</span>
                                        <span>Only registered customers can publish reviews.</span>
                                    </li>
                                    <li className="d-flex gap-2">
                                        <span>✓</span>
                                        <span>Reviews help other pet parents make informed adoption decisions.</span>
                                    </li>
                                    <li className="d-flex gap-2">
                                        <span>✓</span>
                                        <span>All feedback is moderated to ensure a kind and authentic community.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <h5 className="fw-bold text-dark mb-3">All Customer Comments</h5>

                    {loadingReviews ? (
                        <div className="text-center py-4">
                            <div className="spinner-border text-success" role="status">
                                <span className="visually-hidden">Loading reviews...</span>
                            </div>
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="p-4 rounded-4 bg-light text-center text-muted">
                            <div className="fs-3 mb-2">💬</div>
                            <p className="mb-0">No reviews yet for this pet. Be the first customer to share your thoughts!</p>
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {reviews.map((rev) => (
                                <div key={rev.id} className="p-4 rounded-4 border bg-white shadow-2xs">
                                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                                        <div className="d-flex align-items-center gap-2">
                                            <div
                                                className="rounded-circle bg-success text-white fw-bold d-flex align-items-center justify-content-center"
                                                style={{ width: "36px", height: "36px", backgroundColor: "#0f766e" }}
                                            >
                                                {(rev.user_name || "U")[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="fw-bold text-dark small">{rev.user_name || "Customer"}</div>
                                                <div className="text-muted" style={{ fontSize: "11px" }}>
                                                    {formatDate(rev.created_at)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-warning">
                                            {"★".repeat(rev.rating)}
                                            {"☆".repeat(5 - rev.rating)}
                                        </div>
                                    </div>

                                    <p className="text-secondary small mb-0 mt-2" style={{ whiteSpace: "pre-line" }}>
                                        {rev.comment || "Rated without additional written comments."}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {relatedPets.length > 0 && (
                    <section className="mb-5">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                            <div>
                                <h4 className="fw-bold text-dark mb-0">More in {pet.category}</h4>
                            </div>
                            <Link to="/pets" className="btn btn-outline-dark btn-sm rounded-pill px-3 fw-semibold">
                                View All Pets →
                            </Link>
                        </div>

                        <div className="row g-4">
                            {relatedPets.map((rel) => (
                                <div key={rel.id} className="col-12 col-sm-6 col-lg-3">
                                    <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden position-relative bg-white">
                                        <div className="overflow-hidden" style={{ height: "180px" }}>
                                            <img
                                                src={rel.image}
                                                alt={rel.name}
                                                className="w-100 h-100"
                                                style={{ objectFit: "cover" }}
                                                loading="lazy"
                                            />
                                        </div>
                                        <div className="card-body p-3 d-flex flex-column">
                                            <span className="badge bg-light text-secondary border small mb-1 align-self-start">
                                                {rel.category}
                                            </span>
                                            <h6 className="card-title fw-bold text-dark mb-2 text-truncate" title={rel.name}>
                                                {rel.name}
                                            </h6>
                                            <div className="mt-auto pt-2 d-flex align-items-center justify-content-between">
                                                <span className="fw-bold fs-6" style={{ color: "#0f766e" }}>
                                                    {formatPrice(rel.price)}
                                                </span>
                                                <Link
                                                    to={`/pets/${rel.id}`}
                                                    className="btn btn-sm btn-outline-success rounded-pill px-3 fw-semibold"
                                                >
                                                    View Details
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>

            {showLoginPrompt && (
                <div
                    className="modal show d-block"
                    tabIndex="-1"
                    style={{ backgroundColor: "rgba(0, 0, 0, 0.6)", zIndex: 1060 }}
                >
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "420px" }}>
                        <div className="modal-content rounded-4 border-0 shadow-lg p-3">
                            <div className="modal-header border-0 pb-0">
                                <h5 className="modal-title fw-bold text-dark">Sign In Required</h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowLoginPrompt(false)}
                                    aria-label="Close"
                                ></button>
                            </div>
                            <div className="modal-body text-center py-4">
                                <div className="display-4 mb-3">🐾</div>
                                <h6 className="fw-bold mb-2">Sign In Required</h6>
                                <p className="text-muted small mb-4">
                                    You must sign in to your account to review pets or add them to your cart.
                                </p>
                                <div className="d-flex flex-column gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowLoginPrompt(false);
                                            navigate("/login", { state: { returnUrl: location.pathname } });
                                        }}
                                        className="btn btn-success rounded-pill py-2 fw-bold"
                                        style={{ backgroundColor: "#0f766e", border: "none" }}
                                    >
                                        Sign In
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowLoginPrompt(false);
                                            navigate("/register");
                                        }}
                                        className="btn btn-outline-secondary rounded-pill py-2 fw-semibold"
                                    >
                                        Create New Account
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showBuyModal && (
                <div
                    className="modal show d-block"
                    tabIndex="-1"
                    style={{ backgroundColor: "rgba(0, 0, 0, 0.65)", zIndex: 1055 }}
                >
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content rounded-4 border-0 shadow-2xl overflow-hidden">
                            <div
                                className="modal-header text-white border-0 py-3 px-4"
                                style={{ background: "linear-gradient(135deg, #134e4a 0%, #0f766e 100%)" }}
                            >
                                <div className="d-flex align-items-center gap-2">
                                    <span className="fs-4">⚡</span>
                                    <h5 className="modal-title fw-bold mb-0 text-white">Checkout</h5>
                                </div>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => !orderSubmitting && setShowBuyModal(false)}
                                    aria-label="Close"
                                    disabled={orderSubmitting}
                                ></button>
                            </div>

                            <div className="modal-body p-4 p-md-5 bg-white">
                                {orderSuccess ? (
                                    <div className="text-center py-4">
                                        <div className="display-1 text-success mb-3">✅</div>
                                        <h3 className="fw-bold text-dark mb-2">Order Placed Successfully!</h3>
                                        <p className="text-muted mb-4">
                                            Order <strong>#{orderSuccess.id}</strong> has been registered.
                                        </p>
                                        <div className="p-3 bg-light rounded-4 text-start mb-4 mx-auto" style={{ maxWidth: "460px" }}>
                                            <div className="d-flex justify-content-between small text-secondary mb-1">
                                                <span>Pet:</span>
                                                <strong className="text-dark">{pet.name}</strong>
                                            </div>
                                            <div className="d-flex justify-content-between small text-secondary mb-1">
                                                <span>Quantity:</span>
                                                <strong className="text-dark">{quantity}</strong>
                                            </div>
                                            <div className="d-flex justify-content-between small text-secondary mb-1">
                                                <span>Total Amount:</span>
                                                <strong className="text-success">{formatPrice(orderSuccess.total_amount || subtotal)}</strong>
                                            </div>
                                            <div className="d-flex justify-content-between small text-secondary">
                                                <span>Status:</span>
                                                <span className="badge bg-warning text-dark">{orderSuccess.status || "Pending"}</span>
                                            </div>
                                        </div>
                                        <div className="d-flex justify-content-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowBuyModal(false);
                                                    navigate("/orders");
                                                }}
                                                className="btn btn-primary rounded-pill px-4 fw-bold"
                                                style={{ backgroundColor: "#0f766e", border: "none" }}
                                            >
                                                📦 View My Orders
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowBuyModal(false);
                                                    navigate("/pets");
                                                }}
                                                className="btn btn-outline-secondary rounded-pill px-4 fw-semibold"
                                            >
                                                Continue Shopping
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleConfirmOrder}>
                                        <div className="row g-4">
                                            <div className="col-12 col-md-5">
                                                <div className="p-3 rounded-4 bg-light border h-100 d-flex flex-column">
                                                    <h6 className="fw-bold text-dark mb-3">Order Summary</h6>
                                                    <div className="d-flex gap-3 align-items-center mb-3 pb-3 border-bottom">
                                                        <img
                                                            src={pet.image}
                                                            alt={pet.name}
                                                            className="rounded-3 shadow-sm"
                                                            style={{ width: "70px", height: "70px", objectFit: "cover" }}
                                                        />
                                                        <div>
                                                            <div className="fw-bold small text-dark mb-1">{pet.name}</div>
                                                            <div className="text-muted small">
                                                                {formatPrice(pet.price)} × {quantity}
                                                            </div>
                                                            <span className="badge bg-secondary-subtle text-secondary small">
                                                                {pet.category}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="d-flex flex-column gap-2 small text-secondary mb-3">
                                                        <div className="d-flex justify-content-between">
                                                            <span>Unit Price:</span>
                                                            <strong className="text-dark">{formatPrice(pet.price)}</strong>
                                                        </div>
                                                        <div className="d-flex justify-content-between">
                                                            <span>Quantity:</span>
                                                            <strong className="text-dark">{quantity}</strong>
                                                        </div>
                                                    </div>

                                                    <div className="pt-3 border-top mt-auto d-flex justify-content-between align-items-center">
                                                        <span className="fw-bold text-dark fs-6">Total:</span>
                                                        <span className="fw-bold fs-5" style={{ color: "#0f766e" }}>
                                                            {formatPrice(subtotal)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-12 col-md-7">
                                                <h6 className="fw-bold text-dark mb-3">Shipping Details</h6>

                                                <div className="mb-3">
                                                    <label className="form-label small fw-semibold text-secondary">
                                                        Delivery Address *
                                                    </label>
                                                    <textarea
                                                        name="shipping_address"
                                                        rows="3"
                                                        className="form-control rounded-3"
                                                        placeholder="Enter full delivery address"
                                                        value={shippingForm.shipping_address}
                                                        onChange={handleShippingChange}
                                                        required
                                                    />
                                                </div>

                                                <div className="mb-3">
                                                    <label className="form-label small fw-semibold text-secondary">
                                                        Phone Number *
                                                    </label>
                                                    <input
                                                        type="tel"
                                                        name="phone"
                                                        className="form-control rounded-3"
                                                        placeholder="e.g. 9876543210"
                                                        value={shippingForm.phone}
                                                        onChange={handleShippingChange}
                                                        required
                                                    />
                                                </div>

                                                <div className="mb-4">
                                                    <label className="form-label small fw-semibold text-secondary">
                                                        Payment Method
                                                    </label>
                                                    <div className="d-flex flex-column gap-2">
                                                        <label className="border rounded-3 p-2 d-flex align-items-center gap-2 cursor-pointer bg-light">
                                                            <input
                                                                type="radio"
                                                                name="payment_method"
                                                                value="cod"
                                                                checked={shippingForm.payment_method === "cod"}
                                                                onChange={handleShippingChange}
                                                            />
                                                            <span className="small fw-semibold text-dark">
                                                                💵 Cash on Delivery
                                                            </span>
                                                        </label>
                                                        <label className="border rounded-3 p-2 d-flex align-items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="payment_method"
                                                                value="online"
                                                                checked={shippingForm.payment_method === "online"}
                                                                onChange={handleShippingChange}
                                                            />
                                                            <span className="small fw-semibold text-dark">
                                                                💳 Online Payment / Card
                                                            </span>
                                                        </label>
                                                    </div>
                                                </div>

                                                <div className="d-flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowBuyModal(false)}
                                                        disabled={orderSubmitting}
                                                        className="btn btn-light rounded-pill px-4 fw-semibold flex-grow-1"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={orderSubmitting}
                                                        className="btn text-white rounded-pill px-4 fw-bold flex-grow-2"
                                                        style={{
                                                             background: "linear-gradient(135deg, #0f766e 0%, #047857 100%)",
                                                            border: "none",
                                                        }}
                                                    >
                                                        {orderSubmitting ? (
                                                            <>
                                                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                                Placing Order...
                                                            </>
                                                        ) : (
                                                            `Confirm Order (${formatPrice(subtotal)})`
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

export default PetListing;

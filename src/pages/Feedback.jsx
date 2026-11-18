import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import Navbar from "./Navbar.jsx";
import { getCartCount, subscribeToCart } from "../utils/cart.js";

function Feedback() {
    const navigate = useNavigate();

    const [reviews, setReviews] = useState([]);
    const [petsList, setPetsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cartCount, setCartCount] = useState(getCartCount());

    const [selectedProduct, setSelectedProduct] = useState("");
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [filterRating, setFilterRating] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    const [editingReviewId, setEditingReviewId] = useState(null);

    const getUser = () => {
        try {
            const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    };

    const getToken = () => sessionStorage.getItem("access_token") || localStorage.getItem("access_token");

    const currentUser = getUser();

    useEffect(() => {
        const unsubscribe = subscribeToCart((_, count) => setCartCount(count));
        return () => unsubscribe();
    }, []);

    const fetchFeedbacksAndPets = async () => {
        setLoading(true);
        try {
            const token = getToken();
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const [feedbackRes, petsRes] = await Promise.all([
                axios.get("http://127.0.0.1:8000/api/feedback/", { headers }),
                axios.get("http://127.0.0.1:8000/api/pets/items/"),
            ]);

            const fbData = feedbackRes.data?.results || feedbackRes.data;
            const pData = petsRes.data?.results || petsRes.data;

            setReviews(Array.isArray(fbData) ? fbData : []);
            setPetsList(Array.isArray(pData) ? pData : []);

            if (Array.isArray(pData) && pData.length > 0 && !selectedProduct) {
                setSelectedProduct(String(pData[0].id));
            }
        } catch (err) {
            console.error("Failed to fetch feedback:", err);
            toast.error("Could not load reviews. Please refresh the page.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedbacksAndPets();
    }, []);

    const handleSubmitFeedback = async (e) => {
        e.preventDefault();
        const token = getToken();

        if (!currentUser || !token) {
            toast.info("Please sign in to submit feedback.");
            navigate("/login", { state: { returnUrl: "/feedback" } });
            return;
        }

        if (!selectedProduct) {
            toast.warning("Please select a pet companion to review.");
            return;
        }

        if (!comment.trim()) {
            toast.warning("Please enter your thoughts in the comment field.");
            return;
        }

        setSubmitting(true);
        try {
            if (editingReviewId) {
                await axios.patch(
                    `http://127.0.0.1:8000/api/feedback/${editingReviewId}/`,
                    {
                        rating: parseInt(rating, 10),
                        comment: comment.trim(),
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    }
                );
                toast.success("Your review was updated successfully! 🐾");
                setEditingReviewId(null);
            } else {
                await axios.post(
                    "http://127.0.0.1:8000/api/feedback/",
                    {
                        product: parseInt(selectedProduct, 10),
                        rating: parseInt(rating, 10),
                        comment: comment.trim(),
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    }
                );
                toast.success("Thank you for submitting your feedback! 🐾");
            }

            setComment("");
            setRating(5);
            fetchFeedbacksAndPets();
        } catch (err) {
            console.error("Failed to post feedback:", err);
            const errDetail = err.response?.data?.detail || "Could not save review. Please try again.";
            toast.error(errDetail);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditClick = (rev) => {
        setEditingReviewId(rev.id);
        setSelectedProduct(String(rev.product));
        setRating(rev.rating);
        setComment(rev.comment || "");
        window.scrollTo({ top: 380, behavior: "smooth" });
    };

    const handleCancelEdit = () => {
        setEditingReviewId(null);
        setComment("");
        setRating(5);
    };

    const handleDeleteFeedback = async (reviewId) => {
        if (!window.confirm("Are you sure you want to delete this review?")) return;
        const token = getToken();
        try {
            await axios.delete(`http://127.0.0.1:8000/api/feedback/${reviewId}/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.info("Your review was removed.");
            if (editingReviewId === reviewId) {
                handleCancelEdit();
            }
            fetchFeedbacksAndPets();
        } catch (err) {
            console.error("Delete failed:", err);
            toast.error("Could not delete review.");
        }
    };

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
        ? (reviews.reduce((acc, curr) => acc + (curr.rating || 0), 0) / totalReviews).toFixed(1)
        : "5.0";

    const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
        if (starCounts[r.rating] !== undefined) {
            starCounts[r.rating] += 1;
        }
    });

    const filteredReviews = reviews.filter((r) => {
        const matchesRating = filterRating === "all" || String(r.rating) === String(filterRating);
        const search = searchTerm.toLowerCase();
        const matchesSearch =
            !search ||
            (r.product_name && r.product_name.toLowerCase().includes(search)) ||
            (r.user_name && r.user_name.toLowerCase().includes(search)) ||
            (r.comment && r.comment.toLowerCase().includes(search));
        return matchesRating && matchesSearch;
    });

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

    return (
        <div className="bg-light min-vh-100 d-flex flex-column">
            <Navbar cartCount={cartCount} />

            <header
                className="text-white py-5 position-relative overflow-hidden"
                style={{
                    background: "linear-gradient(135deg, #0f766e 0%, #0369a1 100%)",
                }}
            >
                <div className="container py-4">
                    <div className="row align-items-center g-4">
                        <div className="col-lg-8">
                            <span className="badge bg-white text-dark px-3 py-2 rounded-pill fw-semibold mb-3 shadow-sm">
                                💬 Customer Voices
                            </span>
                            <h1 className="display-4 fw-bold mb-3">
                                Feedback & Experiences
                            </h1>
                            <p className="lead text-white-50 mb-0">
                                Discover honest reviews and stories from pet parents across our community, or share your own journey with your adopted companion.
                            </p>
                        </div>

                        <div className="col-lg-4 text-center text-lg-end">
                            <div className="bg-white p-4 rounded-4 shadow-lg text-dark d-inline-block text-center" style={{ minWidth: "240px" }}>
                                <div className="display-4 fw-bold text-success mb-0">{averageRating}</div>
                                <div className="text-warning fs-5 mb-1">
                                    {"★".repeat(Math.round(parseFloat(averageRating) || 5))}
                                    {"☆".repeat(5 - Math.round(parseFloat(averageRating) || 5))}
                                </div>
                                <div className="fw-bold small text-dark">
                                    Community Rating
                                </div>
                                <div className="text-muted small">
                                    Based on {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container py-5 flex-grow-1">
                <div className="row g-4 mb-5">
                    <div className="col-12 col-lg-5">
                        <div className="card border-0 shadow-sm rounded-4 p-4 p-md-4 bg-white h-100">
                            <h4 className="fw-bold text-dark mb-1">
                                {editingReviewId ? "Edit Your Review" : "Share Your Feedback"}
                            </h4>
                            <p className="text-muted small mb-4">
                                Your reviews help future pet adopters provide loving, caring homes.
                            </p>

                            {currentUser ? (
                                <form onSubmit={handleSubmitFeedback}>
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">
                                            Select Pet Companion *
                                        </label>
                                        <select
                                            className="form-select rounded-3"
                                            value={selectedProduct}
                                            onChange={(e) => setSelectedProduct(e.target.value)}
                                            required
                                            disabled={Boolean(editingReviewId)}
                                        >
                                            <option value="">-- Choose a Companion --</option>
                                            {petsList.map((pet) => (
                                                <option key={pet.id} value={pet.id}>
                                                    {pet.name} ({pet.category_name || "Pet"})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">
                                            Your Rating *
                                        </label>
                                        <div className="d-flex align-items-center gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => setRating(star)}
                                                    className="btn btn-link p-0 text-decoration-none fs-3"
                                                    style={{
                                                        color: star <= rating ? "#f59e0b" : "#cbd5e1",
                                                        lineHeight: 1,
                                                    }}
                                                >
                                                    ★
                                                </button>
                                            ))}
                                            <span className="ms-2 fw-bold text-dark small">
                                                {rating} of 5 Stars
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="form-label small fw-semibold text-secondary">
                                            Your Comments & Experience *
                                        </label>
                                        <textarea
                                            rows="4"
                                            className="form-control rounded-3"
                                            placeholder="Tell us about the pet's health, personality, and your experience adopting through PetWorld..."
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            required
                                        ></textarea>
                                    </div>

                                    <div className="d-flex gap-2">
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="btn text-white rounded-pill px-4 fw-bold flex-grow-1"
                                            style={{ backgroundColor: "#0f766e", border: "none" }}
                                        >
                                            {submitting
                                                ? "Saving..."
                                                : editingReviewId
                                                    ? "Save Changes"
                                                    : "Post Feedback"}
                                        </button>
                                        {editingReviewId && (
                                            <button
                                                type="button"
                                                onClick={handleCancelEdit}
                                                className="btn btn-light rounded-pill px-3 fw-semibold"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </form>
                            ) : (
                                <div className="p-4 rounded-4 bg-light text-center border">
                                    <div className="display-6 mb-2">🐾</div>
                                    <h6 className="fw-bold mb-2">Sign in to Review</h6>
                                    <p className="text-muted small mb-3">
                                        Please log in with your PetWorld customer account to submit your review for a companion.
                                    </p>
                                    <Link
                                        to="/login"
                                        state={{ returnUrl: "/feedback" }}
                                        className="btn btn-success rounded-pill px-4 fw-semibold"
                                        style={{ backgroundColor: "#0f766e", border: "none" }}
                                    >
                                        Sign In Now
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="col-12 col-lg-7">
                        <div className="card border-0 shadow-sm rounded-4 p-4 p-md-4 bg-white h-100">
                            <h5 className="fw-bold text-dark mb-3">Community Rating Breakdown</h5>

                            <div className="d-flex flex-column gap-3 mb-4">
                                {[5, 4, 3, 2, 1].map((star) => {
                                    const count = starCounts[star] || 0;
                                    const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                                    return (
                                        <div key={star} className="d-flex align-items-center gap-3">
                                            <div className="text-secondary small fw-bold" style={{ minWidth: "55px" }}>
                                                {star} Stars
                                            </div>
                                            <div className="progress flex-grow-1 rounded-pill" style={{ height: "10px" }}>
                                                <div
                                                    className="progress-bar rounded-pill"
                                                    style={{
                                                        width: `${percent}%`,
                                                        backgroundColor: "#0f766e",
                                                    }}
                                                ></div>
                                            </div>
                                            <div className="text-muted small text-end" style={{ minWidth: "40px" }}>
                                                {count}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="p-3 bg-light rounded-4 border">
                                <h6 className="fw-bold text-dark mb-1">Authentic Community Standards</h6>
                                <p className="text-secondary small mb-0">
                                    Every review on PetWorld comes from verified registered customers. We ensure all reviews reflect true adoption and care experiences.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
                    <div className="row g-3 align-items-center justify-content-between">
                        <div className="col-12 col-md-5">
                            <input
                                type="text"
                                className="form-control rounded-pill px-3"
                                placeholder="Search by pet name, reviewer, or keyword..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="col-12 col-md-7 d-flex flex-wrap gap-2 justify-content-md-end">
                            <button
                                type="button"
                                onClick={() => setFilterRating("all")}
                                className={`btn btn-sm rounded-pill px-3 fw-semibold ${filterRating === "all" ? "btn-success" : "btn-outline-secondary"
                                    }`}
                                style={filterRating === "all" ? { backgroundColor: "#0f766e", borderColor: "#0f766e" } : {}}
                            >
                                All Reviews ({totalReviews})
                            </button>
                            {[5, 4, 3, 2, 1].map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setFilterRating(String(s))}
                                    className={`btn btn-sm rounded-pill px-3 fw-semibold ${filterRating === String(s) ? "btn-success" : "btn-outline-secondary"
                                        }`}
                                    style={filterRating === String(s) ? { backgroundColor: "#0f766e", borderColor: "#0f766e" } : {}}
                                >
                                    {s} ★ ({starCounts[s] || 0})
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-success" role="status">
                            <span className="visually-hidden">Loading reviews...</span>
                        </div>
                    </div>
                ) : filteredReviews.length === 0 ? (
                    <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white">
                        <div className="display-4 text-muted mb-2">💬</div>
                        <h5 className="fw-bold text-dark mb-1">No Reviews Found</h5>
                        <p className="text-muted small mb-0">
                            No customer feedback matches your filter criteria. Be the first to add your review!
                        </p>
                    </div>
                ) : (
                    <div className="row g-4">
                        {filteredReviews.map((rev) => {
                            const isOwner = currentUser && (currentUser.id === rev.user_id || currentUser.email === rev.user_email);
                            return (
                                <div key={rev.id} className="col-12 col-md-6 col-lg-4">
                                    <div className="card h-100 border-0 shadow-sm rounded-4 p-4 bg-white d-flex flex-column">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div className="d-flex align-items-center gap-2">
                                                <div
                                                    className="rounded-circle text-white fw-bold d-flex align-items-center justify-content-center"
                                                    style={{ width: "40px", height: "40px", backgroundColor: "#0f766e" }}
                                                >
                                                    {(rev.user_name || "C")[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="fw-bold text-dark small">
                                                        {rev.user_name || "Verified Customer"}
                                                    </div>
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

                                        <div className="mb-2">
                                            <Link
                                                to={`/pets/${rev.product}`}
                                                className="badge bg-light text-dark border text-decoration-none px-2 py-1"
                                                title="View pet companion"
                                            >
                                                🐾 {rev.product_name}
                                            </Link>
                                            {isOwner && (
                                                <span className="badge bg-success bg-opacity-10 text-success ms-2">
                                                    Your Review
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-secondary small flex-grow-1 mb-3" style={{ whiteSpace: "pre-line" }}>
                                            {rev.comment || "Rated without additional written feedback."}
                                        </p>

                                        {isOwner && (
                                            <div className="d-flex gap-2 pt-2 border-top mt-auto">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditClick(rev)}
                                                    className="btn btn-outline-secondary btn-sm rounded-pill px-3 fw-semibold flex-grow-1"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteFeedback(rev.id)}
                                                    className="btn btn-outline-danger btn-sm rounded-pill px-3 fw-semibold flex-grow-1"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
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
                                    <Link to="/feedback" className="text-decoration-none text-secondary">
                                        Customer Feedback
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

export default Feedback;

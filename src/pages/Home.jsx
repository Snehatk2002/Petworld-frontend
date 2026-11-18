import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import Navbar from "./Navbar.jsx";
import { addToCart, getCartCount, subscribeToCart } from "../utils/cart.js";

const categoryMeta = {
    dogs: { emoji: "🐶", desc: "Loyal puppies and companion dogs" },
    cats: { emoji: "🐱", desc: "Playful kittens and friendly cats" },
    birds: { emoji: "🦜", desc: "Friendly birds and parrot pairs" },
};

const PET_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='45%25' font-size='80' text-anchor='middle' dominant-baseline='middle'%3E🐾%3C/text%3E%3Ctext x='50%25' y='72%25' font-size='22' fill='%2394a3b8' text-anchor='middle' font-family='sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E";

function Home() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [cartCount, setCartCount] = useState(getCartCount());
    const [categories, setCategories] = useState([]);
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [loadingProducts, setLoadingProducts] = useState(true);

    const [user, setUser] = useState(() => {
        const savedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
        try {
            return savedUser ? JSON.parse(savedUser) : null;
        } catch {
            return null;
        }
    });

    useEffect(() => {
        const unsubscribe = subscribeToCart((_, count) => setCartCount(count));
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const savedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
        try {
            setUser(savedUser ? JSON.parse(savedUser) : null);
        } catch {
            setUser(null);
        }

        const fetchCategories = async () => {
            setLoadingCategories(true);
            try {
                const res = await axios.get("http://127.0.0.1:8000/api/pets/categories/");
                const data = res.data?.results || res.data;
                if (Array.isArray(data)) {
                    const valid = ["dogs", "cats", "birds"];
                    const mapped = data
                        .filter((c) => valid.includes((c.name || "").toLowerCase()))
                        .map((c) => {
                            const key = (c.name || "").toLowerCase();
                            const meta = categoryMeta[key] || { emoji: "🐾", desc: "Loving companion pets" };
                            return {
                                id: c.id,
                                name: c.name,
                                tag: c.name,
                                emoji: meta.emoji,
                                desc: typeof c.pets_count === "number" ? `${c.pets_count} pets available` : meta.desc,
                            };
                        });
                    setCategories(mapped);
                } else {
                    setCategories([]);
                }
            } catch {
                setCategories([]);
            } finally {
                setLoadingCategories(false);
            }
        };

        const fetchProducts = async () => {
            setLoadingProducts(true);
            try {
                const res = await axios.get("http://127.0.0.1:8000/api/pets/items/");
                const items = res.data?.results || res.data;
                if (Array.isArray(items)) {
                    const formatted = items.map((p) => ({
                        id: p.id,
                        name: p.name,
                        category_name: p.category_name || "General",
                        price: parseFloat(p.price || 0),
                        stock: parseInt(p.stock, 10) || 0,
                        image: p.image
                            ? (p.image.startsWith("http") ? p.image : `http://127.0.0.1:8000${p.image}`)
                            : PET_PLACEHOLDER,
                    }));
                    setFeaturedProducts(formatted.slice(0, 8));
                } else {
                    setFeaturedProducts([]);
                }
            } catch {
                setFeaturedProducts([]);
            } finally {
                setLoadingProducts(false);
            }
        };

        fetchCategories();
        fetchProducts();
    }, []);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/pets?search=${encodeURIComponent(searchTerm.trim())}`);
        } else {
            navigate("/pets");
        }
    };

    const handleAddToCartClick = (e, product) => {
        e.stopPropagation();
        const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
        if (!user || !token) {
            toast.info("Please sign in to add items to your cart.");
            navigate("/login", { state: { returnUrl: "/" } });
            return;
        }
        if (product.stock <= 0) {
            toast.warning(`"${product.name}" is currently out of stock.`);
            return;
        }
        addToCart(product, 1);
        toast.success(`"${product.name}" added to cart! 🐾`, {
            icon: "🛒"
        });
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
                        <div className="col-lg-7">
                            <span className="badge bg-white text-dark px-3 py-2 rounded-pill fw-semibold mb-3 shadow-sm">
                                🐾 Pure Love For Every Companion
                            </span>
                            <h1 className="display-4 fw-bold mb-3">
                                Everything Your Pet Loves, Right Here
                            </h1>
                            <p className="lead text-white-50 mb-4">
                                Discover loving companions, healthy pets, and essential care handpicked for your dogs, cats, and birds.
                            </p>

                            <form onSubmit={handleSearchSubmit} className="bg-white p-2 rounded-pill shadow-lg d-flex align-items-center" style={{ maxWidth: "560px" }}>
                                <span className="ps-3 text-muted">🔍</span>
                                <input
                                    type="text"
                                    className="form-control border-0 shadow-none bg-transparent ps-2"
                                    placeholder="Search dogs, cats, birds, breeds..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    className="btn btn-primary rounded-pill px-4 fw-semibold"
                                    style={{ background: "#0f766e", border: "none" }}
                                >
                                    Search
                                </button>
                            </form>
                        </div>

                        <div className="col-lg-5 text-center">
                            <img
                                src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=700&auto=format&fit=crop&q=80"
                                alt="Happy pet companion"
                                className="img-fluid rounded-4 shadow-lg border border-3 border-white"
                                style={{ maxHeight: "360px", objectFit: "cover", width: "100%" }}
                            />
                        </div>
                    </div>
                </div>
            </header>

            <section className="bg-white py-3 border-bottom shadow-sm">
                <div className="container">
                    <div className="row text-center g-3">
                        <div className="col-6 col-md-3">
                            <div className="d-flex align-items-center justify-content-center gap-2">
                                <span className="fs-4">🚚</span>
                                <div className="text-start">
                                    <div className="fw-bold small">Free Delivery</div>
                                    <div className="text-muted" style={{ fontSize: "12px" }}>Safe doorstep transport</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-6 col-md-3">
                            <div className="d-flex align-items-center justify-content-center gap-2">
                                <span className="fs-4">🛡</span>
                                <div className="text-start">
                                    <div className="fw-bold small">100% Health Checked</div>
                                    <div className="text-muted" style={{ fontSize: "12px" }}>Vaccinated & healthy companions</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-6 col-md-3">
                            <div className="d-flex align-items-center justify-content-center gap-2">
                                <span className="fs-4">🔄</span>
                                <div className="text-start">
                                    <div className="fw-bold small">Ethical Adoptions</div>
                                    <div className="text-muted" style={{ fontSize: "12px" }}>Certified breeders & shelters</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-6 col-md-3">
                            <div className="d-flex align-items-center justify-content-center gap-2">
                                <span className="fs-4">🩺</span>
                                <div className="text-start">
                                    <div className="fw-bold small">Vet Verified</div>
                                    <div className="text-muted" style={{ fontSize: "12px" }}>Professional medical care</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="container py-5">
                <div className="text-center mb-5">
                    <span className="badge bg-success bg-opacity-10 text-success fw-bold px-3 py-2 rounded-pill mb-2">
                        CATEGORIES
                    </span>
                    <h2 className="fw-bold">Explore by Pet Companion</h2>
                    <p className="text-muted small">Choose your favorite category to find your next companion</p>
                </div>

                {loadingCategories ? (
                    <div className="text-center py-4">
                        <div className="spinner-border text-success" role="status">
                            <span className="visually-hidden">Loading categories...</span>
                        </div>
                    </div>
                ) : categories.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                        No categories found.
                    </div>
                ) : (
                    <div className="row g-4 justify-content-center">
                        {categories.map((cat) => (
                            <div key={cat.id || cat.name} className="col-12 col-md-4">
                                <Link
                                    to={`/pets?category=${encodeURIComponent(cat.tag)}`}
                                    className="card h-100 border-0 rounded-4 shadow-sm p-4 text-decoration-none text-dark d-flex flex-column align-items-center text-center"
                                    style={{ transition: "transform 0.2s ease", backgroundColor: "#ffffff" }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "translateY(-4px)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "none";
                                    }}
                                >
                                    <span className="display-4 mb-3">{cat.emoji}</span>
                                    <h5 className="fw-bold mb-1">{cat.name}</h5>
                                    <p className="text-muted small mb-3">{cat.desc}</p>
                                    <span className="btn btn-sm btn-outline-success rounded-pill px-3 mt-auto">
                                        Explore {cat.name} →
                                    </span>
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="bg-white py-5 border-top">
                <div className="container">
                    <div className="mb-4">
                        <span className="badge bg-primary bg-opacity-10 text-primary fw-bold px-3 py-2 rounded-pill mb-2">
                            FEATURED PETS
                        </span>
                        <h2 className="fw-bold mb-0">Available Companions</h2>
                    </div>

                    {loadingProducts ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-success" role="status">
                                <span className="visually-hidden">Loading pets...</span>
                            </div>
                        </div>
                    ) : featuredProducts.length === 0 ? (
                        <div className="text-center py-5">
                            <p className="text-muted fs-5 mb-3">No pets currently available in the catalogue.</p>
                            <Link to="/pets" className="btn btn-outline-success rounded-pill px-4">
                                Browse All Pets
                            </Link>
                        </div>
                    ) : (
                        <div className="row g-4">
                            {featuredProducts.map((product) => (
                                <div key={product.id} className="col-12 col-sm-6 col-lg-3">
                                    <div
                                        className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden position-relative product-card"
                                        style={{
                                            cursor: "pointer",
                                            transition: "transform 0.2s ease, box-shadow 0.2s ease",
                                        }}
                                        onClick={() => navigate(`/pets/${product.id}`)}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = "translateY(-4px)";
                                            e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.1)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = "none";
                                            e.currentTarget.style.boxShadow = "";
                                        }}
                                    >
                                        <span
                                            className={`position-absolute top-0 start-0 m-3 badge rounded-pill shadow-sm z-2 ${
                                                product.stock > 0 ? "bg-success" : "bg-secondary"
                                            }`}
                                        >
                                            {product.stock > 0
                                                ? product.stock <= 3
                                                    ? `Only ${product.stock} left`
                                                    : "Available"
                                                : "Out of Stock"}
                                        </span>

                                        <div className="overflow-hidden" style={{ height: "200px" }}>
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="w-100 h-100"
                                                style={{ objectFit: "cover", transition: "transform 0.3s ease" }}
                                                loading="lazy"
                                            />
                                        </div>

                                        <div className="card-body d-flex flex-column p-3">
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <span className="badge bg-light text-secondary border small">
                                                    {product.category_name}
                                                </span>
                                                <span className="small text-muted">
                                                    Stock: <strong className="text-dark">{product.stock}</strong>
                                                </span>
                                            </div>

                                            <h5 className="card-title fw-bold fs-6 mb-2 text-dark text-truncate" title={product.name}>
                                                <Link
                                                    to={`/pets/${product.id}`}
                                                    className="text-decoration-none text-dark hover-underline"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {product.name}
                                                </Link>
                                            </h5>

                                            <div className="mt-auto pt-2">
                                                <div className="d-flex align-items-baseline justify-content-between mb-3">
                                                    <span className="fs-5 fw-bold text-success">
                                                        ${product.price.toFixed(2)}
                                                    </span>
                                                    <span className="text-muted small">
                                                        Details →
                                                    </span>
                                                </div>

                                                <div className="d-flex gap-2">
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-dark flex-grow-1 rounded-3 py-2 fw-semibold d-flex align-items-center justify-content-center gap-1 small"
                                                        disabled={product.stock <= 0}
                                                        onClick={(e) => handleAddToCartClick(e, product)}
                                                    >
                                                        <span>+</span> Add to Cart
                                                    </button>
                                                    <Link
                                                        to={`/pets/${product.id}`}
                                                        className="btn btn-success rounded-3 px-3 py-2 fw-semibold d-flex align-items-center justify-content-center text-white text-decoration-none small"
                                                        style={{ backgroundColor: "#0f766e", border: "none" }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        View
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="text-center mt-5 pt-3">
                        <Link
                            to="/pets"
                            className="btn btn-success btn-lg rounded-pill px-5 fw-bold shadow-sm"
                            style={{ background: "#0f766e", border: "none" }}
                        >
                            Explore More Pets →
                        </Link>
                    </div>
                </div>
            </section>

            <footer className="bg-dark text-white pt-5 pb-4 mt-auto" id="about">
                <div className="container">
                    <div className="row g-4 pb-4 border-bottom border-secondary">
                        <div className="col-12 col-md-4">
                            <div className="d-flex align-items-center gap-2 fw-bold fs-4 mb-2">
                                <span>🐾</span> PetWorld
                            </div>
                            <p className="text-secondary small">
                                The trusted all-in-one platform for pet nutrition, habitat gear, and healthy companion pets.
                            </p>
                        </div>
                        <div className="col-6 col-md-4">
                            <h6 className="fw-bold mb-3 text-white">Quick Links</h6>
                            <ul className="list-unstyled small text-secondary d-flex flex-column gap-2 mb-0">
                                <li><Link to="/" className="text-decoration-none text-secondary">Home</Link></li>
                                <li><Link to="/pets" className="text-decoration-none text-secondary">Browse Pets</Link></li>
                                <li><Link to="/admin" className="text-decoration-none text-secondary">Admin Portal</Link></li>
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
                        &copy; {new Date().getFullYear()} PetWorld Full-Stack E-Commerce Platform.
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default Home;

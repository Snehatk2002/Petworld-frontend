import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import Navbar from "./Navbar.jsx";
import { addToCart, getCartCount, subscribeToCart } from "../utils/cart.js";

const fallbackCategories = [
    { id: "all", name: "All Categories" },
    { id: "Dogs", name: "Dogs" },
    { id: "Cats", name: "Cats" },
    { id: "Birds", name: "Birds" }
];

const PET_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='45%25' font-size='80' text-anchor='middle' dominant-baseline='middle'%3E🐾%3C/text%3E%3Ctext x='50%25' y='72%25' font-size='22' fill='%2394a3b8' text-anchor='middle' font-family='sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E";



const Products = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [products, setProducts] = useState([]);
    const [categoriesList, setCategoriesList] = useState(fallbackCategories);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
    const [inStockOnly, setInStockOnly] = useState(false);
    const [maxPrice, setMaxPrice] = useState("");
    const [sortBy, setSortBy] = useState("newest");
    const [cartCount, setCartCount] = useState(getCartCount());

    useEffect(() => {
        const unsubscribe = subscribeToCart((_, count) => setCartCount(count));
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const catParam = searchParams.get("category") || "all";
        const searchParam = searchParams.get("search") || "";
        setSelectedCategory(catParam);
        setSearchTerm(searchParam);
        setCurrentPage(1);
    }, [searchParams]);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const user = (() => {
        try {
            const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    })();

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await axios.get("http://127.0.0.1:8000/api/pets/categories/");
                const data = res.data?.results || res.data;
                if (Array.isArray(data) && data.length > 0) {
                    const valid = ["dogs", "cats", "birds"];
                    const filtered = data.filter((c) => valid.includes((c.name || "").toLowerCase()));
                    if (filtered.length > 0) {
                        setCategoriesList([{ id: "all", name: "All Categories" }, ...filtered]);
                    } else {
                        setCategoriesList(fallbackCategories);
                    }
                } else {
                    setCategoriesList(fallbackCategories);
                }
            } catch {
                setCategoriesList(fallbackCategories);
            }
        };

        const fetchProducts = async () => {
            setLoading(true);
            try {
                const res = await axios.get("http://127.0.0.1:8000/api/pets/items/");
                const data = res.data?.results || res.data;
                if (Array.isArray(data) && data.length > 0) {
                    const formatted = data.map((p, idx) => ({
                        id: p.id,
                        name: p.name,
                        category_name: p.category_name || "General",
                        price: parseFloat(p.price),
                        stock: p.stock,
                        rating: (4.5 + (idx % 5) * 0.1).toFixed(1),
                        reviewsCount: 20 + idx * 11,
                        image: p.image
                            ? (p.image.startsWith("http") ? p.image : `http://127.0.0.1:8000${p.image}`)
                            : PET_PLACEHOLDER
                    }));
                    setProducts(formatted);
                } else {
                    setProducts([]);
                }
            } catch {
                setProducts([]);
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
        fetchProducts();
    }, []);

    const handleAddToCartClick = (e, product) => {
        e.stopPropagation();
        const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
        if (!user || !token) {
            toast.info("Please sign in to add items to your cart.");
            navigate("/login", { state: { returnUrl: "/pets" } });
            return;
        }
        addToCart(product, 1);
        toast.success(`"${product.name}" added to cart! 🐾`, {
            icon: "🛒"
        });
    };

    const handleResetFilters = () => {
        setSearchTerm("");
        setSelectedCategory("all");
        setInStockOnly(false);
        setMaxPrice("");
        setSortBy("newest");
        setSearchParams({});
    };

    const filteredList = products
        .filter((item) => {
            const matchesSearch =
                !searchTerm.trim() ||
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.category_name.toLowerCase().includes(searchTerm.toLowerCase());

            const selectedCat = (selectedCategory || "").toLowerCase().trim();
            const itemCat = (item.category_name || "").toLowerCase().trim();

            const matchesCategory =
                selectedCat === "all" ||
                itemCat === selectedCat ||
                itemCat.includes(selectedCat) ||
                selectedCat.includes(itemCat) ||
                (selectedCat.startsWith("dog") && itemCat.startsWith("dog")) ||
                (selectedCat.startsWith("cat") && itemCat.startsWith("cat")) ||
                (selectedCat.startsWith("bird") && itemCat.startsWith("bird")) ||
                (selectedCat.includes("fish") && itemCat.includes("fish"));

            const matchesStock = !inStockOnly || item.stock > 0;

            const matchesPrice = !maxPrice || item.price <= parseFloat(maxPrice);

            return matchesSearch && matchesCategory && matchesStock && matchesPrice;
        })
        .sort((a, b) => {
            if (sortBy === "price-low") return a.price - b.price;
            if (sortBy === "price-high") return b.price - a.price;
            return b.id - a.id;
        });

    const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
    const paginatedProducts = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "#f8fafc", color: "#1e293b" }}>
            <Navbar cartCount={cartCount} />

            <header
                className="py-4 text-white"
                style={{
                    background: "linear-gradient(135deg, #0f766e 0%, #1e3a8a 100%)"
                }}
            >
                <div className="container">
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb mb-2 small text-white-50">
                            <li className="breadcrumb-item">
                                <Link to="/" className="text-white-50 text-decoration-none">Home</Link>
                            </li>
                            <li className="breadcrumb-item active text-white" aria-current="page">Products</li>
                        </ol>
                    </nav>
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                        <div>
                            <h2 className="fw-bold mb-1">Pet Supplies & Health Catalog</h2>
                            <p className="mb-0 text-white-50 small">
                                Showing {filteredList.length} premium products available for instant order
                            </p>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-white bg-opacity-25 px-3 py-2 rounded-pill small">
                                🚚 Free Shipping above $49
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container py-4 flex-grow-1">
                <div className="row g-4">
                    <aside className="col-12 col-lg-3">
                        <div className="card border-0 shadow-sm rounded-4 p-4 sticky-top" style={{ top: "85px", backgroundColor: "#ffffff", zIndex: 10 }}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="fw-bold mb-0">Filters</h5>
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="btn btn-sm btn-link text-decoration-none text-muted p-0 small"
                                >
                                    Reset
                                </button>
                            </div>

                            <div className="mb-4">
                                <label className="form-label small fw-semibold text-secondary">Search Products</label>
                                <div className="input-group input-group-sm">
                                    <span className="input-group-text bg-light border-end-0">🔍</span>
                                    <input
                                        type="text"
                                        className="form-control bg-light border-start-0"
                                        placeholder="Food, Bed, Toys..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchTerm("")}
                                            className="btn btn-outline-secondary border"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="form-label small fw-semibold text-secondary mb-2">Category</label>
                                <div className="d-flex flex-column gap-2">
                                    {categoriesList.map((cat) => {
                                        const sel = (selectedCategory || "all").toLowerCase().trim();
                                        const cName = (cat.name || "").toLowerCase().trim();
                                        const isChecked =
                                            cat.id === "all" || cName === "all"
                                                ? sel === "all"
                                                : sel === cName ||
                                                  (sel.startsWith("dog") && cName.startsWith("dog")) ||
                                                  (sel.startsWith("cat") && cName.startsWith("cat")) ||
                                                  (sel.startsWith("bird") && cName.startsWith("bird"));

                                        return (
                                            <div key={cat.id || cat.name} className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    name="categoryRadio"
                                                    id={`cat-${cat.id}`}
                                                    checked={isChecked}
                                                    onChange={() => {
                                                        const next = cat.id === "all" ? "all" : cat.name;
                                                        setSelectedCategory(next);
                                                        setSearchParams(next === "all" ? {} : { category: next });
                                                    }}
                                                />
                                                <label className="form-check-label small text-secondary" htmlFor={`cat-${cat.id}`}>
                                                    {cat.name}
                                                </label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="form-label small fw-semibold text-secondary mb-2">Price Limit ($)</label>
                                <div className="d-flex align-items-center gap-2">
                                    <input
                                        type="number"
                                        className="form-control form-control-sm"
                                        placeholder="Max Price"
                                        value={maxPrice}
                                        onChange={(e) => setMaxPrice(e.target.value)}
                                    />
                                    {maxPrice && (
                                        <button
                                            type="button"
                                            onClick={() => setMaxPrice("")}
                                            className="btn btn-sm btn-outline-secondary"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="mb-3">
                                <div className="form-check form-switch">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="inStockCheck"
                                        checked={inStockOnly}
                                        onChange={(e) => setInStockOnly(e.target.checked)}
                                    />
                                    <label className="form-check-label small fw-semibold text-secondary" htmlFor="inStockCheck">
                                        In Stock Items Only
                                    </label>
                                </div>
                            </div>
                        </div>
                    </aside>

                    <section className="col-12 col-lg-9">
                        <div className="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-white">
                            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                                <span className="text-secondary small fw-medium">
                                    Showing <strong>{filteredList.length}</strong> items
                                </span>

                                <div className="d-flex align-items-center gap-2">
                                    <label className="small text-secondary fw-semibold text-nowrap mb-0">Sort By:</label>
                                    <select
                                        className="form-select form-select-sm"
                                        style={{ width: "170px" }}
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                    >
                                        <option value="newest">Newest Arrivals</option>
                                        <option value="price-low">Price: Low to High</option>
                                        <option value="price-high">Price: High to Low</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-success" role="status">
                                    <span className="visually-hidden">Loading products...</span>
                                </div>
                                <p className="text-muted mt-2 small">Loading catalog from server...</p>
                            </div>
                        ) : filteredList.length === 0 ? (
                            <div className="text-center py-5 bg-white rounded-4 shadow-sm border">
                                <div className="display-4 mb-3">🐾</div>
                                <h4 className="fw-bold">No Pets Found</h4>
                                <p className="text-muted small">No pets have been added yet, or none match your filters.</p>
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="btn btn-primary rounded-pill px-4 btn-sm fw-semibold"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="row g-4">
                                    {paginatedProducts.map((product) => (
                                        <div key={product.id} className="col-12 col-sm-6 col-xl-4">
                                            <div
                                                className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden position-relative bg-white"
                                                style={{ cursor: "pointer", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
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
                                                {product.stock <= 5 && (
                                                    <span className="position-absolute top-0 end-0 m-2 badge bg-warning text-dark shadow-sm z-2">
                                                        {product.stock === 0 ? "Out of Stock" : "Low Stock"}
                                                    </span>
                                                )}

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
                                                            ★ {product.rating} ({product.reviewsCount})
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
                                                        <div className="d-flex align-items-baseline gap-2 mb-3">
                                                            <span className="fs-5 fw-bold text-success">
                                                                ${product.price.toFixed(2)}
                                                            </span>
                                                            <span className="text-muted small">
                                                                ({product.stock > 0 ? `${product.stock} in stock` : "Unavailable"})
                                                            </span>
                                                        </div>

                                                        <div className="d-flex gap-2">
                                                            <button
                                                                type="button"
                                                                disabled={product.stock === 0}
                                                                className="btn btn-outline-dark flex-grow-1 rounded-3 py-2 fw-semibold d-flex align-items-center justify-content-center gap-1 small"
                                                                onClick={(e) => handleAddToCartClick(e, product)}
                                                            >
                                                                <span>+</span> {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
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

                                {totalPages > 1 && (
                                    <div className="d-flex justify-content-center align-items-center gap-2 mt-5">
                                        <button
                                            type="button"
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            className="btn btn-outline-secondary btn-sm px-3 rounded-pill"
                                        >
                                            ← Previous
                                        </button>
                                        <span className="text-secondary small px-2">
                                            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                                        </span>
                                        <button
                                            type="button"
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            className="btn btn-outline-secondary btn-sm px-3 rounded-pill"
                                        >
                                            Next →
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                </div>
            </main>

            <footer className="bg-dark text-white pt-5 pb-4 mt-auto">
                <div className="container">
                    <div className="row g-4 pb-4 border-bottom border-secondary">
                        <div className="col-12 col-md-4">
                            <div className="d-flex align-items-center gap-2 fw-bold fs-4 mb-2">
                                <span>🐾</span> PetWorld
                            </div>
                            <p className="text-secondary small">
                                Premium pet foods, accessories, toys, and care essentials for happy and healthy pets.
                            </p>
                        </div>
                        <div className="col-6 col-md-4">
                            <h6 className="fw-bold mb-3 text-white">Explore</h6>
                            <ul className="list-unstyled small text-secondary d-flex flex-column gap-2 mb-0">
                                <li><Link to="/" className="text-decoration-none text-secondary">Home</Link></li>
                                <li><Link to="/pets" className="text-decoration-none text-secondary">All Pets</Link></li>
                                <li><Link to="/admin" className="text-decoration-none text-secondary">Staff Admin Console</Link></li>
                            </ul>
                        </div>
                        <div className="col-6 col-md-4">
                            <h6 className="fw-bold mb-3 text-white">Support</h6>
                            <ul className="list-unstyled small text-secondary d-flex flex-column gap-2 mb-0">
                                <li>Email: support@petworld.com</li>
                                <li>Hours: Mon – Sat, 9am – 7pm</li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-3 text-center text-secondary small">
                        &copy; {new Date().getFullYear()} PetWorld Inc. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Products;

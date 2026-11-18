import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import axiosAdmin from "../utils/axiosAdmin";
import { toast } from "react-toastify";

const AdminPets = () => {
    const navigate = useNavigate();

    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedStockStatus, setSelectedStockStatus] = useState("all");

    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    const [formData, setFormData] = useState({
        name: "",
        category: "Dogs",
        price: "",
        stock: "",
        description: ""
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const fetchProducts = async () => {
        try {
            const res = await axiosAdmin.get("/api/pets/items/");
            const items = res.data?.results || res.data;
            if (Array.isArray(items)) {
                const formatted = items.map((p) => ({
                    id: p.id,
                    name: p.name,
                    category: p.category_name || "General",
                    price: parseFloat(p.price),
                    stock: p.stock,
                    status: p.stock === 0 ? "Out of Stock" : p.stock <= 5 ? "Low Stock" : "In Stock",
                    description: p.description || ""
                }));
                setProducts(formatted);
            }
        } catch {
            setProducts([]);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleLogout = () => {
        sessionStorage.removeItem("access_token");
        localStorage.removeItem("access_token");
        sessionStorage.removeItem("user");
        localStorage.removeItem("user");
        toast.info("Signed out of Admin Console");
        navigate("/admin");
    };

    const handleOpenAddModal = () => {
        setEditingProduct(null);
        setFormData({ name: "", category: "Dogs", price: "", stock: "", description: "" });
        setImageFile(null);
        setImagePreview(null);
        setShowModal(true);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleOpenEditModal = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            category: product.category,
            price: product.price.toString(),
            stock: product.stock.toString(),
            description: product.description || ""
        });
        setImageFile(null);
        setImagePreview(product.image || null);
        setShowModal(true);
    };

    const handleDeleteProduct = async (productId) => {
        const confirmed = window.confirm("Are you sure you want to delete this product?");
        if (confirmed) {
            try {
                await axiosAdmin.delete(`/api/pets/items/${productId}/`);
                setProducts(products.filter((p) => p.id !== productId));
                toast.success("Product removed from catalog");
            } catch {
                toast.error("Failed to delete product from server");
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim() || !formData.price || formData.stock === "") {
            toast.error("Please fill in all required fields");
            return;
        }

        const priceNum = parseFloat(formData.price);
        const stockNum = parseInt(formData.stock, 10);

        if (isNaN(priceNum) || priceNum < 0) {
            toast.error("Price must be a valid positive number");
            return;
        }
        if (isNaN(stockNum) || stockNum < 0) {
            toast.error("Stock must be 0 or higher");
            return;
        }

        // Build multipart FormData so image file can be uploaded
        const fd = new FormData();
        fd.append("name", formData.name.trim());
        fd.append("category", formData.category);
        fd.append("price", priceNum);
        fd.append("stock", stockNum);
        fd.append("description", formData.description);
        if (imageFile) fd.append("image", imageFile);
        fd.append("is_active", "true");

        try {
            if (editingProduct) {
                const res = await axiosAdmin.put(
                    `/api/pets/items/${editingProduct.id}/`,
                    fd
                );
                const updated = res.data;
                setProducts(products.map((p) =>
                    p.id === editingProduct.id
                        ? {
                            id: updated.id,
                            name: updated.name,
                            category: updated.category_name || formData.category,
                            price: parseFloat(updated.price),
                            stock: updated.stock,
                            status: updated.stock === 0 ? "Out of Stock" : updated.stock <= 5 ? "Low Stock" : "In Stock",
                            description: updated.description || "",
                            image: updated.image || null
                        }
                        : p
                ));
                toast.success("Pet updated successfully!");
            } else {
                const res = await axiosAdmin.post(
                    "/api/pets/items/",
                    fd
                );
                const created = res.data;
                setProducts([{
                    id: created.id,
                    name: created.name,
                    category: created.category_name || formData.category,
                    price: parseFloat(created.price),
                    stock: created.stock,
                    status: created.stock === 0 ? "Out of Stock" : created.stock <= 5 ? "Low Stock" : "In Stock",
                    description: created.description || "",
                    image: created.image || null
                }, ...products]);
                toast.success("New pet added to catalog!");
            }
            setShowModal(false);
        } catch (err) {
            const errorMsg = err.response?.data?.detail || "Failed to save pet. Please try again.";
            toast.error(errorMsg);
        }
    };

    const filteredProducts = products.filter((p) => {
        const matchesSearch =
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.id.toString().includes(searchTerm);

        const matchesCategory =
            selectedCategory === "all" || p.category.toLowerCase() === selectedCategory.toLowerCase();

        let matchesStock = true;
        if (selectedStockStatus === "instock") {
            matchesStock = p.stock > 5;
        } else if (selectedStockStatus === "lowstock") {
            matchesStock = p.stock > 0 && p.stock <= 5;
        } else if (selectedStockStatus === "outofstock") {
            matchesStock = p.stock === 0;
        }

        return matchesSearch && matchesCategory && matchesStock;
    });

    return (
        <div className="container-fluid p-0 d-flex min-vh-100" style={{ backgroundColor: "#0b0f19", color: "#f3f4f6" }}>
            <aside
                className="d-flex flex-column justify-content-between p-3 border-end"
                style={{
                    width: "260px",
                    backgroundColor: "#0f172a",
                    borderColor: "rgba(255, 255, 255, 0.08)",
                    minHeight: "100vh"
                }}
            >
                <div>
                    <div className="d-flex align-items-center gap-2 px-2 py-3 mb-3 border-bottom border-secondary border-opacity-25">
                        <div
                            className="rounded-3 d-flex align-items-center justify-content-center shadow-sm"
                            style={{
                                width: "42px",
                                height: "42px",
                                background: "linear-gradient(135deg, #10b981 0%, #0d6efd 100%)",
                                fontSize: "22px"
                            }}
                        >
                            🐾
                        </div>
                        <div>
                            <h5 className="fw-bold mb-0 text-white">PetWorld</h5>
                            <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-25 py-0 px-2" style={{ fontSize: "10px" }}>
                                ADMIN PANEL
                            </span>
                        </div>
                    </div>

                    <nav className="nav flex-column gap-1">
                        <Link
                            to="/admin/dashboard"
                            className="nav-link text-start text-secondary rounded-3 px-3 py-2 d-flex align-items-center gap-2"
                            style={{ fontSize: "14px", fontWeight: "500" }}
                        >
                            <span>📊</span>
                            <span>Dashboard Overview</span>
                        </Link>

                        <Link
                            to="/admin/pets"
                            className="nav-link text-start bg-primary text-white rounded-3 px-3 py-2 d-flex align-items-center gap-2 shadow-sm"
                            style={{ fontSize: "14px", fontWeight: "500" }}
                        >
                            <span>🐶</span>
                            <span>Pets Catalog</span>
                        </Link>

                        <Link
                            to="/admin/orders"
                            className="nav-link text-start text-secondary rounded-3 px-3 py-2 d-flex align-items-center gap-2"
                            style={{ fontSize: "14px", fontWeight: "500" }}
                        >
                            <span>📦</span>
                            <span>Orders Management</span>
                        </Link>

                        <Link
                            to="/admin/feedback"
                            className="nav-link text-start text-secondary rounded-3 px-3 py-2 d-flex align-items-center gap-2"
                            style={{ fontSize: "14px", fontWeight: "500" }}
                        >
                            <span>💬</span>
                            <span>Customer Feedbacks</span>
                        </Link>

                        <Link
                            to="/admin/users"
                            className="nav-link text-start text-secondary rounded-3 px-3 py-2 d-flex align-items-center gap-2"
                            style={{ fontSize: "14px", fontWeight: "500" }}
                        >
                            <span>👥</span>
                            <span>User Accounts</span>
                        </Link>

                        <Link
                            to="/"
                            className="nav-link text-start text-secondary rounded-3 px-3 py-2 d-flex align-items-center gap-2 mt-2"
                            style={{ fontSize: "14px" }}
                        >
                            <span>🛍️</span>
                            <span>Visit Storefront</span>
                        </Link>
                    </nav>
                </div>

                <div className="pt-3 border-top border-secondary border-opacity-25">
                    <div className="d-flex align-items-center gap-2 mb-3 px-2">
                        <div
                            className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-bold"
                            style={{ width: "36px", height: "36px", fontSize: "14px" }}
                        >
                            AD
                        </div>
                        <div className="overflow-hidden">
                            <div className="fw-semibold text-white small text-truncate">System Admin</div>
                            <div className="text-secondary small text-truncate" style={{ fontSize: "11px" }}>admin@petworld.com</div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="btn btn-outline-danger w-100 btn-sm py-2 rounded-3 d-flex align-items-center justify-content-center gap-2"
                        style={{ fontSize: "13px" }}
                    >
                        <span>🚪</span>
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            <main className="flex-grow-1 p-4 overflow-auto" style={{ maxHeight: "100vh" }}>
                <header className="d-flex flex-wrap justify-content-between align-items-center gap-3 pb-3 mb-4 border-bottom border-secondary border-opacity-25">
                    <div>
                        <div className="d-flex align-items-center gap-2">
                            <Link to="/admin/dashboard" className="text-secondary small text-decoration-none">
                                Admin Dashboard
                            </Link>
                            <span className="text-secondary small">/</span>
                            <span className="text-white small fw-semibold">Pets</span>
                        </div>
                        <h3 className="fw-bold text-white mb-1 mt-1">PetWorld Pets Catalog</h3>
                        <p className="text-secondary small mb-0">Manage pet inventory, stock thresholds, pricing, and category classifications</p>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                        <button
                            type="button"
                            onClick={handleOpenAddModal}
                            className="btn btn-sm text-white fw-semibold rounded-3 px-3 py-2 d-flex align-items-center gap-2 shadow-sm"
                            style={{ background: "linear-gradient(135deg, #10b981 0%, #0d6efd 100%)", fontSize: "14px" }}
                        >
                            <span>+</span>
                            <span>Add New Pet</span>
                        </button>
                    </div>
                </header>

                <div className="card border-0 rounded-4 p-3 mb-4 shadow-sm" style={{ backgroundColor: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="row g-2 align-items-center">
                        <div className="col-12 col-md-5">
                            <div className="input-group input-group-sm">
                                <span className="input-group-text bg-dark border-secondary text-secondary">
                                    🔍
                                </span>
                                <input
                                    type="text"
                                    className="form-control bg-dark border-secondary text-white"
                                    placeholder="Search product by title or ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm("")}
                                        className="btn btn-outline-secondary border-secondary text-secondary"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="col-6 col-md-3">
                            <select
                                className="form-select form-select-sm bg-dark border-secondary text-white"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="all">All Categories</option>
                                <option value="Dogs">Dogs</option>
                                <option value="Cats">Cats</option>
                                <option value="Birds">Birds</option>
                            </select>
                        </div>

                        <div className="col-6 col-md-3">
                            <select
                                className="form-select form-select-sm bg-dark border-secondary text-white"
                                value={selectedStockStatus}
                                onChange={(e) => setSelectedStockStatus(e.target.value)}
                            >
                                <option value="all">All Stock Statuses</option>
                                <option value="instock">In Stock (&gt; 5)</option>
                                <option value="lowstock">Low Stock (1-5)</option>
                                <option value="outofstock">Out of Stock (0)</option>
                            </select>
                        </div>

                        <div className="col-12 col-md-1 text-md-end">
                            <span className="badge bg-secondary bg-opacity-25 text-secondary px-2 py-1" style={{ fontSize: "12px" }}>
                                {filteredProducts.length} items
                            </span>
                        </div>
                    </div>
                </div>

                <div className="card border-0 rounded-4 shadow-sm overflow-hidden" style={{ backgroundColor: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="table-responsive">
                        <table className="table table-dark table-hover align-middle mb-0" style={{ backgroundColor: "#111827" }}>
                            <thead className="text-secondary small">
                                <tr>
                                    <th className="ps-4">PET</th>
                                    <th>CATEGORY</th>
                                    <th>UNIT PRICE</th>
                                    <th>STOCK UNITS</th>
                                    <th>STATUS</th>
                                    <th className="text-end pe-4">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className="small">
                                {filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-5 text-secondary">
                                            <div style={{ fontSize: "32px" }}>📦</div>
                                            <p className="mt-2 mb-1">No products found matching your filters.</p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearchTerm("");
                                                    setSelectedCategory("all");
                                                    setSelectedStockStatus("all");
                                                }}
                                                className="btn btn-sm btn-link text-primary text-decoration-none"
                                            >
                                                Reset Filters
                                            </button>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProducts.map((item) => (
                                        <tr key={item.id}>
                                            <td className="ps-4">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div
                                                        className="rounded-3 d-flex align-items-center justify-content-center"
                                                        style={{
                                                            width: "40px",
                                                            height: "40px",
                                                            backgroundColor: "#1f2937",
                                                            fontSize: "18px"
                                                        }}
                                                    >
                                                        🐾
                                                    </div>
                                                    <div>
                                                        <div className="fw-semibold text-white">{item.name}</div>
                                                        <div className="text-secondary" style={{ fontSize: "11px" }}>SKU: PW-{item.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge bg-secondary bg-opacity-25 text-light border border-secondary border-opacity-25 px-2 py-1">
                                                    {item.category}
                                                </span>
                                            </td>
                                            <td className="text-success fw-bold">${item.price.toFixed(2)}</td>
                                            <td>
                                                <span className="fw-semibold">{item.stock}</span> units
                                            </td>
                                            <td>
                                                <span
                                                    className={`badge rounded-pill ${item.stock === 0
                                                        ? "bg-danger"
                                                        : item.stock <= 5
                                                            ? "bg-warning text-dark"
                                                            : "bg-success"
                                                        }`}
                                                >
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="text-end pe-4">
                                                <div className="btn-group btn-group-sm">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditModal(item)}
                                                        className="btn btn-outline-primary py-1 px-2"
                                                        title="Edit Product"
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteProduct(item.id)}
                                                        className="btn btn-outline-danger py-1 px-2"
                                                        title="Delete Product"
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-3 d-flex justify-content-between align-items-center border-top border-secondary border-opacity-25 text-secondary small">
                        <span>Showing {filteredProducts.length} of {products.length} products</span>
                        <div className="d-flex align-items-center gap-2">
                            <button
                                type="button"
                                onClick={handleOpenAddModal}
                                className="btn btn-sm btn-outline-light py-1 px-3 rounded-2"
                            >
                                + Quick Add Pet
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {showModal && (
                <div
                    className="modal d-block"
                    style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
                    tabIndex="-1"
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content text-white border-0 rounded-4" style={{ backgroundColor: "#1e293b" }}>
                            <div className="modal-header border-secondary border-opacity-25">
                                <h5 className="modal-title fw-bold">
                                    {editingProduct ? "Edit Pet" : "Add New Pet"}
                                </h5>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn-close btn-close-white"
                                    aria-label="Close"
                                ></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label small text-secondary">Pet Name *</label>
                                        <input
                                            type="text"
                                            className="form-control bg-dark border-secondary text-white"
                                            placeholder="e.g. Deluxe Cat Scratching Post"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small text-secondary">Category *</label>
                                        <select
                                            className="form-select bg-dark border-secondary text-white"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        >
                                            <option value="Dogs">Dogs</option>
                                            <option value="Cats">Cats</option>
                                            <option value="Birds">Birds</option>
                                        </select>
                                    </div>

                                    <div className="row g-2 mb-3">
                                        <div className="col-6">
                                            <label className="form-label small text-secondary">Price ($) *</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-control bg-dark border-secondary text-white"
                                                placeholder="29.99"
                                                value={formData.price}
                                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small text-secondary">Stock Units *</label>
                                            <input
                                                type="number"
                                                className="form-control bg-dark border-secondary text-white"
                                                placeholder="50"
                                                value={formData.stock}
                                                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small text-secondary">Description</label>
                                        <textarea
                                            rows="3"
                                            className="form-control bg-dark border-secondary text-white"
                                            placeholder="Detailed specifications, weight, suitable breeds..."
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        ></textarea>
                                    </div>

                                    {/* Image Upload */}
                                    <div className="mb-2">
                                        <label className="form-label small text-secondary">Pet Photo</label>
                                        <label
                                            htmlFor="pet-image-upload"
                                            className="d-flex flex-column align-items-center justify-content-center gap-2 rounded-3 border border-secondary border-opacity-50 p-3"
                                            style={{
                                                cursor: "pointer",
                                                backgroundColor: "#0f172a",
                                                minHeight: "110px",
                                                transition: "border-color 0.2s"
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.borderColor = "#10b981"}
                                            onMouseLeave={(e) => e.currentTarget.style.borderColor = ""}
                                        >
                                            {imagePreview ? (
                                                <img
                                                    src={imagePreview.startsWith("blob") || imagePreview.startsWith("data") ? imagePreview : (imagePreview.startsWith("http") ? imagePreview : `http://127.0.0.1:8000${imagePreview}`)}
                                                    alt="Preview"
                                                    style={{ maxHeight: "90px", maxWidth: "100%", objectFit: "cover", borderRadius: "8px" }}
                                                />
                                            ) : (
                                                <>
                                                    <span style={{ fontSize: "28px" }}>📷</span>
                                                    <span className="text-secondary small">Click to upload pet photo</span>
                                                    <span className="text-secondary" style={{ fontSize: "11px" }}>JPG, PNG, WEBP supported</span>
                                                </>
                                            )}
                                            {imagePreview && (
                                                <span className="text-secondary" style={{ fontSize: "11px" }}>
                                                    {imageFile ? imageFile.name : "Current image"} · Click to change
                                                </span>
                                            )}
                                        </label>
                                        <input
                                            id="pet-image-upload"
                                            type="file"
                                            accept="image/*"
                                            className="d-none"
                                            onChange={handleImageChange}
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer border-secondary border-opacity-25">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="btn btn-secondary rounded-3"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-success rounded-3 fw-semibold px-4"
                                    >
                                        {editingProduct ? "Save Changes" : "Add Pet"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPets;

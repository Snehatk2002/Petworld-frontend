import axios from "axios";

const CART_STORAGE_KEY = "petworld_cart";
const API_URL = "http://127.0.0.1:8000/api/cart/";

const getAuthToken = () =>
    sessionStorage.getItem("access_token") || localStorage.getItem("access_token");

export const getCart = () => {
    try {
        const raw = localStorage.getItem(CART_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const getCartCount = () => {
    const cart = getCart();
    return cart.reduce((total, item) => total + (parseInt(item.quantity, 10) || 1), 0);
};

export const saveCart = (cart) => {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (err) {
        console.error(err);
    }
    window.dispatchEvent(new Event("cart-updated"));
};

const formatBackendItems = (items) => {
    if (!Array.isArray(items)) return [];
    return items
        .filter((bi) => bi && (bi.product_id || bi.product || bi.id))
        .map((bi) => {
            const prodId = bi.product_id || bi.product || bi.id;
            const imgPath = bi.product_image || bi.image || "";
            const fullImage = imgPath
                ? (imgPath.startsWith("http") ? imgPath : `http://127.0.0.1:8000${imgPath.startsWith("/") ? "" : "/"}${imgPath}`)
                : "";

            return {
                id: prodId,
                product_id: prodId,
                cart_item_id: bi.id,
                name: bi.product_name || bi.name || "Pet Companion",
                price: parseFloat(bi.product_price ?? bi.price ?? 0),
                image: fullImage,
                category_name: bi.product_category || bi.category_name || bi.category || "General",
                stock: typeof bi.product_stock === "number" ? bi.product_stock : (typeof bi.stock === "number" ? bi.stock : 10),
                quantity: Math.max(1, parseInt(bi.quantity, 10) || 1),
            };
        });
};

export const fetchBackendCart = async () => {
    const token = getAuthToken();
    const local = getCart();

    if (!token) {
        return local;
    }

    try {
        const res = await axios.get(API_URL, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const backendRaw = res.data?.items || [];
        const backendItems = formatBackendItems(backendRaw);

        if (local.length > 0 && backendItems.length === 0) {
            const syncPayload = {
                items: local.map((item) => ({
                    product_id: item.id || item.product_id,
                    quantity: item.quantity,
                })),
            };
            const syncRes = await axios.post(`${API_URL}sync/`, syncPayload, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const synced = formatBackendItems(syncRes.data?.items || []);
            saveCart(synced);
            return synced;
        }

        if (local.length > 0 && backendItems.length > 0) {
            const missing = local.filter(
                (l) => !backendItems.some((b) => String(b.id) === String(l.id))
            );
            if (missing.length > 0) {
                const syncPayload = {
                    items: missing.map((item) => ({
                        product_id: item.id || item.product_id,
                        quantity: item.quantity,
                    })),
                };
                const syncRes = await axios.post(`${API_URL}sync/`, syncPayload, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const synced = formatBackendItems(syncRes.data?.items || []);
                saveCart(synced);
                return synced;
            }
        }

        saveCart(backendItems);
        return backendItems;
    } catch (err) {
        return local;
    }
};

export const addToCart = async (pet, quantity = 1) => {
    const token = getAuthToken();
    const qtyToAdd = Math.max(1, parseInt(quantity, 10) || 1);

    const cart = getCart();
    const existingIndex = cart.findIndex((item) => String(item.id) === String(pet.id));

    if (existingIndex > -1) {
        const maxStock = typeof pet.stock === "number" ? pet.stock : 999;
        const newQty = Math.min(cart[existingIndex].quantity + qtyToAdd, maxStock);
        cart[existingIndex].quantity = newQty;
    } else {
        cart.push({
            id: pet.id,
            product_id: pet.id,
            name: pet.name || pet.title || "Pet Companion",
            price: parseFloat(pet.price || 0),
            image: pet.image || "",
            category_name: pet.category_name || pet.category || "General",
            stock: typeof pet.stock === "number" ? pet.stock : 10,
            quantity: qtyToAdd,
        });
    }

    saveCart(cart);

    if (token) {
        try {
            const res = await axios.post(
                `${API_URL}add/`,
                { product_id: pet.id, quantity: qtyToAdd },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const backendItems = res.data?.items || [];
            if (Array.isArray(backendItems) && backendItems.length > 0) {
                const formatted = formatBackendItems(backendItems);
                saveCart(formatted);
                return formatted;
            }
        } catch (err) {
            console.warn(err);
        }
    }

    return cart;
};

export const updateQuantity = async (petId, quantity, cartItemId = null) => {
    const qty = parseInt(quantity, 10);
    const token = getAuthToken();

    let cart = getCart();
    if (qty <= 0) {
        cart = cart.filter((item) => String(item.id) !== String(petId));
    } else {
        const item = cart.find((i) => String(i.id) === String(petId));
        if (item) {
            item.quantity = qty;
        }
    }
    saveCart(cart);

    if (token) {
        try {
            let res;
            if (cartItemId) {
                if (qty <= 0) {
                    res = await axios.delete(`${API_URL}items/${cartItemId}/`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                } else {
                    res = await axios.patch(
                        `${API_URL}items/${cartItemId}/`,
                        { quantity: qty },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                }
            } else {
                const syncPayload = {
                    items: cart.map((i) => ({ product_id: i.id, quantity: i.quantity })),
                };
                res = await axios.post(`${API_URL}sync/`, syncPayload, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            }

            const backendItems = res.data?.items || [];
            if (Array.isArray(backendItems)) {
                const formatted = formatBackendItems(backendItems);
                saveCart(formatted);
                return formatted;
            }
        } catch (err) {
            console.warn(err);
        }
    }

    return cart;
};

export const removeFromCart = async (petId, cartItemId = null) => {
    const token = getAuthToken();

    const cart = getCart().filter((item) => String(item.id) !== String(petId));
    saveCart(cart);

    if (token && cartItemId) {
        try {
            const res = await axios.delete(`${API_URL}items/${cartItemId}/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const backendItems = res.data?.items || [];
            if (Array.isArray(backendItems)) {
                const formatted = formatBackendItems(backendItems);
                saveCart(formatted);
                return formatted;
            }
        } catch (err) {
            console.warn(err);
        }
    }

    return cart;
};

export const clearCart = async () => {
    const token = getAuthToken();
    saveCart([]);

    if (token) {
        try {
            await axios.post(`${API_URL}clear/`, {}, { headers: { Authorization: `Bearer ${token}` } });
        } catch (err) {
            console.warn(err);
        }
    }

    return [];
};

export const syncCartWithBackend = async () => {
    return await fetchBackendCart();
};

export const subscribeToCart = (callback) => {
    const handler = () => callback(getCart(), getCartCount());
    window.addEventListener("cart-updated", handler);
    window.addEventListener("storage", handler);
    return () => {
        window.removeEventListener("cart-updated", handler);
        window.removeEventListener("storage", handler);
    };
};

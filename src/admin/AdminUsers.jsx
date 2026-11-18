import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axiosAdmin from "../utils/axiosAdmin";

const AdminUsers = () => {
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedUser, setSelectedUser] = useState(null);
    const [actionLoadingId, setActionLoadingId] = useState(null);

    const currentUser = (() => {
        try {
            const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    })();

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await axiosAdmin.get("/api/users/admin/list/");
            const data = res.data?.results || res.data;
            if (Array.isArray(data)) {
                setUsers(data);
            } else {
                setUsers([]);
            }
        } catch (err) {
            try {
                const fallbackRes = await axiosAdmin.get("/api/users/");
                const fb = fallbackRes.data?.results || fallbackRes.data;
                setUsers(Array.isArray(fb) ? fb : []);
            } catch (fallbackErr) {
                toast.error("Failed to load user accounts.");
                setUsers([]);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleLogout = () => {
        sessionStorage.clear();
        localStorage.clear();
        toast.info("Signed out of Admin Console");
        navigate("/admin");
    };

    const handleToggleBlock = async (user) => {
        if (currentUser && user.id === currentUser.id) {
            toast.warning("You cannot block your own administrator account.");
            return;
        }

        setActionLoadingId(user.id);
        try {
            const res = await axiosAdmin.post(`/api/users/admin/${user.id}/toggle-block/`);
            const nextBlocked = typeof res.data?.is_blocked === "boolean" ? res.data.is_blocked : !user.is_blocked;

            setUsers((prev) =>
                prev.map((u) => (u.id === user.id ? { ...u, is_blocked: nextBlocked } : u))
            );

            if (selectedUser && selectedUser.id === user.id) {
                setSelectedUser((prev) => ({ ...prev, is_blocked: nextBlocked }));
            }

            toast.success(
                nextBlocked
                    ? `Account for ${user.username || user.email} has been blocked.`
                    : `Account for ${user.username || user.email} has been unblocked.`
            );
        } catch (err) {
            const message = err.response?.data?.detail || "Could not update user block status.";
            toast.error(message);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleRoleChange = async (user, newRole) => {
        if (currentUser && user.id === currentUser.id) {
            toast.warning("You cannot modify your own role here.");
            return;
        }

        setActionLoadingId(user.id);
        try {
            await axiosAdmin.patch(`/api/users/admin/${user.id}/`, { role: newRole });
            setUsers((prev) =>
                prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
            );
            if (selectedUser && selectedUser.id === user.id) {
                setSelectedUser((prev) => ({ ...prev, role: newRole }));
            }
            toast.success(`Role for ${user.username || user.email} changed to ${newRole}.`);
        } catch (err) {
            toast.error("Failed to update role.");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDeleteUser = async (user) => {
        if (currentUser && user.id === currentUser.id) {
            toast.warning("You cannot delete your own account.");
            return;
        }

        const confirmed = window.confirm(
            `Are you sure you want to permanently delete user "${user.username || user.email}"?`
        );
        if (!confirmed) return;

        setActionLoadingId(user.id);
        try {
            await axiosAdmin.delete(`/api/users/admin/${user.id}/`);
            setUsers((prev) => prev.filter((u) => u.id !== user.id));
            if (selectedUser && selectedUser.id === user.id) {
                setSelectedUser(null);
            }
            toast.success("User account deleted successfully.");
        } catch (err) {
            toast.error("Failed to delete user account.");
        } finally {
            setActionLoadingId(null);
        }
    };

    const totalUsersCount = users.length;
    const customersCount = users.filter((u) => u.role === "customer").length;
    const adminCount = users.filter((u) => u.role === "admin" || u.is_staff || u.is_superuser).length;
    const blockedCount = users.filter((u) => u.is_blocked).length;
    const activeCount = users.filter((u) => !u.is_blocked && u.is_active !== false).length;

    const filteredUsers = users.filter((u) => {
        const query = searchTerm.trim().toLowerCase();
        const matchesSearch =
            !query ||
            (u.username && u.username.toLowerCase().includes(query)) ||
            (u.email && u.email.toLowerCase().includes(query)) ||
            (u.phone && u.phone.toLowerCase().includes(query)) ||
            String(u.id).includes(query);

        const isAdmin = u.role === "admin" || u.is_staff || u.is_superuser;
        let matchesRole = true;
        if (roleFilter === "admin") {
            matchesRole = isAdmin;
        } else if (roleFilter === "customer") {
            matchesRole = !isAdmin;
        }

        let matchesStatus = true;
        if (statusFilter === "blocked") {
            matchesStatus = !!u.is_blocked;
        } else if (statusFilter === "active") {
            matchesStatus = !u.is_blocked && u.is_active !== false;
        }

        return matchesSearch && matchesRole && matchesStatus;
    });

    const formatDate = (isoString) => {
        if (!isoString) return "-";
        try {
            return new Date(isoString).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
            });
        } catch {
            return "-";
        }
    };

    const getAvatarColor = (name = "") => {
        const colors = ["#10b981", "#0d6efd", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6"];
        let sum = 0;
        for (let i = 0; i < name.length; i++) {
            sum += name.charCodeAt(i);
        }
        return colors[sum % colors.length];
    };

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
                            className="nav-link text-start text-secondary rounded-3 px-3 py-2 d-flex align-items-center gap-2"
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
                            className="nav-link text-start bg-primary text-white rounded-3 px-3 py-2 d-flex align-items-center gap-2 shadow-sm"
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
                    <div className="d-flex align-items-center gap-2 px-2 mb-3">
                        <div
                            className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold"
                            style={{ width: "36px", height: "36px", backgroundColor: "#0d6efd", fontSize: "14px" }}
                        >
                            {currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : "A"}
                        </div>
                        <div className="overflow-hidden">
                            <div className="text-white small fw-bold text-truncate" style={{ maxWidth: "150px" }}>
                                {currentUser?.username || "Administrator"}
                            </div>
                            <div className="text-secondary small text-truncate" style={{ fontSize: "11px", maxWidth: "150px" }}>
                                {currentUser?.email || "admin@petworld.com"}
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="btn btn-outline-danger btn-sm w-100 rounded-3 d-flex align-items-center justify-content-center gap-2"
                        style={{ fontSize: "13px" }}
                    >
                        <span>🚪</span>
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            <main className="flex-grow-1 p-4" style={{ overflowY: "auto", maxHeight: "100vh" }}>
                <header className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 pb-3 border-bottom border-secondary border-opacity-25">
                    <div>
                        <h3 className="fw-bold text-white mb-1">User Accounts & Access Control</h3>
                        <p className="text-secondary small mb-0">
                            Manage registered customers, administrators, roles, and security permissions
                        </p>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                        <button
                            type="button"
                            onClick={fetchUsers}
                            className="btn btn-outline-secondary btn-sm px-3 rounded-3 text-light d-flex align-items-center gap-2"
                            disabled={loading}
                        >
                            <span>🔄</span>
                            <span>Refresh</span>
                        </button>
                    </div>
                </header>

                <div className="row g-3 mb-4">
                    <div className="col-12 col-sm-6 col-xl-3">
                        <div
                            className="card border-0 rounded-4 p-3 shadow-sm h-100"
                            style={{ backgroundColor: "#111827", border: "1px solid rgba(255, 255, 255, 0.05)" }}
                        >
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-secondary small fw-semibold">TOTAL USERS</span>
                                <span className="badge bg-primary bg-opacity-25 text-primary rounded-pill px-2 py-1">All</span>
                            </div>
                            <h3 className="fw-bold text-white mb-1">{totalUsersCount}</h3>
                            <span className="text-secondary small" style={{ fontSize: "12px" }}>
                                {activeCount} active in system
                            </span>
                        </div>
                    </div>

                    <div className="col-12 col-sm-6 col-xl-3">
                        <div
                            className="card border-0 rounded-4 p-3 shadow-sm h-100"
                            style={{ backgroundColor: "#111827", border: "1px solid rgba(255, 255, 255, 0.05)" }}
                        >
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-secondary small fw-semibold">CUSTOMERS</span>
                                <span className="badge bg-success bg-opacity-25 text-success rounded-pill px-2 py-1">Buyers</span>
                            </div>
                            <h3 className="fw-bold text-white mb-1">{customersCount}</h3>
                            <span className="text-secondary small" style={{ fontSize: "12px" }}>
                                Registered shoppers
                            </span>
                        </div>
                    </div>

                    <div className="col-12 col-sm-6 col-xl-3">
                        <div
                            className="card border-0 rounded-4 p-3 shadow-sm h-100"
                            style={{ backgroundColor: "#111827", border: "1px solid rgba(255, 255, 255, 0.05)" }}
                        >
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-secondary small fw-semibold">STAFF & ADMINS</span>
                                <span className="badge bg-info bg-opacity-25 text-info rounded-pill px-2 py-1">Privileged</span>
                            </div>
                            <h3 className="fw-bold text-white mb-1">{adminCount}</h3>
                            <span className="text-secondary small" style={{ fontSize: "12px" }}>
                                Full console access
                            </span>
                        </div>
                    </div>

                    <div className="col-12 col-sm-6 col-xl-3">
                        <div
                            className="card border-0 rounded-4 p-3 shadow-sm h-100"
                            style={{ backgroundColor: "#111827", border: "1px solid rgba(255, 255, 255, 0.05)" }}
                        >
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-secondary small fw-semibold">BLOCKED ACCOUNTS</span>
                                <span className="badge bg-danger bg-opacity-25 text-danger rounded-pill px-2 py-1">Restricted</span>
                            </div>
                            <h3 className="fw-bold text-white mb-1">{blockedCount}</h3>
                            <span className="text-secondary small" style={{ fontSize: "12px" }}>
                                Prohibited from login
                            </span>
                        </div>
                    </div>
                </div>

                <div
                    className="card border-0 rounded-4 shadow-sm p-3 mb-4"
                    style={{ backgroundColor: "#111827", border: "1px solid rgba(255, 255, 255, 0.05)" }}
                >
                    <div className="row g-3 align-items-center">
                        <div className="col-12 col-md-5">
                            <div className="input-group">
                                <span
                                    className="input-group-text border-0 text-secondary"
                                    style={{ backgroundColor: "#1f2937", borderTopLeftRadius: "8px", borderBottomLeftRadius: "8px" }}
                                >
                                    🔍
                                </span>
                                <input
                                    type="text"
                                    className="form-control border-0 text-white shadow-none"
                                    style={{
                                        backgroundColor: "#1f2937",
                                        borderTopRightRadius: "8px",
                                        borderBottomRightRadius: "8px",
                                        fontSize: "14px"
                                    }}
                                    placeholder="Search by username, email, phone or ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm("")}
                                        className="btn btn-sm btn-outline-secondary border-0"
                                        style={{ backgroundColor: "#1f2937", color: "#9ca3af" }}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="col-6 col-md-3">
                            <select
                                className="form-select border-0 text-white shadow-none"
                                style={{ backgroundColor: "#1f2937", fontSize: "14px", borderRadius: "8px" }}
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                            >
                                <option value="all">All Roles</option>
                                <option value="customer">Customers Only</option>
                                <option value="admin">Administrators Only</option>
                            </select>
                        </div>

                        <div className="col-6 col-md-3">
                            <select
                                className="form-select border-0 text-white shadow-none"
                                style={{ backgroundColor: "#1f2937", fontSize: "14px", borderRadius: "8px" }}
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active Only</option>
                                <option value="blocked">Blocked Only</option>
                            </select>
                        </div>

                        <div className="col-12 col-md-1 text-md-end">
                            <span className="text-secondary small fw-medium">
                                {filteredUsers.length} of {totalUsersCount}
                            </span>
                        </div>
                    </div>
                </div>

                <div
                    className="card border-0 rounded-4 shadow-sm overflow-hidden"
                    style={{ backgroundColor: "#111827", border: "1px solid rgba(255, 255, 255, 0.05)" }}
                >
                    <div className="p-3 border-bottom border-secondary border-opacity-25 d-flex justify-content-between align-items-center">
                        <h6 className="fw-bold text-white mb-0">Registered User Directory</h6>
                        <span className="badge bg-secondary bg-opacity-25 text-light small px-2 py-1">
                            Live Database Sync
                        </span>
                    </div>

                    {loading ? (
                        <div className="p-5 text-center">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading users...</span>
                            </div>
                            <p className="text-secondary mt-2 small mb-0">Retrieving user accounts from server...</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="p-5 text-center">
                            <div className="fs-1 mb-2">👥</div>
                            <h5 className="text-white fw-bold mb-1">No Users Found</h5>
                            <p className="text-secondary small mb-3">
                                No registered user accounts matched your search or filter criteria.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchTerm("");
                                    setRoleFilter("all");
                                    setStatusFilter("all");
                                }}
                                className="btn btn-outline-primary btn-sm rounded-pill px-3"
                            >
                                Reset Filters
                            </button>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-dark table-hover align-middle mb-0" style={{ backgroundColor: "#111827" }}>
                                <thead>
                                    <tr className="text-secondary border-bottom border-secondary border-opacity-25" style={{ fontSize: "12px" }}>
                                        <th className="ps-3 py-3">USER</th>
                                        <th className="py-3">EMAIL & CONTACT</th>
                                        <th className="py-3">ROLE</th>
                                        <th className="py-3">ORDERS</th>
                                        <th className="py-3">STATUS</th>
                                        <th className="py-3">JOINED</th>
                                        <th className="text-end pe-3 py-3">ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((user) => {
                                        const isAdmin = user.role === "admin" || user.is_staff || user.is_superuser;
                                        const isCurrent = currentUser && user.id === currentUser.id;
                                        const isActionLoading = actionLoadingId === user.id;

                                        return (
                                            <tr key={user.id} className="border-bottom border-secondary border-opacity-10">
                                                <td className="ps-3 py-3">
                                                    <div className="d-flex align-items-center gap-3">
                                                        <div
                                                            className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold shadow-sm"
                                                            style={{
                                                                width: "38px",
                                                                height: "38px",
                                                                backgroundColor: getAvatarColor(user.username || user.email),
                                                                fontSize: "14px",
                                                                flexShrink: 0
                                                            }}
                                                        >
                                                            {user.username ? user.username.charAt(0).toUpperCase() : "U"}
                                                        </div>
                                                        <div>
                                                            <div className="text-white fw-semibold small d-flex align-items-center gap-2">
                                                                <span>{user.username || "Unnamed User"}</span>
                                                                {isCurrent && (
                                                                    <span
                                                                        className="badge bg-primary bg-opacity-25 text-primary border border-primary border-opacity-25 py-0 px-1"
                                                                        style={{ fontSize: "9px" }}
                                                                    >
                                                                        You
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-secondary" style={{ fontSize: "11px" }}>
                                                                User ID: #{user.id}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="py-3">
                                                    <div className="text-light small">{user.email}</div>
                                                    <div className="text-secondary" style={{ fontSize: "11px" }}>
                                                        {user.phone ? `📞 ${user.phone}` : "No phone provided"}
                                                    </div>
                                                </td>

                                                <td className="py-3">
                                                    {isAdmin ? (
                                                        <span
                                                            className="badge text-uppercase px-2 py-1 rounded-pill"
                                                            style={{
                                                                background: "rgba(16, 185, 129, 0.15)",
                                                                color: "#34d399",
                                                                border: "1px solid rgba(16, 185, 129, 0.3)",
                                                                fontSize: "11px"
                                                            }}
                                                        >
                                                            Administrator
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className="badge text-uppercase px-2 py-1 rounded-pill"
                                                            style={{
                                                                background: "rgba(59, 130, 246, 0.15)",
                                                                color: "#60a5fa",
                                                                border: "1px solid rgba(59, 130, 246, 0.3)",
                                                                fontSize: "11px"
                                                            }}
                                                        >
                                                            Customer
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-3">
                                                    <span className="badge bg-secondary bg-opacity-25 text-light px-2 py-1 rounded-pill">
                                                        🛒 {user.orders_count ?? 0}
                                                    </span>
                                                </td>

                                                <td className="py-3">
                                                    {user.is_blocked ? (
                                                        <span className="badge bg-danger bg-opacity-25 text-danger border border-danger border-opacity-25 px-2 py-1 rounded-pill small">
                                                            ✕ Blocked
                                                        </span>
                                                    ) : (
                                                        <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-25 px-2 py-1 rounded-pill small">
                                                            ✓ Active
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-3 text-secondary small">
                                                    {formatDate(user.date_joined)}
                                                </td>

                                                <td className="text-end pe-3 py-3">
                                                    <div className="d-flex align-items-center justify-content-end gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedUser(user)}
                                                            className="btn btn-sm btn-outline-secondary py-1 px-2 border-0 rounded-2 text-decoration-none"
                                                            style={{ fontSize: "12px", color: "#cbd5e1" }}
                                                            title="View details"
                                                        >
                                                            👁️
                                                        </button>

                                                        <button
                                                            type="button"
                                                            disabled={isCurrent || isActionLoading}
                                                            onClick={() => handleToggleBlock(user)}
                                                            className={`btn btn-sm py-1 px-2 border-0 rounded-2 ${user.is_blocked ? "btn-outline-success" : "btn-outline-warning"}`}
                                                            style={{ fontSize: "12px" }}
                                                            title={user.is_blocked ? "Unblock User" : "Block User"}
                                                        >
                                                            {user.is_blocked ? "🔓 Unblock" : "🔒 Block"}
                                                        </button>

                                                        {!isCurrent && (
                                                            <div className="dropdown d-inline">
                                                                <button
                                                                    className="btn btn-sm btn-outline-secondary py-1 px-2 border-0 rounded-2 text-secondary"
                                                                    type="button"
                                                                    data-bs-toggle="dropdown"
                                                                    aria-expanded="false"
                                                                    style={{ fontSize: "12px" }}
                                                                >
                                                                    ⋮
                                                                </button>
                                                                <ul className="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow" style={{ backgroundColor: "#1f2937", fontSize: "13px" }}>
                                                                    <li>
                                                                        <button
                                                                            type="button"
                                                                            className="dropdown-item py-2"
                                                                            onClick={() => handleRoleChange(user, isAdmin ? "customer" : "admin")}
                                                                        >
                                                                            {isAdmin ? "Demote to Customer" : "Promote to Admin"}
                                                                        </button>
                                                                    </li>
                                                                    <li>
                                                                        <button
                                                                            type="button"
                                                                            className="dropdown-item py-2 text-danger"
                                                                            onClick={() => handleDeleteUser(user)}
                                                                        >
                                                                            Delete Account
                                                                        </button>
                                                                    </li>
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {selectedUser && (
                <div
                    className="modal show d-block"
                    tabIndex="-1"
                    style={{ backgroundColor: "rgba(0, 0, 0, 0.75)", zIndex: 1055 }}
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div
                            className="modal-content border-0 rounded-4 text-white shadow-lg overflow-hidden"
                            style={{ backgroundColor: "#111827", border: "1px solid rgba(255, 255, 255, 0.1)" }}
                        >
                            <div className="modal-header border-bottom border-secondary border-opacity-25 px-4 py-3">
                                <h5 className="modal-title fw-bold">User Account Profile</h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => setSelectedUser(null)}
                                ></button>
                            </div>

                            <div className="modal-body p-4">
                                <div className="text-center mb-4">
                                    <div
                                        className="rounded-circle text-white d-inline-flex align-items-center justify-content-center fw-bold shadow mb-2"
                                        style={{
                                            width: "64px",
                                            height: "64px",
                                            backgroundColor: getAvatarColor(selectedUser.username || selectedUser.email),
                                            fontSize: "24px"
                                        }}
                                    >
                                        {selectedUser.username ? selectedUser.username.charAt(0).toUpperCase() : "U"}
                                    </div>
                                    <h5 className="fw-bold mb-0 text-white">{selectedUser.username || "Unnamed"}</h5>
                                    <p className="text-secondary small mb-0">{selectedUser.email}</p>
                                </div>

                                <div className="p-3 rounded-3 mb-3" style={{ backgroundColor: "#1f2937" }}>
                                    <div className="d-flex justify-content-between py-2 border-bottom border-secondary border-opacity-25">
                                        <span className="text-secondary small">User ID</span>
                                        <span className="fw-bold small">#{selectedUser.id}</span>
                                    </div>
                                    <div className="d-flex justify-content-between py-2 border-bottom border-secondary border-opacity-25">
                                        <span className="text-secondary small">Contact Phone</span>
                                        <span className="fw-bold small">{selectedUser.phone || "Not provided"}</span>
                                    </div>
                                    <div className="d-flex justify-content-between py-2 border-bottom border-secondary border-opacity-25">
                                        <span className="text-secondary small">Assigned Role</span>
                                        <span className="fw-bold small text-capitalize text-info">{selectedUser.role}</span>
                                    </div>
                                    <div className="d-flex justify-content-between py-2 border-bottom border-secondary border-opacity-25">
                                        <span className="text-secondary small">Total Orders</span>
                                        <span className="fw-bold small">{selectedUser.orders_count ?? 0} Orders</span>
                                    </div>
                                    <div className="d-flex justify-content-between py-2 border-bottom border-secondary border-opacity-25">
                                        <span className="text-secondary small">Access Status</span>
                                        <span className={`fw-bold small ${selectedUser.is_blocked ? "text-danger" : "text-success"}`}>
                                            {selectedUser.is_blocked ? "Blocked / Suspended" : "Active & Verified"}
                                        </span>
                                    </div>
                                    <div className="d-flex justify-content-between py-2">
                                        <span className="text-secondary small">Date Registered</span>
                                        <span className="fw-bold small">{formatDate(selectedUser.date_joined)}</span>
                                    </div>
                                </div>

                                <div className="d-flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleToggleBlock(selectedUser)}
                                        disabled={currentUser && selectedUser.id === currentUser.id}
                                        className={`btn w-100 rounded-3 py-2 fw-semibold ${selectedUser.is_blocked ? "btn-success" : "btn-warning"}`}
                                        style={{ fontSize: "14px" }}
                                    >
                                        {selectedUser.is_blocked ? "🔓 Unblock Account" : "🔒 Block Account"}
                                    </button>
                                </div>
                            </div>

                            <div className="modal-footer border-top border-secondary border-opacity-25 px-4 py-3">
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm px-4 rounded-3"
                                    onClick={() => setSelectedUser(null)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;

import { Navigate, useLocation, Outlet } from "react-router-dom";

const ProtectedRoute = ({ children, requiredRole }) => {
    const location = useLocation();

    const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
    const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");

    let user = null;
    try {
        user = storedUser ? JSON.parse(storedUser) : null;
    } catch {
        user = null;
    }

    if (!token || !user) {
        const redirectPath = requiredRole === "admin" ? "/admin" : "/login";
        return <Navigate to={redirectPath} state={{ from: location }} replace />;
    }

    if (requiredRole && user.role !== requiredRole && !user.is_staff && !user.is_superuser) {
        return <Navigate to="/" replace />;
    }

    return children ? children : <Outlet />;
};

export default ProtectedRoute;

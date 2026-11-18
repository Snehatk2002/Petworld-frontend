import { Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Home from "./pages/Home.jsx";
import Pets from "./pages/Pets.jsx";
import PetListing from "./pages/PetListing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ProtectedRoute from "./pages/ProtectedRoute.jsx";
import AdminLogin from "./admin/AdminLogin.jsx";
import AdminDashboard from "./admin/AdminDashboard.jsx";
import AdminPets from "./admin/AdminPets.jsx";
import AdminOrders from "./admin/AdminOrders.jsx";
import AdminFeedback from "./admin/AdminFeedback.jsx";
import AdminUsers from "./admin/AdminUsers.jsx";
import Orders from "./pages/Orders.jsx";
import UserProfile from "./pages/UserProfile.jsx";
import Cart from "./pages/Cart.jsx";
import Checkout from "./pages/Checkout.jsx";
import Feedback from "./pages/Feedback.jsx";
import AboutUs from "./pages/AboutUs.jsx";

function App() {
    return (
        <>
            <ToastContainer position="top-right" autoClose={3000} />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/pets" element={<Pets />} />
                <Route path="/pets/:id" element={<PetListing />} />
                <Route path="/pet/:id" element={<PetListing />} />
                <Route path="/pet-listing/:id" element={<PetListing />} />
                <Route path="/products" element={<Navigate to="/pets" replace />} />
                <Route path="/products/:id" element={<PetListing />} />
                <Route
                    path="/cart"
                    element={
                        <ProtectedRoute>
                            <Cart />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/checkout"
                    element={
                        <ProtectedRoute>
                            <Checkout />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/payment"
                    element={
                        <ProtectedRoute>
                            <Checkout />
                        </ProtectedRoute>
                    }
                />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                    path="/orders"
                    element={
                        <ProtectedRoute>
                            <Orders />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <UserProfile />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/user-profile"
                    element={
                        <ProtectedRoute>
                            <UserProfile />
                        </ProtectedRoute>
                    }
                />
                <Route path="/feedback" element={<Feedback />} />
                <Route path="/about" element={<AboutUs />} />
                <Route path="/about-us" element={<AboutUs />} />
                <Route path="/admin" element={<AdminLogin />} />
                <Route
                    path="/admin/dashboard"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <AdminDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/pets"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <AdminPets />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/orders"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <AdminOrders />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/feedback"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <AdminFeedback />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/users"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <AdminUsers />
                        </ProtectedRoute>
                    }
                />

            </Routes>
        </>
    );
}

export default App;

import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute.tsx';
import AdminDashboard from '../pages/AdminDashboard.tsx';
import Cart from '../pages/Cart.tsx';
import Checkout from '../pages/Checkout.tsx';
import ForgotPassword from '../pages/ForgotPassword.tsx';
import Home from '../pages/Home.tsx';
import Login from '../pages/Login.tsx';
import Orders from '../pages/Orders.tsx';
import ProductDetails from '../pages/ProductDetails.tsx';
import Products from '../pages/Products.tsx';
import Profile from '../pages/Profile.tsx';
import Register from '../pages/Register.tsx';
import VerifyEmail from '../pages/VerifyEmail.tsx';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/products" element={<Products />} />
      <Route path="/products/:id" element={<ProductDetails />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ForgotPassword />} />

      <Route
        path="/checkout"
        element={
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        }
      />
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
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

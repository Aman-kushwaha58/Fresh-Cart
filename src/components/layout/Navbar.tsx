import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LogOut,
  Menu,
  ShieldCheck,
  ShoppingCart,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useCart } from '../../context/CartContext.tsx';
import { cn } from '../../utils/format.ts';
import { BrandLogo } from '../common/BrandLogo.tsx';
import { Button } from '../ui/button.tsx';

export function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { summary } = useCart();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    navigate('/');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'text-sm font-medium transition-colors whitespace-nowrap shrink-0 py-1 border-b-2',
      isActive
        ? 'text-[#16A34A] border-[#16A34A]'
        : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
    );

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Wordmark */}
        <Link to="/" className="whitespace-nowrap shrink-0 focus-visible:outline-none">
          <BrandLogo />
        </Link>

        {/* Zone 2: Primary Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/products" className={navLinkClass}>
            Browse Products
          </NavLink>
          <NavLink to="/products?view=categories" className={() =>
            'text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:border-gray-300'
          }>
            Categories
          </NavLink>
          <NavLink to="/orders" className={navLinkClass}>
            My Orders
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={navLinkClass}>
              Admin
            </NavLink>
          )}
        </nav>

        {/* Zone 3: Cart & Auth Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/cart"
            aria-label="Shopping Cart"
            className="relative inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 transition-colors hover:border-[#16A34A] hover:text-[#16A34A] whitespace-nowrap shrink-0"
          >
            <ShoppingCart className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Cart</span>
            <span className="font-mono-nums text-xs font-bold text-[#16A34A]">
              ({summary.totalQuantity})
            </span>
          </Link>

          {isAuthenticated ? (
            <div className="hidden md:flex items-center gap-2">
              <Link
                to="/profile"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors whitespace-nowrap shrink-0 max-w-[160px]"
              >
                <UserIcon className="h-4 w-4 text-gray-500 shrink-0" />
                <span className="truncate">{user?.fullName.split(' ')[0]}</span>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="whitespace-nowrap shrink-0"
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="hidden md:flex items-center">
              <Button asChild size="sm">
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="inline-flex md:hidden items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-700 hover:bg-gray-100"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-4 space-y-2">
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Home
          </Link>
          <Link
            to="/products"
            onClick={() => setMobileOpen(false)}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Browse Products
          </Link>
          <Link
            to="/products?view=categories"
            onClick={() => setMobileOpen(false)}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Categories
          </Link>
          <Link
            to="/orders"
            onClick={() => setMobileOpen(false)}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            My Orders
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-[#15803D] bg-green-50"
            >
              <ShieldCheck className="h-4 w-4" />
              Admin Dashboard
            </Link>
          )}
          <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  <UserIcon className="h-4 w-4" />
                  Profile ({user?.fullName})
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <Link to="/login" onClick={() => setMobileOpen(false)}>
                    Sign In
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link to="/register" onClick={() => setMobileOpen(false)}>
                    Register
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

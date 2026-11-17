import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo.tsx';

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="space-y-4">
            <BrandLogo />
            <p className="text-sm text-gray-600 leading-relaxed max-w-xs">
              Farm-direct produce, pasture-raised dairy, daily artisan bakery, and pantry essentials delivered cleanly to your doorstep.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Shop Aisles</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link to="/products?category=fruits-vegetables" className="hover:text-[#16A34A] transition-colors">
                  Fruits & Vegetables
                </Link>
              </li>
              <li>
                <Link to="/products?category=dairy-eggs" className="hover:text-[#16A34A] transition-colors">
                  Dairy & Eggs
                </Link>
              </li>
              <li>
                <Link to="/products?category=bakery" className="hover:text-[#16A34A] transition-colors">
                  Artisan Bakery
                </Link>
              </li>
              <li>
                <Link to="/products?category=pantry" className="hover:text-[#16A34A] transition-colors">
                  Pantry Staples
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Customer Account</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link to="/cart" className="hover:text-[#16A34A] transition-colors">
                  Shopping Cart
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:text-[#16A34A] transition-colors">
                  Track My Orders
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-[#16A34A] transition-colors">
                  Profile & Addresses
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#16A34A] transition-colors">
                  Sign In / Register
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Customer Care</h3>
            <ul className="space-y-2.5 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#16A34A] shrink-0" />
                <span>support@freshcart.com</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#16A34A] shrink-0" />
                <span>+1 (800) 555-0194</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-[#16A34A] shrink-0 mt-0.5" />
                <span>740 Market Harvest Way, Freshville</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} FreshCart Grocery Delivery. All rights reserved.</p>
          <p>Free delivery on orders over $35.00 · Cash on Delivery available</p>
        </div>
      </div>
    </footer>
  );
}

import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { ProductImage } from '../components/common/ProductImage.tsx';
import { Button } from '../components/ui/button.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useCart } from '../context/CartContext.tsx';
import { formatCurrency } from '../utils/format.ts';

export default function Cart() {
  const { items, summary, isLoading, updateQuantity, removeItem, clearCart } =
    useCart();
  const { isAuthenticated, isVerified } = useAuth();
  const navigate = useNavigate();

  const subtotalNum = Number(summary.subtotal);
  const amountToFreeDelivery = Math.max(
    0,
    summary.freeDeliveryThreshold - subtotalNum
  );
  const freeProgress = Math.min(
    100,
    (subtotalNum / summary.freeDeliveryThreshold) * 100
  );

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }
    if (!isVerified) {
      navigate('/verify-email');
      return;
    }
    navigate('/checkout');
  };

  if (isLoading && items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-green-200 border-t-[#16A34A]" />
        <p className="mt-3 text-sm text-gray-500">Loading your shopping cart...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-gray-200 bg-white p-10 sm:p-12 space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-[#16A34A]">
            <ShoppingBag className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold text-gray-900">
              Your FreshCart bag is empty
            </h1>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Browse fresh fruits, vegetables, dairy, and pantry staples to start building your order.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/products">
              <span>Continue Shopping</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-gray-900">
            Shopping Cart
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-mono-nums">
            {summary.totalQuantity} item(s) ready for doorstep delivery
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link to="/products">Continue Shopping</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCart}
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            Clear Cart
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-gray-200 bg-white p-4"
            >
              <Link
                to={`/products/${item.productId}`}
                className="h-24 w-28 shrink-0 overflow-hidden rounded-lg bg-[#F6F7F6]"
              >
                <ProductImage
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              </Link>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">{item.categoryName}</p>
                <Link
                  to={`/products/${item.productId}`}
                  className="text-base font-semibold text-gray-900 hover:text-[#16A34A] transition-colors line-clamp-1"
                >
                  {item.name}
                </Link>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                  <span>{item.unit}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-nums font-medium text-gray-800">
                    {formatCurrency(item.price)} each
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-5 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white">
                  <button
                    type="button"
                    aria-label={`Decrease ${item.name} quantity`}
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-l-lg cursor-pointer"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="font-mono-nums px-3 text-sm font-semibold text-gray-900">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label={`Increase ${item.name} quantity`}
                    disabled={item.quantity >= item.stock}
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-r-lg disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="text-right min-w-[78px]">
                  <p className="font-mono-nums text-base font-bold text-gray-900">
                    {formatCurrency(item.itemSubtotal)}
                  </p>
                </div>

                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => removeItem(item.productId)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <aside className="lg:col-span-4 rounded-2xl border border-gray-200 bg-white p-6 space-y-5 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-bold text-gray-900">
            Order Summary
          </h2>

          {/* Free delivery progress */}
          <div className="rounded-xl bg-green-50/70 border border-green-100 p-3.5 space-y-2">
            <p className="text-xs font-medium text-[#15803D]">
              {amountToFreeDelivery > 0
                ? `Add ${formatCurrency(amountToFreeDelivery)} more to unlock free delivery.`
                : 'You unlocked free doorstep delivery!'}
            </p>
            <div className="h-1.5 w-full rounded-full bg-green-200 overflow-hidden">
              <div
                className="h-full bg-[#16A34A] transition-all duration-300"
                style={{ width: `${freeProgress}%` }}
              />
            </div>
          </div>

          <div className="space-y-3 text-sm border-b border-gray-100 pb-4">
            <div className="flex justify-between text-gray-600">
              <span>Items ({summary.totalQuantity})</span>
              <span className="font-mono-nums font-medium text-gray-900">
                {formatCurrency(summary.subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery Fee</span>
              <span className="font-mono-nums font-medium text-gray-900">
                {Number(summary.deliveryFee) === 0
                  ? 'Free'
                  : formatCurrency(summary.deliveryFee)}
              </span>
            </div>
            {Number(summary.savings) > 0 && (
              <div className="flex justify-between text-[#16A34A]">
                <span>Product Savings</span>
                <span className="font-mono-nums font-semibold">
                  -{formatCurrency(summary.savings)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-base font-bold text-gray-900">Estimated Total</span>
            <span className="font-mono-nums text-2xl font-bold text-gray-900">
              {formatCurrency(summary.total)}
            </span>
          </div>

          <Button size="lg" className="w-full" onClick={handleCheckout}>
            <span>Proceed to Checkout</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </aside>
      </div>
    </div>
  );
}

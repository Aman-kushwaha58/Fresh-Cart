import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Minus, Plus, ShieldCheck, ShoppingCart, Truck } from 'lucide-react';
import { ProductImage } from '../components/common/ProductImage.tsx';
import { ProductCard } from '../components/products/ProductCard.tsx';
import { Button } from '../components/ui/button.tsx';
import { useCart } from '../context/CartContext.tsx';
import { productService } from '../services/productService.ts';
import { formatCurrency, getDiscountPercent } from '../utils/format.ts';

export default function ProductDetails() {
  const { id } = useParams();
  const productId = Number(id);
  const { addToCart, getItemQuantity } = useCart();
  const [qty, setQty] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productService.getProductById(productId),
    enabled: Number.isInteger(productId) && productId > 0,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-6 aspect-[4/3] rounded-2xl bg-gray-200 animate-pulse" />
          <div className="lg:col-span-6 space-y-4">
            <div className="h-8 w-2/3 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 w-1/3 bg-gray-200 rounded animate-pulse" />
            <div className="h-24 w-full bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data?.product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-gray-900">
          Product not found
        </h1>
        <p className="text-sm text-gray-600">
          This grocery item may have been removed or is unavailable.
        </p>
        <Button asChild>
          <Link to="/products">Back to All Products</Link>
        </Button>
      </div>
    );
  }

  const { product, related } = data;
  const discountPct = getDiscountPercent(product.price, product.originalPrice);
  const inCartQty = getItemQuantity(product.id);
  const remainingAddable = Math.max(0, product.stock - inCartQty);
  const isOutOfStock = product.stock <= 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-16">
      <div>
        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-[#16A34A] mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Browse Products</span>
        </Link>

        {/* Contiguous Purchase Module */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-6 lg:sticky lg:top-24">
            <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-gray-200 bg-[#F6F7F6]">
              <ProductImage
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-6 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                <Link
                  to={`/products?category=${encodeURIComponent(product.categorySlug)}`}
                  className="text-[#16A34A] hover:underline"
                >
                  {product.categoryName}
                </Link>
                <span aria-hidden="true">·</span>
                <span>{product.unit}</span>
                <span aria-hidden="true">·</span>
                <span className={isOutOfStock ? 'text-red-600' : 'text-[#15803D]'}>
                  {isOutOfStock ? 'Out of stock' : `${product.stock} available`}
                </span>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                {product.name}
              </h1>
            </div>

            <div className="flex items-baseline gap-3 border-y border-gray-100 py-4">
              <span className="font-mono-nums text-3xl font-bold text-gray-900">
                {formatCurrency(product.price)}
              </span>
              {product.originalPrice && discountPct > 0 && (
                <>
                  <span className="font-mono-nums text-lg text-gray-400 line-through">
                    {formatCurrency(product.originalPrice)}
                  </span>
                  <span className="text-sm font-semibold text-[#16A34A]">
                    Save {discountPct}%
                  </span>
                </>
              )}
            </div>

            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              {product.description}
            </p>

            {/* Quantity & Add to Cart */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="inline-flex items-center justify-between rounded-lg border border-gray-200 bg-white px-2 h-11 sm:w-36">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    disabled={qty <= 1}
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="p-1.5 text-gray-600 hover:text-gray-900 disabled:opacity-40 cursor-pointer"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="font-mono-nums text-sm font-semibold text-gray-900">
                    {qty}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={qty >= Math.max(1, remainingAddable)}
                    onClick={() =>
                      setQty((q) => Math.min(Math.max(1, remainingAddable), q + 1))
                    }
                    className="p-1.5 text-gray-600 hover:text-gray-900 disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <Button
                  size="lg"
                  className="flex-1 h-11"
                  disabled={isOutOfStock || remainingAddable <= 0}
                  onClick={() => {
                    addToCart(product, qty);
                    setQty(1);
                  }}
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>
                    {isOutOfStock
                      ? 'Out of Stock'
                      : remainingAddable <= 0
                      ? 'Maximum Stock in Cart'
                      : `Add to Cart · ${formatCurrency(Number(product.price) * qty)}`}
                  </span>
                </Button>
              </div>

              {inCartQty > 0 && (
                <p className="text-xs text-[#15803D] font-medium">
                  You currently have {inCartQty} unit(s) in your cart.{' '}
                  <Link to="/cart" className="underline font-semibold">
                    View Cart
                  </Link>
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-gray-100 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-[#16A34A] shrink-0" />
                <span>Free delivery on orders $35+</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#16A34A] shrink-0" />
                <span>Freshness guaranteed or refunded</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="space-y-6">
          <h2 className="font-display text-2xl font-bold tracking-tight text-gray-900">
            More from {product.categoryName}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

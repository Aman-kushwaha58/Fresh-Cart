import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { useCart } from '../../context/CartContext.tsx';
import { Product } from '../../types/index.ts';
import { cn, formatCurrency, getDiscountPercent } from '../../utils/format.ts';
import { ProductImage } from '../common/ProductImage.tsx';
import { Button } from '../ui/button.tsx';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, updateQuantity, getItemQuantity } = useCart();
  const qtyInCart = getItemQuantity(product.id);
  const discountPct = getDiscountPercent(product.price, product.originalPrice);
  const isOutOfStock = product.stock <= 0;

  return (
    <article className="group flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
      <Link
        to={`/products/${product.id}`}
        className="block relative aspect-[4/3] w-full overflow-hidden bg-[#F6F7F6]"
      >
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5 truncate">
          <span className="truncate font-medium text-gray-600">
            {product.categoryName}
          </span>
          <span aria-hidden="true">·</span>
          <span
            className={cn(
              'shrink-0 font-medium',
              isOutOfStock
                ? 'text-red-600'
                : product.stock <= 8
                ? 'text-amber-700'
                : 'text-[#15803D]'
            )}
          >
            {isOutOfStock ? 'Out of stock' : `${product.stock} in stock`}
          </span>
        </div>

        <Link
          to={`/products/${product.id}`}
          className="text-base font-semibold text-gray-900 leading-snug hover:text-[#16A34A] transition-colors line-clamp-1"
        >
          {product.name}
        </Link>
        <p className="text-xs text-gray-500 mt-0.5 mb-3">{product.unit}</p>

        <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="font-mono-nums text-base font-bold text-gray-900">
                {formatCurrency(product.price)}
              </span>
              {product.originalPrice && discountPct > 0 && (
                <span className="font-mono-nums text-xs text-gray-400 line-through">
                  {formatCurrency(product.originalPrice)}
                </span>
              )}
            </div>
            {discountPct > 0 && (
              <span className="text-[11px] font-semibold text-[#16A34A]">
                Save {discountPct}%
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {qtyInCart > 0 ? (
              <div className="inline-flex items-center rounded-lg border border-green-200 bg-green-50">
                <button
                  type="button"
                  aria-label={`Decrease quantity of ${product.name}`}
                  onClick={() => updateQuantity(product.id, qtyInCart - 1)}
                  className="p-2 text-[#15803D] hover:bg-green-100 rounded-l-lg transition-colors cursor-pointer"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="font-mono-nums px-2.5 text-xs font-bold text-[#15803D]">
                  {qtyInCart}
                </span>
                <button
                  type="button"
                  aria-label={`Increase quantity of ${product.name}`}
                  disabled={qtyInCart >= product.stock}
                  onClick={() => updateQuantity(product.id, qtyInCart + 1)}
                  className="p-2 text-[#15803D] hover:bg-green-100 rounded-r-lg transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <Button
                size="sm"
                disabled={isOutOfStock}
                onClick={() => addToCart(product, 1)}
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                <span>{isOutOfStock ? 'Unavailable' : 'Add'}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

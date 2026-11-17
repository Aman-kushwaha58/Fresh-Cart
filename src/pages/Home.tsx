import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Clock,
  Leaf,
  Search,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { ProductImage } from '../components/common/ProductImage.tsx';
import { ProductCard } from '../components/products/ProductCard.tsx';
import { Button } from '../components/ui/button.tsx';
import { Input } from '../components/ui/input.tsx';
import { productService } from '../services/productService.ts';
import { cn } from '../utils/format.ts';

type ShowcaseTab = 'featured' | 'offers' | 'best_selling' | 'all';

export default function Home() {
  const navigate = useNavigate();
  const [heroSearch, setHeroSearch] = useState('');
  const [activeTab, setActiveTab] = useState<ShowcaseTab>('featured');

  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productService.getCategories(),
  });

  const { data: showcaseData, isLoading: productsLoading } = useQuery({
    queryKey: ['home-products', activeTab],
    queryFn: () =>
      productService.getProducts({
        featured: activeTab === 'featured' ? true : undefined,
        offers: activeTab === 'offers' ? true : undefined,
        sort:
          activeTab === 'best_selling'
            ? 'best_selling'
            : activeTab === 'featured'
            ? 'featured'
            : 'newest',
        limit: 8,
      }),
  });

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = heroSearch.trim();
    navigate(q ? `/products?search=${encodeURIComponent(q)}` : '/products');
  };

  return (
    <div className="space-y-16 pb-8">
      {/* 1. Hero Section */}
      <section className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <div className="space-y-4">
                <p className="text-sm font-semibold text-[#16A34A] tracking-wide">
                  Farm-to-Door Grocery Market
                </p>
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 leading-[1.12] text-balance">
                  Fresh Groceries Delivered to Your Doorstep
                </h1>
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-xl">
                  Shop fresh fruits, vegetables, dairy products, bakery items, and everyday essentials at FreshCart.
                </p>
              </div>

              {/* Integrated Search + Primary CTA */}
              <form
                onSubmit={handleHeroSearch}
                className="flex flex-col sm:flex-row gap-3 max-w-xl"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="search"
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                    placeholder="Search apples, sourdough, milk, olive oil..."
                    className="h-12 pl-10 pr-4 text-sm"
                  />
                </div>
                <Button type="submit" size="lg" className="h-12 px-6">
                  <span>Shop Now</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs sm:text-sm text-gray-500">
                <span>Free delivery over $35.00</span>
                <span aria-hidden="true">·</span>
                <span>Use code <strong className="text-gray-800 font-semibold">FRESH10</strong> for 10% off</span>
                <span aria-hidden="true">·</span>
                <span>Cash on Delivery ready</span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-64 sm:h-80 lg:h-full min-h-[320px] overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                <ProductImage
                  src="/src/assets/images/hero_freshcart_market_1794931467258.jpg"
                  alt="Fresh organic vegetables, avocados, sourdough bread, and farm milk on a sunlit kitchen counter"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Popular Categories */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-gray-900">
              Popular Categories
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Explore curated aisles stocked fresh each morning.
            </p>
          </div>
          <Link
            to="/products"
            className="text-sm font-semibold text-[#16A34A] hover:text-[#15803D] inline-flex items-center gap-1 whitespace-nowrap"
          >
            <span>All Aisles</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {catsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div
                key={idx}
                className="h-40 rounded-xl border border-gray-200 bg-white animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/products?category=${encodeURIComponent(cat.slug)}`}
                className="group flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden transition-all duration-150 hover:-translate-y-0.5 hover:border-[#16A34A]/50 hover:shadow-sm"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-gray-50">
                  <ProductImage
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-3">
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-[#16A34A] line-clamp-1">
                    {cat.name}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5 font-mono-nums">
                    {cat.productCount ?? 0} items
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 3. Featured, Offers & Best-Selling Products */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-gray-900">
              Fresh Market Highlights
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Hand-picked staples, weekly savings, and customer favorites.
            </p>
          </div>

          <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-gray-100 p-1 self-start">
            {(
              [
                { id: 'featured', label: 'Featured' },
                { id: 'offers', label: 'Special Offers' },
                { id: 'best_selling', label: 'Best Sellers' },
                { id: 'all', label: 'All Products' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap cursor-pointer',
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="h-80 rounded-xl border border-gray-200 bg-white animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(showcaseData?.products ?? []).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Button asChild variant="outline" size="lg">
            <Link to="/products">
              <span>Browse Full Catalog ({showcaseData?.pagination.total ?? 35}+ items)</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* 4. Promotional Crate & Customer Benefits */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 lg:items-stretch">
            <div className="lg:col-span-5 min-h-[260px]">
              <ProductImage
                src="/src/assets/images/promo_delivery_crate_1794931468324.jpg"
                alt="Wooden farm grocery crate packed with apples, carrots, fresh herbs, and pantry jars"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="lg:col-span-7 p-8 lg:p-12 flex flex-col justify-center space-y-6">
              <div>
                <p className="text-sm font-semibold text-[#16A34A]">
                  The FreshCart Standard
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 mt-1 text-balance">
                  Why households trust FreshCart for weekly groceries
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-green-50 p-2.5 text-[#16A34A] shrink-0">
                    <Leaf className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Harvested Fresh Daily
                    </h3>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      Produce, dairy, and hearth loaves sourced directly from regional growers and creameries.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-green-50 p-2.5 text-[#16A34A] shrink-0">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Free Delivery Over $35
                    </h3>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      Insulated crates keep cold milk, eggs, and greens crisp all the way to your door.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-green-50 p-2.5 text-[#16A34A] shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Live Order Tracking
                    </h3>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      Follow every order from confirmation and packing to doorstep delivery.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-green-50 p-2.5 text-[#16A34A] shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Cash on Delivery
                    </h3>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      Inspect your fresh items at arrival and pay cleanly on delivery with zero hidden fees.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

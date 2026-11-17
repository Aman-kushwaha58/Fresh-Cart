import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react';
import { ProductCard } from '../components/products/ProductCard.tsx';
import { Button } from '../components/ui/button.tsx';
import { Input } from '../components/ui/input.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select.tsx';
import { productService } from '../services/productService.ts';
import { cn } from '../utils/format.ts';

type PriceBand = 'all' | 'under5' | '5to10' | 'over10';

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || 'all';
  const initialOffers = searchParams.get('offers') === 'true';

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [priceBand, setPriceBand] = useState<PriceBand>('all');
  const [sort, setSort] = useState<'featured' | 'price_asc' | 'price_desc' | 'best_selling'>('featured');
  const [offersOnly, setOffersOnly] = useState(initialOffers);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const paramSearch = searchParams.get('search') || '';
    const paramCat = searchParams.get('category') || 'all';
    setSearchInput(paramSearch);
    setDebouncedSearch(paramSearch);
    setSelectedCategory(paramCat);
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productService.getCategories(),
  });

  const minPrice =
    priceBand === '5to10' ? 5 : priceBand === 'over10' ? 10 : undefined;
  const maxPrice =
    priceBand === 'under5' ? 4.99 : priceBand === '5to10' ? 10 : undefined;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      'products',
      debouncedSearch,
      selectedCategory,
      priceBand,
      sort,
      offersOnly,
      page,
    ],
    queryFn: () =>
      productService.getProducts({
        search: debouncedSearch || undefined,
        category: selectedCategory,
        minPrice,
        maxPrice,
        sort,
        offers: offersOnly || undefined,
        page,
        limit: 12,
      }),
  });

  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(slug);
    setPage(1);
    const next = new URLSearchParams(searchParams);
    if (slug === 'all') next.delete('category');
    else next.set('category', slug);
    setSearchParams(next, { replace: true });
  };

  const resetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedCategory('all');
    setPriceBand('all');
    setSort('featured');
    setOffersOnly(false);
    setPage(1);
    setSearchParams({}, { replace: true });
  };

  const products = data?.products ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: 12, total: 0, totalPages: 1 };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-gray-900">
            Browse Fresh Groceries
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Filter by aisle, price range, or search across {pagination.total} stocked grocery items.
          </p>
        </div>

        {/* Search + Sort Bar */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products..."
              className="pl-9 pr-8"
            />
            {searchInput && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Select
            value={sort}
            onValueChange={(v) => {
              setSort(v as any);
              setPage(1);
            }}
          >
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Featured First</SelectItem>
              <SelectItem value="best_selling">Best Selling</SelectItem>
              <SelectItem value="price_asc">Price: Low to High</SelectItem>
              <SelectItem value="price_desc">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Category & Price Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleCategoryChange('all')}
            className={cn(
              'px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer border',
              selectedCategory === 'all'
                ? 'bg-[#16A34A] text-white border-[#16A34A]'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
            )}
          >
            All Aisles
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryChange(cat.slug)}
              className={cn(
                'px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer border',
                selectedCategory === cat.slug
                  ? 'bg-[#16A34A] text-white border-[#16A34A]'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-gray-400" />
            <Select
              value={priceBand}
              onValueChange={(v) => {
                setPriceBand(v as PriceBand);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Price range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="under5">Under $5.00</SelectItem>
                <SelectItem value="5to10">$5.00 – $10.00</SelectItem>
                <SelectItem value="over10">$10.00 & Up</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <button
            type="button"
            onClick={() => {
              setOffersOnly((prev) => !prev);
              setPage(1);
            }}
            className={cn(
              'px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-colors whitespace-nowrap cursor-pointer',
              offersOnly
                ? 'bg-green-50 text-[#15803D] border-[#16A34A]'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
            )}
          >
            Special Offers Only
          </button>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="h-80 rounded-xl border border-gray-200 bg-white animate-pulse"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm font-medium text-red-800">
            Could not load products right now.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
            Try Again
          </Button>
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center space-y-3">
          <p className="text-lg font-semibold text-gray-900">
            No matching groceries found
          </p>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Try clearing your active search keyword or price filter to view all available items.
          </p>
          <Button variant="outline" onClick={resetFilters}>
            Reset All Filters
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-6">
              <p className="text-sm text-gray-600 font-mono-nums">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} items
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => {
                    setPage((p) => p + 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

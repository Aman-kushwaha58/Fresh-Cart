import { Category, Product } from '../types/index.ts';
import { apiRequest } from './api.ts';

export interface ProductQueryParams {
  search?: string;
  category?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'featured' | 'price_asc' | 'price_desc' | 'best_selling' | 'newest';
  featured?: boolean;
  offers?: boolean;
  page?: number;
  limit?: number;
}

export interface ProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const productService = {
  async getCategories(): Promise<Category[]> {
    const res = await apiRequest<{ categories: Category[] }>('/api/categories');
    return res.categories;
  },

  async getProducts(params: ProductQueryParams = {}): Promise<ProductsResponse> {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.category && params.category !== 'all') qs.set('category', params.category);
    if (params.categoryId) qs.set('categoryId', String(params.categoryId));
    if (params.minPrice) qs.set('minPrice', String(params.minPrice));
    if (params.maxPrice) qs.set('maxPrice', String(params.maxPrice));
    if (params.sort) qs.set('sort', params.sort);
    if (params.featured) qs.set('featured', 'true');
    if (params.offers) qs.set('offers', 'true');
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));

    const query = qs.toString();
    return apiRequest<ProductsResponse>(`/api/products${query ? `?${query}` : ''}`);
  },

  async getProductById(id: number): Promise<{ product: Product; related: Product[] }> {
    return apiRequest<{ product: Product; related: Product[] }>(`/api/products/${id}`);
  },
};

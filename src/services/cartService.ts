import { CartResponse } from '../types/index.ts';
import { apiRequest } from './api.ts';

export const cartService = {
  getCart(): Promise<CartResponse> {
    return apiRequest<CartResponse>('/api/cart');
  },

  addItem(productId: number, quantity = 1): Promise<CartResponse> {
    return apiRequest<CartResponse>('/api/cart', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    });
  },

  updateQuantity(productId: number, quantity: number): Promise<CartResponse> {
    return apiRequest<CartResponse>(`/api/cart/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  },

  removeItem(productId: number): Promise<CartResponse> {
    return apiRequest<CartResponse>(`/api/cart/${productId}`, {
      method: 'DELETE',
    });
  },

  clearCart(): Promise<CartResponse> {
    return apiRequest<CartResponse>('/api/cart', {
      method: 'DELETE',
    });
  },

  syncGuestItems(items: Array<{ productId: number; quantity: number }>): Promise<CartResponse> {
    return apiRequest<CartResponse>('/api/cart/sync', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },
};

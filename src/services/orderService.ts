import { Address, AdminCustomer, AdminStats, Order } from '../types/index.ts';
import { apiRequest } from './api.ts';

export interface PlaceOrderPayload {
  fullName: string;
  email: string;
  phone: string;
  houseNumber: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  deliveryInstructions?: string;
  paymentMethod: 'cash_on_delivery' | 'online_test_pending';
  saveAddress?: boolean;
  promoCode?: string;
}

export const orderService = {
  async getAddresses(): Promise<Address[]> {
    const res = await apiRequest<{ addresses: Address[] }>('/api/addresses');
    return res.addresses;
  },

  async createAddress(payload: Omit<Address, 'id' | 'userId' | 'createdAt'>): Promise<Address> {
    const res = await apiRequest<{ address: Address }>('/api/addresses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.address;
  },

  async deleteAddress(id: number): Promise<void> {
    await apiRequest(`/api/addresses/${id}`, { method: 'DELETE' });
  },

  async placeOrder(payload: PlaceOrderPayload): Promise<Order> {
    const res = await apiRequest<{ order: Order }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.order;
  },

  async getMyOrders(): Promise<Order[]> {
    const res = await apiRequest<{ orders: Order[] }>('/api/orders');
    return res.orders;
  },

  async getOrderById(id: number): Promise<Order> {
    const res = await apiRequest<{ order: Order }>(`/api/orders/${id}`);
    return res.order;
  },

  async cancelOrder(id: number): Promise<Order> {
    const res = await apiRequest<{ order: Order }>(`/api/orders/${id}/cancel`, {
      method: 'POST',
    });
    return res.order;
  },

  // Admin endpoints
  async getAdminStats(): Promise<{ stats: AdminStats; recentOrders: any[] }> {
    return apiRequest<{ stats: AdminStats; recentOrders: any[] }>('/api/admin/stats');
  },

  async getAdminOrders(): Promise<Order[]> {
    const res = await apiRequest<{ orders: Order[] }>('/api/admin/orders');
    return res.orders;
  },

  async updateAdminOrderStatus(
    id: number,
    data: { orderStatus?: string; paymentStatus?: string }
  ): Promise<void> {
    await apiRequest(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getAdminCustomers(): Promise<AdminCustomer[]> {
    const res = await apiRequest<{ customers: AdminCustomer[] }>('/api/admin/customers');
    return res.customers;
  },

  async getAdminCustomerOrders(customerId: number): Promise<Order[]> {
    const res = await apiRequest<{ orders: Order[] }>(
      `/api/admin/customers/${customerId}/orders`
    );
    return res.orders;
  },

  async uploadProductImage(dataUrl: string, filename: string): Promise<string> {
    const res = await apiRequest<{ imageUrl: string }>('/api/admin/upload', {
      method: 'POST',
      body: JSON.stringify({ dataUrl, filename }),
    });
    return res.imageUrl;
  },

  async createProduct(payload: any): Promise<void> {
    await apiRequest('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateProduct(id: number, payload: any): Promise<void> {
    await apiRequest(`/api/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteProduct(id: number): Promise<void> {
    await apiRequest(`/api/admin/products/${id}`, { method: 'DELETE' });
  },

  async createCategory(payload: { name: string; description: string; imageUrl: string }): Promise<void> {
    await apiRequest('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

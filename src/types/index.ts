export interface UserProfile {
  id: number;
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin' | string;
  emailVerified: boolean;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  productCount?: number;
  createdAt?: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  unit: string;
  price: string;
  originalPrice: string | null;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  imageUrl: string;
  stock: number;
  isFeatured: boolean;
  salesCount: number;
  createdAt: string;
}

export interface CartItem {
  id?: number;
  productId: number;
  quantity: number;
  name: string;
  unit: string;
  price: string;
  originalPrice: string | null;
  imageUrl: string;
  stock: number;
  categoryName: string;
  itemSubtotal: string;
}

export interface CartSummary {
  totalQuantity: number;
  subtotal: string;
  deliveryFee: string;
  freeDeliveryThreshold: number;
  savings: string;
  total: string;
}

export interface CartResponse {
  items: CartItem[];
  summary: CartSummary;
}

export interface Address {
  id: number;
  userId: number;
  fullName: string;
  phone: string;
  houseNumber: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
  createdAt: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number | null;
  productName: string;
  productImage: string;
  price: string;
  quantity: number;
  subtotal: string;
}

export interface ShippingSnapshot {
  fullName: string;
  email: string;
  phone: string;
  houseNumber: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  userId: number;
  addressId: number | null;
  shippingAddress: ShippingSnapshot;
  subtotal: string;
  deliveryFee: string;
  discount: string;
  totalAmount: string;
  paymentMethod: 'cash_on_delivery' | 'online_test_pending' | string;
  paymentStatus: PaymentStatus | string;
  orderStatus: OrderStatus | string;
  deliveryInstructions: string | null;
  createdAt: string;
  items: OrderItem[];
  customerName?: string;
  customerEmail?: string;
}

export interface AdminStats {
  totalProducts: number;
  totalCustomers: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: string;
}

export interface AdminCustomer {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  orderCount: number;
  totalSpent: string;
}

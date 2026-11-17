import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { cartService } from '../services/cartService.ts';
import { CartItem, CartResponse, CartSummary, Product } from '../types/index.ts';
import { useAuth } from './AuthContext.tsx';

const GUEST_CART_KEY = 'freshcart_guest_cart_v1';
const FREE_DELIVERY_THRESHOLD = 35;
const STANDARD_DELIVERY_FEE = 4.99;

interface StoredGuestItem {
  productId: number;
  quantity: number;
  name: string;
  unit: string;
  price: string;
  originalPrice: string | null;
  imageUrl: string;
  stock: number;
  categoryName: string;
}

interface CartContextValue {
  items: CartItem[];
  summary: CartSummary;
  isLoading: boolean;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  updateQuantity: (productId: number, quantity: number) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  getItemQuantity: (productId: number) => number;
}

const EMPTY_SUMMARY: CartSummary = {
  totalQuantity: 0,
  subtotal: '0.00',
  deliveryFee: '0.00',
  freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
  savings: '0.00',
  total: '0.00',
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

function computeGuestCart(raw: StoredGuestItem[]): CartResponse {
  let subtotal = 0;
  let totalQuantity = 0;
  let savings = 0;

  const items: CartItem[] = raw.map((item) => {
    const unitPrice = Number(item.price);
    const orig = item.originalPrice ? Number(item.originalPrice) : unitPrice;
    const line = unitPrice * item.quantity;
    subtotal += line;
    totalQuantity += item.quantity;
    if (orig > unitPrice) {
      savings += (orig - unitPrice) * item.quantity;
    }
    return {
      ...item,
      itemSubtotal: line.toFixed(2),
    };
  });

  const deliveryFee =
    subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
  const total = subtotal + deliveryFee;

  return {
    items,
    summary: {
      totalQuantity,
      subtotal: subtotal.toFixed(2),
      deliveryFee: deliveryFee.toFixed(2),
      freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
      savings: savings.toFixed(2),
      total: total.toFixed(2),
    },
  };
}

function loadGuestItems(): StoredGuestItem[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveGuestItems(items: StoredGuestItem[]) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isVerified, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState<CartSummary>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(false);

  const applyResponse = useCallback((res: CartResponse) => {
    setItems(res.items);
    setSummary(res.summary);
  }, []);

  const refreshCart = useCallback(async () => {
    if (isAuthenticated && isVerified) {
      setIsLoading(true);
      try {
        const guest = loadGuestItems();
        if (guest.length > 0) {
          const synced = await cartService.syncGuestItems(
            guest.map((g) => ({ productId: g.productId, quantity: g.quantity }))
          );
          localStorage.removeItem(GUEST_CART_KEY);
          applyResponse(synced);
        } else {
          const serverCart = await cartService.getCart();
          applyResponse(serverCart);
        }
      } catch (err) {
        console.error('Cart load error:', err);
      } finally {
        setIsLoading(false);
      }
    } else {
      const guest = loadGuestItems();
      applyResponse(computeGuestCart(guest));
    }
  }, [isAuthenticated, isVerified, applyResponse]);

  useEffect(() => {
    if (!authLoading) {
      refreshCart();
    }
  }, [authLoading, refreshCart]);

  const addToCart = async (product: Product, quantity = 1) => {
    if (product.stock <= 0) {
      toast.error(`${product.name} is currently out of stock.`);
      return;
    }

    if (isAuthenticated && isVerified) {
      try {
        const res = await cartService.addItem(product.id, quantity);
        applyResponse(res);
        toast.success(`Added ${product.name} to cart`);
      } catch (err: any) {
        toast.error(err?.message || 'Unable to add item to cart.');
      }
      return;
    }

    const guest = loadGuestItems();
    const idx = guest.findIndex((i) => i.productId === product.id);
    const currentQty = idx >= 0 ? guest[idx].quantity : 0;
    const nextQty = currentQty + quantity;
    if (nextQty > product.stock) {
      toast.error(`Only ${product.stock} unit(s) of ${product.name} in stock.`);
      return;
    }

    if (idx >= 0) {
      guest[idx].quantity = nextQty;
      guest[idx].stock = product.stock;
      guest[idx].price = product.price;
    } else {
      guest.push({
        productId: product.id,
        quantity: nextQty,
        name: product.name,
        unit: product.unit,
        price: product.price,
        originalPrice: product.originalPrice,
        imageUrl: product.imageUrl,
        stock: product.stock,
        categoryName: product.categoryName,
      });
    }

    saveGuestItems(guest);
    applyResponse(computeGuestCart(guest));
    toast.success(`Added ${product.name} to cart`);
  };

  const updateQuantity = async (productId: number, quantity: number) => {
    if (isAuthenticated && isVerified) {
      try {
        const res = await cartService.updateQuantity(productId, quantity);
        applyResponse(res);
      } catch (err: any) {
        toast.error(err?.message || 'Could not update quantity.');
      }
      return;
    }

    const guest = loadGuestItems();
    const idx = guest.findIndex((i) => i.productId === productId);
    if (idx < 0) return;

    if (quantity <= 0) {
      guest.splice(idx, 1);
    } else {
      if (quantity > guest[idx].stock) {
        toast.error(`Only ${guest[idx].stock} unit(s) available in stock.`);
        return;
      }
      guest[idx].quantity = quantity;
    }

    saveGuestItems(guest);
    applyResponse(computeGuestCart(guest));
  };

  const removeItem = async (productId: number) => {
    if (isAuthenticated && isVerified) {
      try {
        const res = await cartService.removeItem(productId);
        applyResponse(res);
        toast.success('Item removed from cart');
      } catch (err: any) {
        toast.error(err?.message || 'Could not remove item.');
      }
      return;
    }

    const guest = loadGuestItems().filter((i) => i.productId !== productId);
    saveGuestItems(guest);
    applyResponse(computeGuestCart(guest));
    toast.success('Item removed from cart');
  };

  const clearCart = async () => {
    if (isAuthenticated && isVerified) {
      try {
        const res = await cartService.clearCart();
        applyResponse(res);
      } catch (err: any) {
        toast.error(err?.message || 'Could not clear cart.');
      }
      return;
    }
    localStorage.removeItem(GUEST_CART_KEY);
    applyResponse(computeGuestCart([]));
  };

  const getItemQuantity = (productId: number) => {
    return items.find((i) => i.productId === productId)?.quantity ?? 0;
  };

  return (
    <CartContext.Provider
      value={{
        items,
        summary,
        isLoading,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart,
        getItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}

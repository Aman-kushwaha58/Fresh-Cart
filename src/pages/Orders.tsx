import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Package, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { OrderStatusBadge } from '../components/common/OrderStatusBadge.tsx';
import { ProductImage } from '../components/common/ProductImage.tsx';
import { Button } from '../components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog.tsx';
import { orderService } from '../services/orderService.ts';
import { Order } from '../types/index.ts';
import { cn, formatCurrency, formatDateTime } from '../utils/format.ts';

const TRACKING_STEPS = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
];

export default function Orders() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => orderService.getMyOrders(),
  });

  const cancelMutation = useMutation({
    mutationFn: (orderId: number) => orderService.cancelOrder(orderId),
    onSuccess: (updated) => {
      toast.success(`Order ${updated.orderNumber} cancelled and stock restored.`);
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (selectedOrder?.id === updated.id) {
        setSelectedOrder(updated);
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Could not cancel this order.');
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-gray-900">
            My Orders
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track live delivery progress, review itemized receipts, or cancel eligible orders.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/products">Shop More Groceries</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-40 rounded-xl border border-gray-200 bg-white animate-pulse"
            />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-[#16A34A]">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h2 className="font-display text-xl font-bold text-gray-900">
            No orders placed yet
          </h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Once you check out your fresh groceries, every order and live tracking step will appear here.
          </p>
          <Button asChild>
            <Link to="/products">Browse Products</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => {
            const canCancel = ['pending', 'confirmed'].includes(order.orderStatus);
            const activeStepIdx = TRACKING_STEPS.indexOf(order.orderStatus);

            return (
              <article
                key={order.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono-nums text-base font-bold text-gray-900">
                        {order.orderNumber}
                      </span>
                      <span aria-hidden="true" className="text-gray-300">·</span>
                      <OrderStatusBadge status={order.orderStatus} />
                    </div>
                    <p className="text-xs text-gray-500">
                      Placed {formatDateTime(order.createdAt)} ·{' '}
                      {order.paymentMethod === 'cash_on_delivery'
                        ? 'Cash on Delivery'
                        : 'Online Payment'}{' '}
                      ({order.paymentStatus})
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono-nums text-lg font-bold text-gray-900 mr-2">
                      {formatCurrency(order.totalAmount)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Details</span>
                    </Button>
                    {canCancel && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate(order.id)}
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      >
                        Cancel Order
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress Stepper */}
                {order.orderStatus !== 'cancelled' && (
                  <div className="grid grid-cols-5 gap-2">
                    {TRACKING_STEPS.map((step, index) => {
                      const done = activeStepIdx >= index;
                      return (
                        <div key={step} className="space-y-1.5">
                          <div
                            className={cn(
                              'h-1.5 rounded-full transition-colors',
                              done ? 'bg-[#16A34A]' : 'bg-gray-200'
                            )}
                          />
                          <p
                            className={cn(
                              'text-[11px] capitalize font-medium truncate',
                              done ? 'text-[#15803D]' : 'text-gray-400'
                            )}
                          >
                            {step}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Product Thumbnails Preview */}
                <div className="flex flex-wrap items-center gap-3">
                  {order.items.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2 text-xs"
                    >
                      <div className="h-9 w-10 rounded overflow-hidden bg-white shrink-0">
                        <ProductImage
                          src={item.productImage}
                          alt={item.productName}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 max-w-[140px] truncate">
                          {item.productName}
                        </p>
                        <p className="text-gray-500 font-mono-nums">
                          ×{item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                  {order.items.length > 4 && (
                    <span className="text-xs font-medium text-gray-500">
                      +{order.items.length - 4} more item(s)
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Order Details Modal */}
      <Dialog
        open={Boolean(selectedOrder)}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      >
        <DialogContent className="max-w-2xl">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-mono-nums">
                  <Package className="h-5 w-5 text-[#16A34A]" />
                  <span>{selectedOrder.orderNumber}</span>
                </DialogTitle>
                <DialogDescription>
                  Placed on {formatDateTime(selectedOrder.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 p-4">
                  <div>
                    <p className="text-xs text-gray-500">Order Status</p>
                    <OrderStatusBadge status={selectedOrder.orderStatus} className="mt-1" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Payment</p>
                    <p className="font-medium text-gray-900 mt-1">
                      {selectedOrder.paymentMethod === 'cash_on_delivery'
                        ? 'Cash on Delivery'
                        : 'Online'}{' '}
                      · <span className="capitalize">{selectedOrder.paymentStatus}</span>
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-1.5">
                    Delivery Destination
                  </h3>
                  <p className="text-gray-700">
                    {selectedOrder.shippingAddress.fullName} ·{' '}
                    {selectedOrder.shippingAddress.phone}
                  </p>
                  <p className="text-gray-600">
                    {selectedOrder.shippingAddress.houseNumber},{' '}
                    {selectedOrder.shippingAddress.streetAddress},{' '}
                    {selectedOrder.shippingAddress.city},{' '}
                    {selectedOrder.shippingAddress.state}{' '}
                    {selectedOrder.shippingAddress.postalCode}
                  </p>
                  {selectedOrder.deliveryInstructions && (
                    <p className="text-xs text-gray-500 mt-1">
                      Note: {selectedOrder.deliveryInstructions}
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Ordered Products
                  </h3>
                  <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                    {selectedOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 p-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-11 w-12 rounded overflow-hidden bg-gray-100 shrink-0">
                            <ProductImage
                              src={item.productImage}
                              alt={item.productName}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {item.productName}
                            </p>
                            <p className="text-xs text-gray-500 font-mono-nums">
                              {item.quantity} × {formatCurrency(item.price)}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono-nums font-semibold text-gray-900">
                          {formatCurrency(item.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-gray-100 pt-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-mono-nums">
                      {formatCurrency(selectedOrder.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery Fee</span>
                    <span className="font-mono-nums">
                      {Number(selectedOrder.deliveryFee) === 0
                        ? 'Free'
                        : formatCurrency(selectedOrder.deliveryFee)}
                    </span>
                  </div>
                  {Number(selectedOrder.discount) > 0 && (
                    <div className="flex justify-between text-[#16A34A]">
                      <span>Discount</span>
                      <span className="font-mono-nums">
                        -{formatCurrency(selectedOrder.discount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base text-gray-900 pt-1">
                    <span>Total Amount</span>
                    <span className="font-mono-nums">
                      {formatCurrency(selectedOrder.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

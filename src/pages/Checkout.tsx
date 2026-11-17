import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  PackageCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { ProductImage } from '../components/common/ProductImage.tsx';
import { Button } from '../components/ui/button.tsx';
import { Checkbox } from '../components/ui/checkbox.tsx';
import { Input } from '../components/ui/input.tsx';
import { Label } from '../components/ui/label.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useCart } from '../context/CartContext.tsx';
import { orderService } from '../services/orderService.ts';
import { Address, Order } from '../types/index.ts';
import { cn, formatCurrency } from '../utils/format.ts';

const checkoutSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  email: z.string().trim().email('Valid email address is required'),
  phone: z.string().trim().min(7, 'Valid phone number is required'),
  houseNumber: z.string().trim().min(1, 'House / apartment number is required'),
  streetAddress: z.string().trim().min(4, 'Street address is required'),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State is required'),
  postalCode: z.string().trim().min(3, 'Postal code is required'),
  deliveryInstructions: z.string().max(300).optional(),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const { user } = useAuth();
  const { items, summary, refreshCart } = useCart();
  const queryClient = useQueryClient();

  const [paymentMethod, setPaymentMethod] = useState<'cash_on_delivery' | 'online_test_pending'>('cash_on_delivery');
  const [saveAddress, setSaveAddress] = useState(true);
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  const { data: savedAddresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => orderService.getAddresses(),
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      houseNumber: '',
      streetAddress: '',
      city: '',
      state: '',
      postalCode: '',
      deliveryInstructions: '',
    },
  });

  useEffect(() => {
    if (user) {
      setValue('fullName', user.fullName);
      setValue('email', user.email);
      if (user.phone) setValue('phone', user.phone);
    }
  }, [user, setValue]);

  const applySavedAddress = (addr: Address) => {
    setValue('fullName', addr.fullName);
    setValue('phone', addr.phone);
    setValue('houseNumber', addr.houseNumber);
    setValue('streetAddress', addr.address);
    setValue('city', addr.city);
    setValue('state', addr.state);
    setValue('postalCode', addr.postalCode);
    toast.success('Address populated from saved list');
  };

  const subtotalNum = Number(summary.subtotal);
  const deliveryFeeNum = Number(summary.deliveryFee);
  const promoDiscount =
    appliedPromo.toUpperCase() === 'FRESH10'
      ? Math.min(subtotalNum * 0.1, 15)
      : 0;
  const finalPayable = Math.max(0, subtotalNum + deliveryFeeNum - promoDiscount);

  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    if (code === 'FRESH10') {
      setAppliedPromo(code);
      toast.success('Promo code FRESH10 applied (10% off subtotal)');
    } else {
      toast.error('Invalid promo code. Try FRESH10 for 10% off.');
    }
  };

  const onSubmit = async (values: CheckoutFormValues) => {
    if (paymentMethod === 'online_test_pending') {
      toast.error(
        'Online payment gateway is prepared for future configuration. Please select Cash on Delivery to place your order.'
      );
      return;
    }

    try {
      const order = await orderService.placeOrder({
        ...values,
        paymentMethod,
        saveAddress,
        promoCode: appliedPromo || undefined,
      });
      setConfirmedOrder(order);
      await refreshCart();
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success(`Order ${order.orderNumber} placed!`);
    } catch (err: any) {
      toast.error(err?.message || 'Unable to place order. Please review your details.');
    }
  };

  // Order Confirmation State
  if (confirmedOrder) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-10 space-y-8">
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-[#16A34A]">
              <PackageCheck className="h-8 w-8" />
            </div>
            <p className="text-sm font-semibold text-[#16A34A]">
              Order Confirmed
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900">
              Thank you, {confirmedOrder.shippingAddress.fullName}
            </h1>
            <p className="text-sm text-gray-600">
              Order <strong className="font-mono-nums text-gray-900">{confirmedOrder.orderNumber}</strong> has been received and is now pending preparation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 rounded-xl bg-gray-50 p-5 text-sm">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">
                Delivery Address
              </p>
              <p className="font-medium text-gray-900">
                {confirmedOrder.shippingAddress.fullName}
              </p>
              <p className="text-gray-600">
                {confirmedOrder.shippingAddress.houseNumber},{' '}
                {confirmedOrder.shippingAddress.streetAddress}
              </p>
              <p className="text-gray-600">
                {confirmedOrder.shippingAddress.city},{' '}
                {confirmedOrder.shippingAddress.state}{' '}
                {confirmedOrder.shippingAddress.postalCode}
              </p>
              <p className="text-gray-600 mt-1">
                {confirmedOrder.shippingAddress.phone}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">
                Payment & Total
              </p>
              <p className="font-medium text-gray-900">
                Cash on Delivery
              </p>
              <p className="text-gray-600 mt-1">
                Payment Status: <span className="capitalize font-medium">{confirmedOrder.paymentStatus}</span>
              </p>
              <p className="font-mono-nums text-lg font-bold text-gray-900 mt-2">
                {formatCurrency(confirmedOrder.totalAmount)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">
              Ordered Items ({confirmedOrder.items.length})
            </h2>
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
              {confirmedOrder.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 p-3.5 text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-14 rounded-md overflow-hidden bg-gray-100 shrink-0">
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
                        Qty {item.quantity} × {formatCurrency(item.price)}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono-nums font-semibold text-gray-900 shrink-0">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button asChild size="lg" className="flex-1">
              <Link to="/orders">Track My Order</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="flex-1">
              <Link to="/products">Continue Shopping</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-gray-900">
          Your cart is empty
        </h1>
        <p className="text-sm text-gray-500">
          Add grocery items to your cart before proceeding to checkout.
        </p>
        <Button asChild>
          <Link to="/products">Browse Groceries</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="font-display text-3xl font-bold tracking-tight text-gray-900">
          Checkout
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Enter your delivery details and confirm your FreshCart order.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
      >
        {/* Left: Delivery & Payment Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Saved Addresses Quick Pick */}
          {savedAddresses.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <MapPin className="h-4 w-4 text-[#16A34A]" />
                <span>Saved Delivery Addresses</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => applySavedAddress(addr)}
                    className="text-left rounded-xl border border-gray-200 p-3 text-xs hover:border-[#16A34A] hover:bg-green-50/30 transition-colors cursor-pointer"
                  >
                    <p className="font-semibold text-gray-900">{addr.fullName}</p>
                    <p className="text-gray-600 mt-0.5 line-clamp-1">
                      {addr.houseNumber}, {addr.address}
                    </p>
                    <p className="text-gray-500">
                      {addr.city}, {addr.state} {addr.postalCode}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customer Details */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-gray-900">
              1. Customer Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" {...register('fullName')} />
                {errors.fullName && (
                  <p className="text-xs text-red-600">{errors.fullName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && (
                  <p className="text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" placeholder="+1 (555) 234-5678" {...register('phone')} />
                {errors.phone && (
                  <p className="text-xs text-red-600">{errors.phone.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Delivery Information */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-gray-900">
              2. Delivery Address
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="houseNumber">House / Apt Number</Label>
                <Input
                  id="houseNumber"
                  placeholder="Apt 4B / #128"
                  {...register('houseNumber')}
                />
                {errors.houseNumber && (
                  <p className="text-xs text-red-600">
                    {errors.houseNumber.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input id="postalCode" placeholder="94107" {...register('postalCode')} />
                {errors.postalCode && (
                  <p className="text-xs text-red-600">
                    {errors.postalCode.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="streetAddress">Street Address</Label>
                <Input
                  id="streetAddress"
                  placeholder="742 Evergreen Terrace"
                  {...register('streetAddress')}
                />
                {errors.streetAddress && (
                  <p className="text-xs text-red-600">
                    {errors.streetAddress.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" placeholder="San Francisco" {...register('city')} />
                {errors.city && (
                  <p className="text-xs text-red-600">{errors.city.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">State / Province</Label>
                <Input id="state" placeholder="CA" {...register('state')} />
                {errors.state && (
                  <p className="text-xs text-red-600">{errors.state.message}</p>
                )}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="deliveryInstructions">
                  Delivery Instructions (Optional)
                </Label>
                <Input
                  id="deliveryInstructions"
                  placeholder="Leave at front porch, ring bell once"
                  {...register('deliveryInstructions')}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="saveAddress"
                checked={saveAddress}
                onCheckedChange={(c) => setSaveAddress(Boolean(c))}
              />
              <Label htmlFor="saveAddress" className="text-sm font-normal text-gray-600 cursor-pointer">
                Save this address to my profile for faster checkout
              </Label>
            </div>
          </div>

          {/* Payment Options */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-gray-900">
              3. Payment Method
            </h2>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash_on_delivery')}
                className={cn(
                  'w-full flex items-start gap-3 rounded-xl border p-4 text-left transition-all cursor-pointer',
                  paymentMethod === 'cash_on_delivery'
                    ? 'border-[#16A34A] bg-green-50/40'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <Banknote className="h-5 w-5 text-[#16A34A] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">
                      Cash on Delivery (COD)
                    </span>
                    {paymentMethod === 'cash_on_delivery' && (
                      <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Pay with cash or local UPI/card terminal when your fresh groceries arrive at your doorstep.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('online_test_pending')}
                className={cn(
                  'w-full flex items-start gap-3 rounded-xl border p-4 text-left transition-all cursor-pointer',
                  paymentMethod === 'online_test_pending'
                    ? 'border-amber-500 bg-amber-50/40'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <CreditCard className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">
                      Online Card / Gateway Checkout (Gateway Configuration Pending)
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Prepared for Stripe / Razorpay API integration. Live card processing requires merchant keys in environment configuration.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Order Summary */}
        <aside className="lg:col-span-5 rounded-2xl border border-gray-200 bg-white p-6 space-y-5 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-bold text-gray-900">
            Order Summary ({summary.totalQuantity} items)
          </h2>

          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 pr-1">
            {items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-12 w-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    <ProductImage
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 font-mono-nums">
                      Qty {item.quantity} × {formatCurrency(item.price)}
                    </p>
                  </div>
                </div>
                <span className="font-mono-nums font-semibold text-gray-900 shrink-0">
                  {formatCurrency(item.itemSubtotal)}
                </span>
              </div>
            ))}
          </div>

          {/* Promo Code */}
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <Input
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              placeholder="Promo code (e.g. FRESH10)"
            />
            <Button type="button" variant="outline" onClick={handleApplyPromo}>
              Apply
            </Button>
          </div>

          <div className="space-y-2.5 text-sm border-t border-gray-100 pt-4">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-mono-nums font-medium text-gray-900">
                {formatCurrency(subtotalNum)}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery Fee</span>
              <span className="font-mono-nums font-medium text-gray-900">
                {deliveryFeeNum === 0 ? 'Free' : formatCurrency(deliveryFeeNum)}
              </span>
            </div>
            {promoDiscount > 0 && (
              <div className="flex justify-between text-[#16A34A]">
                <span>Promo ({appliedPromo})</span>
                <span className="font-mono-nums font-semibold">
                  -{formatCurrency(promoDiscount)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-baseline justify-between border-t border-gray-100 pt-4">
            <span className="text-base font-bold text-gray-900">Total Payable</span>
            <span className="font-mono-nums text-2xl font-bold text-gray-900">
              {formatCurrency(finalPayable)}
            </span>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSubmitting || paymentMethod === 'online_test_pending'}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Placing Order...</span>
              </>
            ) : paymentMethod === 'online_test_pending' ? (
              'Select Cash on Delivery to Continue'
            ) : (
              `Place Order · ${formatCurrency(finalPayable)}`
            )}
          </Button>
        </aside>
      </form>
    </div>
  );
}

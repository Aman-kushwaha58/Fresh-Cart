import {
  CheckCircle2,
  Clock,
  PackageCheck,
  RefreshCw,
  Truck,
  XCircle,
} from 'lucide-react';
import { cn } from '../../utils/format.ts';

const STATUS_META: Record<
  string,
  { label: string; color: string; Icon: typeof Clock }
> = {
  pending: {
    label: 'Pending',
    color: 'text-amber-700',
    Icon: Clock,
  },
  confirmed: {
    label: 'Confirmed',
    color: 'text-sky-700',
    Icon: CheckCircle2,
  },
  processing: {
    label: 'Processing',
    color: 'text-indigo-700',
    Icon: RefreshCw,
  },
  shipped: {
    label: 'Shipped',
    color: 'text-emerald-700',
    Icon: Truck,
  },
  delivered: {
    label: 'Delivered',
    color: 'text-[#15803D]',
    Icon: PackageCheck,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-700',
    Icon: XCircle,
  },
  paid: {
    label: 'Paid',
    color: 'text-[#15803D]',
    Icon: CheckCircle2,
  },
  failed: {
    label: 'Failed',
    color: 'text-red-700',
    Icon: XCircle,
  },
  refunded: {
    label: 'Refunded',
    color: 'text-gray-600',
    Icon: RefreshCw,
  },
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const meta = STATUS_META[status.toLowerCase()] ?? {
    label: status,
    color: 'text-gray-700',
    Icon: Clock,
  };
  const Icon = meta.Icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap',
        meta.color,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{meta.label}</span>
    </span>
  );
}

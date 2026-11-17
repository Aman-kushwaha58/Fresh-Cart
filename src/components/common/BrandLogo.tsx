import { Leaf } from 'lucide-react';
import { cn } from '../../utils/format.ts';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function BrandLogo({ className, size = 'md' }: BrandLogoProps) {
  const iconSize =
    size === 'sm' ? 'h-5 w-5' : size === 'lg' ? 'h-7 w-7' : 'h-6 w-6';
  const boxSize =
    size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-10 w-10' : 'h-9 w-9';
  const textSize =
    size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 select-none',
        className
      )}
    >
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-lg bg-[#16A34A] text-white',
          boxSize
        )}
      >
        <Leaf className={cn(iconSize, 'stroke-[2.2]')} />
      </span>
      <span
        className={cn(
          'font-display font-bold tracking-tight text-gray-900',
          textSize
        )}
      >
        Fresh<span className="text-[#16A34A]">Cart</span>
      </span>
    </span>
  );
}

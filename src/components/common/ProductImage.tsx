import { useState } from 'react';
import { Leaf } from 'lucide-react';
import { cn } from '../../utils/format.ts';

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function ProductImage({ src, alt, className }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-gray-100 text-green-700/70 p-4 text-center',
          className
        )}
      >
        <Leaf className="h-8 w-8 mb-1.5 opacity-70" />
        <span className="text-xs font-medium text-gray-500 line-clamp-2 max-w-[14ch]">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  );
}

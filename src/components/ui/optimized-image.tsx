import { useState, useRef, useEffect, ImgHTMLAttributes, memo } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  lazy?: boolean;
  blur?: boolean;
}

/**
 * Optimized image component with lazy loading and blur placeholder
 */
export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  fallback,
  lazy = true,
  blur = true,
  className,
  ...props
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Reset state when src changes
    setLoaded(false);
    setError(false);
  }, [src]);

  const handleLoad = () => {
    setLoaded(true);
  };

  const handleError = () => {
    setError(true);
    if (fallback && imgRef.current) {
      imgRef.current.src = fallback;
    }
  };

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      loading={lazy ? 'lazy' : 'eager'}
      decoding="async"
      onLoad={handleLoad}
      onError={handleError}
      className={cn(
        'transition-all duration-300',
        blur && !loaded && 'blur-sm opacity-0',
        loaded && 'blur-0 opacity-100',
        className
      )}
      {...props}
    />
  );
});

/**
 * Preload critical images
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Preload multiple images in parallel
 */
export async function preloadImages(sources: string[]): Promise<void[]> {
  return Promise.all(sources.map(preloadImage));
}

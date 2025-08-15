import { useState } from "react";
import { Package } from "lucide-react";

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

export function ProductImage({ 
  src, 
  alt, 
  className = "w-full h-full object-cover",
  fallbackClassName = "h-6 w-6 text-gray-400"
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // If no src provided or error occurred, show fallback
  if (!src || hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <Package className={fallbackClassName} />
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <Package className={fallbackClassName} />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ display: isLoading ? 'none' : 'block' }}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
      />
    </>
  );
}
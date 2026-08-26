"use client";

import { useState, useCallback } from "react";
import Image, { type ImageProps } from "next/image";
import { BLUR_PLACEHOLDER } from "@/lib/media/imageOptimization";

const FALLBACK_SRC = "/images/placeholder-product.svg";

interface OptimizedImageProps extends Omit<ImageProps, "onError"> {
  /** Show blur placeholder while loading (default: true) */
  blurPlaceholder?: boolean;
}

export default function OptimizedImage({
  src,
  alt,
  width = 300,
  height = 300,
  className = "",
  blurPlaceholder = true,
  priority = false,
  ...rest
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    if (!hasError) setHasError(true);
  }, [hasError]);

  const resolvedSrc = hasError ? FALLBACK_SRC : src;

  return (
    <Image
      src={resolvedSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? undefined : "lazy"}
      placeholder={blurPlaceholder && !priority ? "blur" : undefined}
      blurDataURL={blurPlaceholder && !priority ? BLUR_PLACEHOLDER : undefined}
      onError={handleError}
      {...rest}
    />
  );
}

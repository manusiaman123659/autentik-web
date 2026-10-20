"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useWishlist, type WishlistItem } from "@/components/store/useWishlist";

interface WishlistButtonProps {
  product: WishlistItem;
  variant?: "card" | "detail" | "bar";
  className?: string;
}

export default function WishlistButton({ product, variant = "card", className = "" }: WishlistButtonProps) {
  const { has, toggle } = useWishlist();
  const t = useTranslations("products.storeUi");
  const isWishlisted = has(product.id);
  const [animating, setAnimating] = useState(false);

  const handleToggle = () => {
    toggle(product);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 150);
  };

  if (variant === "card") {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleToggle();
        }}
        aria-label={t(isWishlisted ? "wishlistRemove" : "wishlistAdd")}
        aria-pressed={isWishlisted}
        className="absolute bottom-2 right-2 z-10 w-11 h-11 rounded border border-base flex items-center justify-center focus-visible:outline-2 motion-reduce:!transform-none"
        style={{
          backgroundColor: "var(--bg-card)",
          transform: animating ? "scale(1.15)" : undefined,
        }}
      >
        <Heart
          size={14}
          className={isWishlisted ? "text-red-700 dark:text-red-400" : "text-slate-600 dark:text-slate-300"}
          fill={isWishlisted ? "currentColor" : "none"}
        />
      </button>
    );
  }

  if (variant === "detail") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        aria-label={t(isWishlisted ? "wishlistRemove" : "wishlistAdd")}
        aria-pressed={isWishlisted}
        className={`flex-shrink-0 w-11 h-11 rounded border flex items-center justify-center focus-visible:outline-2 motion-reduce:!transform-none ${className}`}
        style={{
          borderColor: isWishlisted ? "#ef4444" : "var(--border-subtle)",
          color: isWishlisted ? "#b91c1c" : "var(--text-secondary)",
          backgroundColor: isWishlisted ? "#fef2f2" : "var(--bg-card)",
          transform: animating ? "scale(1.1)" : undefined,
        }}
      >
        <Heart
          size={16}
          fill={isWishlisted ? "currentColor" : "none"}
        />
      </button>
    );
  }

  // variant === "bar"
  return (
    <button
      type="button"
      onClick={handleToggle}
        aria-label={t(isWishlisted ? "wishlistRemove" : "wishlistAdd")}
        aria-pressed={isWishlisted}
        className={`flex-shrink-0 w-11 h-11 rounded flex items-center justify-center focus-visible:outline-2 motion-reduce:!transform-none ${className}`}
      style={{
        border: `1px solid ${isWishlisted ? "#ef4444" : "var(--border-subtle)"}`,
        color: isWishlisted ? "#ef4444" : "var(--text-secondary)",
        backgroundColor: "var(--bg-card)",
        transform: animating ? "scale(1.1)" : undefined,
      }}
    >
      <Heart
        size={16}
        fill={isWishlisted ? "currentColor" : "none"}
      />
    </button>
  );
}

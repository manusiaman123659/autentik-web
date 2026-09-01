"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useWishlist, type WishlistItem } from "@/components/store/useWishlist";

interface WishlistButtonProps {
  product: WishlistItem;
  variant?: "card" | "detail" | "bar";
  className?: string;
}

export default function WishlistButton({ product, variant = "card", className = "" }: WishlistButtonProps) {
  const { has, toggle } = useWishlist();
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
        aria-label={isWishlisted ? "Hapus dari wishlist" : "Tambah ke wishlist"}
        className="absolute bottom-1.5 right-1.5 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all duration-150 hover:scale-110"
        style={{
          backgroundColor: "rgba(255,255,255,0.9)",
          transform: animating ? "scale(1.15)" : undefined,
        }}
      >
        <Heart
          size={14}
          className={isWishlisted ? "text-red-500" : "text-slate-400"}
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
        aria-label={isWishlisted ? "Hapus dari wishlist" : "Tambah ke wishlist"}
        className={`flex-shrink-0 w-9 h-9 rounded-sm border flex items-center justify-center transition-all duration-150 hover:scale-105 ${className}`}
        style={{
          borderColor: isWishlisted ? "#ef4444" : "var(--border-subtle)",
          color: isWishlisted ? "#ef4444" : "var(--text-muted)",
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
      aria-label={isWishlisted ? "Hapus dari wishlist" : "Tambah ke wishlist"}
      className={`flex-shrink-0 w-10 h-10 rounded-sm flex items-center justify-center transition-all duration-150 ${className}`}
      style={{
        border: `1px solid ${isWishlisted ? "#ef4444" : "var(--border-subtle)"}`,
        color: isWishlisted ? "#ef4444" : "var(--text-muted)",
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

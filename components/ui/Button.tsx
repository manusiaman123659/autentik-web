import Link from "next/link";
import { cn } from "@/lib/utils";

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "outline" | "outline-white" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  id?: string;
}

const variantStyles = {
  primary:
    "bg-[#0EA5A0] text-white hover:bg-[#0d9e98] shadow-sm hover:shadow-md",
  secondary:
    "bg-[#0B1F3A] text-white hover:bg-[#0e2a4d] shadow-sm hover:shadow-md",
  outline:
    "border-2 border-navy-900 text-navy-900 hover:bg-navy-900 hover:text-white dark:border-slate-300 dark:text-slate-100 dark:hover:bg-slate-100 dark:hover:text-navy-900",
  "outline-white":
    "border-2 border-white text-white hover:bg-white hover:text-[#0B1F3A]",
  ghost: "text-[#0EA5A0] hover:bg-[#0EA5A0]/10",
};

const sizeStyles = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
};

export default function Button({
  children,
  href,
  onClick,
  variant = "primary",
  size = "md",
  className,
  type = "button",
  disabled = false,
  id,
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 min-w-0 text-center font-semibold rounded-md transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-500",
    variantStyles[variant],
    sizeStyles[size],
    disabled && "opacity-50 cursor-not-allowed",
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes} id={id}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={classes}
      disabled={disabled}
      id={id}
    >
      {children}
    </button>
  );
}

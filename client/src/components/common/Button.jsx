import React from "react";
import { Loader2 } from "lucide-react";

const variants = {
  primary: "bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm focus:ring-emerald-500",
  secondary: "bg-slate-100 hover:bg-slate-200 text-slate-800 focus:ring-slate-400",
  outline: "border border-slate-300 hover:bg-slate-50 text-slate-700 focus:ring-slate-400",
  danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm focus:ring-red-500",
  amber: "bg-amber-600 hover:bg-amber-700 text-white shadow-sm focus:ring-amber-500",
  ghost: "text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:ring-slate-300"
};

const sizes = {
  sm: "px-3 py-1.5 text-xs font-medium rounded-lg",
  md: "px-4 py-2 text-sm font-medium rounded-xl",
  lg: "px-5 py-2.5 text-base font-medium rounded-xl"
};

const Button = ({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  disabled = false,
  type = "button",
  onClick,
  className = "",
  icon: Icon,
  ...props
}) => {
  const baseClasses =
    "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer";
  const variantClasses = variants[variant] || variants.primary;
  const sizeClasses = sizes[size] || sizes.md;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4" />}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};

export default Button;

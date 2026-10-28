import React from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-navy-900 hover:bg-navy-800 text-white shadow-sm hover:shadow transition-all focus:ring-2 focus:ring-navy-900/20',
  teal: 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm hover:shadow transition-all focus:ring-2 focus:ring-teal-600/30',
  sky: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm hover:shadow transition-all focus:ring-2 focus:ring-sky-600/30',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors focus:ring-2 focus:ring-slate-300',
  outline: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-subtle hover:border-slate-400 transition-all focus:ring-2 focus:ring-slate-200',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors focus:ring-2 focus:ring-rose-400',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs font-medium rounded-lg',
  md: 'px-4 py-2 text-sm font-medium rounded-xl',
  lg: 'px-6 py-3 text-base font-semibold rounded-xl',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass = SIZES[size] || SIZES.md;
  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 outline-none select-none ${variantClass} ${sizeClass} ${
        isDisabled ? 'opacity-60 cursor-not-allowed shadow-none' : 'active:scale-[0.98]'
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-4 h-4 shrink-0" />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon className="w-4 h-4 shrink-0" />}
        </>
      )}
    </button>
  );
}

import React from 'react';

const VARIANTS = {
  primary: 'bg-teal-50 text-teal-700 border-teal-200',
  navy: 'bg-navy-50 text-navy-800 border-navy-200',
  sky: 'bg-sky-50 text-sky-700 border-sky-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  outline: 'bg-transparent text-slate-600 border-slate-300',
};

const SIZES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs font-medium',
  lg: 'px-3 py-1.5 text-sm font-medium',
};

export default function Badge({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon: Icon,
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${variantClass} ${sizeClass} tracking-wide transition-colors ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      {children}
    </span>
  );
}

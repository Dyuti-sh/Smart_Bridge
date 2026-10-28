import React from 'react';

export default function Card({
  children,
  className = '',
  hoverEffect = false,
  padding = 'p-6',
  onClick,
  ...props
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-subtle ${
        hoverEffect ? 'hover:shadow-card hover:border-slate-300 transition-all duration-200 cursor-pointer' : ''
      } ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

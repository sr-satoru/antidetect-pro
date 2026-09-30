import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  containerClassName?: string;
  iconClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className = '',
      containerClassName = '',
      iconClassName = '',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <div className={`relative w-full ${containerClassName}`}>
        <select
          ref={ref}
          disabled={disabled}
          className={`w-full cursor-pointer appearance-none rounded-md border border-white/10 bg-[#14151B] px-3 py-2 pr-9 text-[12.5px] text-[#C4C7D5] transition-all hover:border-white/20 focus:border-white/40 focus:ring-1 focus:ring-white/10 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={14}
          className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7E8294] transition-colors ${
            disabled ? 'opacity-40' : ''
          } ${iconClassName}`}
        />
      </div>
    );
  }
);

Select.displayName = 'Select';

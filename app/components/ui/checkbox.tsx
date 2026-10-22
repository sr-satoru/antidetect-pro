import React, { forwardRef, useEffect, useRef } from 'react';
import { Check, Minus } from 'lucide-react';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  indeterminate?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      checked = false,
      indeterminate = false,
      className = '',
      size = 'md',
      disabled = false,
      onChange,
      ...props
    },
    ref
  ) => {
    const defaultRef = useRef<HTMLInputElement>(null);
    const resolvedRef = (ref || defaultRef) as React.RefObject<HTMLInputElement | null>;

    useEffect(() => {
      if (resolvedRef && 'current' in resolvedRef && resolvedRef.current) {
        resolvedRef.current.indeterminate = Boolean(indeterminate);
      }
    }, [indeterminate, resolvedRef]);

    const sizeClasses = {
      sm: 'h-3.5 w-3.5 rounded-[3px]',
      md: 'h-[18px] w-[18px] rounded-[5px]',
      lg: 'h-5 w-5 rounded-[6px]',
    }[size];

    const iconSize = {
      sm: 11,
      md: 13,
      lg: 15,
    }[size];

    const isMarked = Boolean(checked || indeterminate);

    return (
      <label className="relative inline-flex items-center justify-center cursor-pointer select-none">
        <input
          ref={resolvedRef}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          className={`peer appearance-none cursor-pointer border transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3366E6]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#181920] ${sizeClasses} ${
            isMarked
              ? 'bg-[#3366E6] border-[#3366E6] text-white dark:bg-[#3366E6] dark:border-[#3366E6] shadow-xs'
              : 'bg-white dark:bg-[#1A1A21] border-slate-300 dark:border-[#2E2E38] hover:border-[#3366E6] dark:hover:border-[#4B4B58] hover:bg-slate-50 dark:hover:bg-[#24242C]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
          {...props}
        />
        {checked && !indeterminate && (
          <Check
            size={iconSize}
            strokeWidth={3.5}
            className="pointer-events-none absolute text-white transition-transform animate-in zoom-in-95"
          />
        )}
        {indeterminate && (
          <Minus
            size={iconSize}
            strokeWidth={3.5}
            className="pointer-events-none absolute text-white transition-transform animate-in zoom-in-95"
          />
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

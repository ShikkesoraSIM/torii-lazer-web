import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
  fullWidth?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition ' +
  'duration-base ease-torii disabled:opacity-50 disabled:cursor-not-allowed select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-torii focus-visible:ring-offset-2 focus-visible:ring-offset-[#030014]';

const VARIANTS: Record<Variant, string> = {
  primary: 'torii-btn-primary text-white',
  secondary: 'torii-btn-glass',
  danger: 'bg-red-600 text-white hover:bg-red-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]',
  ghost: 'torii-btn-glass !bg-transparent !border-transparent !shadow-none hover:!bg-white/10 hover:!border-white/15',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 !px-3 !py-0 text-2xs',
  md: 'h-10 !px-4 !py-0 text-sm',
  lg: 'h-12 !px-6 !py-0 text-base',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading = false, fullWidth = false, className = '', disabled, children, ...rest },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading && (
        <>
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden
          />
          <span className="sr-only">Loading</span>
        </>
      )}
      {children}
    </button>
  ),
);

Button.displayName = 'Button';

export default Button;

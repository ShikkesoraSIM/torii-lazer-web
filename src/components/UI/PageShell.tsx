import React from 'react';

interface PageShellProps {
  children: React.ReactNode;
  width?: 'narrow' | 'medium' | 'wide';
  className?: string;
}

const WIDTH_CLASSES: Record<NonNullable<PageShellProps['width']>, string> = {
  narrow: 'max-w-4xl',
  medium: 'max-w-6xl',
  wide: 'max-w-7xl 3xl:max-w-[1536px]',
};

/**
 * Shared page wrapper providing unified background stage, horizontal gutters,
 * ultrawide scaling, and consistent vertical spacing across views.
 */
export const PageShell: React.FC<PageShellProps> = ({
  children,
  width = 'wide',
  className = '',
}) => (
  <div className="min-h-screen torii-page-stage">
    <div
      className={`${WIDTH_CLASSES[width]} mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 ${className}`}
    >
      {children}
    </div>
  </div>
);

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  eyebrow,
  actions,
  align = 'left',
  className = '',
}) => {
  if (align === 'center') {
    return (
      <header className={`mb-6 sm:mb-8 text-center ${className}`}>
        {eyebrow && (
          <p className="mb-1.5 text-2xs font-semibold uppercase tracking-widest text-torii">
            {eyebrow}
          </p>
        )}
        <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 mx-auto max-w-2xl text-sm sm:text-base text-text-secondary">
            {subtitle}
          </p>
        )}
        {actions && <div className="mt-4 flex flex-wrap justify-center gap-3">{actions}</div>}
      </header>
    );
  }

  return (
    <header
      className={`mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${className}`}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-2xs font-semibold uppercase tracking-widest text-torii">
            {eyebrow}
          </p>
        )}
        <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-sm sm:text-base text-text-secondary">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">{actions}</div>}
    </header>
  );
};

export default PageShell;

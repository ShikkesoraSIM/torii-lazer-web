import React from 'react';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  tone?: 'neutral' | 'error';
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  onRetry,
  retryLabel = 'Try again',
  tone = 'neutral',
  className = '',
}) => {
  const isError = tone === 'error';
  const defaultIcon = isError ? (
    <AlertCircle className="h-6 w-6 text-red-400" aria-hidden="true" />
  ) : (
    <Inbox className="h-6 w-6 text-torii" aria-hidden="true" />
  );

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`rounded-2xl border px-6 py-10 text-center ${
        isError
          ? 'border-red-500/25 bg-red-500/10'
          : 'border-border-color bg-card'
      } ${className}`}
    >
      <div
        className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${
          isError ? 'bg-red-500/15' : 'bg-torii/15'
        }`}
      >
        {icon ?? defaultIcon}
      </div>
      <h2 className="font-heading text-lg font-semibold text-text-primary">{title}</h2>
      {description && (
        <p className="mx-auto mt-1.5 max-w-md text-sm text-text-secondary">{description}</p>
      )}
      {(action || onRetry) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="torii-btn-primary min-h-[40px] rounded-full text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-torii"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {retryLabel}
            </button>
          )}
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;

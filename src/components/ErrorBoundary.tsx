import React from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  variant?: 'page' | 'app';
}

const isChunkLoadError = (error: Error | null): boolean => {
  if (!error) return false;
  const msg = `${error.name} ${error.message}`.toLowerCase();
  return (
    msg.includes('dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('chunkloaderror') ||
    msg.includes('failed to fetch')
  );
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (window.location.pathname !== '/') {
      window.location.assign('/');
    }
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const chunkError = isChunkLoadError(this.state.error);
    const fullScreen = this.props.variant === 'app';

    return (
      <div
        role="alert"
        className={`flex items-center justify-center px-4 py-12 ${
          fullScreen ? 'min-h-screen bg-[#030014] text-white' : 'min-h-[60vh] text-text-primary'
        }`}
      >
        <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0b0f26]/95 p-6 sm:p-8 text-center shadow-elev-3">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-torii/15 text-torii">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="font-heading text-xl font-bold text-white">
            {chunkError ? 'New version available' : 'Something went wrong'}
          </h2>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            {chunkError
              ? 'A newer build of Torii was deployed or a page module failed to download. Reload to continue.'
              : 'An unexpected error interrupted this view. Reloading the page usually clears it.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-torii px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-torii-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-torii"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Reload page
            </button>
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-torii"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;

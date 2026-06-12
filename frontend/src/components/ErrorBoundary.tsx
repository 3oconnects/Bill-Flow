/**
 * Error Boundary Component
 * Catches React component errors and displays fallback UI
 * Logs errors to monitoring service (Sentry, etc.)
 */

import React, { ReactNode, ReactElement } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactElement;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to monitoring service
    this.logError(error, errorInfo);

    // Update state
    this.setState({
      error,
      errorInfo,
    });
  }

  private logError(error: Error, errorInfo: React.ErrorInfo) {
    // Send to Sentry (or similar monitoring service)
    if (window.__SENTRY__) {
      window.__SENTRY__.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = process.env.NODE_ENV === 'development';
      return (
        <div style={{
          minHeight: '100vh', width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, background: 'var(--c-bg, #f5f7fb)',
          fontFamily: 'var(--font, system-ui, sans-serif)',
        }}>
          <div style={{
            maxWidth: 480, width: '100%',
            background: 'var(--c-surface, #fff)',
            border: '1px solid var(--c-border, #e5e7eb)',
            borderRadius: 14,
            boxShadow: '0 12px 32px rgba(15, 23, 42, .08)',
            padding: 32, textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--c-red-lt, #fee2e2)',
              color: 'var(--c-red, #dc2626)',
              margin: '0 auto 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertCircle size={30} />
            </div>

            <h2 style={{
              fontSize: 20, fontWeight: 700, margin: '0 0 8px',
              color: 'var(--c-text, #0f172a)',
            }}>
              Something went wrong
            </h2>

            <p style={{
              fontSize: 14, lineHeight: 1.5, margin: '0 0 22px',
              color: 'var(--c-text2, #475569)',
            }}>
              An unexpected error occurred. You can try again, refresh the page,
              or go back to the dashboard.
            </p>

            {isDev && this.state.error && (
              <div style={{
                background: 'var(--c-red-lt, #fee2e2)',
                border: '1px solid var(--c-red, #fecaca)',
                borderRadius: 8, padding: 12, marginBottom: 20,
                textAlign: 'left', fontSize: 12, color: 'var(--c-red, #991b1b)',
                fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                maxHeight: 200, overflow: 'auto',
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack && (
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Component stack</summary>
                    <pre style={{ fontSize: 11, marginTop: 6, whiteSpace: 'pre-wrap' }}>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={this.handleReset} className="btn btn-primary"
                style={{ justifyContent: 'center' }}>
                <RefreshCw size={15} /> Try Again
              </button>
              <button onClick={this.handleReload} className="btn btn-secondary"
                style={{ justifyContent: 'center' }}>
                Refresh Page
              </button>
              <a href="/" className="btn btn-ghost"
                style={{ justifyContent: 'center', textDecoration: 'none' }}>
                Go Home
              </a>
            </div>

            <p style={{
              fontSize: 11, color: 'var(--c-text3, #94a3b8)',
              marginTop: 22, marginBottom: 0,
            }}>
              If this keeps happening, contact{' '}
              <a href="mailto:support@billflow.io"
                style={{ color: 'var(--c-primary, #2563eb)', textDecoration: 'none' }}>
                support@billflow.io
              </a>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook wrapper for functional components
 * Usage: try/catch in async functions, not in render
 */
export function useErrorHandler() {
  const handleError = (error: Error) => {
    // This would need to communicate with ErrorBoundary
    // For now, log to monitoring service directly
    if (window.__SENTRY__) {
      window.__SENTRY__.captureException(error);
    }
    console.error('Handled error:', error);
  };

  return { handleError };
}

// Extend window type for monitoring service
declare global {
  interface Window {
    __SENTRY__?: {
      captureException: (error: Error, context?: any) => void;
      captureMessage: (message: string, level?: string) => void;
    };
  }
}

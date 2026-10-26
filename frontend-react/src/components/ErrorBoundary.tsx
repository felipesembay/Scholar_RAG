import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error silently in production, verbose in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    
    this.setState({ error, errorInfo });
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-surface-muted flex items-center justify-center p-6">
          <div className="max-w-lg w-full">
            <div className="sr-card p-8 text-center">
              {/* Error Icon */}
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              
              {/* Error Message */}
              <h1 className="component-title mb-4">
                Algo deu errado
              </h1>
              
              <p className="body-text text-muted-foreground mb-8">
                Ocorreu um erro inesperado na aplicação. Você pode tentar recarregar a página 
                ou voltar ao início.
              </p>
              
              {/* Error Details - Only in development */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                  <details className="cursor-pointer">
                    <summary className="label-text text-red-800 mb-2">
                      Detalhes do erro (desenvolvimento)
                    </summary>
                    <div className="body-text-sm text-red-700 font-mono whitespace-pre-wrap">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </div>
                  </details>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button 
                  onClick={this.handleRetry}
                  className="sr-button primary"
                >
                  <RefreshCw className="w-4 h-4" />
                  Tentar novamente
                </button>
                
                <button 
                  onClick={this.handleReload}
                  className="sr-button secondary"
                >
                  <RefreshCw className="w-4 h-4" />
                  Recarregar página
                </button>
                
                <button 
                  onClick={this.handleGoHome}
                  className="sr-button ghost"
                >
                  <Home className="w-4 h-4" />
                  Ir ao início
                </button>
              </div>
              
              {/* Help Text */}
              <div className="mt-6 pt-6 border-t border-line">
                <p className="body-text-sm text-muted-foreground">
                  Se o problema persistir, entre em contato com o suporte técnico.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

/**
 * Hook para reportar erros manualmente
 */
export function useErrorHandler() {
  return (error: Error, context?: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error in ${context}:`, error);
    }
    
    // Em produção, você pode enviar erros para um serviço de monitoramento
    // como Sentry, LogRocket, etc.
  };
}

/**
 * Wrapper de componente para capturar erros async
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
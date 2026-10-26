import React, { Component, ReactNode } from 'react';
import { X, AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  onClose?: () => void;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

/**
 * Error Boundary específico para modais
 * Fornece uma UI de erro contextualizada para o ambiente modal
 */
export default class ModalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log do erro para monitoramento
    console.error('Modal Error Boundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo: errorInfo.componentStack
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Fallback customizado se fornecido
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI de erro padrão para modais
      return (
        <div 
          className="fixed inset-0 z-modal flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(34, 34, 34, 0.25)" }}
        >
          <div className="bg-surface rounded-xl w-full max-w-md shadow-xl animate-scale-in">
            <div className="p-6">
              {/* Header com botão de fechar */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center element-gap">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="component-title text-red-600">
                    Erro no Modal
                  </h2>
                </div>
                
                {this.props.onClose && (
                  <button
                    onClick={this.props.onClose}
                    className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Fechar modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Conteúdo do erro */}
              <div className="flex flex-col component-gap">
                <p className="body-text text-muted-foreground">
                  Ocorreu um erro inesperado no modal. Você pode tentar novamente ou fechar o modal.
                </p>

                {/* Detalhes do erro (apenas em desenvolvimento) */}
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-4">
                    <summary className="body-text-sm cursor-pointer text-muted-foreground hover:text-ink">
                      Detalhes técnicos (desenvolvimento)
                    </summary>
                    <div className="mt-2 p-3 bg-surface-muted rounded-lg">
                      <code className="body-text-sm text-red-600 block whitespace-pre-wrap">
                        {this.state.error.message}
                      </code>
                      {this.state.errorInfo && (
                        <code className="body-text-sm text-muted-foreground block whitespace-pre-wrap mt-2">
                          {this.state.errorInfo}
                        </code>
                      )}
                    </div>
                  </details>
                )}
              </div>

              {/* Ações */}
              <div className="flex flex-col sm:flex-row component-gap justify-end mt-6">
                {this.props.onClose && (
                  <button
                    onClick={this.props.onClose}
                    className="sr-button ghost"
                  >
                    Fechar Modal
                  </button>
                )}
                
                <button
                  onClick={this.handleRetry}
                  className="sr-button primary"
                >
                  <RefreshCw className="w-4 h-4" />
                  Tentar Novamente
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
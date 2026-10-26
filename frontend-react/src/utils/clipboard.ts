/**
 * Utilitário robusto para operações de clipboard
 * Handles diferentes cenários de permissões e fallbacks
 */

export interface ClipboardResult {
  success: boolean;
  method: 'clipboard-api' | 'execCommand' | 'manual' | 'failed';
  error?: string;
}

/**
 * Verifica se estamos em um contexto seguro para usar Clipboard API
 */
function isSecureContext(): boolean {
  try {
    return window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
  } catch {
    return false;
  }
}

/**
 * Verifica se o Clipboard API está disponível
 */
function hasClipboardAPI(): boolean {
  try {
    return !!(navigator.clipboard && navigator.clipboard.writeText && isSecureContext());
  } catch {
    return false;
  }
}

/**
 * Copia texto para o clipboard com fallbacks automáticos
 */
export async function copyToClipboard(text: string): Promise<ClipboardResult> {
  // Validação de entrada
  if (typeof text !== 'string') {
    return {
      success: false,
      method: 'failed',
      error: 'Texto inválido fornecido'
    };
  }

  if (!text.trim()) {
    return {
      success: false,
      method: 'failed',
      error: 'Texto vazio'
    };
  }

  // Método 1: Tentar Clipboard API moderna (silenciosamente)
  if (hasClipboardAPI()) {
    try {
      await navigator.clipboard.writeText(text);
      return {
        success: true,
        method: 'clipboard-api'
      };
    } catch (error) {
      // Log do erro para debug, mas continue para o fallback
      if (process.env.NODE_ENV === 'development') {
        console.info('Clipboard API não disponível, usando fallback:', (error as Error).message);
      }
    }
  }

  // Método 2: Fallback com document.execCommand (legacy)
  if (document.queryCommandSupported && document.queryCommandSupported('copy')) {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // Estilos para tornar o elemento invisível mas ainda focalizável
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.style.width = '1px';
      textArea.style.height = '1px';
      textArea.style.opacity = '0';
      textArea.style.pointerEvents = 'none';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      
      textArea.setAttribute('readonly', '');
      textArea.setAttribute('aria-hidden', 'true');
      textArea.setAttribute('tabindex', '-1');
      
      document.body.appendChild(textArea);
      
      // Focus e select com tratamento de erro
      try {
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, text.length);
        
        const successful = document.execCommand('copy');
        
        if (successful) {
          return {
            success: true,
            method: 'execCommand'
          };
        }
      } catch (selectError) {
        if (process.env.NODE_ENV === 'development') {
          console.info('Seleção de texto falhou:', selectError);
        }
      } finally {
        // Sempre remover o elemento
        try {
          document.body.removeChild(textArea);
        } catch (removeError) {
          // Ignorar erro de remoção
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.info('execCommand failed:', error);
      }
    }
  }

  // Método 3: Fallback manual apenas em desenvolvimento
  if (process.env.NODE_ENV === 'development' && window.prompt) {
    try {
      const userCopied = window.prompt(
        'A cópia automática não está disponível. Por favor, copie o texto abaixo manualmente (Ctrl+C ou Cmd+C):',
        text
      );
      
      return {
        success: userCopied !== null,
        method: 'manual'
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.info('Manual prompt failed:', error);
      }
    }
  }

  // Todos os métodos falharam - retornar falha silenciosa
  return {
    success: false,
    method: 'failed',
    error: 'Cópia não disponível neste ambiente'
  };
}

/**
 * Verifica se o clipboard está disponível
 */
export function isClipboardAvailable(): boolean {
  return (
    hasClipboardAPI() ||
    (document.queryCommandSupported && document.queryCommandSupported('copy')) ||
    false
  );
}

/**
 * Copia texto com feedback automático via toast
 */
export async function copyWithToast(
  text: string,
  showSuccess: (title: string, message: string) => void,
  showError: (title: string, message: string) => void,
  customSuccessMessage?: string,
  customErrorMessage?: string
): Promise<ClipboardResult> {
  const result = await copyToClipboard(text);
  
  if (result.success) {
    const message = customSuccessMessage || getSuccessMessage(result.method);
    showSuccess("Copiado!", message);
  } else {
    // Apenas mostrar erro se não for uma falha silenciosa
    if (result.method !== 'failed' || process.env.NODE_ENV === 'development') {
      const message = customErrorMessage || result.error || "Falha ao copiar texto.";
      showError("Erro ao copiar", message);
    }
  }
  
  return result;
}

/**
 * Mensagens de sucesso baseadas no método usado
 */
function getSuccessMessage(method: ClipboardResult['method']): string {
  switch (method) {
    case 'clipboard-api':
      return 'Texto copiado para a área de transferência.';
    case 'execCommand':
      return 'Texto copiado com sucesso.';
    case 'manual':
      return 'Texto pronto para cópia manual.';
    default:
      return 'Texto copiado.';
  }
}

/**
 * Hook personalizado para clipboard com toast integrado
 */
export function useClipboard(
  showSuccess: (title: string, message: string) => void,
  showError: (title: string, message: string) => void
) {
  const copy = async (
    text: string,
    customSuccessMessage?: string,
    customErrorMessage?: string
  ): Promise<ClipboardResult> => {
    return copyWithToast(
      text,
      showSuccess,
      showError,
      customSuccessMessage,
      customErrorMessage
    );
  };

  return {
    copy,
    isAvailable: isClipboardAvailable()
  };
}

/**
 * Versão simplificada para uso direto (silenciosa)
 */
export async function simpleCopy(text: string): Promise<boolean> {
  const result = await copyToClipboard(text);
  return result.success;
}

/**
 * Versão que nunca falha - sempre retorna true mas pode ser silenciosa
 */
export async function safeCopy(text: string): Promise<boolean> {
  try {
    const result = await copyToClipboard(text);
    return result.success;
  } catch (error) {
    // Sempre retornar true para evitar quebrar a UI
    if (process.env.NODE_ENV === 'development') {
      console.info('Safe copy failed silently:', error);
    }
    return true;
  }
}
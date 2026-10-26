import React, { useState, useCallback, useRef } from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
  persistent?: boolean;
}

export interface UseToastReturn {
  toasts: ToastMessage[];
  toast: {
    success: (title: string, description?: string, options?: { duration?: number }) => void;
    error: (title: string, description?: string, options?: { persistent?: boolean }) => void;
    warning: (title: string, description?: string, options?: { duration?: number }) => void;
    info: (title: string, description?: string, options?: { duration?: number }) => void;
  };
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

let toastCounter = 0;
const generateToastId = () => `toast-${++toastCounter}-${Date.now()}`;

// Store global para compartilhar toasts entre componentes
let globalToasts: ToastMessage[] = [];
let globalListeners: Set<(toasts: ToastMessage[]) => void> = new Set();

const notifyListeners = () => {
  globalListeners.forEach(listener => listener([...globalToasts]));
};

const addToast = (toast: Omit<ToastMessage, 'id'>) => {
  const newToast: ToastMessage = {
    ...toast,
    id: generateToastId(),
    duration: toast.duration ?? (toast.type === 'error' ? undefined : 5000)
  };
  
  globalToasts.push(newToast);
  notifyListeners();
  
  // Auto dismiss se não for persistente e tiver duration
  if (!toast.persistent && newToast.duration) {
    setTimeout(() => {
      removeToast(newToast.id);
    }, newToast.duration);
  }
  
  return newToast.id;
};

const removeToast = (id: string) => {
  const index = globalToasts.findIndex(toast => toast.id === id);
  if (index > -1) {
    globalToasts.splice(index, 1);
    notifyListeners();
  }
};

const removeAllToasts = () => {
  globalToasts.length = 0;
  notifyListeners();
};

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastMessage[]>([...globalToasts]);
  const listenerRef = useRef<(toasts: ToastMessage[]) => void>();
  
  // Registrar listener na primeira renderização
  if (!listenerRef.current) {
    listenerRef.current = (newToasts: ToastMessage[]) => {
      setToasts(newToasts);
    };
    globalListeners.add(listenerRef.current);
  }
  
  // Cleanup do listener
  const cleanup = useCallback(() => {
    if (listenerRef.current) {
      globalListeners.delete(listenerRef.current);
    }
  }, []);
  
  // Toast functions
  const toast = useCallback({
    success: (title: string, description?: string, options?: { duration?: number }) => {
      addToast({
        type: 'success',
        title,
        description,
        duration: options?.duration
      });
    },
    
    error: (title: string, description?: string, options?: { persistent?: boolean }) => {
      addToast({
        type: 'error',
        title,
        description,
        persistent: options?.persistent ?? true // Erros são persistentes por padrão
      });
    },
    
    warning: (title: string, description?: string, options?: { duration?: number }) => {
      addToast({
        type: 'warning',
        title,
        description,
        duration: options?.duration
      });
    },
    
    info: (title: string, description?: string, options?: { duration?: number }) => {
      addToast({
        type: 'info',
        title,
        description,
        duration: options?.duration
      });
    }
  }, []);
  
  const dismiss = useCallback((id: string) => {
    removeToast(id);
  }, []);
  
  const dismissAll = useCallback(() => {
    removeAllToasts();
  }, []);
  
  // Cleanup on unmount
  React.useEffect(() => {
    return cleanup;
  }, [cleanup]);
  
  return {
    toasts,
    toast,
    dismiss,
    dismissAll
  };
}

// Export funções globais para uso sem hook (ex: em event handlers)
export const toast = {
  success: (title: string, description?: string, options?: { duration?: number }) => {
    addToast({
      type: 'success',
      title,
      description,
      duration: options?.duration
    });
  },
  
  error: (title: string, description?: string, options?: { persistent?: boolean }) => {
    addToast({
      type: 'error',
      title,
      description,
      persistent: options?.persistent ?? true
    });
  },
  
  warning: (title: string, description?: string, options?: { duration?: number }) => {
    addToast({
      type: 'warning',
      title,
      description,
      duration: options?.duration
    });
  },
  
  info: (title: string, description?: string, options?: { duration?: number }) => {
    addToast({
      type: 'info',
      title,
      description,
      duration: options?.duration
    });
  }
};
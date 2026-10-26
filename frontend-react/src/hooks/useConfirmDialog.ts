import React from 'react';
import { useState, useCallback, useRef } from 'react';

export interface ConfirmDialogOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  persistent?: boolean;
}

interface ConfirmDialogState extends ConfirmDialogOptions {
  id: string;
  isOpen: boolean;
  resolve: (confirmed: boolean) => void;
}

export interface UseConfirmDialogReturn {
  dialogs: ConfirmDialogState[];
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

let dialogCounter = 0;
const generateDialogId = () => `confirm-dialog-${++dialogCounter}-${Date.now()}`;

// Store global para compartilhar dialogs entre componentes
let globalDialogs: ConfirmDialogState[] = [];
let globalListeners: Set<(dialogs: ConfirmDialogState[]) => void> = new Set();

const notifyListeners = () => {
  globalListeners.forEach(listener => listener([...globalDialogs]));
};

const addDialog = (options: ConfirmDialogOptions): Promise<boolean> => {
  return new Promise((resolve) => {
    const newDialog: ConfirmDialogState = {
      ...options,
      id: generateDialogId(),
      isOpen: true,
      confirmText: options.confirmText ?? 'Confirmar',
      cancelText: options.cancelText ?? 'Cancelar',
      variant: options.variant ?? 'default',
      resolve
    };
    
    globalDialogs.push(newDialog);
    notifyListeners();
  });
};

const removeDialog = (id: string, confirmed: boolean = false) => {
  const index = globalDialogs.findIndex(dialog => dialog.id === id);
  if (index > -1) {
    const dialog = globalDialogs[index];
    dialog.resolve(confirmed);
    globalDialogs.splice(index, 1);
    notifyListeners();
  }
};

const removeAllDialogs = (confirmed: boolean = false) => {
  globalDialogs.forEach(dialog => dialog.resolve(confirmed));
  globalDialogs.length = 0;
  notifyListeners();
};

export function useConfirmDialog(): UseConfirmDialogReturn {
  const [dialogs, setDialogs] = useState<ConfirmDialogState[]>([...globalDialogs]);
  const listenerRef = useRef<(dialogs: ConfirmDialogState[]) => void>();
  
  // Registrar listener na primeira renderização
  if (!listenerRef.current) {
    listenerRef.current = (newDialogs: ConfirmDialogState[]) => {
      setDialogs(newDialogs);
    };
    globalListeners.add(listenerRef.current);
  }
  
  // Cleanup do listener
  const cleanup = useCallback(() => {
    if (listenerRef.current) {
      globalListeners.delete(listenerRef.current);
    }
  }, []);
  
  const confirm = useCallback(async (options: ConfirmDialogOptions): Promise<boolean> => {
    try {
      return await addDialog(options);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro no confirm dialog:', error);
      }
      return false;
    }
  }, []);
  
  const dismiss = useCallback((id: string) => {
    removeDialog(id, false);
  }, []);
  
  const dismissAll = useCallback(() => {
    removeAllDialogs(false);
  }, []);
  
  // Cleanup on unmount
  React.useEffect(() => {
    return cleanup;
  }, [cleanup]);
  
  return {
    dialogs,
    confirm,
    dismiss,
    dismissAll
  };
}

// Export função global para uso sem hook
export const confirmDialog = {
  show: (options: ConfirmDialogOptions): Promise<boolean> => {
    return addDialog(options);
  },
  
  // Shortcuts para casos comuns
  delete: (itemName?: string): Promise<boolean> => {
    return addDialog({
      title: 'Confirmar exclusão',
      description: itemName 
        ? `Tem certeza que deseja excluir "${itemName}"? Esta ação não pode ser desfeita.`
        : 'Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'danger'
    });
  },
  
  save: (hasUnsavedChanges: boolean = true): Promise<boolean> => {
    if (!hasUnsavedChanges) return Promise.resolve(true);
    
    return addDialog({
      title: 'Salvar alterações',
      description: 'Você tem alterações não salvas. Deseja salvá-las antes de continuar?',
      confirmText: 'Salvar',
      cancelText: 'Descartar'
    });
  },
  
  leave: (): Promise<boolean> => {
    return addDialog({
      title: 'Sair da página',
      description: 'Você tem certeza que deseja sair? Alterações não salvas serão perdidas.',
      confirmText: 'Sair',
      cancelText: 'Permanecer',
      variant: 'danger'
    });
  }
};
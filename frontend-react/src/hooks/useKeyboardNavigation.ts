import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardNavigationOptions {
  enabled?: boolean;
  focusLoop?: boolean;
  escapeHandler?: () => void;
  onEscape?: () => void; // Alias para escapeHandler para compatibilidade
  enterHandler?: (element: HTMLElement) => void;
  arrowHandler?: (direction: 'up' | 'down' | 'left' | 'right', element: HTMLElement) => void;
}

export interface UseKeyboardNavigationReturn {
  containerRef: React.RefObject<HTMLElement>;
  focusFirst: () => void;
  focusLast: () => void;
  focusNext: () => void;
  focusPrevious: () => void;
}

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[role="button"]:not([aria-disabled="true"])',
  '[role="checkbox"]:not([aria-disabled="true"])',
  '[role="menuitem"]:not([aria-disabled="true"])',
  '[role="option"]:not([aria-disabled="true"])'
].join(', ');

export function useKeyboardNavigation(
  options: KeyboardNavigationOptions = {}
): UseKeyboardNavigationReturn {
  const {
    enabled = true,
    focusLoop = true,
    escapeHandler,
    onEscape,
    enterHandler,
    arrowHandler
  } = options;
  
  // Use onEscape como fallback para escapeHandler
  const finalEscapeHandler = escapeHandler || onEscape;
  
  const containerRef = useRef<HTMLElement>(null);
  
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    
    const elements = containerRef.current.querySelectorAll(FOCUSABLE_SELECTORS);
    return Array.from(elements) as HTMLElement[];
  }, []);
  
  const getCurrentFocusIndex = useCallback((): number => {
    const elements = getFocusableElements();
    const activeElement = document.activeElement as HTMLElement;
    return elements.indexOf(activeElement);
  }, [getFocusableElements]);
  
  const focusElement = useCallback((index: number) => {
    const elements = getFocusableElements();
    if (elements.length === 0) return;
    
    let targetIndex = index;
    
    if (focusLoop) {
      if (targetIndex < 0) {
        targetIndex = elements.length - 1;
      } else if (targetIndex >= elements.length) {
        targetIndex = 0;
      }
    } else {
      targetIndex = Math.max(0, Math.min(elements.length - 1, targetIndex));
    }
    
    const targetElement = elements[targetIndex];
    if (targetElement) {
      targetElement.focus();
    }
  }, [getFocusableElements, focusLoop]);
  
  const focusFirst = useCallback(() => {
    focusElement(0);
  }, [focusElement]);
  
  const focusLast = useCallback(() => {
    const elements = getFocusableElements();
    focusElement(elements.length - 1);
  }, [focusElement, getFocusableElements]);
  
  const focusNext = useCallback(() => {
    const currentIndex = getCurrentFocusIndex();
    focusElement(currentIndex + 1);
  }, [getCurrentFocusIndex, focusElement]);
  
  const focusPrevious = useCallback(() => {
    const currentIndex = getCurrentFocusIndex();
    focusElement(currentIndex - 1);
  }, [getCurrentFocusIndex, focusElement]);
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled || !containerRef.current) return;
    
    const { key, target } = event;
    const targetElement = target as HTMLElement;
    
    // Verificar se o foco está dentro do container
    if (!containerRef.current.contains(targetElement)) return;
    
    switch (key) {
      case 'Escape':
        if (finalEscapeHandler) {
          event.preventDefault();
          finalEscapeHandler();
        }
        break;
        
      case 'Enter':
      case ' ':
        if (enterHandler && (targetElement.tagName !== 'BUTTON' && targetElement.tagName !== 'A')) {
          event.preventDefault();
          enterHandler(targetElement);
        }
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        if (arrowHandler) {
          arrowHandler('up', targetElement);
        } else {
          focusPrevious();
        }
        break;
        
      case 'ArrowDown':
        event.preventDefault();
        if (arrowHandler) {
          arrowHandler('down', targetElement);
        } else {
          focusNext();
        }
        break;
        
      case 'ArrowLeft':
        if (arrowHandler) {
          event.preventDefault();
          arrowHandler('left', targetElement);
        }
        break;
        
      case 'ArrowRight':
        if (arrowHandler) {
          event.preventDefault();
          arrowHandler('right', targetElement);
        }
        break;
        
      case 'Home':
        event.preventDefault();
        focusFirst();
        break;
        
      case 'End':
        event.preventDefault();
        focusLast();
        break;
        
      case 'Tab':
        // Permitir navegação normal por Tab, mas gerenciar dentro do container se necessário
        if (focusLoop) {
          const elements = getFocusableElements();
          const currentIndex = getCurrentFocusIndex();
          
          if (event.shiftKey) {
            // Shift+Tab (backwards)
            if (currentIndex === 0) {
              event.preventDefault();
              focusLast();
            }
          } else {
            // Tab (forwards)
            if (currentIndex === elements.length - 1) {
              event.preventDefault();
              focusFirst();
            }
          }
        }
        break;
    }
  }, [
    enabled,
    finalEscapeHandler,
    enterHandler,
    arrowHandler,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    focusLoop,
    getFocusableElements,
    getCurrentFocusIndex
  ]);
  
  useEffect(() => {
    if (!enabled) return;
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
  
  return {
    containerRef,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious
  };
}

// Hook específico para menus dropdown
export function useDropdownKeyboardNavigation(
  isOpen: boolean,
  onClose: () => void,
  onSelect?: (index: number) => void
) {
  return useKeyboardNavigation({
    enabled: isOpen,
    focusLoop: true,
    escapeHandler: onClose,
    enterHandler: (element) => {
      const menuItems = element.closest('[role="menu"]')?.querySelectorAll('[role="menuitem"]');
      if (menuItems && element.matches('[role="menuitem"]')) {
        const index = Array.from(menuItems).indexOf(element);
        onSelect?.(index);
      }
    }
  });
}

// Hook específico para diálogos/modais
export function useDialogKeyboardNavigation(
  isOpen: boolean,
  onClose: () => void
) {
  const navigation = useKeyboardNavigation({
    enabled: isOpen,
    focusLoop: true,
    escapeHandler: onClose
  });
  
  // Auto-focus no primeiro elemento quando o diálogo abre
  useEffect(() => {
    if (isOpen) {
      // Delay para garantir que o DOM foi atualizado
      setTimeout(() => {
        navigation.focusFirst();
      }, 100);
    }
  }, [isOpen, navigation]);
  
  return navigation;
}
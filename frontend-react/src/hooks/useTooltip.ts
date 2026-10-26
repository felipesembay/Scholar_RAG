import { useState, useCallback, useRef, useEffect } from 'react';

export interface TooltipPosition {
  x: number;
  y: number;
}

export interface TooltipOptions {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  delay? : number;
  offset?: number;
  disabled?: boolean;
}

interface TooltipState {
  id: string;
  content: string;
  position: TooltipPosition;
  placement: 'top' | 'bottom' | 'left' | 'right';
  isVisible: boolean;
  targetElement: HTMLElement;
}

export interface UseTooltipReturn {
  tooltips: TooltipState[];
  showTooltip: (element: HTMLElement, options: TooltipOptions) => void;
  hideTooltip: (element: HTMLElement) => void;
  hideAllTooltips: () => void;
}

let tooltipCounter = 0;
const generateTooltipId = () => `tooltip-${++tooltipCounter}-${Date.now()}`;

// Store global para tooltips
let globalTooltips: TooltipState[] = [];
let globalListeners: Set<(tooltips: TooltipState[]) => void> = new Set();

const notifyListeners = () => {
  globalListeners.forEach(listener => listener([...globalTooltips]));
};

const calculatePosition = (
  element: HTMLElement, 
  preferredPlacement: 'top' | 'bottom' | 'left' | 'right' | 'auto',
  offset: number = 8
): { position: TooltipPosition; placement: 'top' | 'bottom' | 'left' | 'right' } => {
  const rect = element.getBoundingClientRect();
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  
  const positions = {
    top: {
      position: { 
        x: rect.left + scrollX + rect.width / 2, 
        y: rect.top + scrollY - offset 
      },
      placement: 'top' as const
    },
    bottom: {
      position: { 
        x: rect.left + scrollX + rect.width / 2, 
        y: rect.bottom + scrollY + offset 
      },
      placement: 'bottom' as const
    },
    left: {
      position: { 
        x: rect.left + scrollX - offset, 
        y: rect.top + scrollY + rect.height / 2 
      },
      placement: 'left' as const
    },
    right: {
      position: { 
        x: rect.right + scrollX + offset, 
        y: rect.top + scrollY + rect.height / 2 
      },
      placement: 'right' as const
    }
  };
  
  if (preferredPlacement !== 'auto') {
    return positions[preferredPlacement];
  }
  
  // Auto placement - escolhe a melhor posição baseada no espaço disponível
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  
  // Prioridade: bottom > top > right > left
  if (rect.bottom + 40 < viewportHeight) {
    return positions.bottom;
  } else if (rect.top - 40 > 0) {
    return positions.top;
  } else if (rect.right + 200 < viewportWidth) {
    return positions.right;
  } else {
    return positions.left;
  }
};

const addTooltip = (element: HTMLElement, options: TooltipOptions) => {
  if (options.disabled) return;
  
  // Remove tooltip existente para o mesmo elemento
  removeTooltipByElement(element);
  
  const { position, placement } = calculatePosition(
    element, 
    options.position ?? 'auto',
    options.offset
  );
  
  const newTooltip: TooltipState = {
    id: generateTooltipId(),
    content: options.content,
    position,
    placement,
    isVisible: false,
    targetElement: element
  };
  
  globalTooltips.push(newTooltip);
  
  // Delay para mostrar
  const delay = options.delay ?? 500;
  setTimeout(() => {
    const tooltipIndex = globalTooltips.findIndex(t => t.id === newTooltip.id);
    if (tooltipIndex > -1) {
      globalTooltips[tooltipIndex].isVisible = true;
      notifyListeners();
    }
  }, delay);
};

const removeTooltipByElement = (element: HTMLElement) => {
  const index = globalTooltips.findIndex(tooltip => tooltip.targetElement === element);
  if (index > -1) {
    globalTooltips.splice(index, 1);
    notifyListeners();
  }
};

const removeAllTooltips = () => {
  globalTooltips.length = 0;
  notifyListeners();
};

export function useTooltip(): UseTooltipReturn {
  const [tooltips, setTooltips] = useState<TooltipState[]>([...globalTooltips]);
  const listenerRef = useRef<(tooltips: TooltipState[]) => void>();
  
  // Registrar listener
  if (!listenerRef.current) {
    listenerRef.current = (newTooltips: TooltipState[]) => {
      setTooltips(newTooltips);
    };
    globalListeners.add(listenerRef.current);
  }
  
  const cleanup = useCallback(() => {
    if (listenerRef.current) {
      globalListeners.delete(listenerRef.current);
    }
  }, []);
  
  const showTooltip = useCallback((element: HTMLElement, options: TooltipOptions) => {
    try {
      addTooltip(element, options);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao mostrar tooltip:', error);
      }
    }
  }, []);
  
  const hideTooltip = useCallback((element: HTMLElement) => {
    try {
      removeTooltipByElement(element);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao esconder tooltip:', error);
      }
    }
  }, []);
  
  const hideAllTooltips = useCallback(() => {
    try {
      removeAllTooltips();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao esconder todos os tooltips:', error);
      }
    }
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);
  
  // Cleanup automático quando elemento sai do DOM
  useEffect(() => {
    const observer = new MutationObserver(() => {
      globalTooltips.forEach(tooltip => {
        if (!document.contains(tooltip.targetElement)) {
          removeTooltipByElement(tooltip.targetElement);
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    return () => observer.disconnect();
  }, []);
  
  return {
    tooltips,
    showTooltip,
    hideTooltip,
    hideAllTooltips
  };
}

// Hook para usar tooltip em um elemento específico
export function useElementTooltip(
  content: string, 
  options: Omit<TooltipOptions, 'content'> = {}
) {
  const elementRef = useRef<HTMLElement>(null);
  const { showTooltip, hideTooltip } = useTooltip();
  
  const show = useCallback(() => {
    if (elementRef.current && content) {
      showTooltip(elementRef.current, { content, ...options });
    }
  }, [content, options, showTooltip]);
  
  const hide = useCallback(() => {
    if (elementRef.current) {
      hideTooltip(elementRef.current);
    }
  }, [hideTooltip]);
  
  const tooltipProps = {
    ref: elementRef,
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide
  };
  
  return { tooltipProps, show, hide };
}
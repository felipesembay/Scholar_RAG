import { useMemo } from 'react';

export interface LayoutConfig {
  sidebarWidth: number;
  isOverlay: boolean;
  contentPadding: string;
  cssVariables: Record<string, string>;
}

/**
 * Hook personalizado para gerenciar configuração de layout responsivo
 * Calcula automaticamente padding, larguras e modo de exibição baseado no estado da aplicação
 */
export function useLayoutConfig(
  isCollapsed: boolean, 
  isMobile: boolean, 
  isTablet: boolean
): LayoutConfig {
  return useMemo(() => {
    // Mobile/Tablet: sidebar é overlay
    if (isMobile || isTablet) {
      return {
        sidebarWidth: 256, // 16rem - largura padrão da sidebar
        isOverlay: true,
        contentPadding: isMobile ? "p-8" : "p-16", // 32px mobile, 64px tablet
        cssVariables: {
          '--sidebar-width': '256px',
          '--content-offset': '0px',
          '--is-sidebar-overlay': '1'
        }
      };
    }
    
    // Desktop: sidebar é fixa, content area se adapta
    const sidebarWidth = isCollapsed ? 56 : 256; // 3.5rem : 16rem
    
    return {
      sidebarWidth,
      isOverlay: false,
      contentPadding: "p-16", // 64px em todas as direções
      cssVariables: {
        '--sidebar-width': `${sidebarWidth}px`,
        '--content-offset': `${sidebarWidth}px`,
        '--is-sidebar-overlay': '0'
      }
    };
  }, [isCollapsed, isMobile, isTablet]);
}

/**
 * Hook para detecção otimizada de breakpoints
 * Retorna estados booleanos para cada tipo de dispositivo
 */
export interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
}

export function useResponsive(): ResponsiveState {
  // Esta implementação será movida do App.tsx
  // Por enquanto, retorna um estado default para não quebrar a tipagem
  return {
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: 1024
  };
}

/**
 * Utilities para layout
 */
export const LayoutUtils = {
  /**
   * Calcula a largura máxima do conteúdo baseada na sidebar
   */
  getMaxContentWidth: (sidebarWidth: number, isOverlay: boolean): string => {
    if (isOverlay) return '100vw';
    return `calc(100vw - ${sidebarWidth}px)`;
  },

  /**
   * Gera classes CSS para container responsivo
   */
  getContainerClasses: (config: LayoutConfig): string => {
    const baseClasses = [
      'transition-all',
      'duration-300',
      'ease-in-out',
      config.contentPadding
    ];

    if (config.isOverlay) {
      baseClasses.push('layout-overlay-mode');
    } else {
      baseClasses.push('layout-sidebar-aware');
    }

    return baseClasses.join(' ');
  },

  /**
   * Breakpoints padrão do sistema
   */
  breakpoints: {
    xs: 480,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536
  },

  /**
   * Verifica se está em um breakpoint específico
   */
  isBreakpoint: (width: number, breakpoint: keyof typeof LayoutUtils.breakpoints): boolean => {
    return width >= LayoutUtils.breakpoints[breakpoint];
  }
} as const;

export default useLayoutConfig;
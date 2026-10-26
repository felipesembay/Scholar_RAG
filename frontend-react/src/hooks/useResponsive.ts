import { useState, useEffect } from 'react';

export interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isXs: boolean;  // < 480px (smartphones pequenos)
  isSm: boolean;  // 480-639px (smartphones)
  isMd: boolean;  // 640-767px (smartphones grandes)
  isLg: boolean;  // 768-1023px (tablets)
  isXl: boolean;  // 1024-1279px (desktop)
  is2Xl: boolean; // >= 1280px (desktop grande)
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  isTouchDevice: boolean;
  devicePixelRatio: number;
}

/**
 * Hook otimizado para detecção de breakpoints e responsividade
 * Inclui detecção de orientação e dimensões da tela
 */
export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    // Estado inicial baseado em window (se disponível)
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const devicePixelRatio = window.devicePixelRatio || 1;
      
      return {
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        isXs: width < 480,
        isSm: width >= 480 && width < 640,
        isMd: width >= 640 && width < 768,
        isLg: width >= 768 && width < 1024,
        isXl: width >= 1024 && width < 1280,
        is2Xl: width >= 1280,
        width,
        height,
        orientation: width > height ? 'landscape' : 'portrait',
        isTouchDevice,
        devicePixelRatio
      };
    }
    
    // Fallback para SSR
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isXs: false,
      isSm: false,
      isMd: false,
      isLg: false,
      isXl: true,
      is2Xl: false,
      width: 1024,
      height: 768,
      orientation: 'landscape',
      isTouchDevice: false,
      devicePixelRatio: 1
    };
  });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const mobile = width < 768;
      const tablet = width >= 768 && width < 1024;
      const desktop = width >= 1024;
      const orientation = width > height ? 'landscape' : 'portrait';
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const devicePixelRatio = window.devicePixelRatio || 1;
      
      setState({
        isMobile: mobile,
        isTablet: tablet,
        isDesktop: desktop,
        isXs: width < 480,
        isSm: width >= 480 && width < 640,
        isMd: width >= 640 && width < 768,
        isLg: width >= 768 && width < 1024,
        isXl: width >= 1024 && width < 1280,
        is2Xl: width >= 1280,
        width,
        height,
        orientation,
        isTouchDevice,
        devicePixelRatio
      });
    };

    // Verificação inicial
    checkScreenSize();
    
    // Handler com debounce para melhor performance
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkScreenSize, 100);
    };
    
    // Event listeners
    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', debouncedResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return state;
}

/**
 * Hook para detectar breakpoint específico
 */
export function useBreakpoint(breakpoint: number): boolean {
  const { width } = useResponsive();
  return width >= breakpoint;
}

/**
 * Hook para detectar múltiplos breakpoints
 */
export function useBreakpoints() {
  const { width } = useResponsive();
  
  return {
    isXs: width >= 480,
    isSm: width >= 640,
    isMd: width >= 768,
    isLg: width >= 1024,
    isXl: width >= 1280,
    is2Xl: width >= 1536,
    width
  };
}

/**
 * Hook para detectar se está em mobile/touch device
 */
export function useTouchDevice(): boolean {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice(
        'ontouchstart' in window || 
        navigator.maxTouchPoints > 0 || 
        // @ts-ignore - legacy support
        navigator.msMaxTouchPoints > 0
      );
    };

    checkTouchDevice();
    window.addEventListener('resize', checkTouchDevice);
    
    return () => window.removeEventListener('resize', checkTouchDevice);
  }, []);

  return isTouchDevice;
}

/**
 * Hook para detectar preferências do usuário
 */
export function useUserPreferences() {
  const [preferences, setPreferences] = useState({
    prefersReducedMotion: false,
    prefersHighContrast: false,
    prefersDarkMode: false
  });

  useEffect(() => {
    const updatePreferences = () => {
      setPreferences({
        prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        prefersHighContrast: window.matchMedia('(prefers-contrast: high)').matches,
        prefersDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches
      });
    };

    updatePreferences();

    // Listeners para mudanças dinâmicas
    const reducedMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastMQ = window.matchMedia('(prefers-contrast: high)');
    const darkModeMQ = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => updatePreferences();
    
    reducedMotionMQ.addEventListener('change', handleChange);
    highContrastMQ.addEventListener('change', handleChange);
    darkModeMQ.addEventListener('change', handleChange);

    return () => {
      reducedMotionMQ.removeEventListener('change', handleChange);
      highContrastMQ.removeEventListener('change', handleChange);
      darkModeMQ.removeEventListener('change', handleChange);
    };
  }, []);

  return preferences;
}

export default useResponsive;
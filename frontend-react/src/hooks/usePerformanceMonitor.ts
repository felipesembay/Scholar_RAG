import { useEffect, useRef, useCallback } from 'react';

export interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  mountTime: number;
  updateCount: number;
  lastRenderTimestamp: number;
}

export interface UsePerformanceMonitorOptions {
  componentName: string;
  enabled?: boolean;
  logToConsole?: boolean;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

/**
 * Hook para monitoramento de performance de componentes React
 * Tracked métricas de renderização, mount time e contadores de update
 */
export function usePerformanceMonitor(options: UsePerformanceMonitorOptions) {
  const {
    componentName,
    enabled = process.env.NODE_ENV === 'development',
    logToConsole = false,
    onMetricsUpdate
  } = options;

  const metricsRef = useRef<PerformanceMetrics>({
    componentName,
    renderTime: 0,
    mountTime: 0,
    updateCount: 0,
    lastRenderTimestamp: 0
  });

  const mountTimeRef = useRef<number>(0);
  const renderStartRef = useRef<number>(0);

  // Marcar início da renderização
  const markRenderStart = useCallback(() => {
    if (!enabled) return;
    renderStartRef.current = performance.now();
  }, [enabled]);

  // Marcar fim da renderização e calcular métricas
  const markRenderEnd = useCallback(() => {
    if (!enabled || renderStartRef.current === 0) return;
    
    const renderTime = performance.now() - renderStartRef.current;
    const now = performance.now();
    
    metricsRef.current = {
      ...metricsRef.current,
      renderTime,
      updateCount: metricsRef.current.updateCount + 1,
      lastRenderTimestamp: now
    };

    if (logToConsole) {
      console.log(`🔍 [${componentName}] Render: ${renderTime.toFixed(2)}ms | Updates: ${metricsRef.current.updateCount}`);
    }

    if (onMetricsUpdate) {
      onMetricsUpdate({ ...metricsRef.current });
    }

    renderStartRef.current = 0;
  }, [enabled, componentName, logToConsole, onMetricsUpdate]);

  // Calcular tempo de mount na primeira renderização
  useEffect(() => {
    if (!enabled) return;
    
    if (mountTimeRef.current === 0) {
      mountTimeRef.current = performance.now();
    }
    
    const mountTime = performance.now() - mountTimeRef.current;
    metricsRef.current.mountTime = mountTime;

    if (logToConsole) {
      console.log(`🚀 [${componentName}] Mount: ${mountTime.toFixed(2)}ms`);
    }
  }, [enabled, componentName, logToConsole]);

  // Effect para marcar início/fim de cada renderização
  useEffect(() => {
    markRenderEnd();
  });

  // Marcar início na próxima renderização
  markRenderStart();

  // Função para obter métricas atuais
  const getMetrics = useCallback((): PerformanceMetrics => {
    return { ...metricsRef.current };
  }, []);

  // Função para resetar métricas
  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      componentName,
      renderTime: 0,
      mountTime: 0,
      updateCount: 0,
      lastRenderTimestamp: 0
    };
    mountTimeRef.current = performance.now();
  }, [componentName]);

  return {
    getMetrics,
    resetMetrics,
    metrics: metricsRef.current
  };
}

/**
 * Hook para monitorar performance de operações assíncronas
 */
export function useAsyncPerformanceMonitor() {
  const measureAsync = useCallback(async <T>(
    operationName: string,
    asyncOperation: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await asyncOperation();
      const duration = performance.now() - startTime;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`⚡ [${operationName}] Async: ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      if (process.env.NODE_ENV === 'development') {
        console.error(`❌ [${operationName}] Error after ${duration.toFixed(2)}ms:`, error);
      }
      
      throw error;
    }
  }, []);

  return { measureAsync };
}

/**
 * Hook para monitorar Web Vitals básicos
 */
export function useWebVitals(enabled = process.env.NODE_ENV === 'development') {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // FCP - First Contentful Paint
    const observeFCP = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            console.log(`🎨 FCP: ${entry.startTime.toFixed(2)}ms`);
          }
        });
      });
      
      try {
        observer.observe({ entryTypes: ['paint'] });
      } catch (error) {
        console.warn('Performance Observer não suportado para paint entries');
      }
    };

    // LCP - Largest Contentful Paint
    const observeLCP = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          console.log(`🖼️ LCP: ${lastEntry.startTime.toFixed(2)}ms`);
        }
      });
      
      try {
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('Performance Observer não suportado para LCP');
      }
    };

    // CLS - Cumulative Layout Shift
    const observeCLS = () => {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            console.log(`📐 CLS: ${clsValue.toFixed(4)}`);
          }
        });
      });
      
      try {
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('Performance Observer não suportado para layout-shift');
      }
    };

    observeFCP();
    observeLCP();
    observeCLS();
  }, [enabled]);
}

/**
 * Hook para detectar componentes lentos
 */
export function useSlowComponentDetector(
  componentName: string,
  threshold = 16 // 16ms = 60fps
) {
  const { getMetrics } = usePerformanceMonitor({
    componentName,
    logToConsole: false
  });

  useEffect(() => {
    const metrics = getMetrics();
    
    if (metrics.renderTime > threshold) {
      console.warn(
        `🐌 Componente lento detectado: ${componentName} (${metrics.renderTime.toFixed(2)}ms > ${threshold}ms)`
      );
    }
  });
}

export default usePerformanceMonitor;
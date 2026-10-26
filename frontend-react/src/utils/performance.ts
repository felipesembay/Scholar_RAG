// Utilitários de performance do frontend

export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  componentName: string;
  timestamp: number;
}

// Debounce function otimizada
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let result: ReturnType<T>;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) result = func(...args);
    };

    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) result = func(...args);
    
    return result;
  };
}

// Throttle function otimizada
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  let lastResult: ReturnType<T>;

  return function throttledFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      lastResult = func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
    return lastResult;
  };
}

// Performance monitoring
class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics: number = 100;

  startMeasure(componentName: string): () => void {
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize;

    return () => {
      const endTime = performance.now();
      const endMemory = (performance as any).memory?.usedJSHeapSize;
      
      const metric: PerformanceMetrics = {
        componentName,
        renderTime: endTime - startTime,
        memoryUsage: endMemory ? endMemory - startMemory : undefined,
        timestamp: Date.now()
      };

      this.addMetric(metric);
      
      // Log em desenvolvimento
      if (process.env.NODE_ENV === 'development' && metric.renderTime > 16) {
        console.warn(`Slow render detected in ${componentName}: ${metric.renderTime.toFixed(2)}ms`);
      }
    };
  }

  private addMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);
    
    // Manter apenas as últimas métricas
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getAverageRenderTime(componentName?: string): number {
    const relevantMetrics = componentName 
      ? this.metrics.filter(m => m.componentName === componentName)
      : this.metrics;
    
    if (relevantMetrics.length === 0) return 0;
    
    const total = relevantMetrics.reduce((sum, metric) => sum + metric.renderTime, 0);
    return total / relevantMetrics.length;
  }

  clearMetrics() {
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Hook para medir performance de componentes
export function usePerformanceMonitor(componentName: string) {
  React.useEffect(() => {
    const endMeasure = performanceMonitor.startMeasure(componentName);
    return endMeasure;
  });
}

// Lazy loading utilities
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback: React.ComponentType = () => (
    <div className="loading-container">
      <div className="loading-spinner" />
      <p className="body-text">Carregando...</p>
    </div>
  )
) {
  return React.lazy(importFn);
}

// Image lazy loading
export function useImageLazyLoad(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = React.useState(placeholder || '');
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isError, setIsError] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const image = new Image();
            image.onload = () => {
              setImageSrc(src);
              setIsLoaded(true);
            };
            image.onerror = () => {
              setIsError(true);
            };
            image.src = src;
            observer.unobserve(img);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(img);
    return () => observer.disconnect();
  }, [src]);

  return {
    ref: imgRef,
    src: imageSrc,
    isLoaded,
    isError
  };
}

// Virtual scrolling hook
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = React.useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const onScroll = React.useCallback(
    throttle((event: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(event.currentTarget.scrollTop);
    }, 16), // ~60fps
    []
  );

  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll,
    startIndex,
    endIndex
  };
}

// Memoization utilities
export function deepMemo<T>(fn: () => T, deps: React.DependencyList): T {
  const memoizedRef = React.useRef<{ deps: React.DependencyList; value: T }>();

  const depsChanged = !memoizedRef.current || 
    deps.some((dep, index) => dep !== memoizedRef.current!.deps[index]);

  if (depsChanged) {
    memoizedRef.current = {
      deps: [...deps],
      value: fn()
    };
  }

  return memoizedRef.current.value;
}

// Bundle size analysis (development only)
export function analyzeBundleSize() {
  if (process.env.NODE_ENV !== 'development') return;

  const entries = performance.getEntriesByType('navigation');
  if (entries.length > 0) {
    const navigation = entries[0] as PerformanceNavigationTiming;
    console.group('Bundle Size Analysis');
    console.log('Transfer Size:', navigation.transferSize, 'bytes');
    console.log('Encoded Body Size:', navigation.encodedBodySize, 'bytes');
    console.log('Decoded Body Size:', navigation.decodedBodySize, 'bytes');
    console.log('Load Time:', navigation.loadEventEnd - navigation.loadEventStart, 'ms');
    console.groupEnd();
  }
}

// Memory usage monitoring
export function useMemoryMonitor(intervalMs: number = 10000) {
  const [memoryInfo, setMemoryInfo] = React.useState<{
    used: number;
    total: number;
    limit: number;
  } | null>(null);

  React.useEffect(() => {
    if (!(performance as any).memory) return;

    const updateMemoryInfo = () => {
      const memory = (performance as any).memory;
      setMemoryInfo({
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      });
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, intervalMs);
    
    return () => clearInterval(interval);
  }, [intervalMs]);

  return memoryInfo;
}

// React-specific optimizations
export const OptimizedComponent = {
  // HOC para adicionar performance monitoring
  withPerformanceMonitor: <P extends object>(
    Component: React.ComponentType<P>,
    componentName?: string
  ) => {
    const name = componentName || Component.displayName || Component.name || 'Unknown';
    
    return React.memo(React.forwardRef<any, P>((props, ref) => {
      usePerformanceMonitor(name);
      return <Component {...props} ref={ref} />;
    }));
  },

  // HOC para lazy loading
  withLazyLoading: <P extends object>(
    Component: React.ComponentType<P>,
    fallback?: React.ComponentType
  ) => {
    return React.lazy(() => Promise.resolve({ default: Component }));
  }
};
import { useState, useCallback } from 'react';

type UIState = 'idle' | 'loading' | 'success' | 'error';

interface UseUIStateReturn {
  state: UIState;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: string | null;
  setLoading: () => void;
  setSuccess: () => void;
  setError: (error: string) => void;
  reset: () => void;
  executeAsync: <T,>(asyncFn: () => Promise<T>) => Promise<T | null>;
}

export function useUIState(): UseUIStateReturn {
  const [state, setState] = useState<UIState>('idle');
  const [error, setErrorMessage] = useState<string | null>(null);

  const setLoading = useCallback(() => {
    setState('loading');
    setErrorMessage(null);
  }, []);

  const setSuccess = useCallback(() => {
    setState('success');
    setErrorMessage(null);
  }, []);

  const setError = useCallback((error: string) => {
    setState('error');
    setErrorMessage(error);
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setErrorMessage(null);
  }, []);

  const executeAsync = useCallback(async <T,>(asyncFn: () => Promise<T>): Promise<T | null> => {
    try {
      setLoading();
      const result = await asyncFn();
      setSuccess();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return null;
    }
  }, [setLoading, setSuccess, setError]);

  return {
    state,
    isLoading: state === 'loading',
    isError: state === 'error',
    isSuccess: state === 'success',
    error,
    setLoading,
    setSuccess,
    setError,
    reset,
    executeAsync
  };
}
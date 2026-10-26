export interface ValidationRule<T = any> {
  test: (value: T) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export type ValidatorFunction<T = any> = (value: T) => ValidationResult;

// Validadores básicos
export const validators = {
  required: (message: string = 'Este campo é obrigatório'): ValidationRule<any> => ({
    test: (value) => {
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return value != null && value !== undefined;
    },
    message
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    test: (value) => !value || value.length >= min,
    message: message || `Deve ter pelo menos ${min} caracteres`
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    test: (value) => !value || value.length <= max,
    message: message || `Deve ter no máximo ${max} caracteres`
  }),

  email: (message: string = 'Email inválido'): ValidationRule<string> => ({
    test: (value) => {
      if (!value) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message
  }),

  url: (message: string = 'URL inválida'): ValidationRule<string> => ({
    test: (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message
  }),

  numeric: (message: string = 'Deve ser um número válido'): ValidationRule<string | number> => ({
    test: (value) => {
      if (!value && value !== 0) return true;
      return !isNaN(Number(value));
    },
    message
  }),

  integer: (message: string = 'Deve ser um número inteiro'): ValidationRule<string | number> => ({
    test: (value) => {
      if (!value && value !== 0) return true;
      const num = Number(value);
      return !isNaN(num) && Number.isInteger(num);
    },
    message
  }),

  min: (min: number, message?: string): ValidationRule<string | number> => ({
    test: (value) => {
      if (!value && value !== 0) return true;
      const num = Number(value);
      return !isNaN(num) && num >= min;
    },
    message: message || `Deve ser maior ou igual a ${min}`
  }),

  max: (max: number, message?: string): ValidationRule<string | number> => ({
    test: (value) => {
      if (!value && value !== 0) return true;
      const num = Number(value);
      return !isNaN(num) && num <= max;
    },
    message: message || `Deve ser menor ou igual a ${max}`
  }),

  pattern: (regex: RegExp, message: string): ValidationRule<string> => ({
    test: (value) => !value || regex.test(value),
    message
  }),

  custom: <T>(testFn: (value: T) => boolean, message: string): ValidationRule<T> => ({
    test: testFn,
    message
  })
};

// Função para criar um validador com múltiplas regras
export function createValidator<T = any>(...rules: ValidationRule<T>[]): ValidatorFunction<T> {
  return (value: T): ValidationResult => {
    const errors: string[] = [];
    
    for (const rule of rules) {
      try {
        if (!rule.test(value)) {
          errors.push(rule.message);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Erro na validação:', error);
        }
        errors.push('Erro na validação');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };
}

// Validações específicas do projeto
export const projectValidators = {
  projectName: createValidator(
    validators.required('Nome do projeto é obrigatório'),
    validators.minLength(2, 'Nome deve ter pelo menos 2 caracteres'),
    validators.maxLength(100, 'Nome deve ter no máximo 100 caracteres')
  ),

  projectDescription: createValidator(
    validators.maxLength(500, 'Descrição deve ter no máximo 500 caracteres')
  ),

  password: createValidator(
    validators.minLength(8, 'Senha deve ter pelo menos 8 caracteres'),
    validators.pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'
    )
  ),

  wordCount: createValidator(
    validators.required('Número de palavras é obrigatório'),
    validators.integer('Deve ser um número inteiro'),
    validators.min(10, 'Deve ter pelo menos 10 palavras'),
    validators.max(10000, 'Deve ter no máximo 10.000 palavras')
  ),

  fileSize: (maxSizeMB: number) => createValidator(
    validators.custom(
      (size: number) => size <= maxSizeMB * 1024 * 1024,
      `Arquivo deve ter no máximo ${maxSizeMB}MB`
    )
  ),

  fileType: (allowedTypes: string[]) => createValidator(
    validators.custom(
      (type: string) => allowedTypes.includes(type),
      `Tipo de arquivo permitido: ${allowedTypes.join(', ')}`
    )
  )
};

// Hook para validação de formulários
export function useFormValidation<T extends Record<string, any>>(
  initialData: T,
  validators: Partial<Record<keyof T, ValidatorFunction>>
) {
  const [data, setData] = useState<T>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string[]>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const validateField = useCallback((field: keyof T, value: any): ValidationResult => {
    const validator = validators[field];
    if (!validator) return { isValid: true, errors: [] };
    
    return validator(value);
  }, [validators]);

  const validateAll = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string[]>> = {};
    let hasErrors = false;

    Object.keys(data).forEach(key => {
      const field = key as keyof T;
      const result = validateField(field, data[field]);
      
      if (!result.isValid) {
        newErrors[field] = result.errors;
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    return !hasErrors;
  }, [data, validateField]);

  const updateField = useCallback((field: keyof T, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    
    // Validar campo apenas se já foi tocado
    if (touched[field]) {
      const result = validateField(field, value);
      setErrors(prev => ({
        ...prev,
        [field]: result.isValid ? undefined : result.errors
      }));
    }
  }, [touched, validateField]);

  const touchField = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Validar quando tocar no campo
    const result = validateField(field, data[field]);
    setErrors(prev => ({
      ...prev,
      [field]: result.isValid ? undefined : result.errors
    }));
  }, [data, validateField]);

  const reset = useCallback(() => {
    setData(initialData);
    setErrors({});
    setTouched({});
  }, [initialData]);

  const isValid = Object.keys(errors).length === 0;
  const hasErrors = !isValid;

  return {
    data,
    errors,
    touched,
    isValid,
    hasErrors,
    updateField,
    touchField,
    validateField,
    validateAll,
    reset
  };
}
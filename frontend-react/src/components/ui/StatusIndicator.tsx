import React from "react";
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";

export type StatusType = 'success' | 'error' | 'warning' | 'loading' | 'idle';

interface StatusIndicatorProps {
  status: StatusType;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const statusConfig = {
  success: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200'
  },
  error: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200'
  },
  warning: {
    icon: AlertCircle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-200'
  },
  loading: {
    icon: Loader2,
    color: 'text-primary',
    bgColor: 'bg-primary-soft',
    borderColor: 'border-line'
  },
  idle: {
    icon: AlertCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200'
  }
};

const sizeConfig = {
  sm: {
    iconSize: 'size-4',
    padding: 'p-2',
    textSize: 'text-sm'
  },
  md: {
    iconSize: 'size-5',
    padding: 'p-3',
    textSize: 'text-base'
  },
  lg: {
    iconSize: 'size-6',
    padding: 'p-4',
    textSize: 'text-lg'
  }
};

export default function StatusIndicator({ 
  status, 
  message, 
  size = 'md', 
  showIcon = true,
  className = ''
}: StatusIndicatorProps) {
  const config = statusConfig[status];
  const sizeConf = sizeConfig[size];
  const Icon = config.icon;

  return (
    <div 
      className={`
        inline-flex items-center gap-2 rounded-lg border
        ${config.bgColor} ${config.borderColor} ${sizeConf.padding}
        transition-all duration-200
        ${className}
      `}
      role="status"
      aria-label={`Status: ${status}${message ? ` - ${message}` : ''}`}
    >
      {showIcon && (
        <Icon 
          className={`
            ${sizeConf.iconSize} ${config.color}
            ${status === 'loading' ? 'animate-spin' : ''}
          `}
          aria-hidden="true"
        />
      )}
      {message && (
        <span className={`${config.color} ${sizeConf.textSize} font-medium`}>
          {message}
        </span>
      )}
    </div>
  );
}

// Hook para gerenciar estados de status
export function useStatus(initialStatus: StatusType = 'idle') {
  const [status, setStatus] = React.useState<StatusType>(initialStatus);
  const [message, setMessage] = React.useState<string>('');

  const updateStatus = (newStatus: StatusType, newMessage?: string) => {
    setStatus(newStatus);
    setMessage(newMessage || '');
  };

  const success = (msg?: string) => updateStatus('success', msg);
  const error = (msg?: string) => updateStatus('error', msg);
  const warning = (msg?: string) => updateStatus('warning', msg);
  const loading = (msg?: string) => updateStatus('loading', msg);
  const idle = () => updateStatus('idle');

  return {
    status,
    message,
    updateStatus,
    success,
    error,
    warning,
    loading,
    idle
  };
}
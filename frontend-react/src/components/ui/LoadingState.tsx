import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  submessage?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingState({ 
  message = "Carregando...", 
  submessage,
  className = "",
  size = 'md'
}: LoadingStateProps) {
  const spinnerSize = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  }[size];

  return (
    <div className={`loading-container ${className}`}>
      <Loader2 className={`${spinnerSize} text-primary animate-spin mb-4`} />
      <div className="flex flex-col element-gap text-center">
        <p className="component-title text-primary">
          {message}
        </p>
        {submessage && (
          <p className="body-text-sm text-muted-foreground">
            {submessage}
          </p>
        )}
      </div>
    </div>
  );
}
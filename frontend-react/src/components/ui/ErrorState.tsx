import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorState({
  title = "Ops! Algo deu errado",
  message = "Não foi possível carregar os dados. Tente novamente.",
  onRetry,
  className = ""
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-6 py-16 px-4 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      
      <div className="space-y-2 max-w-md">
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <p className="text-muted-foreground">{message}</p>
      </div>

      {onRetry && (
        <Button 
          onClick={onRetry}
          variant="outline"
          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground px-6 py-2 rounded-lg font-medium transition-colors duration-200"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
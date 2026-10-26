import { FileX, Plus, Search } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: "file" | "search" | "plus";
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  icon = "file",
  title,
  description,
  actionLabel,
  onAction,
  className = ""
}: EmptyStateProps) {
  const IconComponent = {
    file: FileX,
    search: Search,
    plus: Plus
  }[icon];

  return (
    <div className={`flex flex-col items-center justify-center gap-6 py-16 px-4 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full bg-primary-soft flex items-center justify-center">
        <IconComponent className="w-8 h-8 text-primary" />
      </div>
      
      <div className="space-y-2 max-w-md">
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>

      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          className="bg-primary hover:bg-primary-strong text-primary-foreground px-6 py-2 rounded-lg font-medium transition-colors duration-200"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
import { LucideIcon } from "lucide-react";

interface ChartPlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconColor?: string;
  height?: string;
}

export default function ChartPlaceholder({ 
  icon: Icon, 
  title, 
  description, 
  iconColor = "var(--muted-foreground)",
  height = "300px"
}: ChartPlaceholderProps) {
  return (
    <div className="flex flex-col component-gap">
      <div className="flex items-center element-gap mb-4">
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
        <h3 className="component-title">{title}</h3>
      </div>
      
      <div 
        className="bg-surface-muted border-2 border-dashed border-line rounded-xl p-8 flex flex-col items-center justify-center text-center"
        style={{ minHeight: height }}
      >
        <Icon className="w-16 h-16 text-muted-foreground mb-4" />
        <h4 className="component-title mb-2">{title}</h4>
        <p className="body-text text-muted-foreground max-w-md">
          {description}
        </p>
        <div className="mt-4">
          <span className="inline-flex items-center px-3 py-1 bg-primary-soft text-primary body-text-sm font-medium rounded-full">
            Em desenvolvimento
          </span>
        </div>
      </div>
    </div>
  );
}
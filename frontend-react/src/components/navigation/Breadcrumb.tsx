import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  section?: string;
  isActive?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate: (section: string) => void;
}

export default function Breadcrumb({ items, onNavigate }: BreadcrumbProps) {
  return (
    <nav 
      aria-label="Breadcrumb" 
      className="flex items-center element-gap body-text-sm text-muted-foreground mb-6"
      role="navigation"
    >
      <button
        onClick={() => onNavigate('Home')}
        className="flex items-center element-gap hover:text-primary transition-colors duration-200 focus-visible-only rounded-sm"
        aria-label="Ir para Home"
        type="button"
      >
        <Home className="w-4 h-4" aria-hidden="true" />
        <span className="hide-on-xs">Home</span>
      </button>
      
      {items.map((item, index) => (
        <div key={index} className="flex items-center element-gap">
          <ChevronRight className="w-4 h-4 text-line-strong" aria-hidden="true" />
          {item.section && !item.isActive ? (
            <button
              onClick={() => onNavigate(item.section)}
              className="hover:text-primary transition-colors duration-200 focus-visible-only rounded-sm"
              type="button"
              aria-label={`Navegar para ${item.label}`}
            >
              {item.label}
            </button>
          ) : (
            <span 
              className={item.isActive ? "text-primary font-medium" : ""}
              aria-current={item.isActive ? "page" : undefined}
            >
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  onBack: () => void;
  label?: string;
  className?: string;
}

export default function BackButton({ onBack, label = "Voltar", className = "" }: BackButtonProps) {
  return (
    <button
      onClick={onBack}
      className={`
        inline-flex items-center element-gap text-[var(--primary)] hover:text-[var(--primary-strong)] 
        transition-colors duration-200 focus-visible-only rounded-sm
        body-text-sm font-medium cursor-pointer
        ${className}
      `}
      aria-label={label}
      type="button"
    >
      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
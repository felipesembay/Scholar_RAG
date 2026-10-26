import { RadioButton, FileText, X } from "lucide-react";

export function RadioButtonChecked({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <RadioButton className={`${className} text-primary`} />
  );
}

export function RadioButtonUnchecked({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <div className={`${className} border-2 border-line rounded-full`} />
  );
}

export function DocsIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <FileText className={`${className}`} />
  );
}

export function CloseIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <X className={`${className}`} />
  );
}
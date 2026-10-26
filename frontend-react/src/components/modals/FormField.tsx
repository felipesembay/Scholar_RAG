interface FormFieldProps {
  label: string;
  placeholder: string;
  type?: "text" | "password" | "textarea";
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function FormField({ 
  label, 
  placeholder, 
  type = "text", 
  value, 
  onChange,
  className = "" 
}: FormFieldProps) {
  return (
    <div className="box-border content-stretch flex flex-col gap-1 items-start justify-start p-0 relative shrink-0">
      <div className="flex flex-col font-bold justify-center leading-[0] relative shrink-0 text-ink text-[18px] text-left text-nowrap">
        <p className="block leading-[normal] whitespace-pre">{label}</p>
      </div>
      
      {type === "textarea" ? (
        <textarea
          className={`textarea-base h-[157px] ${className}`}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type={type}
          className={`input-base ${className}`}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
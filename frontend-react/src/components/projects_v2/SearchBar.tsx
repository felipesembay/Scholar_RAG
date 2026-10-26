import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}




             

export default function SearchBar({ value, onChange, placeholder = "Pesquisar projetos" }: SearchBarProps) {
  return (
    <div className="input-container">
      <Search className="input-icon w-5 h-5" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-with-icon"
      />
    </div>
  );         
}
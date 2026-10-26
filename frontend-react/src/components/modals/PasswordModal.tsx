import { useState, useEffect } from "react";
import { X, Lock, Eye, EyeOff, KeyRound } from "lucide-react";

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  projectName: string;
}

export default function PasswordModal({ isOpen, onClose, onConfirm, projectName }: PasswordModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {

    //window.alert("estou aqui....");

    e.preventDefault();
    if (password.trim()) {
      onConfirm(password.trim());
      setPassword("");
    }
  };

  const handleCancel = () => {
    setPassword("");
    setShowPassword(false);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  const handleEscapeKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
    } else {
      setPassword("");
      setShowPassword(false);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;


  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(34, 34, 34, 0.25)" }}
      onClick={handleOverlayClick}
    >
      <div 
        className="bg-surface rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto relative shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8">
          {/* Close Button */}
          <button
            onClick={handleCancel}
            className="absolute top-4 right-4 z-10 p-2 text-muted-foreground hover:text-primary hover:bg-primary-soft rounded-lg transition-all duration-200"
            title="Fechar modal (ESC)"
          >
            <X className="size-5" />
            <span className="sr-only">Fechar</span>
          </button>
         
          {/* Header */}
          <div className="flex flex-col gap-3 mb-8 pt-2">
            <div className="flex items-center gap-3">
              <div className="bg-primary-soft p-2 rounded-lg">
                <Lock className="size-6 text-primary" />
              </div>
              <div>
                <div className=" font-bold text-ink text-2xl sm:text-[28px]">
                  Acesso ao Projeto
                </div>
                <div className=" font-normal text-muted-foreground text-[16px] mt-1" style={{ fontVariationSettings: "'wdth' 100" }}>
                  Este projeto está protegido por senha
                </div>
              </div>
            </div>
          </div>
          {/* Project Info */}
          <div className="bg-surface-muted border border-line rounded-xl p-4 w-full mb-8">
            <div className="flex items-start gap-3">
              <KeyRound className="size-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <div className=" font-bold text-primary text-[16px] mb-1">
                  Projeto Protegido
                </div>
                <div className=" font-normal text-muted-foreground text-[14px] leading-[1.4]" style={{ fontVariationSettings: "'wdth' 100" }}>
                  O projeto <strong>"{projectName}"</strong> requer autenticação para acesso.
                  Digite a senha para continuar.
                </div>
              </div>
            </div>
          </div>        
          {/* Password Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <label className=" font-bold text-ink text-[18px]">
                Senha do Projeto *
              </label>
              <div className="input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a senha para acessar este projeto"
                  className="input-base pr-12"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <div className=" font-normal text-muted-foreground text-[14px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                Esta senha foi definida quando o projeto foi criado.
              </div>
            </div>
          </form>
          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <button
              type="button"
              onClick={handleCancel}
              className="bg-surface border border-line-strong px-6 py-3 rounded-xl hover:bg-surface-muted transition-all duration-200 order-2 sm:order-1 group"
            >
              <div className=" font-bold text-primary text-[16px] text-center group-hover:text-primary-hover transition-colors" style={{ fontVariationSettings: "'wdth' 100" }}>
                Cancelar
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
              disabled={!password.trim()}
              className="bg-primary hover:bg-primary-hover disabled:bg-surface-muted disabled:cursor-not-allowed flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all duration-200 order-1 sm:order-2 hover:shadow-sm transform hover:translate-y-[-1px] disabled:hover:transform-none disabled:hover:shadow-none"
            >
              <Lock className="size-5 text-primary-foreground" />
              <div className=" font-bold text-primary-foreground text-[16px] text-center" style={{ fontVariationSettings: "'wdth' 100" }}>
                Acessar Projeto
              </div>
            </button>
          </div> 
        </div>
      </div>
    </div>
  ); 


  // return (
    // <div 
    //   className="fixed inset-0 z-50 flex items-center justify-center p-4"
    //   style={{ backgroundColor: "rgba(34, 34, 34, 0.25)" }}
    //   onClick={handleOverlayClick}
    // >
    //   <div 
    //     className="bg-surface rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto relative shadow-xl"
    //     onClick={(e) => e.stopPropagation()}
    //   >
    //     <div className="p-6 sm:p-8">
          {/* Close Button */}
          {/* <button
            onClick={handleCancel}
            className="absolute top-4 right-4 z-10 p-2 text-muted-foreground hover:text-primary hover:bg-primary-soft rounded-lg transition-all duration-200"
            title="Fechar modal (ESC)"
          >
            <X className="size-5" />
            <span className="sr-only">Fechar</span>
          </button>
          */}
          {/* Header */}
          {/* <div className="flex flex-col gap-3 mb-8 pt-2">
            <div className="flex items-center gap-3">
              <div className="bg-primary-soft p-2 rounded-lg">
                <Lock className="size-6 text-primary" />
              </div>
              <div>
                <div className=" font-bold text-ink text-2xl sm:text-[28px]">
                  Acesso ao Projeto
                </div>
                <div className=" font-normal text-muted-foreground text-[16px] mt-1" style={{ fontVariationSettings: "'wdth' 100" }}>
                  Este projeto está protegido por senha
                </div>
              </div>
            </div>
          </div> */}
          {/* Project Info */}
          {/* <div className="bg-surface-muted border border-line rounded-xl p-4 w-full mb-8">
            <div className="flex items-start gap-3">
              <KeyRound className="size-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <div className=" font-bold text-primary text-[16px] mb-1">
                  Projeto Protegido
                </div>
                <div className=" font-normal text-muted-foreground text-[14px] leading-[1.4]" style={{ fontVariationSettings: "'wdth' 100" }}>
                  O projeto <strong>"{projectName}"</strong> requer autenticação para acesso.
                  Digite a senha para continuar.
                </div>
              </div>
            </div>
          </div>         */}
          {/* Password Form */}
          {/* <form onSubmit={handleSubmit} className="flex flex-col gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <label className=" font-bold text-ink text-[18px]">
                Senha do Projeto *
              </label>
              <div className="input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a senha para acessar este projeto"
                  className="input-base pr-12"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <div className=" font-normal text-muted-foreground text-[14px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                Esta senha foi definida quando o projeto foi criado.
              </div>
            </div>
          </form> */}
          {/* Actions */}
          {/* <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <button
              type="button"
              onClick={handleCancel}
              className="bg-surface border border-line-strong px-6 py-3 rounded-xl hover:bg-surface-muted transition-all duration-200 order-2 sm:order-1 group"
            >
              <div className=" font-bold text-primary text-[16px] text-center group-hover:text-primary-hover transition-colors" style={{ fontVariationSettings: "'wdth' 100" }}>
                Cancelar
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
              disabled={!password.trim()}
              className="bg-primary hover:bg-primary-hover disabled:bg-surface-muted disabled:cursor-not-allowed flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all duration-200 order-1 sm:order-2 hover:shadow-sm transform hover:translate-y-[-1px] disabled:hover:transform-none disabled:hover:shadow-none"
            >
              <Lock className="size-5 text-primary-foreground" />
              <div className=" font-bold text-primary-foreground text-[16px] text-center" style={{ fontVariationSettings: "'wdth' 100" }}>
                Acessar Projeto
              </div>
            </button>
          </div> */
          }
        {/* </div>
      </div>
    </div>
  ); */}

}
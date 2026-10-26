import { useState, useEffect } from "react";
import { X, Trash2, AlertTriangle, Eye, EyeOff } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  lastAccessed: string;
  hasPassword?: boolean; 
  username:string;
  qtd_documents:number;
  qtd_words:number;

}

interface DeleteProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: (projectId: string, password: string, haspassword: boolean) => void;
  project: Project | null;
}

export default function DeleteProjectModal({ isOpen, onClose, onDelete, project }: DeleteProjectModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);  
  // const [isModalVisible, setModalVisible] = useState(false);  

  const handleDelete = async () => {
    if (!project) return;
    setIsProcessing(true)
    //window.alert("aqui na função: handleDelete() em DeleteProjectModals.tsx ");

    //setModalVisible(true);          
    await new  Promise(resolve => setTimeout(resolve, 250));   


    onDelete(project.id, password, !!project.hasPassword);      
    //setModalVisible(false);          
    await new  Promise(resolve => setTimeout(resolve, 250));       
    setIsProcessing(false);    
    //onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleEscapeKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
    } else {
      setPassword("");
      setShowPassword(false);
      setIsProcessing(false);
      setShowPassword(false);      
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !project) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(34, 34, 34, 0.25)" }}
      onClick={handleOverlayClick}
    >
      <div
        className="bg-surface rounded-xl w-full max-w-lg relative shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
       <div className="p-6 sm:p-8">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 text-muted-foreground hover:text-[#ef4444] hover:bg-[#fef2f2] rounded-lg transition-all duration-200"
            title="Fechar modal (ESC)"
          >
            <X className="size-5" />
            <span className="sr-only">Fechar</span>
          </button>
          
          {/* Header */}
          <div className="flex flex-col gap-3 mb-8 pt-2">
            <div className="flex items-center gap-3">
              <div className="bg-[#fef2f2] p-2 rounded-lg">
                <AlertTriangle className="size-6 text-[#ef4444]" />
              </div>
              <div>
                <div className=" font-bold text-ink text-2xl sm:text-[28px]">
                  Deletar projeto
                </div>
                <div className=" font-normal text-muted-foreground text-[16px] mt-1" style={{ fontVariationSettings: "'wdth' 100" }}>
                  Esta ação não pode ser desfeita
                </div>
              </div>
            </div>
          </div>


          {/* Content */}
          <div className="flex flex-col gap-6 mb-8">
            {/* Warning Message */}
            <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-4 w-full">
              <div className="flex items-start gap-3">
                <Trash2 className="size-5 text-[#ef4444] mt-0.5 flex-shrink-0" />
                <div>
                  <div className=" font-bold text-[#ef4444] text-[16px] mb-1">
                    Atenção: Ação irreversível
                  </div>
                  <div className=" font-normal text-[#991b1b] text-[14px] leading-[1.4]" style={{ fontVariationSettings: "'wdth' 100" }}>
                    O projeto <strong>"{project.name}"</strong> e todos os seus dados serão permanentemente removidos. 
                    Esta operação não pode ser desfeita.
                  </div>
                </div>
              </div>
            </div>

            {/* 
            // 
            */}            
            {/* Processing indicator */}
            {isProcessing && 
              (
              <div className="flex items-center gap-3 bg-primary-soft p-4 rounded-xl">
                <div className="animate-spin size-7 border-2 border-primary border-t-transparent rounded-full"></div>
                <div className=" font-normal text-primary text-[18px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                  Excluindo o Projeto, aguarde...
                </div>
              </div>          
              )
            }       


            {/* 
            // 
            */}
            {/* <div>
              {isModalVisible && (
                <div className="modal-overlay"  
                  style={
                    { backgroundColor: "rgba(34, 34, 34, 0.25)" }
                  }
                >
                <div className="animate-spin size-7 border-2 border-primary border-t-transparent rounded-full">           
                </div>
                  <div className="modal-content">
                    <h2>
                        <div className="mb-4">
                          Excluindo o Projeto, aguarde..."   
                        </div>
                    </h2>
                  </div>
                </div>
              )}
            </div> */}


            { project.hasPassword && 
              (
                <div>  
                  {/* Password Field */}
                  <div className="flex flex-col gap-2">
                    <label className=" font-bold text-ink text-[18px]">
                      Digite a senha para confirmar *
                    </label>
                    <div className="bg-surface-muted h-12 px-4 py-2 rounded-xl border border-line hover:border-[#ef4444] transition-colors flex items-center gap-4">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Digite sua senha para confirmar"
                        className="bg-transparent flex-1 outline-none font-normal text-ink text-[16px] placeholder:text-line-strong"
                        style={{ fontVariationSettings: "'wdth' 100" }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword )}
                        className="text-muted-foreground hover:text-[#ef4444] transition-colors p-1"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    <div className=" font-normal text-muted-foreground text-[14px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                      Esta é a senha que foi definida quando o projeto foi criado.
                    </div>
                  </div>
                </div>
              )
            }
            {/* ---------------------------------------------------------------------------------------- */}
 
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <button
              className="bg-surface border border-line-strong px-6 py-3 rounded-xl hover:bg-surface-muted transition-all duration-200 order-2 sm:order-1 group"
              onClick={onClose}
            >
              <div className=" font-bold text-primary text-[16px] text-center group-hover:text-primary-hover transition-colors" style={{ fontVariationSettings: "'wdth' 100" }}>
                Cancelar
              </div>
            </button>
            
            <button
              className="bg-[#ef4444] flex items-center justify-center gap-2 px-6 py-3 rounded-xl hover:bg-[#dc2626] transition-all duration-200 order-1 sm:order-2 hover:shadow-[0_4px_15px_rgba(239,68,68,0.3)] transform hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
              onClick={handleDelete}
              //disabled={!password.trim()}
              disabled={project.hasPassword ? !password.trim() : false}
            >
              <Trash2 className="size-5 text-white" />
              <div className=" font-bold text-white text-[16px] text-center" style={{ fontVariationSettings: "'wdth' 100" }}>
                Deletar Projeto
              </div>
            </button>
          </div>


        </div>
      </div>
    </div>
  );
}
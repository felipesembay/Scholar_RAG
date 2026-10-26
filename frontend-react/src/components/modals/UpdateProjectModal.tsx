import { useState, useCallback, useEffect } from "react";
import { X, RefreshCw, Upload, Eye, EyeOff, Calendar, User, FileText, Archive } from "lucide-react";
import imgImage5 from "figma:asset/f9088f315ce734b792fb1beee4bbe487ccc3f1d5.png";
import { hasWarned } from "motion/react";

interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  lastAccessed: string;
  username:string;
  hasPassword?: boolean;
  qtd_documents:number;
  qtd_words:number;
  files: File[];

}

interface UpdateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (projectId: string, data: UpdateProjectData) => void;
  project: Project | null;
}

interface UpdateProjectData {
  uploadMethod: "manual";
  files: File[];
  password: string;
}


interface FileItemPrj {
  id: number;
  file_name: string;
  word_count: number;
}

interface FileItem {
  id: string;
  name: string;
  size: string;
  file: File;
}

export default function UpdateProjectModal({ isOpen, onClose, onUpdate, project }: UpdateProjectModalProps) {
  const uploadMethod = "manual";
  const [files, setFiles] = useState<FileItem[]>([]);
  const [password, setPassword] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [doUpdate, setdoUpdate] = useState(false);


  const CheckValuesOfFileds = () => {
    let boCanSave = true;


    if(project?.hasPassword && password.toString().trim() === "") // possui proteção por senha 
    {
      boCanSave = false;
    } 
    else if(project?.hasPassword && password.length < 5)
    {
      boCanSave = false;
    }
    else if(project?.hasPassword && password.length > 25)
    {
      boCanSave = false;
    }
    else
    {
      if (files.length === 0) 
      {
        boCanSave = false;
      }
    }

    // if ( boCanSave){ 
      //setdoUpdate(false);
    // }

    return boCanSave;

  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0mb';
    const mb = bytes / (1024 * 1024);
    return `${Math.round(mb)}mb`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleFilesChange = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    
    setIsProcessing(true);
    //Simular processamento
    setTimeout(() => {
      const validFiles: FileItem[] = [];
      
      Array.from(newFiles).forEach((file) => {
        validFiles.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: formatFileSize(file.size),
          file
        });
      });

      setFiles(prevFiles => [...prevFiles, ...validFiles]);

      setIsProcessing(false);
    }, 1500);


  }, []);


  const handleUpdate = () => {
    if (!project) return;
    
    setIsProcessing(true);
    setdoUpdate(true);
    new  Promise(resolve => setTimeout(resolve, 1000));   

    const updateData: UpdateProjectData = {
      uploadMethod,
      files: files.map(f => f.file),
      password,
    };
    onUpdate(project.id, updateData);


    //onClose();


    //setModalVisible(false);  
    setIsProcessing(false);    
    //setdoUpdate(false);   
    //new  Promise(resolve => setTimeout(resolve, 1000));            
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
      setFiles([]);
      setPassword("");
      setIsProcessing(false);
      setShowPassword(false);
      setdoUpdate(false);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !project) return null;


  // Simular dados de arquivos existentes
  // const existingFilesCount = Math.floor(Math.random() * 5) + 1
  // const existingFileWords = Math.floor(Math.random() * 5000) + 1000;
  const existingFilesCount = project.qtd_documents;
  const existingFileWords = project.qtd_words;
  const hasPassword = project.hasPassword;

  const validFiles: FileItemPrj[] = [];
  let idx_files: number = 0
  Array.from(project.files).forEach((file: any) => {
      idx_files = (idx_files+1),
      validFiles.push({
        id: idx_files,
        file_name: file.file_name,
        word_count: file.word_count
       }
      )
  });


  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(34, 34, 34, 0.25)" }}
      onClick={handleOverlayClick}
    >
      <div
        className="bg-surface rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative shadow-xl"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="p-6 sm:p-8">
          {/* Close Button */}
          <button
            onClick={onClose}
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
                <RefreshCw className="size-6 text-primary" />
              </div>
              <div>
                <div className=" font-bold text-ink text-2xl sm:text-[28px]">
                  Atualizar projeto
                </div>
                <div className=" font-normal text-muted-foreground text-[16px] mt-1" style={{ fontVariationSettings: "'wdth' 100" }}>
                  Adicione novos documentos ao projeto existente
                </div>
              </div>
            </div>
          </div>

          {/* Project Information */}
          <div className="bg-surface-muted border border-line rounded-xl p-4 w-full mb-8">
            <div className="flex items-start gap-3">
              <FileText className="size-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <div className=" font-bold text-primary text-[16px] mb-2">
                  Informações do Projeto
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <User className="size-4 text-muted-foreground flex-shrink-0" />
                      <span className=" font-bold text-ink text-[14px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                        {project.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-muted-foreground flex-shrink-0" />
                    <span className=" text-muted-foreground text-[14px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                      Criado em {formatDate(project.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Archive className="size-4 text-muted-foreground flex-shrink-0" />
                    <span className=" text-muted-foreground text-[14px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                      {existingFilesCount} documento(s) • {existingFileWords} palavras
                    </span>
                  </div>
                  <div>
                    <span className=" font-bold text-ink text-[14px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                      Arquivos cadastrados no Projeto:
                    </span> 
                    <span className=" text-muted-foreground text-[14px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                    <ul>
                      {validFiles.map(item => (
                        <li key={item.id}>{item.file_name}</li>
                      ))}
                    </ul>
                    </span>
                  </div>


                </div>
              </div>
            </div>
          </div>


     

          {/* Form Fields */}
          <div className="flex flex-col gap-6 mb-8">


            {/* File Upload Area */}
              <div className="relative"
                  onClick={(e) => CheckValuesOfFileds()}                                  
              >
                <div className="border border-dashed border-line-strong hover:border-primary rounded-xl p-8 text-center hover:bg-primary-soft transition-colors cursor-pointer" onClick={() => document.getElementById('update-file-input')?.click()}>
                  <div className="bg-primary-soft p-4 rounded-xl mb-4 inline-block">
                    <Upload className="size-8 text-primary" />
                  </div>
                  <p className=" font-bold text-primary text-[18px] mb-2" style={{ fontVariationSettings: "'wdth' 100" }}>
                    Adicione novos arquivos
                  </p>
                  <p className="text-[16px] text-muted-foreground">
                    <span className="" style={{ fontVariationSettings: "'wdth' 100" }}>
                      Clique aqui ou arraste e solte
                    </span>
                    <br />
                    <span className="italic italic text-[14px] text-muted-foreground" style={{ fontVariationSettings: "'wdth' 100" }}>
                      Formatos: PDF, DOCX, PPTX, XLSX/CSV, TXT/MD, notebooks (.ipynb), scripts R/Python, imagens (OCR) e ZIP com pastas
                    </span>
                  </p>
                </div>

                {/* 
                // 
                */}            
                {/* Processing indicator */}
                {doUpdate && (
                  <div className="flex items-center gap-3 bg-primary-soft p-4 rounded-xl">
                    <div className="animate-spin size-7 border-2 border-primary border-t-transparent rounded-full"></div>
                    <div className=" font-normal text-primary text-[18px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                      Atualizando o Projeto, aguarde...
                    </div>
                  </div>
                )}
                {/* Processing indicator */}
                {isProcessing && (
                  <div className="flex items-center gap-3 bg-primary-soft p-4 rounded-xl">
                    <div className="animate-spin size-7 border-2 border-primary border-t-transparent rounded-full"></div>
                    <div className=" font-normal text-primary text-[18px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                      Processando arquivos, aguarde...
                    </div>
                  </div>
                )}     


                <input
                  id="update-file-input"
                  type="file"
                  multiple
                  accept=".zip,.pdf,.docx,.pptx,.xlsx,.xls,.csv,.odt,.html,.htm,.txt,.md,.json,.yaml,.yml,.ipynb,.r,.R,.py,.rmd,.qmd,.tex,.png,.jpg,.jpeg,.tif,.tiff,.bmp,.webp"
                  onChange={(e) => handleFilesChange(e.target.files)}
                  //onBlur={(e) => CheckValuesOfFileds()} 
                  className="hidden"
                />

                
              </div>

            {/* Password Field */}
            {hasPassword && (
              <div className="flex flex-col gap-2">
                <label className=" font-bold text-ink text-[18px]">
                  Digite a senha para confirmar *
                </label>
                <div className="input-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha para confirmar"
                    className="input-base pr-12"
                    autoFocus
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
                  Esta é a senha que foi definida quando o projeto foi criado.
                </div>
              </div>
            )}    


          </div>


          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <button
              type="button"
              className="bg-surface border border-line-strong px-6 py-3 rounded-xl hover:bg-surface-muted transition-all duration-200 order-2 sm:order-1 group"
              onClick={onClose}
            >
              <div className=" font-bold text-primary text-[16px] text-center group-hover:text-primary-hover transition-colors" style={{ fontVariationSettings: "'wdth' 100" }}>
                Cancelar
              </div>
            </button>
            
            <button
              type="button"
              className="bg-primary flex items-center justify-center gap-2 px-6 py-3 rounded-xl hover:bg-primary-hover transition-all duration-200 order-1 sm:order-2 hover:shadow-sm transform hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
              onClick={handleUpdate}
              // disabled={!password.trim()}                     
              disabled={!CheckValuesOfFileds()}    
            >
              <RefreshCw className="size-5 text-primary-foreground" />
              <div className=" font-bold text-primary-foreground text-[16px] text-center" style={{ fontVariationSettings: "'wdth' 100" }}>
                Atualizar Projeto
              </div>
            </button>
          </div>
        </div>
      </div>


    </div>
  );
}
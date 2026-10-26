import { useState, useCallback, useEffect } from "react";
import { X, FolderPlus, Upload, Eye, EyeOff } from "lucide-react";
import svgPaths from "../../imports/svg-l0264ce6e4";
import imgImage5 from "figma:asset/f9088f315ce734b792fb1beee4bbe487ccc3f1d5.png";
import { useToast } from "../ui/Toast";
import { validateNewProject }   from "../../rag_services.ts";
import { setSaveProject }       from "../../rag_services.ts";
import axios from "axios";
//import { useNavigate } from 'react-router-dom';
//import Project from "../content/ProjectsContent.tsx";
//import handleSaveProject from "../content/ProjectsContent.tsx";
import { retrieveProjectInfo }  from "../../rag_services.ts";
import { retQdtProjetct }       from "../../App.tsx";
//import { refreshListproject }  from "../content/ProjectsContent.tsx";


interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Project) => void;
}

export interface ProjectData {
  projectName: string;
  username: string;
  password: string;
  confirmPassword: string;
  prompt: string;
  uploadMethod: "manual";
  files: File[];
}


interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  lastAccessed: string;
  hasPassword?: boolean; // Novo campo para indicar se o projeto tem senha
  username:string;
  qtd_documents:number;
  qtd_words:number;
  files: File[];
}


interface FileItem {
  id: string;
  name: string;
  size: string;
  file: File;
}

function RadioButtonChecked() {
  return (
    <div className="relative shrink-0 size-6 text-primary" data-name="radio_button_checked">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" role="presentation" viewBox="0 0 24 24">
        <g id="radio_button_checked">
          <path d={svgPaths.p4501f00} fill="currentColor" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function RadioButtonUnchecked() {
  return (
    <div className="relative shrink-0 size-6 text-ink-soft" data-name="radio_button_unchecked">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" role="presentation" viewBox="0 0 24 24">
        <g id="radio_button_unchecked">
          <path d={svgPaths.p26f9ce00} fill="currentColor" id="Vector" />
        </g>
      </svg>
    </div>
  );
}


export default function CreateProjectModal({ isOpen, onClose, onSave }: CreateProjectModalProps) {
  const [optionalPass, setOptionalPass] = useState(false);

  const [projectName, setProjectName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [prompt, setPrompt] = useState("");
  const uploadMethod = "manual";
  const [modePrompt, setModePrompt] = useState<"concatenar" | "sobrescrever">("concatenar");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { showSuccess, showError } = useToast();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0mb';
    const mb = bytes / (1024 * 1024);
    return `${Math.round(mb)}mb`;
  };

  const handleGenerateProject  = async () =>   {
    
    setIsProcessing(true);
    const projectData: ProjectData = {
      projectName,
      username,
      password,
      confirmPassword,
      prompt,
      uploadMethod,
      files: files.map(f => f.file),
    };

    const HasPrompt = projectData.prompt != '' ? true : false;
    projectData.projectName = projectData.projectName.trim();
    projectData.username = projectData.username.trim();

    
    const IsValid = (await validateNewProject(projectData, HasPrompt, optionalPass)).toString();
    if(IsValid.substring(0,4) === "[OK]") {
      try{
        const response = await setSaveProject({
          project_name: projectData.projectName,
          user_name: projectData.username,
          password: projectData.password,
          upload_method: projectData.uploadMethod,
          prompt: projectData.prompt,
          prompt_mode: modePrompt,
          files: projectData.files,
        });

        if (response.status === 200 && response.data ) 
        {
          const complement = await retrieveProjectInfo({project_name: projectData.projectName})
          const document = Number(retQdtProjetct() + 1) ;
          const newProject: Project = {
            id:   document.toString().trim(),
            name: projectData.projectName, 
            description: "",
            createdAt: complement.create_date??'1900-01-01 00:00:00',
            lastAccessed: complement.last_update??'1900-01-01 00:00:00',
            hasPassword: complement.has_password??false,
            username: projectData.username,
            qtd_documents:  Number(complement.qtd_documents??0), 
            qtd_words: Number(complement.qtd_words??0) ,
            files: projectData.files    
          };
          onSave(newProject);       

          //showSuccess("O Projeto: " + projectData.projectName + " foi criado com sucesso!");
          showSuccess("[PROJETO CADASTRADO].", `O Projeto "${projectData.projectName}", foi criado com sucesso!`);             
        }
        else
        {
          showError("Erro ao criar o projeto: " + projectData.projectName + ". Tente novamente.");
          setIsProcessing(false);
          return;
        }
        // const newProject: Project = {
        //   id: Date.now().toString(),
        //   name: data.projectName,
        //   description: data.prompt || "Novo projeto criado",
        //   createdAt: new Date().toISOString().split('T')[0],
        //   lastAccessed: new Date().toISOString().split('T')[0],
        //   hasPassword: data.password.trim() ? true : false,
        //   username: "",
        //   qtd_documents: 0,
        //   qtd_words: 0
        // };        
        //const navigate = useNavigate(); // <-- Adicione esta linha
        //navigate(`/chatbot/${projectData.projectName}`); // <--- É ASSIM QUE VOCÊ CHAMA! 
        // window.location().reload();  
        //window.location.href = '/src/main.tsx';
      }
      catch (error) {
        console.error('Erro na Execução de Consistência:FrontEnd (CreateProjectModal.tsx) - ', error);
        const detail = (error as any)?.response?.data?.["error "] ?? (error as any)?.message ?? "";
        showError("Erro ao criar o projeto: " + projectData.projectName, detail);
        setIsProcessing(false);
        return;
      }
    } else
    {
      showError(IsValid);
    }  
    
    //onClose();
    setIsProcessing(false);
  }


  const handleFilesChange = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    
    setIsProcessing(true);
    showSuccess("Processando...", "Validando arquivos selecionados.");
    

    // Simular processamento
    setTimeout(() => {
      const validFiles: FileItem[] = [];
      let hasErrors = false;
      
      Array.from(newFiles).forEach((file) => {
        // Verificar tamanho do arquivo (200MB = 200 * 1024 * 1024 bytes)
        if (file.size > 200 * 1024 * 1024) {
          showError("Arquivo muito grande", `${file.name} excede o limite de 200MB.`);
          hasErrors = true;
          return;
        }

        validFiles.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: formatFileSize(file.size),
          file
        });
      });

      if (validFiles.length > 0) {
        showSuccess("Arquivos adicionados!", `${validFiles.length} arquivo(s) adicionado(s) com sucesso.`);
      }

      setFiles(prevFiles => [...prevFiles, ...validFiles]);

    }, 1500);

    setIsProcessing(false);    
  }, [showSuccess, showError]);


  // const mostrarAlerta = () => {
  //   alert("Projeto"); // Mostra um alerta simples
  // };


  const handleSave = () => {
    handleGenerateProject();


    // const projectData: ProjectData = {
    //   projectName,
    //   username,
    //   password,
    //   confirmPassword,
    //   prompt,
    //   uploadMethod,
    //   files: files.map(f => f.file),
    // };
    // console.log("projectData: ", projectData);
    //onSave(projectData);
  };

  //const handleSave = () => {
    // const projectData: ProjectData = {
    //   projectName,
    //   username,
    //   password,
    //   confirmPassword,
    //   prompt,
    //   uploadMethod,
    //   files: files.map(f => f.file),
    // };
    // const HasPrompt = projectData.prompt != '' ? true : false;
    // console.log("HasPrompt: ", HasPrompt);
    // projectData.projectName = projectData.projectName.trim();
    // projectData.username = projectData.username.trim();
    // const IsValid = validateNewProject(projectData, HasPrompt).then(
    //   IsValid =>
    //   {
    //     const result = IsValid.toString();
    //     if(IsValid.substring(0,3) === "[OK]") 
    //     {
    //       try{        
    //         const response = setSaveProject({
    //           project_name: projectData.projectName,
    //           user_name: projectData.username,
    //           password: projectData.password,
    //           upload_method: projectData.uploadMethod,
    //           prompt: projectData.prompt,
    //           files: projectData.files,
    //         });
    //       }
    //       catch (error) {
    //         console.error('Erro na Execução de Consistência:FrontEnd (CreateProjectModal.tsx) - ', error);
    //         throw error;
    //       } 
    //       showSuccess("Criando o Projeto: " + projectData.projectName);
    //     }
    //     else
    //     {
    //       showError(IsValid);
    //     }
    //   }
    // );
  //};

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

  const handleChangeCheck = () => {
    setOptionalPass(!optionalPass);
  }

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
    } else {
      setOptionalPass(false);  
      setProjectName("");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setPrompt("");
      setModePrompt("concatenar");
      setFiles([]);
      setIsProcessing(false);
      setShowPassword(false);
      setShowConfirmPassword(false);
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
                <FolderPlus className="size-6 text-primary" />
              </div>
              <div>
                <div className="section-title">
                  <p>Criar novo projeto</p>
                </div>
                <div className="body-text text-muted-foreground mt-1">
                  Configure seu projeto e faça upload dos documentos
                </div>
              </div>
            </div>
          </div>


          {/* Form Fields */}
          <div className="flex flex-col gap-6 mb-8">
            {/* Nome do projeto */}
            <div className="flex flex-col gap-2">
              <label className="component-title">
                Nome do projeto *
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Escolha o nome do seu projeto"
                className="input-base"
                required
              />
            </div>

            {/* Usuário */}
            <div className="flex flex-col gap-2">
              <label className="component-title">
                Usuário *
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Escolha o nome"
                className="input-base"
                required
              />
            </div>

            {/* 
            // */}
            {/* Possui senha */}
            <div className="flex flex-col gap-97"
                  style={{
                    border: '2px solid black', // Define uma borda de 2px sólida e preta
                    padding: '10px'                    
                  }} 
            >
              <label className="component-title">
                Possuí senha (opcional)&nbsp;&nbsp;
                <input type="checkbox" 
                  style={{
                    width: '20px',
                    height: '20px',
                    alignContent: 'center',
                    alignItems: 'center',
                    
                  }}

                  checked={optionalPass}
                  onChange={handleChangeCheck}
                  required
                />                
              </label>

            </div>
            {/* ------------------------------------------------------------------------------- */}

            {optionalPass && 
              (
                <div>
                    {/* Senha */}
                      <div className="flex flex-col gap-2">
                        <label className="component-title">
                          Senha *
                        </label>
                        <div className="input-container">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Escolha sua senha"
                            className="input-base pr-12"
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
                      </div>

                      {/* Repita a senha */}
                      <div className="flex flex-col gap-2">
                        <label className="component-title">
                          Repita a senha *
                        </label>
                        <div className="input-container">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Digite novamente a senha"
                            className="input-base pr-12"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-1"
                          >
                            {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </div>
              </div>      
              )
            } 
            {/* ------------------------------------------------------------------------------- */}  


            {/* Prompt do projeto */}
            <div className="flex flex-col gap-2">
              <label className="component-title">
                Prompt do projeto
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Dê instruções detalhadas sobre como o sistema deve processar seus documentos..."
                className="textarea-base h-32 sm:h-[120px]"
              />
            </div>
            {/* Modo do Prompt do projeto */}
            <div className="flex flex-col gap-3">
              <label className="component-title">
                Modo do prompt
              </label>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary-soft transition-colors border border-transparent hover:border-primary"
                  onClick={() => setModePrompt("concatenar")}
                >
                  {modePrompt === "concatenar" ? <RadioButtonChecked /> : <RadioButtonUnchecked />}
                  <div className={`body-text ${modePrompt === "concatenar" ? 'text-primary' : 'text-primary-strong'}`}>
                    Concatenar
                  </div>
                </button>
                
                <button
                  type="button"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary-soft transition-colors border border-transparent hover:border-primary"
                  onClick={() => setModePrompt("sobrescrever")}
                >
                  {modePrompt === "sobrescrever" ? <RadioButtonChecked /> : <RadioButtonUnchecked />}
                  <div className="body-text text-primary-strong">
                    Sobrescrever
                  </div>
                </button>
              </div>
            </div>

            {/* Processing indicator */}
            {isProcessing && 
              (
              <div className="flex items-center gap-3 bg-primary-soft p-4 rounded-xl">
                <div className="animate-spin size-7 border-2 border-primary border-t-transparent rounded-full"></div>
                <div className=" font-normal text-primary text-[18px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                  Criando o Projeto, aguarde...
                </div>
              </div>          
              )
            } 


            {/* File Upload Area */}
              <div className="relative">
                <div className="border border-dashed border-line-strong hover:border-primary rounded-xl p-8 text-center hover:bg-primary-soft transition-colors cursor-pointer" onClick={() => document.getElementById('file-input')?.click()}>
                  <div className="bg-primary-soft p-4 rounded-xl mb-4 inline-block">
                    <Upload className="size-8 text-primary" />
                  </div>
                  <p className="label-text text-primary mb-2">
                    Carregue seus arquivos
                  </p>
                  <p className="body-text text-muted-foreground">
                    Clique aqui ou arraste e solte seus documentos
                    <br />
                    <span className="body-text-sm italic text-muted-foreground">
                      Formatos: PDF, DOCX, PPTX, XLSX/CSV, TXT/MD, notebooks (.ipynb), scripts R/Python, imagens (OCR) e ZIP com pastas (até 200MB por arquivo)
                    </span>
                  </p>
                </div>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept=".zip,.pdf,.docx,.pptx,.xlsx,.xls,.csv,.odt,.html,.htm,.txt,.md,.json,.yaml,.yml,.ipynb,.r,.R,.py,.rmd,.qmd,.tex,.png,.jpg,.jpeg,.tif,.tiff,.bmp,.webp"
                  onChange={(e) => handleFilesChange(e.target.files)}
                  className="hidden"
                />
              </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <button
              type="button"
              className="bg-surface border border-line-strong px-6 py-3 rounded-xl hover:bg-surface-muted transition-all duration-200 order-2 sm:order-1 group"
              onClick={onClose}
            >
              <div className="label-text text-primary text-center group-hover:text-primary-hover transition-colors">
                Cancelar
              </div>
            </button>
            
            <button
              type="button"
              className="bg-primary flex items-center justify-center gap-2 px-6 py-3 rounded-xl hover:bg-primary-hover transition-all duration-200 order-1 sm:order-2 hover:shadow-sm transform hover:translate-y-[-1px]"
              //onClick={handleSave}
              onClick={handleSave}
              //onClick={handleGenerateProject}      
   
            >
              <FolderPlus className="size-5 text-primary-foreground" />
              <div className="label-text text-primary-foreground text-center">
                Criar Projeto
              </div>
            </button>
          </div>
        </div>
        {/* ///// */}

      </div>           
    </div>
  );
}
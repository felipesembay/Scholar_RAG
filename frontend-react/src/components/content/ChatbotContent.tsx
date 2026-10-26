import { useState, useRef, useEffect } from "react";
import svgPaths from "../../imports/svg-l7pa6g5i2w";
import { PlusIcon } from "../icons";
import CreateProjectModal from "../modals/CreateProjectModal";
import ProjectCard from "../ProjectCard";
import { Search, Folder, ArrowLeft } from "lucide-react";
import Breadcrumb from "../navigation/Breadcrumb";
import BackButton from "../navigation/BackButton";
import EmptyState from "../ui/EmptyState";
import { useToast } from "../ui/Toast";
import { useClipboard } from "../../utils/clipboard";
import { X, Trash2, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { checkPassword } from "../../rag_services.ts";
import MarkdownWithCitations from "../academic/MarkdownWithCitations";
import SourcesPanel from "../academic/SourcesPanel";
import type { Source } from "../../academic_services.ts";
import { initChatBot } from "../../rag_services.ts";
import { msgChatBot } from "../../rag_services.ts"; 


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
  files: File[];
}

interface ReturnChat{
  id: string;
  status : string; 
  response : string;                          
  docs?: string[];
  sources?: Source[];
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  relatedDocs?: string[];
  sources?: Source[];
}

interface ProjectData {
  projectName: string;
  username: string;
  password: string;
  confirmPassword: string;
  prompt: string;
  uploadMethod: "manual";
  files: File[];
}

interface ChatbotContentProps {
  isOpen: boolean;
  onClose: () => void; 

  selectedProject: Project | null;
  onProjectSelect: (project: Project | null) => void;
  onSectionChange: (section: string) => void;
  projects: Project[];
  onUpdateProjects: (projects: Project[]) => void;
}


// Ícone do Chatbot/Assistente (Forum)
function ChatbotAvatar() {
  return (
    <div className="bg-primary-soft box-border content-stretch flex flex-col gap-2.5 items-center justify-center px-[3px] py-[5px] relative rounded-xl shrink-0 size-12" data-name="dehaze">
      <div className="relative shrink-0 size-5" data-name="forum">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
          <g id="forum">
            <mask height="20" id="mask0_2008_1680" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="20" x="0" y="0">
              <rect fill="var(--fill-0, var(--line))" height="20" id="Bounding box" width="20" />
            </mask>
            <g mask="url(#mask0_2008_1680)">
              <path d={svgPaths.p3e72cf40} fill="var(--fill-0, var(--primary))" id="forum_2" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

// Ícone do Usuário (Account Circle)
function UserAvatar() {
  return (
    <div className="bg-primary box-border content-stretch flex flex-col gap-2.5 items-center justify-center px-[3px] py-[5px] relative rounded-xl shrink-0 size-12" data-name="dehaze">
      <div className="relative shrink-0 size-5" data-name="account_circle">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
          <g id="account_circle">
            <mask height="24" id="mask0_2008_1657" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="24" x="0" y="0">
              <rect fill="var(--fill-0, var(--line))" height="24" id="Bounding box" width="24" />
            </mask>
            <g mask="url(#mask0_2008_1657)">
              <path d={svgPaths.p8ea680} fill="var(--fill-0, var(--surface))" id="account_circle_2" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

// Ícones de Ação
function SoundDetectionLoudSound() {
  return (
    <div className="relative shrink-0 size-5" data-name="sound_detection_loud_sound">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="sound_detection_loud_sound">
          <path d={svgPaths.p3d54a00} fill="var(--fill-0, var(--muted-foreground))" id="sound_detection_loud_sound_2" />
        </g>
      </svg>
    </div>
  );
}

function ContentCopy() {
  return (
    <div className="relative shrink-0 size-5" data-name="content_copy">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="content_copy">
          <mask height="24" id="mask0_2008_1669" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="24" x="0" y="0">
            <rect fill="var(--fill-0, var(--line))" height="24" id="Bounding box" width="24" />
          </mask>
          <g mask="url(#mask0_2008_1669)">
            <path d={svgPaths.p22f3db00} fill="var(--fill-0, var(--muted-foreground))" id="content_copy_2" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function Share() {
  return (
    <div className="relative shrink-0 size-5" data-name="share">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="share">
          <mask height="24" id="mask0_2008_1661" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="24" x="0" y="0">
            <rect fill="var(--fill-0, var(--line))" height="24" id="Bounding box" width="24" />
          </mask>
          <g mask="url(#mask0_2008_1661)">
            <path d={svgPaths.p3a3f7ae0} fill="var(--fill-0, var(--muted-foreground))" id="share_2" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function Send() {
  return (
    <div className="relative shrink-0 size-6" data-name="send">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="send">
          <mask height="24" id="mask0_2008_1665" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="24" x="0" y="0">
            <rect fill="var(--fill-0, var(--line))" height="24" id="Bounding box" width="24" />
          </mask>
          <g mask="url(#mask0_2008_1665)">
            <path d={svgPaths.pa41fe00} fill="var(--fill-0, var(--primary))" id="send_2" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function Docs() {
  return (
    <div className="relative shrink-0 size-4" data-name="docs">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="docs">
          <mask height="20" id="mask0_2008_1695" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="20" x="0" y="0">
            <rect fill="var(--fill-0, var(--line))" height="20" id="Bounding box" width="20" />
          </mask>
          <g mask="url(#mask0_2008_1695)">
            <path d={svgPaths.p338f8c00} fill="var(--fill-0, var(--primary))" id="docs_2" />
          </g>
        </g>
      </svg>
    </div>
  );
}

// Botões de Ação das Mensagens
function MessageActions({ onCopy, onShare, onListen }: {
  onCopy: () => void;
  onShare: () => void;
  onListen: () => void;
}) {
  return (
    <div className="flex gap-3 items-center justify-start ml-14 mt-2">
      <button 
        onClick={onListen} 
        className="p-2 hover:bg-primary-soft rounded-lg transition-colors cursor-pointer"
        title="Ouvir mensagem"
      >
        <SoundDetectionLoudSound />
      </button>
      <button 
        onClick={onCopy} 
        className="p-2 hover:bg-primary-soft rounded-lg transition-colors cursor-pointer"
        title="Copiar mensagem"
      >
        <ContentCopy />
      </button>
      <button 
        onClick={onShare} 
        className="p-2 hover:bg-primary-soft rounded-lg transition-colors cursor-pointer"
        title="Compartilhar mensagem"
      >
        <Share />
      </button>
    </div>
  );
}

// Documentos Relacionados
function RelatedDocs({ docs }: { docs: string[] }) {
  return (
    <div className="ml-14 mt-3 p-3 bg-surface-muted rounded-lg border border-line">
      <div className=" font-bold text-ink text-[13px] mb-2" style={{ fontVariationSettings: "'wdth' 100" }}>
        Documentos relacionados:
      </div>
      <div className="space-y-1">
        {docs.map((doc, index) => (
          <div key={index} className="flex gap-2 items-center">
            <Docs />
            <div className="italic italic text-ink text-[13px]" style={{ fontVariationSettings: "'wdth' 100" }}>
              {doc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Componente de Mensagem
function MessageComponent({ message }: { message: Message }) {
  const { showSuccess, showError } = useToast();
  const [highlightedSources, setHighlightedSources] = useState<number[]>([]);
  const { copy } = useClipboard(showSuccess, showError);

  const handleCopy = async () => {
    await copy(message.text, "Mensagem copiada para a área de transferência.");
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          text: message.text,
          title: 'ScholarRAG Chat'
        });
        showSuccess("Compartilhado!", "Mensagem compartilhada com sucesso.");
      } else {
        // Fallback: usar o utilitário de clipboard
        await copy(message.text, "Conteúdo copiado para área de transferência (compartilhamento não disponível).");
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      // Fallback final: usar clipboard
      await copy(message.text, "Conteúdo copiado como alternativa ao compartilhamento.");
    }
  };

  const handleListen = () => {
    try {
      if ('speechSynthesis' in window) {
        // Parar qualquer síntese em andamento
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(message.text);
        utterance.lang = 'pt-BR';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        
        utterance.onstart = () => {
          showSuccess("Reproduzindo...", "Áudio iniciado.");
        };
        
        utterance.onerror = (error) => {
          console.error('Erro na síntese de voz:', error);
          showError("Erro no áudio", "Não foi possível reproduzir o áudio.");
        };
        
        speechSynthesis.speak(utterance);
      } else {
        showError("Não suportado", "Síntese de voz não disponível neste navegador.");
      }
    } catch (error) {
      console.error('Erro ao iniciar síntese de voz:', error);
      showError("Erro no áudio", "Falha ao iniciar reprodução de áudio.");
    }
  };

  if (message.isUser) {
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-[70%] flex items-start gap-3">
          <div className="bg-surface p-4 rounded-xl shadow-sm border border-line">
            <div className=" font-normal text-ink text-[16px] leading-[1.4]" style={{ fontVariationSettings: "'wdth' 100" }}>
              {message.text}
            </div>
          </div>
          <UserAvatar />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-6">
      <div className="max-w-[80%] w-full">
        <div className="flex items-start gap-3">
          <ChatbotAvatar />
          <div className="flex-1">
            <div className="bg-surface p-4 rounded-xl shadow-sm border border-line">
              <div className=" font-normal text-ink text-[16px] leading-[1.4]" style={{ fontVariationSettings: "'wdth' 100" }}>
                <MarkdownWithCitations text={message.text} onCitationClick={setHighlightedSources} />
              </div>
            </div>
          </div>
        </div>
        <MessageActions onCopy={handleCopy} onShare={handleShare} onListen={handleListen} />
        {message.sources && message.sources.length > 0 ? (
          <SourcesPanel sources={message.sources} highlighted={highlightedSources} />
        ) : (
          message.relatedDocs && message.relatedDocs.length > 0 && <RelatedDocs docs={message.relatedDocs} />
        )}
      </div>
    </div>
  );
}

// Estado "Pensando..."
function ThinkingMessage() {
  return (
    <div className="flex justify-start mb-6">
      <div className="flex items-start gap-3">
        <ChatbotAvatar />
        <div className="bg-surface p-4 rounded-xl shadow-sm border border-line">
          <div className="flex items-center gap-2">
            <div className=" font-normal text-ink text-[16px]" style={{ fontVariationSettings: "'wdth' 100" }}>
              Pensando
            </div>
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateProjectButton({ onClick }: { onClick: () => void }) {
  return (
    <button 
      className="bg-primary box-border content-stretch flex flex-row gap-2.5 items-center justify-center px-6 py-4 relative rounded-xl shrink-0 hover:bg-primary-hover transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="relative shrink-0 size-6 text-primary-foreground">
        <PlusIcon />
      </div>
      <div className="flex flex-col font-bold justify-center leading-[0] relative shrink-0 text-primary-foreground text-[16px] text-center" style={{ fontVariationSettings: "'wdth' 100" }}>
        <p className="block leading-[normal] whitespace-pre">Criar novo projeto</p>
      </div>
    </button>
  );
}


// Project Selection Screen Component
function ProjectSelectionScreen({ 
  projects, 
  onProjectSelect, 
  onCreateProject 
}: { 
  projects: Project[];
  onProjectSelect: (project: Project) => void;
  onCreateProject: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full">
      {/* Search Bar */}
      <div className="mb-8">
        <div className="input-container">
          <Search className="input-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar projetos..."
            className="input-with-icon"
          />
        </div>
      </div>

      {/* Create New Project Button */}
      <div className="mb-8">
        <button 
          onClick={onCreateProject}
          className="w-full bg-surface hover:bg-primary-soft rounded-xl px-5 py-4 transition-colors cursor-pointer border border-dashed border-line-strong hover:border-primary group"
        >
          <div className="flex items-center gap-4 text-left">
            <div className="bg-primary-soft p-2.5 rounded-lg text-primary group-hover:bg-surface transition-colors">
              <PlusIcon className="size-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-ink text-[15px]">
                Novo projeto de pesquisa
              </div>
              <div className="text-muted-foreground text-[13px]">
                Envie artigos e documentos para conversar com eles
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length > 0 ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <div className=" font-bold text-ink text-[20px]">
              Seus Projetos ({filteredProjects.length})
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                variant="simple"
                onSelect={onProjectSelect}
                //onSelect={() => PromptPasswod(project.hasPassword)}
                showActions={false}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <div className="bg-primary-soft p-6 rounded-full mb-6 inline-block">
            <Folder className="size-12 text-primary" />
          </div>
          <div className=" font-bold text-ink text-[20px] mb-4">
            {searchQuery ? "Nenhum projeto encontrado" : "Nenhum projeto ainda"}
          </div>
          <div className=" text-muted-foreground text-[16px] max-w-md mx-auto" style={{ fontVariationSettings: "'wdth' 100" }}>
            {searchQuery 
              ? "Tente ajustar os termos de busca ou criar um novo projeto."
              : "Crie seu primeiro projeto para começar a conversar com o assistente ScholarRAG."
            }
          </div>
        </div>
      )}
    </div>
  );
}

// Estado sem projeto selecionado
function NoProjectSelected({ onCreateProject }: { onCreateProject: () => void }) {
  
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="bg-primary-soft p-6 rounded-full mb-6">
        <ChatbotAvatar />
      </div>
      <div className=" font-bold text-ink text-[24px] mb-4">
        Nenhum projeto selecionado
      </div>
      <div className=" font-normal text-muted-foreground text-[16px] mb-8 max-w-md" style={{ fontVariationSettings: "'wdth' 100" }}>
        Selecione um projeto existente ou crie um novo projeto para começar a conversar com o assistente ScholarRAG.
      </div>
      <CreateProjectButton onClick={onCreateProject} />
    </div>
  );
}

export default function ChatbotContent(
  //{ onNavigate }: { onNavigate: (section: string) => void } , 

  { isOpen, onClose, selectedProject, onProjectSelect, onSectionChange, projects, onUpdateProjects }: ChatbotContentProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showProjectSelection, setShowProjectSelection] = useState(!selectedProject);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  //const { showSuccess } = useToast();  
  const { showSuccess, showError } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);

  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");  
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [isProcessingInit, setProcessingInit] = useState(false);
  const [isOpenedChat, setOpenChat] = useState(false);
  const [temperature, setTemperature]= useState(0);
  const [similarity, setSimilarity]= useState(0);
  const [debug_mode, setDebugMode]= useState("");
  const [flag_download, setFlagDownload]= useState("");
  const [use_param, setUseParam]= useState("");


  const sendChatMsg = async (project_name: string, message: string) => 
  {

    let chatMsg : ReturnChat[] = [];
    await new Promise(resolve => setTimeout(resolve, 250)); 
    try{
      const results = await msgChatBot(
        {
          project_name: project_name, 
          temperature: temperature, 
          similarity: similarity, 
          debug_mode: debug_mode, 
          flag_download: flag_download,
          user_input: message ,
          use_param: use_param
        }


      );
      if (results.status === 200  && results.data) 
      {    
        if (results.data.status === "[OK]"){  
          chatMsg.push({
            id: "001",
            status: results.data.status,
            response : results.data.response,                       
            docs: results.data.docs ?? [],  // API returns a list (".files" was always undefined)
            sources: results.data.sources ?? []
           }
          );
        }
      }
    } catch (error) {
      console.error('Erro na Camada de Aplicação:FrontEnd (ChatbotContext.tsx) - ', error);
      showError('Erro na Camada de Aplicação:FrontEnd (ChatbotContext.tsx) - ' + error);
    }   
    await new Promise(resolve => setTimeout(resolve, 250)); 

    return chatMsg


  }


  const TestProjectCredential = async (project : Project) =>{
    if (!project.hasPassword)
    {
      setProcessingInit(true);
      await new Promise(resolve => setTimeout(resolve, 500)); 
      await StartChat(project.name);      
      setOpenChat(true);         
      setProcessingInit(false);    
      await new Promise(resolve => setTimeout(resolve, 500));       

    }        


  }


  const StartChat = async (project_name: string)=>{
    try
    {
      const response = await initChatBot({project_name: project_name});
      if (response.status === 200 && response.data ) 
      {       
        showSuccess("O ChatBot foi carregado com sucesso para o projeto: " + project_name +"!");                
      }
      else
      {
        showError("Erro de Inicialização do ChatBot. Verifique: ", response.status + " - " + response.data.project_name);          
      }
      // try{
      //   const results = await setUpdateProjet({
      //     project_name: name_prj??"", 
      //     user_name: projects.find(p => p.id === projectId)?.username??"", 
      //     password: data.password, 
      //     upload_method: data.uploadMethod, 
      //     prompt: projects.find(p => p.id === projectId)?.description??"",
      //     files: data.files ,
      //   const status = results.status;
      //   if (status === 200  && results.data) 
      //   { 
    } catch (error) {
      console.error('Erro na Camada de Aplicação:FrontEnd (ChatbotContext.tsx) - ', error);
    }    

  }

  const PromptPassword = async (selectProject: Project, password_prj: string) => {
    let boIsPermited: boolean = false;

    if (!selectProject){
      boIsPermited = false
      showError("Ocorreu um erro de Interface. Não há projetos selecionados. Verifique!");
    }
    else
    {
      if (selectProject.hasPassword)
      {
        try{
          const response = await checkPassword({project_name: selectProject.name, password: password_prj});         
          if (response.status === 200  && response.data) {       
            if( response.data.password === "TRUE") 
            {                      
              boIsPermited = true 

              showSuccess("A senha digitada é a correta!"); 
              await new Promise(resolve => setTimeout(resolve, 1000));                               
              //setPasswordVisible(!isPasswordVisible);
              //await new Promise(resolve => setTimeout(resolve, 2000));   

              //console.log("Chama função StartChat com projeto: ", selectProject.name);

              setPasswordVisible(!isPasswordVisible);                
              setProcessingInit(true);
              await new Promise(resolve => setTimeout(resolve, 500));    
              await StartChat(selectProject.name); 
              setOpenChat(true);              
              await new Promise(resolve => setTimeout(resolve, 500));    
              setProcessingInit(false);
              //setPasswordVisible(!isPasswordVisible);             
              
            } else
            {
              boIsPermited = false             
            }
          }
          else
          {
            console.log('Camada de Aplicação:FrontEnd (ChatbotContext.tsx.tsx) - Erro ao processar Permissões!');
          }  
        } catch (error) {
          console.error('Erro na Camada de Aplicação:FrontEnd (ChatbotContext.tsx.tsx) - ', error);
        }
      }
      else
      {
        boIsPermited = true 
      }
    } 

    if(boIsPermited)
    {  
      //showSuccess("A senha digitada é a correta!");  

    }
    else
    {
      showError("A senha digitada, para Projeto " + selectProject.name + ", esta errada. Tente novamente!");
    }
      
  }


  // Gerar breadcrumb dinâmico baseado no estado atual
  const generateBreadcrumbItems = () => {
    const items = [
      { label: "Chatbot", 
        section: "Chatbot" 
        ,isActive: true

      }
    ];
    
    if (selectedProject && !showProjectSelection) {
      items.push({ label: selectedProject.name, section: "Chatbot" , isActive: true });
      //items.push({ label: selectedProject.name,  isActive: true });

    } else {
      items[0].isActive = true;
    }


    return items;
  };


  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleBackToSelection();
      setOpenChat(false); 
      onClose();
    }
  };

  const handleEscapeKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleBackToSelection();
      setOpenChat(false);       
      onClose();
    }
  };


  // Inicializar mensagens quando o projeto mudar
  useEffect(() => {
    if (selectedProject) {
      document.addEventListener('keydown', handleEscapeKey);  
      document.body.style.overflow = 'hidden';          
      setShowProjectSelection(false);
      setShowPassword(false);  
      setPassword("");   
      setPasswordVisible(true);
      setOpenChat(false);  
      setProcessingInit(false);
      //new Promise(resolve => setTimeout(resolve, 3000));
      TestProjectCredential(selectedProject) 
      //new Promise(resolve => setTimeout(resolve, 3000));   
      setTemperature(0);
      setSimilarity(1.1);
      setDebugMode("Não");
      setFlagDownload("Não");
      setUseParam("Não");      

      setMessages([
        {
          id: Date.now().toString(),
          text: `Olá! Sou o assistente do projeto "${selectedProject.name}". Como posso ajudar você com este projeto?`,
          isUser: false,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } else {
      setShowProjectSelection(true);
      setMessages([]);
      setPasswordVisible(false);
      setProcessingInit(false);
      setTemperature(0);
      setSimilarity(1.1);
      setDebugMode("Não");
      setFlagDownload("Não");
      setUseParam("Não");      
    
    }
  }, [selectedProject]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!message.trim() || isTyping || !selectedProject) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: message.trim(),
      isUser: true,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage("");
    setIsTyping(true);

    const messageChat = await sendChatMsg(selectedProject.name, message.trim()) ;
    const botResponse: Message = {
      id: (Date.now() + 1).toString(),
      text: messageChat.find(p => p.id=== "001")?.response??"",
      isUser: false,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      relatedDocs: messageChat.find(p => p.id=== "001")?.docs,
      sources: messageChat.find(p => p.id=== "001")?.sources,
    };
    setMessages(prev => [...prev, botResponse]);
    setIsTyping(false);    


    // Simulate bot response with project context
    // const delay = Math.random() * 2000 + 1500;    
    // setTimeout(() => {
    //   const projectResponses = [
    //     {
    //       text: `Baseado no projeto "${selectedProject.name}", posso ajudar você com análises específicas dos dados carregados e funcionalidades relacionadas.`,
    //       relatedDocs: [`dados_${selectedProject.name.toLowerCase().replace(/\s+/g, '_')}.pdf`]
    //     },
    //     {
    //       text: `Para o projeto "${selectedProject.name}", tenho acesso aos documentos carregados e posso gerar insights personalizados baseados no contexto específico.`,
    //       relatedDocs: ["análise_contexto.xlsx", "relatório_insights.pdf"]
    //     },
    //     {
    //       text: `Sobre "${selectedProject.description}" - posso ajudar você a otimizar os resultados e sugerir melhorias baseados nos dados do projeto.`,
    //       relatedDocs: undefined
    //     }
    //   ];
    //   const randomResponse = projectResponses[Math.floor(Math.random() * projectResponses.length)];
    //   const botResponse: Message = {
    //     id: (Date.now() + 1).toString(),
    //     text: randomResponse.text,
    //     isUser: false,
    //     timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    //     relatedDocs: randomResponse.relatedDocs
    //   };
    //   setMessages(prev => [...prev, botResponse]);
    //   setIsTyping(false);
    // }, delay);


  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCreateProject = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };


  const handleSaveProject = async (data: any) => {

    //onUpdateProjects([ ...projects, data]);    
    const sortedProjects = [...projects, data].sort((a, b) => a.name.localeCompare(b.name));
    onUpdateProjects(sortedProjects);
    setIsModalOpen(false);
    //await new  Promise(resolve => setTimeout(resolve, 500));


    //onNavigate('Projetos'); 
 
    // Aqui você pode adicionar lógica adicional, como:
    // - Salvar o projeto em um estado global
    // - Redirecionar para a página de projetos
    // - Mostrar uma notificação de sucesso
  };
  // const handleSaveProject = (data: ProjectData) => {
  //   const newProject: Project = {
  //     id: Date.now().toString(),
  //     name: data.projectName,
  //     description: data.prompt || "Novo projeto criado",
  //     createdAt: new Date().toISOString().split('T')[0],
  //     lastAccessed: new Date().toISOString().split('T')[0],
  //     hasPassword: data.password.trim() === "" ? true : false,
  //     username: "",
  //     qtd_documents: 0 ,
  //     qtd_words:0,
  //     files: []
  //   };

  //   onUpdateProjects([newProject, ...projects]);
  //   setIsModalOpen(false);
    
  //   // Selecionar o novo projeto automaticamente
  //   onProjectSelect(newProject);
    
  //   showSuccess("Projeto criado!", `O projeto "${data.projectName}" foi criado e está pronto para uso.`);
    
  //   console.log("Projeto criado e selecionado:", {
  //     ...data,
  //     files: data.files.map(f => ({ name: f.name, size: f.size }))
  //   });
  // };


  const handleBackToSelection = () => {
    onProjectSelect(null);
    setShowProjectSelection(true);
  };

  // if ( selectedProject?.hasPassword && selectedProject)
  // {  
  //   return (
  //     <div >  
  //       {/* Password Field */}
  //       <div className="flex flex-col gap-2">
  //         <label className=" font-bold text-ink text-[18px]">
  //           Digite a senha para confirmar *
  //         </label>
  //         {
  //         /*---------------------------------------------------------------------------------------*/
  //         -----------------------------------------------------------------------------------------*/
  //         }
  //         <div className="bg-surface-muted h-12 px-4 py-2 rounded-xl border border-line hover:border-[#ef4444] transition-colors flex items-center gap-4">
  //           <input
  //             type={showPassword ? "text" : "password"}
  //             value={password}
  //             onChange={(e) => setPassword(e.target.value)}
  //             placeholder="Digite sua senha para confirmar"
  //             className="bg-transparent flex-1 outline-none font-normal text-ink text-[16px] placeholder:text-line-strong"
  //             style={{ fontVariationSettings: "'wdth' 100" }}
  //             autoFocus
  //           />
  //           <button
  //             type="button"
  //             onClick={() => setShowPassword(!showPassword )}
  //             className="text-muted-foreground hover:text-[#ef4444] transition-colors p-1"
  //           >
  //             {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
  //           </button>
  //         </div>
  //         <div className=" font-normal text-muted-foreground text-[14px]" style={{ fontVariationSettings: "'wdth' 100" }}>
  //           Esta é a senha que foi definida quando o projeto foi criado.
  //         </div>
  //       </div>

  //       <div className="flex flex-col sm:flex-row gap-4 justify-end">
  //         <button
  //           className="bg-surface border border-line-strong px-6 py-3 rounded-xl hover:bg-surface-muted transition-all duration-200 order-2 sm:order-1 group"
  //           onClick={handleBackToSelection}
  //         >
  //           <div className=" font-bold text-primary text-[16px] text-center group-hover:text-primary-hover transition-colors" style={{ fontVariationSettings: "'wdth' 100" }}>
  //             Cancelar
  //           </div>
  //         </button>
          
  //         <button
  //           className="bg-[#ef4444] flex items-center justify-center gap-2 px-6 py-3 rounded-xl hover:bg-[#dc2626] transition-all duration-200 order-1 sm:order-2 hover:shadow-[0_4px_15px_rgba(239,68,68,0.3)] transform hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
  //           onClick={handleBackToSelection}
  //           //-------------------------------------------------------------------------------------------
  //           //-------------------------------------------------------------------------------------------
  //           //disabled={!password.trim()}
  //           disabled={selectedProject.hasPassword ? !password.trim() : false}
  //           //-------------------------------------------------------------------------------------------
  //         >
  //           <Trash2 className="size-5 text-white" />
  //           <div className=" font-bold text-white text-[16px] text-center" style={{ fontVariationSettings: "'wdth' 100" }}>
  //             Deletar Projeto
  //           </div>
  //         </button>
  //       </div>
  //     </div>          
  //   )
  // }

  // Project Selection Screen
  if (showProjectSelection || !selectedProject) {
    return (
      <div className="box-border content-stretch flex flex-col gap-8 items-start justify-start relative size-full">
        {/* Breadcrumb */}
        <Breadcrumb 
          items={generateBreadcrumbItems()}
          onNavigate={onSectionChange}
        />

        {/* Header */}
        <div className="box-border content-stretch flex flex-col gap-2 items-start justify-center leading-[0] p-0 relative shrink-0 text-nowrap">
          <div className="page-title relative shrink-0 text-left">
            <p className="block">Chat com citações</p>
          </div>
          <div className=" font-normal relative shrink-0 text-ink text-[24px] md:text-[20px] sm:text-[18px] text-left">
            <p className="block leading-[normal] break-words">
              Escolha um projeto para perguntar sobre seus documentos — as respostas citam autor, ano e página.
            </p>
          </div>
        </div>

        {/* Project Selection */}
        <div className="flex-1 bg-surface rounded-xl shadow-sm border border-line hover:border-primary hover:shadow-sm transition-all duration-300 p-8 overflow-hidden">
          {projects.length === 0 ? (
            <EmptyState
              icon="plus"
              title="Nenhum projeto ainda"
              description="Crie seu primeiro projeto para começar a conversar com o assistente ScholarRAG."
              actionLabel="Criar primeiro projeto"
              onAction={handleCreateProject}
            />
          ) : (
            <ProjectSelectionScreen 
              projects={projects}
              onProjectSelect={onProjectSelect}
              onCreateProject={handleCreateProject}
            />
          )}
        </div>

        {/* Create Project Modal */}
        <CreateProjectModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveProject}
        />


      </div>
    );
  }


  const estiloMainDiv = {
    width: '100vw',

  };

  // Interface de chat com projeto selecionado
  return (
    <div className="box-border content-stretch flex flex-col gap-8 items-start justify-start relative size-full">
      {/* Breadcrumb */}
      <Breadcrumb 
        items={generateBreadcrumbItems()}
        onNavigate={onSectionChange}
      />

      {/* Header with Back Button */}
      <div className="box-border content-stretch flex flex-col gap-4 items-start justify-center leading-[0] p-0 relative shrink-0">
        <BackButton 
          onBack={handleBackToSelection}
          label="Voltar para projetos"
          className="mb-2"
        />
        
        <div className="box-border content-stretch flex flex-col gap-2 items-start justify-center leading-[0] p-0 relative shrink-0 text-nowrap">
          <div className="page-title relative shrink-0 text-left">
            <p className="block">Chat com citações</p>
          </div>
          <div className=" font-normal relative shrink-0 text-ink text-[24px] md:text-[20px] sm:text-[18px] text-left">
            <p className="block leading-[normal] break-words">
              Conversando com o projeto "{selectedProject.name}".
            </p>
          </div>
        </div>
      </div>


      {/* Chat Container */}   


      {/* 
      */}
      {isProcessingInit &&
      (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(205, 218, 241, 0.26)" }}
        >
          <div
            className="bg-surface rounded-xl w-full max-w-lg relative shadow-xl"
            // onClick={(e) => e.stopPropagation()}
          >
          <div className="p-6 sm:p-8">
              {/* Header */}
              <div className="flex flex-col gap-3 mb-8 pt-2">
                <div className="flex items-center gap-3">
                  <div>
                    <div className=" font-bold text-ink text-2xl sm:text-[28px]">
                      Inicializando o Chat para o Projeto, aguarde...
                    </div>
                  </div>
                </div>
              </div>             
            </div>
          </div>
        </div>
      ) 
      }


      {/* 
      */}
      {selectedProject?.hasPassword && isPasswordVisible &&
      (
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
                  <div>
                    <div className=" font-bold text-ink text-2xl sm:text-[28px]">
                      Iniciar um Chat com o Projeto
                    </div>
                  </div>
                </div>
              </div>
              {/* Content */}
              <div className="flex flex-col gap-6 mb-8">
                {/* Warning Message */}
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
                        onClick={() => setShowPassword(!showPassword)}
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
              </div>
              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-end">
                <button
                  className="bg-surface border border-line-strong px-6 py-3 rounded-xl hover:bg-surface-muted transition-all duration-200 order-2 sm:order-1 group"
                  onClick={()=> handleBackToSelection()}
                >
                  <div className=" font-bold text-primary text-[16px] text-center group-hover:text-primary-hover transition-colors" style={{ fontVariationSettings: "'wdth' 100" }}>
                    Cancelar
                  </div>
                </button>                
                <button
                  className="bg-[#ef4444] flex items-center justify-center gap-2 px-6 py-3 rounded-xl hover:bg-[#dc2626] transition-all duration-200 order-1 sm:order-2 hover:shadow-[0_4px_15px_rgba(239,68,68,0.3)] transform hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
                  onClick={() => PromptPassword(selectedProject, password.trim())}
                  //disabled={!password.trim()}
                  disabled={selectedProject.hasPassword ? !password.trim() : false}
                >
                  <Trash2 className="size-5 text-white" />
                  <div className=" font-bold text-white text-[16px] text-center" style={{ fontVariationSettings: "'wdth' 100" }}>
                    Iniciar Chat
                  </div>
                </button>
              </div>              
            </div>
          </div>
        </div>
      ) 
      }


      <div className="flex-1 bg-surface rounded-xl shadow-sm border border-line flex flex-col overflow-hidden ">
        {/* Chat Header - melhorado com mais informações */}
        <div className="flex-shrink-0 p-4 border-b border-line bg-surface-muted">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChatbotAvatar />
              <div>
                <div className=" font-bold text-ink text-[16px]">
                  Assistente do Projeto
                </div>
                <div className=" font-normal text-muted-foreground text-[13px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                  Online • Conectado aos dados do projeto
                </div>
              </div>
            </div>
            
            {/* Informações do projeto */}
            <div className="hidden sm:flex items-center gap-3 bg-primary-soft px-4 py-2 rounded-lg">
              <div className="text-right">
                <div className=" font-medium text-ink text-[14px]">
                  {selectedProject.name}
                </div>
                <div className=" text-muted-foreground text-[12px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                  Último acesso: {new Date(selectedProject.lastAccessed).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area - melhorado com foco em acessibilidade */}
        <div 
          className="flex-1 overflow-y-auto p-6 space-y-0 focus:outline-none"
          role="log"
          aria-live="polite"
          aria-label="Histórico de mensagens do chat"
        >
          {messages.map((msg) => (
            <MessageComponent key={msg.id} message={msg} />
          ))}
          
          {isTyping && <ThinkingMessage />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - melhorado com melhor UX */}
        <div className="flex-shrink-0 p-4 border-t border-line bg-surface-muted">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-surface rounded-xl border border-line focus-within:border-primary transition-colors duration-200 px-4 py-3">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Digite sua mensagem sobre "${selectedProject.name}"...`}
                disabled={isTyping}
                className="w-full bg-transparent outline-none font-normal text-ink text-[16px] placeholder:text-line-strong"
                style={{ fontVariationSettings: "'wdth' 100" }}
                aria-label="Digite sua mensagem"
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isTyping}
              className="bg-primary hover:bg-primary-hover disabled:bg-surface-muted disabled:cursor-not-allowed p-3 rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Enviar mensagem"
              title={isTyping ? "Aguarde a resposta..." : "Enviar mensagem"}
            >
              <Send />
            </button>
          </div>
          
          {/* Contador de caracteres e dicas */}
          <div className="flex items-center justify-between mt-2 text-[12px] text-muted-foreground">
            <div className="" style={{ fontVariationSettings: "'wdth' 100" }}>
              {message.length > 0 && `${message.length}/500 caracteres`}
            </div>
            <div className="italic italic" style={{ fontVariationSettings: "'wdth' 100" }}>
              Pressione Enter para enviar
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}
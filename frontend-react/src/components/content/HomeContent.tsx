import { useState } from "react";
import { WorkspacesIcon, ForumIcon } from "../icons";
import { BookOpen } from "lucide-react";
import CreateProjectModal from "../modals/CreateProjectModal";
import { time } from "motion/react";
import ProjectCard from "../ProjectCard";
//import { useToast } from "../ui/Toast";
//import ProjectsContent  from "../../App";


interface ProjectData {
  projectName: string;
  username: string;
  password: string;
  confirmPassword: string;
  prompt: string;
  uploadMethod: "manual";
  files: File[];
}


function WelcomeHeading() {
  return (
    <div className="flex flex-col element-gap items-start justify-center">
      <div className="page-title">
        <p className="block">Bem-vindo ao ScholarRAG</p>
      </div>
      <div className="page-subtitle max-w-2xl">
        <p className="block break-words">
          Organize a literatura do seu mestrado, converse com seus documentos com citações verificáveis
          (ABNT ou APA) e use seus próprios resultados para escrever artigos.
        </p>
      </div>
    </div>
  );
}

function ProjectsCard({ onCreateProject }: { onCreateProject: () => void }) {
  return (
    <div 
      className="sr-card interactive p-5 flex flex-col component-gap items-start justify-start"
      onClick={onCreateProject}
    >
      <div className="bg-primary-soft flex items-center justify-center rounded-lg shrink-0 size-10">
        <WorkspacesIcon className="size-5 text-primary" />
      </div>
      <div className="section-title">
        <p className="block">Projetos de pesquisa</p>
      </div>
      <div className="body-text max-w-lg">
        <p className="block">
          Reúna artigos, livros e PDFs digitalizados por tema. O texto é extraído (com OCR quando preciso)
          e indexado para busca semântica e por palavras-chave.
        </p>
      </div>
      <button 
        className="sr-button primary"
        onClick={(e) => {
          e.stopPropagation();
          onCreateProject();
        }}
        aria-label="Adicionar um novo projeto"
      >
        Novo projeto
      </button>
    </div>
  );
}

function ChatbotCard({ onNavigate }: { onNavigate: (section: string) => void }) {
  return (
    <div 
      className="sr-card interactive p-5 flex flex-col component-gap items-start justify-start"
      onClick={() => onNavigate('Chatbot')}
    >
      <div className="bg-primary-soft flex items-center justify-center rounded-lg shrink-0 size-10">
        <ForumIcon className="size-5 text-primary" />
      </div>
      <div className="section-title">
        <p className="block">Chat com citações</p>
      </div>
      <div className="body-text max-w-lg">
        <p className="block">
          Pergunte sobre seus documentos e receba respostas com citação de autor, ano e página —
          cada citação abre o trecho original.
        </p>
      </div>
      <button 
        className="sr-button secondary"
        onClick={(e) => {
          e.stopPropagation();
          onNavigate('Chatbot');
        }}
      >
        Abrir o chat
      </button>
    </div>
  );
}

function LibraryCard({ onNavigate }: { onNavigate: (section: string) => void }) {
  return (
    <div
      className="sr-card interactive p-5 flex flex-col component-gap items-start justify-start"
      onClick={() => onNavigate('Biblioteca')}
    >
      <div className="bg-primary-soft flex items-center justify-center rounded-lg shrink-0 size-10">
        <BookOpen className="size-5 text-primary" />
      </div>
      <div className="section-title">
        <p className="block">Biblioteca e referências</p>
      </div>
      <div className="body-text max-w-lg">
        <p className="block">
          Revise autores e anos, escolha ABNT ou APA, exporte a lista de referências e o BibTeX
          e envie seus resultados em markdown.
        </p>
      </div>
      <button
        className="sr-button secondary"
        onClick={(e) => {
          e.stopPropagation();
          onNavigate('Biblioteca');
        }}
      >
        Abrir a biblioteca
      </button>
    </div>
  );
}

function FeatureCards({ onCreateProject, onNavigate }: { onCreateProject: () => void; onNavigate: (section: string) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full max-w-6xl">
      <ProjectsCard onCreateProject={onCreateProject} />
      <ChatbotCard onNavigate={onNavigate} />
      <LibraryCard onNavigate={onNavigate} />
    </div>
  );
}

function FAQText({ onNavigate }: { onNavigate: (section: string) => void }) {
  return (
    <div className="body-text-sm">
      <p className="leading-[normal]">
        Dúvidas sobre o uso? Veja a{" "}
        <a
          className="text-primary hover:underline cursor-pointer font-medium"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('FAQ');
          }}
        >
          página de ajuda
        </a>
        .
      </p>
    </div>
  );
}


export default function HomeContent({ onNavigate, onUpdateProjects, projects }: { onNavigate: (section: string) => void; onUpdateProjects: (projects: any[]) => void; projects: any[] } ) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateProject = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };


  const handleSaveProject = async (data: any) => {

    const sortedProjects = [...projects, data].sort((a, b) => a.name.localeCompare(b.name));
    onUpdateProjects(sortedProjects);
    await new  Promise(resolve => setTimeout(resolve, 500));
    setIsModalOpen(false);
    onNavigate('Chatbot');     

    // Aqui você pode adicionar lógica adicional, como:
    // - Salvar o projeto em um estado global
    // - Redirecionar para a página de projetos
    // - Mostrar uma notificação de sucesso
  };

  return (
    <div className="flex flex-col section-gap items-start justify-start size-full">
      <div className="flex flex-col section-gap items-start justify-start">
        <WelcomeHeading />
        <FeatureCards onCreateProject={handleCreateProject} onNavigate={onNavigate} />
      </div>
      <FAQText onNavigate={onNavigate} />
      
      {/* Modal */}
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveProject}
      />
    </div>
  );
}



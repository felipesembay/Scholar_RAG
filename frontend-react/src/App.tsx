import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import React from "react";
import Sidebar from "./components/Sidebar";
import LoadingState from "./components/ui/LoadingState";
import { ToastProvider } from "./components/ui/Toast";
import ErrorBoundary from "./components/ErrorBoundary";
import { useLayoutConfig, LayoutConfig } from "./hooks/useLayoutConfig";
import { useResponsive } from "./hooks/useResponsive";
import { useKeyboardNavigation } from "./hooks/useKeyboardNavigation";
import { listAllProjects } from "../src/rag_services.ts";
import { retrieveProjectInfo } from "../src/rag_services.ts";
//import { useFormValidation } from "utils/validation.ts";
// import { useLocation } from 'react-router-dom'; // Importe o hook

// Lazy loading para otimização de performance
const HomeContent = lazy(() => import("./components/content/HomeContent"));
const ProjectsContent = lazy(() => import("./components/content/ProjectsContent"));
const ChatbotContent = lazy(() => import("./components/content/ChatbotContent"));
const BibliotecaContent = lazy(() => import("./components/content/BibliotecaContent"));
const ArtigoContent = lazy(() => import("./components/content/ArtigoContent"));
const SumarizadorContent = lazy(() => import("./components/content/SumarizadorContent"));
const DashboardContent = lazy(() => import("./components/content/DashboardContent"));
const FAQContent = lazy(() => import("./components/content/FAQContent"));
let qtd_projects = 0;


//const now = new Date();
//const timestampFromDate = now.getTime();
//const session_id = "sessao_" + timestampFromDate.toString().trim() + Math.random().toString().trim().replace(".", "_") + ".txt"
//console.log("session_id.: ", session_id)


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

// Componente de conteúdo otimizado com lazy loading e semântica melhorada
const ContentArea = React.memo(function ContentArea({ 
  activeSection, 
  onSectionChange, 
  selectedProject, 
  onProjectSelect, 
  projects, 
  onUpdateProjects,
  layoutConfig
}: { 
  activeSection: string; 
  onSectionChange: (section: string) => void;
  selectedProject: Project | null;
  onProjectSelect: (project: Project | null) => void;
  projects: Project[];
  onUpdateProjects: (projects: Project[]) => void;
  layoutConfig: LayoutConfig;
}) {
  const renderContent = useCallback(() => {
    try {
      switch (activeSection) {
        // Opção de Projetos
        case 'Home':
          return <HomeContent 
                        onNavigate={onSectionChange} 
                        onUpdateProjects={onUpdateProjects} 
                        projects={projects}
          />;
          case 'Projetos':
            return (
              <ProjectsContent 
                onProjectSelect={onProjectSelect}
                onSectionChange={onSectionChange}
                projects={projects}
                onUpdateProjects={onUpdateProjects}

              />
            );
        case 'Chatbot':
          return (
            <ChatbotContent 
              selectedProject={selectedProject}
              onProjectSelect={onProjectSelect}
              onSectionChange={onSectionChange}
              projects={projects}
              onUpdateProjects={onUpdateProjects}
              isOpen={true}
              onClose={() => {}}          
            />
          );
        case 'Biblioteca':
          return <BibliotecaContent projects={projects} selectedProject={selectedProject} />;
        case 'Artigo':
          return <ArtigoContent projects={projects} selectedProject={selectedProject} />;
        case 'Sumarizador':
          return <SumarizadorContent onNavigate={onSectionChange} />;
        case 'Dashboard':
          // for (let i = 0; i < 100; i++) {
          //   new Promise(resolve => setTimeout(resolve, 100)); 
          // }           

          return <DashboardContent onNavigate={onSectionChange} />;
        case 'FAQ':
          return <FAQContent onNavigate={onSectionChange} />;
        default:
          return <HomeContent   onNavigate={onSectionChange} 
                                onUpdateProjects={onUpdateProjects} 
                                projects={projects}
          />;
      }
    } catch (error) {
      // Log do erro em desenvolvimento, falhar silenciosamente em produção
      // if (process.env.NODE_ENV === 'development') {
      //   console.error('Erro ao renderizar conteúdo:', error);
      // }
      
      // Fallback para Home em caso de erro
      return <HomeContent onNavigate={onSectionChange} 
                          onUpdateProjects={onUpdateProjects} 
                          projects={projects}
      />;
    }
  }, [activeSection, onSectionChange, selectedProject, onProjectSelect, projects, onUpdateProjects]);

  return (
    <div 
      className="content-scrollable"
      role="main"
      aria-label={`Conteúdo da seção ${activeSection}`}
      tabIndex={-1}
    >
      <div className="universal-content-padding">
        <Suspense fallback={
          <LoadingState 
            message="Carregando..." 
            submessage="Preparando o conteúdo da página"
          />
        }>
          {renderContent()}
        </Suspense>
      </div>
    </div>
  );
});

export function retQdtProjetct(){
  return qtd_projects;
}


export default function App() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('Home');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);  
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const layoutConfig = useLayoutConfig(isCollapsed, isMobile, isTablet);
  // const [values, setValues] = useState({ project: '' })


 

  // Navegação por teclado melhorada
  useKeyboardNavigation({
    onEscape: () => {
      if ((isMobile || isTablet) && showMobileMenu) {
        setShowMobileMenu(false);
      }
    }
  });


  let results: Project[] = [];
  let documentos = 0;
  let trans_item;


  useEffect(() => {

    const handleListProject = async () => {

      try {
        const response = await listAllProjects();
        if (response.status === 200 && response.data ) 
        {
          console.log('Camada de Aplicação:FrontEnd (App.tsx) - Projetos Carregado com Sucesso!'); 
          const promises =  Object.keys(response.data.projects).map(async (key,index) => {
            const result = await retrieveProjectInfo({project_name: response.data.projects[index].project_name})
            return result;
          });
          const new_results = await Promise.all(promises);

          documentos = 0;
          Object.keys(response.data.projects).map((chave, index) => (
              documentos = (documentos + 1),
              trans_item = new_results.filter(item  => item.project_name === response.data.projects[index].project_name.toString().trim()),
              results.push(
              { 
                  id: documentos.toString().trim(),
                  name: response.data.projects[index].project_name.toString().trim(), 
                  description: "", //response.data.projects[index].prompt,
                  createdAt: response.data.projects[index].creation_date,
                  lastAccessed: trans_item[0].last_update,
                  hasPassword: response.data.projects[index].flag_password,
                  username: response.data.projects[index].project_owner,
                  qtd_documents:  Number(trans_item[0].qtd_documents), 
                  qtd_words: Number(trans_item[0].qtd_words),  
                  files: response.data.projects[index].files                 
                }
              )
            ));
            qtd_projects = Number(results);

            //console.log("results...:", response.data);

        } else {
          console.log('Camada de Aplicação:FrontEnd (App.tsx) - Erro ao carregar Projetos!');
        }   

      } catch (error) {
        console.error('Erro na Camada de Aplicação:FrontEnd (App.tsx) - ', error);
      }

    }
    handleListProject();

  },[] );


  const [projects, setProjects] = useState<Project[]>(
    results
  );

  
  // Inibido por Dnaiel em 18/09/2025
  // const [projects, setProjects] = useState<Project[]>([
  //   {
  //     id: "1",
  //     name: "Projeto Alpha",
  //     description: "Análise de dados de vendas Q4 2024",
  //     createdAt: "2024-01-15",
  //     lastAccessed: "2024-01-20",
  //     hasPassword: true
  //   },
  //   {
  //     id: "2", 
  //     name: "Projeto Beta",
  //     description: "Sistema de recomendações para e-commerce",
  //     createdAt: "2024-01-10",
  //     lastAccessed: "2024-01-18"
  //   },
  //   {
  //     id: "3",
  //     name: "Projeto Gamma V2222", 
  //     description: "Chatbot para atendimento ao cliente",
  //     createdAt: "2024-01-05",
  //     lastAccessed: "2024-01-16",
  //     hasPassword: true
  //   },
  //   {
  //     id: "4",
  //     name: "Projeto Delta",
  //     description: "Análise de sentimentos em redes sociais", 
  //     createdAt: "2024-01-01",
  //     lastAccessed: "2024-01-14"
  //   },
  //   {
  //     id: "5",
  //     name: "Projeto Epsilon",
  //     description: "Sistema de detecção de fraudes",
  //     createdAt: "2023-12-28", 
  //     lastAccessed: "2024-01-12"
  //   },
  //   {
  //     id: "6",
  //     name: "Projeto Zeta",
  //     description: "Otimização de processos internos",
  //     createdAt: "2023-12-25",
  //     lastAccessed: "2024-01-10",
  //     hasPassword: true
  //   }
  // ]);


  // Gerenciar estado da sidebar com localStorage
  useEffect(() => {
    try {
      if (isMobile || isTablet) {
        setIsCollapsed(true);
        setShowMobileMenu(false);
      } else if (isDesktop) {
        const savedCollapsed = localStorage.getItem('sr-sidebar-collapsed');
        setIsCollapsed(savedCollapsed === 'true');
      }

    } catch (error) {
      // Ignorar erros de localStorage silenciosamente
      // if (process.env.NODE_ENV === 'development') {
      //   console.info('Erro ao acessar localStorage:', error);
      // }

    }
  }, [isMobile, isTablet, isDesktop]);

  // Salvar estado da sidebar
  useEffect(() => {
    try {
      if (isDesktop) {
        localStorage.setItem('sr-sidebar-collapsed', isCollapsed.toString());
      }
    } catch (error) {
      // Ignorar erros de localStorage silenciosamente
      // if (process.env.NODE_ENV === 'development') {
      //   console.info('Erro ao salvar no localStorage:', error);
      // }
    }
  }, [isCollapsed, isDesktop]);

  // Handlers otimizados
  const handleToggle = useCallback(() => {
    try {
      if (isMobile || isTablet) {
        setShowMobileMenu(prev => !prev);
      } else {
        setIsCollapsed(prev => !prev);
      }
    } catch (error) {
      // if (process.env.NODE_ENV === 'development') {
      //   console.error('Erro no toggle:', error);
      // }
    }
  }, [isMobile, isTablet]);

  const handleSectionChange = useCallback((section: string) => {
    try {
      setActiveSection(section);
      
      if (isMobile || isTablet) {
        setShowMobileMenu(false);
      }
      
      if (section !== 'Chatbot') {
        setSelectedProject(null);
      }

      
    } catch (error) {
      // if (process.env.NODE_ENV === 'development') {
      //   console.error('Erro na mudança de seção:', error);
      // }
    }
  }, [isMobile, isTablet]);

  const handleProjectSelect = useCallback((project: Project | null) => {
    try {
      setSelectedProject(project);
      
      if (project) {
        setProjects(prev => prev.map(p => 
          p.id === project.id 
            ? { ...p, lastAccessed: new Date().toISOString().split('T')[0] }
            : p
        ));
      }
    } catch (error) {
      // if (process.env.NODE_ENV === 'development') {
      //   console.error('Erro na seleção de projeto:', error);
      // }
    }
  }, []);

  const handleOverlayClick = useCallback(() => {
    try {
      if ((isMobile || isTablet) && showMobileMenu) {
        setShowMobileMenu(false);
      }
    } catch (error) {
      // if (process.env.NODE_ENV === 'development') {
      //   console.error('Erro no overlay click:', error);
      // }
    }
  }, [isMobile, isTablet, showMobileMenu]);

  // Gerenciamento de foco para acessibilidade
  useEffect(() => {
    const mainContent = document.querySelector('[role="main"]') as HTMLElement;
    if (mainContent && activeSection !== 'Home') {
      // Mover foco para o conteúdo principal ao navegar
      setTimeout(() => {
        mainContent.focus();
      }, 100);
    }
  }, [activeSection]);

  // Controle do scroll do body
  useEffect(() => {
    try {
      document.body.style.overflow = (isMobile || isTablet) && showMobileMenu ? 'hidden' : 'unset';
      return () => { 
        document.body.style.overflow = 'unset'; 
      };
    } catch (error) {
      // if (process.env.NODE_ENV === 'development') {
      //   console.error('Erro no controle de scroll:', error);
      // }
    }
  }, [showMobileMenu, isMobile, isTablet]);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div 
          className="app-layout"
          data-mobile={isMobile}
          data-tablet={isTablet}
          data-desktop={isDesktop}
          data-sidebar-collapsed={isCollapsed}
        >
          {/* Skip to main content - Acessibilidade */}
          <a 
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-toast focus:sr-button focus:primary"
            tabIndex={1}
          >
            Pular para o conteúdo principal
          </a>

          {/* Overlay para mobile/tablet com melhor acessibilidade */}
          {(isMobile || isTablet) && showMobileMenu && (
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-overlay transition-all duration-300 ease-in-out animate-fade-in"
              onClick={handleOverlayClick}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  handleOverlayClick();
                }
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Menu de navegação móvel"
              tabIndex={-1}
            />
          )}
          
          {/* Sidebar com semântica melhorada */}
          <ErrorBoundary fallback={
            <aside className="w-64 h-full bg-primary flex items-center justify-center" role="alert">
              <span className="text-white body-text">Menu indisponível</span>
            </aside>
          }>
            <aside 
              className={
                layoutConfig.isOverlay 
                  ? `sidebar-overlay z-modal ${showMobileMenu ? 'open' : ''}`
                  : 'sidebar-fixed'
              }
              role="navigation"
              aria-label="Menu principal de navegação"
              aria-expanded={layoutConfig.isOverlay ? showMobileMenu : !isCollapsed}
            >
              <Sidebar 
                isCollapsed={layoutConfig.isOverlay ? false : isCollapsed}
                activeSection={activeSection}
                onToggle={handleToggle}
                onSectionChange={handleSectionChange}
                isMobile={layoutConfig.isOverlay}
              />
            </aside>
          </ErrorBoundary>
          
          {/* Content Area com melhor semântica */}
          <main 
            id="main-content"
            className="main-content"
            role="main"
            aria-label={`Aplicação ScholarRAG - Seção ${activeSection}`}
            tabIndex={-1}
          >
            <ErrorBoundary fallback={
              <div className="content-scrollable" role="alert">
                <div className="universal-content-padding">
                  <div className="sr-card p-8 text-center">
                    <h2 className="component-title mb-4">Conteúdo indisponível</h2>
                    <p className="body-text text-muted-foreground">
                      Ocorreu um erro ao carregar esta seção. 
                      <button 
                        className="sr-button ghost ml-4"
                        onClick={() => window.location.reload()}
                      >
                        Recarregar página
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            }>
              <ContentArea 
                activeSection={activeSection} 
                onSectionChange={handleSectionChange}
                selectedProject={selectedProject}
                onProjectSelect={handleProjectSelect}
                projects={projects}
                onUpdateProjects={setProjects}
                layoutConfig={layoutConfig}

              />
            </ErrorBoundary>
          </main>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
  
}



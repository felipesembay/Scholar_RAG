import React, { useState }      from "react";
import { PlusIcon }             from "../icons";
import SearchBar                from "../projects_v2/SearchBar.tsx";
import ProjectCard              from "../ProjectCard";
import CreateProjectModal       from "../modals/CreateProjectModal";
import UpdateProjectModal       from "../modals/UpdateProjectModal";
import DeleteProjectModal       from "../modals/DeleteProjectModal";
//import PasswordModal            from "../modals/PasswordModal";
//import ProjectChatbotModal from "../modals/ProjectChatbotModal";
import { checkPassword }        from "../../rag_services.ts";
import { setUpdateProjet }      from "../../rag_services.ts";
import { deleteProject }        from "../../rag_services.ts";
import { retrieveProjectInfo }  from "../../rag_services.ts";
import Breadcrumb               from "../navigation/Breadcrumb";
import EmptyState               from "../ui/EmptyState";
import LoadingState             from "../ui/LoadingState";
import { useUIState }           from "../../hooks/useUIState";
import { useToast }             from "../ui/Toast";
// import { refreshProjects }   from "../../App.tsx";
// import reload                from "../../App.tsx";
// import useEffect             from "../../App.tsx";
// import { useAnimationFrame } from "motion/react";


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

interface ProjectData {
  projectName: string;
  username: string;
  password: string;
  confirmPassword: string;
  prompt: string;
  uploadMethod: "manual";
  files: File[];
}

interface UpdateProjectData {
  uploadMethod: "manual";
  files: File[];
  password: string;
  

}

interface ProjectsContentProps {
  onProjectSelect: (project: Project) => void;
  onSectionChange: (section: string) => void;
  projects: Project[];
  onUpdateProjects: (projects: Project[]) => void;
}

function CreateProjectButton({ onClick }: { onClick: () => void }) {
  return (
    <button 
      className="sr-button primary"
      onClick={onClick}
    >
      <PlusIcon className="size-5" />
      Criar novo projeto
    </button>
  );
}


// export function refreshListproject(data: ProjectData) {
//   //console.log("data: ", data) 
// }


export default function ProjectsContent({ onProjectSelect, onSectionChange, projects, onUpdateProjects }: ProjectsContentProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const { isLoading, executeAsync } = useUIState();
  const { showSuccess, showError } = useToast();
  // const [isDeleting , setIsDeleting] = useState(false);
  // const [isUpdating , setIsUpdating] = useState(false);
  // const [isCreating , setIsCreating] = useState(false);
  // let isDeleting: boolean  = false;
  // let isUpdating: boolean  = false;
  // let isCreating: boolean  = false;
  // const [isModalVisible, setModalVisible] = useState(false);

  // const msgWindows = () => {
  //   return (
  //     <div>
  //       {isModalVisible && (
  //         <div className="modal-overlay"  
  //           style={
  //             { backgroundColor: "rgba(34, 34, 34, 0.25)" }
  //           }
  //         >
  //         <div className="animate-spin size-7 border-2 border-primary border-t-transparent rounded-full">           
  //         </div>
  //           <div className="modal-content">
  //             <h2>
  //                 <div className="mb-4">
  //                   Excluindo o Projeto, aguarde..."   
  //                 </div>
  //             </h2>
  //           </div>
  //         </div>
  //       )}
  //     </div>
  //   );
  // }  
  // //-----------------------------------------------------------------


  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const breadcrumbItems = [
    { label: "Projetos", isActive: true }
  ];

  const handleCreateProject = () => {
    setIsModalOpen(true);  
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSaveProject = async (data: Project) => {
    await executeAsync(async () => {    

      //onUpdateProjects([data, ...projects]);
      //
      //onUpdateProjects([ ...projects, data]);   
      const sortedProjects = [...projects, data].sort((a, b) => a.name.localeCompare(b.name));
      onUpdateProjects(sortedProjects);                 
      setIsModalOpen(false);   
                  
      // Simular delay de criação
      //await new Promise(resolve => setTimeout(resolve, 1000));
      //console.log("Projeto criado:", data);
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


      //showSuccess("Projeto criado!", `O projeto "${data.projectName}" foi criado com sucesso!`);      
      // console.log("Projeto criado:", {
      //   ...data,
      //   files: data.files.map(f => ({ name: f.name, size: f.size }))
      // });
      // showSuccess("Projeto criado!", `O projeto "${data.projectName}" foi criado com sucesso!`);    
      // console.log("Projeto criado:", {
      //   ...data,
      //   files: data.files.map(f => ({ name: f.name, size: f.size }))
      // });

            
    });
  };

  const handleEditProject = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (project) {
      setSelectedProject(project);
      setIsUpdateModalOpen(true);
    }
  };

  // const validatePassword = async (project_name: string, project_password: string, project_protect: boolean) => {
  //   console.log("teste");
  // };


  const handleUpdateProject = async (projectId: string, data: UpdateProjectData) => {
    await executeAsync(async () => {
      // Simular delay de atualização
      //await new Promise(resolve => setTimeout(resolve, 800));      
      // console.log("Atualizar projeto:", projectId, {
      //   ...data,
      //   files: data.files.map(f => ({ name: f.name, size: f.size }))
      // });
      const name_prj :string  =  projects.find(p => p.id === projectId)?.name??""; 
      let boIsPermited = false
      if(!projects.find(p => p.id === projectId)?.hasPassword)
      {
          //console.log("Não há senha neste Projeto para Verificar....");
          boIsPermited = true 
      } else
      {        
        try{
          const response = await checkPassword({project_name: name_prj,password: data.password});         
          if (response.status === 200  && response.data) {       
            if( response.data.password === "TRUE") 
            {
              boIsPermited = true 
            } else
            {
              showError("A senha digitada, para Projeto " + name_prj + ", esta errada. Tente novamente!");
            }
          }
          else
          {
            console.log('Camada de Aplicação:FrontEnd (ProjectsContent.tsx) - Erro ao processar Permissões!');
          }  
        } catch (error) {
          console.error('Erro na Camada de Aplicação:FrontEnd (ProjectsContent.tsx) - ', error);
        }
      }     

      if (boIsPermited)
      {
        try{
          const results = await setUpdateProjet({
            project_name: name_prj??"", 
            user_name: projects.find(p => p.id === projectId)?.username??"", 
            password: data.password, 
            upload_method: data.uploadMethod, 
            prompt: projects.find(p => p.id === projectId)?.description??"",
            files: data.files });
          const status = results.status;
          if (status === 200  && results.data) 
          {   
              const projectToUpdate = projects.find(p => p.id === projectId);
              if (projectToUpdate) {
                try{
                  const complement = await retrieveProjectInfo({project_name: projectToUpdate.name})
                  projectToUpdate.qtd_documents = complement.qtd_documents??0;
                  projectToUpdate.qtd_words = complement.qtd_words??0;
                  const updatedProjects = projects.map(p => 
                    p.id === projectId 
                      ? { ...p, ...projectToUpdate }
                      : p
                  );   
                  onUpdateProjects(updatedProjects);
                  setIsUpdateModalOpen(false);
                  setSelectedProject(null);
                  showSuccess("[PROJETO ATUALIZADO]", `O projeto "${name_prj}", foi atualizado com sucesso!`);  

                } 
                catch (error) {
                  console.error('Erro na Camada de Aplicação:FrontEnd (ProjectsContent.tsx) - ', error);
                }
              }

              //const updatedProjects = projects.filter(p => p.id !== projectId);
              //onUpdateProjects(updatedProjects);  
              //const response = await listAllProjects();
              // const updatedProjects = projects.filter(p => p.id === projectId);
              // onUpdateProjects(updatedProjects);  


              
          } 
          else
          {
              showError("Não foi possível atualizar o Projeto " + name_prj + ". Tente novamente!");            
          }   


        }
        catch (error) 
        {
          console.error('Erro na Camada de Aplicação:FrontEnd (ProjectsContent.tsx) - ', error);
        }
        // Atualiza a data de último acesso do projeto
        // const updatedProjects = projects.map(p => 
        //   p.id === projectId 
        //     ? { ...p, lastAccessed: new Date().toISOString().split('T')[0] }
        //     : p
        // );   
      
      }
      
      //const projectName = projects.find(p => p.id === projectId)?.name;
      //showSuccess("Projeto atualizado!", `O projeto "${projectName}" foi atualizado com sucesso.`);
    });
  };

  const handleCloseUpdateModal = () => {
    setIsUpdateModalOpen(false);
    setSelectedProject(null);
  };

  const handleDeleteProject = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (project) {
      setSelectedProject(project);
      setIsDeleteModalOpen(true);

    }
  };

  const handleConfirmDelete = async (projectId: string, password: string) => {
    await executeAsync(async () => {
      const name_prj :string  =  projects.find(p => p.id === projectId)?.name??""; 
      let boIsPermited = false
      
      if(!projects.find(p => p.id === projectId)?.hasPassword)
      {
          //console.log("Não há senha neste Projeto para Verificar....");
          boIsPermited = true 
      } else
      {        
        try{
          const response = await checkPassword({project_name: name_prj,password: password});         
          if (response.status === 200  && response.data) {       
            if( response.data.password === "TRUE") 
            {
              boIsPermited = true 
            } else
            {
              showError("A senha digitada, para Projeto " + name_prj + ", esta errada. Tente novamente!");
            }
          }
          else
          {
            console.log('Camada de Aplicação:FrontEnd (ProjectsContent.tsx) - Erro ao processar Permissões!');
          }  
        } catch (error) {
          console.error('Erro na Camada de Aplicação:FrontEnd (ProjectsContent.tsx) - ', error);
        }
      }     
      if (boIsPermited)
      {
       try{
          //setIsDeleting(true);

          //MsgWindows("Excluindo o Projeto, aguarde...",true);
          // setModalVisible(true);          
          // await new  Promise(resolve => setTimeout(resolve, 1000));          


          const results = await deleteProject({project_name: name_prj??""});
          const status = results.status;
          if (status === 200  && results.data) 
          {                    
              const updatedProjects = projects.filter(p => p.id !== projectId);
              // setIsDeleteModalOpen(false);
              // setSelectedProject(null); 
              showSuccess("[PROJETO EXCLUÍDO].", `O Projeto "${name_prj}",foi excluído com sucesso!`); 
              onUpdateProjects(updatedProjects);   

          } 
          else
          {
              showError("Não foi possível excluir o Projeto " + name_prj + ". Tente novamente!");            
          }
          // setModalVisible(false);          
          // await new  Promise(resolve => setTimeout(resolve, 1000));   
          // setIsDeleteModalOpen(false);
          // setSelectedProject(null);      
          // MsgWindows("",false);
          // await new  Promise(resolve => setTimeout(resolve, 2000));              
        }
        catch (error) 
        {
          console.error('Erro na Camada de Aplicação:FrontEnd (ProjectsContent.tsx) - ', error);
        }
      }

      // // Simular delay de deleção
      // await new Promise(resolve => setTimeout(resolve, 500));      
      // console.log("Deletar projeto:", projectId, "com senha:", password);
      // const updatedProjects = projects.filter(p => p.id !== projectId);
      // onUpdateProjects(updatedProjects);
      // setIsDeleteModalOpen(false);
      // setSelectedProject(null);
      // showSuccess("Projeto excluído!", `O projeto "${name_prj}" foi excluído com sucesso.`);


    });

    setIsDeleteModalOpen(false);  
    setSelectedProject(null);     
       

  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedProject(null);
  };

  const handleAccessProject = (project: Project, password?: string) => {
    //console.log("Acessar projeto:", project.id, password ? "com senha" : "sem senha");
    
    // Selecionar projeto e navegar para chatbot
    onProjectSelect(project);
    onSectionChange('Chatbot');
  };

  return (
    <div className="box-border content-stretch flex flex-col gap-8 items-start justify-start relative size-full">
      {/* Breadcrumb */}
      <Breadcrumb 
        items={breadcrumbItems}
        onNavigate={onSectionChange}
      />

      {/* Header */}
      <div className="flex flex-col element-gap items-start justify-center">
        <div className="page-title">
          <p className="block">Projetos de pesquisa</p>
        </div>
        <div className="page-subtitle">
          <p className="block leading-[normal] break-words">
            Cada projeto reúne os documentos de um tema da sua pesquisa. Crie, atualize ou remova projetos.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 bg-surface rounded-xl shadow-sm border border-line hover:border-primary hover:shadow-sm transition-all duration-300 p-8 overflow-hidden w-full">
        {/* Search and Create Section */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-start sm:items-center justify-between mb-8 w-full">
          {/* Search Bar */}
          <div className="relative shrink-0 w-full max-w-md">
            <SearchBar 
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar projetos..."
            />
          </div>
          
          {/* Create Button */}
          <CreateProjectButton onClick={handleCreateProject} />
        </div>
        {/* // Estava aqui antes  */}


  


        {/* Exclusion State */}
        {/* {isDeleting && !isUpdating &&  !isCreating && (
          <div className="mb-4">
            Excluindo o Projeto, aguarde..."   
          </div>
        )} */}


        {/* Projects Grid */}
        {!isLoading && (
          <div className="relative w-full">
            {filteredProjects.length === 0 ? (
              <EmptyState
                icon={searchTerm ? "search" : "plus"}
                title={searchTerm ? "Nenhum projeto encontrado" : "Nenhum projeto criado ainda"}
                description={
                  searchTerm 
                    ? "Tente ajustar os termos de busca ou criar um novo projeto."
                    : "Crie seu primeiro projeto para começar a usar o ScholarRAG."
                }
                actionLabel={!searchTerm ? "Criar primeiro projeto" : undefined}
                onAction={!searchTerm ? handleCreateProject : undefined}
              />
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div className=" font-bold text-ink text-[20px]">
                    Seus Projetos ({filteredProjects.length})
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      variant="full"
                      onEdit={handleEditProject}
                      onDelete={handleDeleteProject}
                      onAccess={handleAccessProject}
                      showActions={true}
                    />
                  ))}

                    {/* Exclusion State */}
                    {/* {isDeleting && !isUpdating &&  !isCreating &&(
                      <LoadingState message="Excluindo o Projeto, aguarde..."   />
                    )} */}


                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveProject}
      />
      
      <UpdateProjectModal
        isOpen={isUpdateModalOpen}
        onClose={handleCloseUpdateModal}
        onUpdate={handleUpdateProject}
        project={selectedProject}
      />
      
      <DeleteProjectModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onDelete={handleConfirmDelete}
        project={selectedProject}
      />
    </div>
  );
}
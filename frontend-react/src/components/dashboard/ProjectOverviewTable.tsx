import { FolderOpen } from "lucide-react";
//import { getInteractProjects } from "../../rag_services.ts"; 
import { listAllProjects } from "../../rag_services.ts"; 
import { retrieveProjectInfo } from "../../rag_services.ts"; 
import { useState, useEffect, useCallback, lazy, Suspense } from "react";
//import React from 'react';


// interface ProjetInformations {
//   tot_files: number;
//   tot_usr_active: number;
//   last_update: string;
//   tot_active_projects: number;
//   tot_docs_processed: number;
//   tot_onwner_project: number;
//   tot_usr_active24h: number;
//   tot_storage_used: string;
//   average_storage: string
// }

interface ProjectData {
  id: number;
  name: string;
  responsible: string;
  creationDate: string;
  totalFiles: number;
  words: number;
}


let projectsData: ProjectData[] = [];


//let contReset: boolean = true;
// function ReturnReset(reset: boolean){
//   if(reset){
//     contReset = false;
//     return true
//   } else
//   {
//     return false 
//   }
// }

export default function ProjectOverviewTable() {
  //const [renderChart, setRenderChart] = useState(true) 

//export default function ProjectOverviewTable({ summaryproject }: { summaryproject: ProjetInformations }) {
  useEffect(() => {
    const mainContent = document.querySelector('[role="main"]') as HTMLElement;
    if (mainContent) {   
      let projectsDataBack: ProjectData[] = [];
      const getInformationTable = async () => {
        try {
          //let trans_item;
          const response = await listAllProjects();
          if (response.status === 200 && response.data) {
            // Carga dos Dados de qtd_documents,total_size e responsáveis (unique), para os projetos
            const promises = Object.keys(response.data.projects).map(async (key, index) => {
              const result = await retrieveProjectInfo({ project_name: response.data.projects[index].project_name });
              return result;
            });
            let doc_id: number = 0; 
            const new_results = await Promise.all(promises);
            Object.keys(new_results).map(async (key, index) => {
              doc_id = (doc_id + 1),
              projectsDataBack.push({
                id: doc_id,
                name: new_results[index].project_name,
                responsible: new_results[index].project_owner,
                creationDate: new_results[index].create_date,
                totalFiles: new_results[index].qtd_documents,
                words: new_results[index].qtd_words
              })
            });
            projectsData = projectsDataBack

          }
        
          else {
            console.log('Camada de Aplicação:FrontEnd (ProjectOverviewTable.tsx) - Erro ao processar Projetos!');
          }
        } catch (error) {
          console.error('Erro na Camada de Aplicação:FrontEnd (ProjectOverviewTable.tsx) - ', error);
        }
      }
      getInformationTable();
    }

  }, []);  


  const formatNumber = (num: number) => {
    return num.toLocaleString('pt-BR');
  };


  return (
    <div className="flex flex-col component-gap">
      <div className="flex items-center element-gap mb-4">
        <FolderOpen className="w-5 h-5 text-[#f59e0b]" />
        <h3 className="component-title">Visão Geral dos Projetos</h3>
      </div>
      
      <p className="body-text text-muted-foreground mb-4">
        Nesta tabela, você pode visualizar informações detalhadas sobre cada projeto, como nome, 
        responsável, data de criação, número de arquivos e total de palavras.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full bg-surface rounded-lg border border-line">
          <thead>
            <tr className="bg-surface-muted border-b border-line">
              <th className="text-left p-4 body-text font-bold text-muted-foreground">Nome do Projeto</th>
              <th className="text-left p-4 body-text font-bold text-muted-foreground">Responsável</th>
              <th className="text-left p-4 body-text font-bold text-muted-foreground">Data de Criação</th>
              <th className="text-left p-4 body-text font-bold text-muted-foreground">Total de Arquivos</th>
              <th className="text-left p-4 body-text font-bold text-muted-foreground">Palavras</th>
            </tr>
          </thead>
          <tbody>
            {projectsData.map((project) => (
              <tr key={project.id} className="border-b border-surface-muted hover:bg-surface-muted transition-colors">
                <td className="p-4">
                  <span className="body-text font-medium text-ink">{project.name}</span>
                </td>
                <td className="p-4">
                  <span className="body-text text-muted-foreground">{project.responsible}</span>
                </td>
                <td className="p-4">
                  <span className="body-text text-muted-foreground">{project.creationDate}</span>
                </td>
                <td className="p-4 text-center">
                  <span className="inline-flex items-center justify-center px-3 py-1 bg-primary-soft text-primary body-text-sm font-medium rounded-full">
                    {project.totalFiles}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <span className="body-text font-medium text-ink">{formatNumber(project.words)}</span>
                </td>
              </tr>
            ))
          }
          </tbody>
        </table>
      </div>
    </div>
  );
}

//export default React.memo(ProjectOverviewTable);
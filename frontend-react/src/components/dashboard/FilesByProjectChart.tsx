import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { FileText } from "lucide-react";
//import { getInteractProjects } from "../../rag_services.ts"; 
//import { listAllProjects } from "../../rag_services.ts"; 
//import { retrieveProjectInfo } from "../../rag_services.ts"; 
//import { useState, useEffect, useCallback, lazy, Suspense } from "react";

interface ProjectFile {  
  name: string;
  files: number;
}[]




//export default function FilesByProjectChart() {
export default function FilesByProjectChart({ chartData }: { chartData: ProjectFile[] }) {

  // useEffect(() => {
  //   //const mainContent = document.querySelector('[role="main"]') as HTMLElement;
  //   const mainContent: boolean = true; 
  //   //if (mainContent) {
  //   const getInformationFiles = async () => {
  //     try {
  //       //let trans_item;
  //       const response = await listAllProjects();
  //       if (response.status === 200 && response.data) {
  //         //------------------------------------------------------------------------------------------------------------
  //         // Carga dos Dados de qtd_documents,total_size e responsáveis (unique), para os projetos
  //         //------------------------------------------------------------------------------------------------------------
  //         const promises = Object.keys(response.data.projects).map(async (key, index) => {
  //           const result = await retrieveProjectInfo({ project_name: response.data.projects[index].project_name });
  //           return result;
  //         });
  //         const new_results = await Promise.all(promises);
  //         //let doc_id: number = 0; 

  //         Object.keys(new_results).map(async (key, index) => {             
  //           //doc_id = (doc_id + 1),              
  //           chartData.push({
  //             //id: doc_id,
  //             name: new_results[index].project_name,
  //             files: new_results[index].qtd_documents
  //           })
  //         });
  //       }
  //       else {
  //         console.log('Camada de Aplicação:FrontEnd (FilesByprojectChart.tsx) - Erro ao processar Projetos!');
  //       }
  //     } catch (error) {
  //       console.error('Erro na Camada de Aplicação:FrontEnd (FilesByprojectChart.tsx) - ', error);
  //     }
  //   }

  
  //   getInformationFiles();
   
    
  // //}
  // }, []);


  // const [file, setFilesProject] = useState<ProjectFile>(
  //   chartData[0]
  // );


  return (
    <div className="flex flex-col component-gap">
      <div className="flex items-center element-gap mb-4">
        <FileText className="w-5 h-5 text-primary" />
        <h3 className="component-title">Arquivos por Projeto</h3>
      </div>
      
      <p className="body-text text-muted-foreground mb-6">
        O gráfico abaixo mostra a quantidade de arquivos por projeto, permitindo identificar rapidamente 
        quais projetos possuem mais ou menos arquivos.
      </p>

      <div className="bg-surface p-6 rounded-lg border border-line">
        <div className="mb-6">
          <h4 className="component-title text-center">Número de Arquivos por Projeto</h4>
        </div>
        
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 80
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
                tick={{ fill: 'var(--muted-foreground)' }}
              />
              <YAxis 
                label={{ 
                  value: 'Número de Arquivos', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: 'var(--muted-foreground)' }
                }}
                fontSize={12}
                tick={{ fill: 'var(--muted-foreground)' }}
              />
              <Bar 
                dataKey="files" 
                fill="#22c55e" 
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 text-center">
          <span className="body-text-sm text-muted-foreground">Projetos</span>
        </div>
      </div>
    </div>
  );
}
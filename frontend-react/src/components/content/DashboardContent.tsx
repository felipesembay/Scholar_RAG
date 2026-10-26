import { 
  BarChart3, 
  FolderOpen, 
  FileText, 
  Users, 
  TrendingUp, 
  Activity,
  MessageSquare,
  Search,
  Calendar,
  Target,
  Clock,
  Zap,
  Sparkles,
  Globe,
  Database
} from "lucide-react";
import Breadcrumb from "../navigation/Breadcrumb";
import ChartAccordion from "../dashboard/ChartAccordion";
import ProjectOverviewTable from "../dashboard/ProjectOverviewTable";
import FilesByProjectChart from "../dashboard/FilesByProjectChart";
import ProjectsByOwnerChart from "../dashboard/ProjectsByOwnerChart";
import ProjectCreationEvolutionChart from "../dashboard/ProjectCreationEvolutionChart";
import WordsByProjectChart from "../dashboard/WordsByProjectChart";
import TotalInteractionsTimelineChart from "../dashboard/TotalInteractionsTimelineChart";
import TotalInteractionsByProjectChart from "../dashboard/TotalInteractionsByProjectChart";
import ProjectDetailsView from "../dashboard/ProjectDetailsView";
import ProjectInteractionsTimelineChart from "../dashboard/ProjectInteractionsTimelineChart";

import { retrieveProjectInfo } from "../../rag_services.ts"; 
import { listAllProjects } from "../../rag_services.ts"; 
import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { getInteractProjects } from "../../rag_services.ts"; 
import { getAllProjects } from "../../rag_services.ts"; 


interface ProjetInformations {
  tot_files: number;
  tot_usr_active: number;
  last_update: string;
  tot_active_projects: number;
  tot_docs_processed: number;
  tot_onwner_project: number;
  tot_usr_active24h: number;
  tot_storage_used: string;
  average_storage: string
};

// interface OverTimeInteractions{
//   data_interact: string;
//   num_interact: number;
// };

// interface ProjectOverTimeInteractions{
//   name_interact: string;
//   data_interact: string;
//   num_interact:  number;
// };


interface ProjectFile {
  id: string;
  name: string;
  files: number;
}[];

interface ProjectWord {
  name: string;
  words: number;
  shortName: string;
}[];

interface EvolutionProject {
  id: string;
  date: string;
  projects: number;
  month: string;
}[];

interface EvolGroupProjectDate {
  date: string;
  projects: number;
  month: string; 
}[];

interface ProjectByOwner {
  name: string;
  projects: number;
}

interface FileProject {
  id: string;
  name: string;
  words: number;
}[];

interface FileList {
  file_name: string;
  word_count: number;
}[];

interface ProjectDetailDash {
  id: string;
  name: string;
  owner: string;
  creationDate: string;
  totalFiles: number;
  totalWords: number;
  files: FileProject[];
}

interface InteractProject{
  name: string;
  interactions: number;
  shortName: string;
}[]

interface InteractByData{
  date: string;
  interactions: number;
  formatted: string;
}[]

interface ProjectInteract{
  project_name: string;
  interactions: number;
}[]

interface InteractProjectOverTime{
  date: string;
  formatted: string;  
  projetos: ProjectInteract[];
}[]

interface ColorsProject {
  [key: string]: string;
}

// interface InteractProjectOverTimeJSON{
//   date: string;
//   formatted: string;  
// }[]


function ColorGenerator() {
  let randomHex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  if(randomHex === 'var(--surface)' || randomHex === 'var(--surface)') {
    randomHex = '#0000'
  }
  return randomHex
}


function ReturnMonthDay(date: string){
  try{

    return date.substring(8,10).toString() + "/" + date.substring(5,7).toString()
  }
  catch (error) {
    console.error('Erro na Camada de Aplicação:FrontEnd (DashboardContent.tsx) - ', error);
    console.error('Erro de Conversão de Data para o parâmetro: ', date);
    return "null"
  }

    //{ date: '2025-07-16', interactions: 6, formatted: '16/07' },
}


function ReturnMonthYearDate(date: string){
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  try{
    const index =  Number(date.substring(5,7));
    return (months[index-1] + "/" + date.substring(0,4)).toString()
  }
  catch (error) {
    console.error('Erro na Camada de Aplicação:FrontEnd (DashboardContent.tsx) - ', error);
    console.error('Erro de Conversão de Data para o parâmetro: ', date);
    return "null"
  }
}


// function groupByDateInProject(dados: any[]) {
//   return dados.reduce((agrupado, item) => {
//     // Extrai a data (ajuste o nome do projeto)
//     const data = item.date;
//     // Se a data ainda não existe no objeto de resultado, cria um novo array para ela
//     if (!agrupado[data]) {
//       total: 0;
//       itens: []
//     }
//     agrupado[data].total += item.valor;
//     agrupado[data].itens.push(item);
//     return agrupado;
//   }, {}); // Inicia com um objeto vazio
// }


interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: string;
  bgPattern?: string;
};


function StatCard({ icon, value, label, trend, color, bgPattern }: StatCardProps) {
  return (
    <div className="sr-card interactive relative overflow-hidden group">
      {/* Background Pattern */}
      {bgPattern && (
        <div 
          className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-300"
          style={{ 
            backgroundImage: bgPattern,
            backgroundSize: '40px 40px',
            backgroundPosition: '0 0, 20px 20px'
          }}
        />
      )}
      
      {/* Gradient overlay */}
      <div 
        className="absolute top-0 right-0 w-20 h-20 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-300"
        style={{ backgroundColor: color }}
      />
      
      <div className="relative z-10 p-6 flex flex-col component-gap">
        <div className="flex items-start justify-between">
          <div className="relative">
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300"
              style={{ 
                backgroundColor: color + '20',
                boxShadow: `0 4px 20px ${color}30`
              }}
            >
              <div style={{ color }}>{icon}</div>
            </div>
            <div 
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ backgroundColor: color }}
            />
          </div>
          
          {trend && (
            <div className={`flex items-center element-gap px-3 py-1.5 rounded-full text-sm font-medium ${trend.isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <TrendingUp className={`w-4 h-4 ${!trend.isPositive ? 'rotate-180' : ''}`} />
              <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
            </div>
          )}
        </div>
        
        <div className="flex flex-col element-gap">
          <div className="flex items-center element-gap">
            <div 
              style={{ backgroundColor: color }} 
              className="w-3 h-3 rounded-full shadow-md"
            />
            <span className="label-text text-muted-foreground">{label}</span>
          </div>
          <div className="flex items-baseline element-gap">
            <span 
              className="text-4xl font-bold group-hover:scale-105 transition-transform duration-300" 
              style={{ color }}
            >
              {value}
            </span>
            {typeof value === 'number' && value > 100 && (
              <span className="body-text-sm text-muted-foreground opacity-70">unidades</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

let chartData: ProjectFile[] = [];
let chartDataWord: ProjectWord[] = [];
let chartDataEvolData : EvolGroupProjectDate[] = [];
let chartProjectByOwner: ProjectByOwner[] = [];
let chartProjectDetail: ProjectDetailDash[] = [];
let chartProjectInteract: InteractProject[] = [];
let chartDateInteract: InteractByData[] = [];
let chartProjectOverTime: InteractProjectOverTime[] = [];
//let chartProjectOverTimeColors: ColorsProject[] = [];
let chartProjectOverTimeColors: ColorsProject;
let chartColors: ColorsProject ;
//let chartProjectOverJson: JSON[] = [];


export default function DashboardContent({ onNavigate }: { onNavigate?: (section: string) => void }) {
  // Gerenciamento de foco para acessibilidade
  //const [isLoadingDash, setLoadingDash] = useState(false);  

  // Função para converter bytes para um formato legível
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;

    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

  
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };
  const [summaryproject, setSummaryProject] = useState<ProjetInformations>({
    tot_files: 0,
    tot_usr_active: 0,
    last_update: "",
    tot_active_projects: 0,
    tot_docs_processed: 0,
    tot_onwner_project: 0,
    tot_usr_active24h: 0,
    tot_storage_used: "",
    average_storage: ""
  });


  //let projectDetails: ProjectDetails[] = [];


  useEffect(() => {
    const mainContent = document.querySelector('[role="main"]') as HTMLElement;
    if (mainContent) {
      const getInformations = async () => {
        try {
          let trans_item;
          const response = await listAllProjects();
          if (response.status === 200 && response.data) {

            let chartDataBack: ProjectFile[] = [];
            let chartDataWordBack: ProjectWord[] = [];
            let chartDataEvolDataBack : EvolGroupProjectDate[] = [];
            let chartProjectByOwnerBack: ProjectByOwner[] = [];
            let chartProjectDetailBack: ProjectDetailDash[] = [];
            let chartProjectInteractBack: InteractProject[] = [];
            let chartDateInteractBack: InteractByData[] = [];
            let chartProjectOverTimeBack: InteractProjectOverTime[] = [];
            let chartProjectOverTimeColorsBack: ColorsProject;
            let chartColorsBack: ColorsProject ;


            // Carga dos Dados de qtd_documents,total_size e responsáveis (unique), para os projetos
            const promises = Object.keys(response.data.projects).map(async (key, index) => {
              const result = await retrieveProjectInfo({ project_name: response.data.projects[index].project_name });
              return result;
            });
            const new_results = await Promise.all(promises);
            const uniqueOwners = [...new Set(new_results.map(item => item.project_owner))];

            let docu_id: number = 0; 

            Object.keys(new_results).map(async (key, index) => {             
              docu_id = (docu_id + 1),  

              // Criando array de arquivos por projeto
              chartDataBack.push({
                id: docu_id.toString(),
                name: new_results[index].project_name,
                files: Number(new_results[index].qtd_documents)
              })
              chartData= chartDataBack;

              // Criando array de palavras por projeto
              chartDataWordBack.push({
                //id: doc_id,
                name: new_results[index].project_name,
                words: Number(new_results[index].qtd_words),
                shortName: new_results[index].project_name
              })
              chartDataWord = chartDataWordBack;
            });     


            // Criando Projetos por Data de Criação (Evolução)
            const evol: EvolutionProject[]= [];
            let doc_id: number = 0; 
            Object.keys(response.data.projects).map(async (key, index) => {
              doc_id = (doc_id + 1),
              evol.push(
                {
                  id:  doc_id.toString(),
                  date: response.data.projects[index].creation_date.toString().substring(0, 7),
                  projects: response.data.projects[index].project_name,
                  month: ReturnMonthYearDate(response.data.projects[index].creation_date.toString().substring(0, 7))             
                }
              )
            });   
            const sortedEvol = evol.sort((a, b) => a.date.localeCompare(b.date));
            const countEvol = sortedEvol.reduce((acc, project) => {
              const currentDate = project.date;
              // 2. Verifica se a data já existe no acumulador
              if (acc[currentDate]) {
                // Se existir, adiciona os projetos à contagem existente
                acc[currentDate] += 1;
              } else {
                // Se não existir, inicializa a contagem
                acc[currentDate] = 1;
              }
              return acc;
            }, {} as Record<string, number>);           
            Object.entries(countEvol).map(([key, user]) => (
              chartDataEvolDataBack.push({
                date: key,
                projects: user,
                month: ReturnMonthYearDate(key) 
              })
            )) 
            chartDataEvolData = chartDataEvolDataBack;
            // Criando Projetos por Responsável
            const owner: ProjectByOwner[]= [];
            Object.keys(response.data.projects).map(async (key, index) => {
              owner.push(
                {
                  name: response.data.projects[index].project_owner,
                  projects: response.data.projects[index].project_name,
                }
              )
            });  
            const sortedOwner = owner.sort((a, b) => a.name.localeCompare(b.name)); 
            const countOwner = sortedOwner.reduce((acc, project) => {
              const currentDate = project.name;
              // 2. Verifica se a data já existe no acumulador
              if (acc[currentDate]) {
                acc[currentDate] += 1;
              } else {
                acc[currentDate] = 1;
              }
              return acc;
            }, {} as Record<string, number>);                 
            Object.entries(countOwner).map(([key, user]) => (
              chartProjectByOwnerBack.push({
                name: key,
                projects: user,
              })
            )) 
            chartProjectByOwner = chartProjectByOwnerBack;

            // Criando os Detalhes do Projeto
            const details = Object.keys(response.data.projects).map(async (key, index) => {
              const result_det = await retrieveProjectInfo({ project_name: response.data.projects[index].project_name });
              return result_det;
            });
            const new_detail = await Promise.all(details);
            const new_main =  await Promise.all(response.data.projects);
            let doc_detail = 0; 
            let doc_file = 0; 
            let file_detail: FileProject[] = [];
            let files_list: FileList[] = [];
            Object.keys(new_detail).map(async (key, index) => {
              doc_detail = (doc_detail + 1),
              doc_file = 0,
              file_detail = [];
              trans_item = new_main.filter(item  => item.project_name === new_detail[index].project_name.toString().trim()),
              files_list = trans_item[0].files,
              Object.keys(files_list).map(async (key, index) => {
                doc_file = (doc_file + 1),
                file_detail.push({
                  id: doc_file.toString(),
                  name: files_list[index].file_name,
                  words: Number(files_list[index].word_count)
                })
              }),
              chartProjectDetailBack.push(
              {
                id: doc_detail.toString(),
                name: new_detail[index].project_name,
                owner: new_detail[index].project_owner,
                creationDate: new_detail[index].create_date,
                totalFiles: Number(new_detail[index].qtd_documents),
                totalWords: Number(new_detail[index].qtd_words),
                files: file_detail
            })   
            });
            chartProjectDetail = chartProjectDetailBack;


            // Criando as Interações por Projeto
            const interact = await getInteractProjects()
            const arrayinteract = Object.entries(interact.data.total_per_project);
            Array.from(arrayinteract).forEach((item) => {
              chartProjectInteractBack.push({
                name: item[0],
                interactions: Number(item[1]),
                shortName: item[0]
              })
            }
            )
            chartProjectInteract = chartProjectInteractBack;


            // Criando as Interações por Data
            Object.keys(interact.data.total_over_time).map(async (key, index) => {  
              chartDateInteractBack.push({
                date: interact.data.total_over_time[index].date,
                interactions: Number(interact.data.total_over_time[index].interactions),
                formatted: ReturnMonthDay(interact.data.total_over_time[index].date.toString().trim())
              })            
            }     
            ) 
            chartDateInteract = chartDateInteractBack;

            // Criando as Interações por Projeto na Linha de Tempo
            const project_per_date = interact.data.total_over_time;
            const new_detail_date = await Promise.all(project_per_date);          
            const project_per_dateSorted = new_detail_date.sort((a, b) => a.date.localeCompare(b.date));  
            
            const listproject = await getAllProjects()
            const new_detail_project = await Promise.all(listproject.data.projects); 

            const project_over_time = interact.data.per_project_over_time;
            //const new_detail_over = await Promise.all(project_over_time);   
            const new_detail_find = await Promise.all(project_over_time);

            const listprj: ProjectInteract[] = [];
            chartProjectOverTimeColors = {};
            Array.from(new_detail_project).forEach((item,index) => {
              listprj.push({
                project_name: item,
                interactions: 0
              });
              chartProjectOverTimeColors[item] = ColorGenerator();
            }
            );
            //chartColors = JSON.parse(JSON.stringify(chartProjectOverTimeColors))
            chartColors = chartProjectOverTimeColors          

            // let projectcolor: string = "";
            // Object.keys(chartProjectOverTimeColors).map(async (key, index) => {  
            //   projectcolor = projectcolor + "\t'" + chartProjectOverTimeColors[index].item + "': '" 
            //   projectcolor = projectcolor + chartProjectOverTimeColors[index].color + (index < (chartProjectOverTimeColors.length-1) ?  "',\n": "'\n")
            // })
            // projectcolor = "{\n" + projectcolor + "}"
            // chartColors = JSON.parse(JSON.stringify(projectcolor));
            // //console.log("chartColors...: ", chartColors)


            let project_interact: ProjectInteract[]= [];
            let search_date: string ;
            let search_project: string;
            let find: any[];

            Object.keys(project_per_dateSorted).map(async (key, index) => { 
              project_interact = [],
              search_date = project_per_dateSorted[index].date.toString().trim(),        
              Object.keys(listprj).map(async (key, index) => {  
                search_project = listprj[index].project_name.toString().trim(),  
                find = new_detail_find.filter( item => item.project_name.toString().trim() === search_project && item.date.toString().trim() === search_date),                    
                project_interact.push({
                  project_name: search_project,
                  interactions: Number(find.length > 0 ? find[0].interactions: 0)
                })
              }
              )
              chartProjectOverTimeBack.push({
                date: project_per_dateSorted[index].date,
                formatted: ReturnMonthDay(project_per_dateSorted[index].date),  
                projetos: project_interact
              })  
            }
            );   
            chartProjectOverTime = chartProjectOverTimeBack;
            // Módulo para gerar uma varíavel dinâmica coms os dados de projeto sem interface
            // Inibido pois não é claro como passar uma estrutura de interface variável
            // let varArray:any = [];
            // let varProject: any [];
            // let project_string:string= ""
            // let data_string:string  = ""          
            // Object.keys(chartProjectOverTime).map(async (key, index) => { 
            //   //console.log(chartProjectOverTime[index].date) 
            //   varProject = []
            //   let interact = chartProjectOverTime[index].projetos
            //   let data_proj = chartProjectOverTime[index].date.toString().trim()
            //   let format_date = chartProjectOverTime[index].formatted.toString().trim()
            //   project_string = ""
            //   //data_string=  ""  
            //   Object.keys(interact).map( (item,index) => {
            //     let name_project = "\t\t" + interact[index].project_name + " : " + Number(interact[index].interactions).toString().trim() + (index < (interact.length-1) ? "," : "")                                             
            //     project_string = project_string + name_project + "\n"
            //   })
            //   data_string = data_string + (index > 0 ? "\n": "")
            //   data_string = data_string + "\t{\n\t\tdate: '" + data_proj+ "',\n"
            //   data_string = data_string + "\t\t" + "formatted: '" + format_date + "',\n"
            //   data_string = data_string + project_string +  "\t}" + (index < (chartProjectOverTime.length-1) ? "," : "")
            // })
            // //data_string = "[\n" + data_string + "\n]";
            // varArray = JSON.stringify(data_string);
            // const converter = JSON.parse(varArray);
            // chartProjectOverJson = converter;
            // console.log(chartProjectOverJson)
            // console.log(typeof(chartProjectOverJson))  


            let totalfiles: number = 0;
            let totalstorage: number = 0;
            Object.keys(response.data.projects).map((chave, index) => (
              trans_item = new_results.filter(item => item.project_name === response.data.projects[index].project_name.toString().trim()),
              totalfiles = (totalfiles + Number(trans_item[0].qtd_documents)),
              totalstorage = (totalstorage + Number(trans_item[0].total_size))
            ));
            
            const hoje = new Date();
            const dataFormatada = hoje.toLocaleDateString('pt-BR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            });

            const projects: ProjetInformations = {
              tot_files: totalfiles,
              tot_usr_active: 0,
              // Carga do Painel Sumarizado do Topo da Página
              last_update: dataFormatada , //Date.now().toString(),
              tot_active_projects: response.data.projects.length,
              tot_docs_processed: totalfiles,
              tot_onwner_project: uniqueOwners.length,
              tot_usr_active24h: 0,
              tot_storage_used: formatBytes(totalstorage),
              average_storage: formatBytes(totalstorage / response.data.projects.length)
            };

            setSummaryProject(projects);


          }
          else {
            console.log('Camada de Aplicação:FrontEnd (DashboardContent.tsx) - Erro ao processar Projetos!');
          }
        } catch (error) {
          console.error('Erro na Camada de Aplicação:FrontEnd (DashboardContent.tsx) - ', error);
        }

      }


      //new Promise(resolve => setTimeout(resolve, 2000)); 
      getInformations();
      //new Promise(resolve => setTimeout(resolve, 3000));    


      // Mover foco para o conteúdo principal ao navegar
      setTimeout(() => {
        mainContent.focus();
      }, 100);
    }
  }, []);


  const statisticsData = {
    totalProjects: summaryproject.tot_active_projects,
    totalFiles: summaryproject.tot_docs_processed,
    projectOwners: summaryproject.tot_onwner_project,
    activeUsers: 0,
    storageUsed:summaryproject.tot_storage_used,
    averageProjectSize: summaryproject.average_storage
  };

  const accordionItems = [
    {
      id: "overview",
      title: "Visão Geral dos Projetos",
      icon: <FolderOpen className="w-5 h-5 text-[#f59e0b]" />,
      //content: <ProjectOverviewTable summaryproject={summaryproject} />,
      content: <ProjectOverviewTable />,      
 
      defaultOpen: true
    },
    {
      id: "files-by-project",
      title: "Arquivos por Projeto",
      icon: <FileText className="w-5 h-5 text-primary" />,
      //content: <FilesByProjectChart />,
      content: <FilesByProjectChart chartData={chartData} />,     
      
    },
    {
      id: "words-by-project",
      title: "Palavras por Projeto",
      icon: <MessageSquare className="w-5 h-5 text-[#06b6d4]" />,
      //content: <WordsByProjectChart />
      content: <WordsByProjectChart chartDataWord={chartDataWord}/>
    },
    {
      id: "project-evolution",
      title: "Evolução da Criação de Projetos",
      icon: <TrendingUp className="w-5 h-5 text-[#10b981]" />,
      //content: <ProjectCreationEvolutionChart />      
      content: <ProjectCreationEvolutionChart chartDataEvolData={chartDataEvolData}/>   
    },
    {
      id: "projects-by-owner",
      title: "Projetos por Dono",
      icon: <Users className="w-5 h-5 text-[#f97316]" />,
      //content: <ProjectsByOwnerChart />
      content: <ProjectsByOwnerChart chartProjectByOwner={chartProjectByOwner}/>      
    },
    {
      id: "project-details",
      title: "Detalhes do Projeto",
      icon: <Search className="w-5 h-5 text-[#3b82f6]" />,
      //content: <ProjectDetailsView />     
      content: <ProjectDetailsView chartProjectDetail={chartProjectDetail}/>
    },
    {
      id: "total-interactions",
      title: "Interações Totais por Projeto",
      icon: <Activity className="w-5 h-5 text-[#ec4899]" />,
      //content: <TotalInteractionsByProjectChart/> 
      content: <TotalInteractionsByProjectChart chartProjectInteract={chartProjectInteract}/>
    },
    {
      id: "interactions-timeline",
      title: "Interações Totais ao Longo do Tempo",
      icon: <Calendar className="w-5 h-5 text-[#84cc16]" />,
      //content: <TotalInteractionsTimelineChart />
      content: <TotalInteractionsTimelineChart chartDateInteract={chartDateInteract}/>      
    },
    {
      id: "project-interactions-timeline",
      title: "Interações por Projeto ao Longo do Tempo",
      icon: <Clock className="w-5 h-5 text-[#a855f7]" />,
      //content: <ProjectInteractionsTimelineChart />
      //content: <ProjectInteractionsTimelineChart chartProjectOverTime={chartProjectOverTime} chartProjectOverTimeColors={chartProjectOverTimeColors}/>      
      content: <ProjectInteractionsTimelineChart chartProjectOverTime={chartProjectOverTime} chartColors={chartColors}/>      


    }
  ];


  return (
    <div className="flex flex-col section-gap">
      <Breadcrumb 
        items={[
          { label: "Dashboard", isActive: true }
        ]}
        onNavigate={onNavigate || (() => {})}
      />
      
      {/* Enhanced Header Section */}
      <div className="relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-[#f59e0b]/3 rounded-2xl" />
        <div className="absolute top-4 right-8 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-4 left-8 w-24 h-24 bg-[#f59e0b]/10 rounded-full blur-2xl" />
        
        <div className="relative sr-card p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between component-gap">
            {/* Main Header Content */}
            <div className="flex items-center element-gap">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary flex items-center justify-center shadow-2xl">
                  <BarChart3 className="w-10 h-10 text-primary-foreground" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#f59e0b] rounded-full flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </div>
              
              <div className="flex flex-col element-gap">
                <h1 className="page-title flex items-center element-gap">
                  Dashboard
                  <span className="inline-flex items-center px-3 py-1 bg-primary-soft text-primary body-text-sm font-bold rounded-full">
                    Analytics
                  </span>
                </h1>
                <p className="page-subtitle opacity-90">
                  Visão geral dos projetos, documentos e interações
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-6">

              {/* <div className="text-center">
                <div className="body-text-sm text-muted-foreground mb-1">Total Geral</div>
                <div className="component-title text-primary">{statisticsData.totalFiles} Arquivo(s)</div>
              </div> */}
              {/* <div className="text-center">
                <div className="body-text-sm text-muted-foreground mb-1">Ativo Hoje</div>
                <div className="component-title text-[#10b981]">{0} Usuário(s)</div>
              </div> */}
              <div className="text-right col-span-2 lg:col-span-1">
                <div className="body-text-sm text-muted-foreground mb-1">Última Atualização</div>
                <div className="component-title text-[#f59e0b]">{summaryproject.last_update}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Introduction Section */}
      <div className="sr-card p-8 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-surface-muted via-white to-primary-soft opacity-50" />
        <div className="relative z-10 flex flex-col component-gap">
          <div className="flex items-center justify-between">
            <div className="flex items-center element-gap">
              <Globe className="w-6 h-6 text-primary" />
              <h2 className="section-title">Painel de Controle Inteligente</h2>
            </div>
            <div className="hidden md:flex items-center element-gap px-4 py-2 bg-primary-soft rounded-full">
              <Database className="w-4 h-4 text-primary" />
              <span className="body-text-sm text-primary font-medium">Tempo Real</span>
            </div>
          </div>
          
          <p className="page-subtitle">
            Bem-vindo ao centro de comando dos seus projetos! Esta dashboard oferece insights poderosos e análises em tempo real:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start element-gap p-4 bg-surface/60 rounded-xl border border-line/50">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-4 h-4 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="label-text">Estatísticas Avançadas</span>
                <span className="body-text-sm text-muted-foreground">Métricas detalhadas e KPIs dos projetos</span>
              </div>
            </div>
            
            <div className="flex items-start element-gap p-4 bg-surface/60 rounded-xl border border-line/50">
              <div className="w-8 h-8 rounded-lg bg-[#10b981]/10 flex items-center justify-center flex-shrink-0">
                <Search className="w-4 h-4 text-[#10b981]" />
              </div>
              <div className="flex flex-col">
                <span className="label-text">Exploração Interativa</span>
                <span className="body-text-sm text-muted-foreground">Drill-down nos dados dos projetos</span>
              </div>
            </div>

            {/* <div className="flex items-start element-gap p-4 bg-surface/60 rounded-xl border border-line/50">
              <div className="w-8 h-8 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-[#f59e0b]" />
              </div>
               <div className="flex flex-col">
                <span className="label-text">Analytics Preditivos</span>
                <span className="body-text-sm text-muted-foreground">Tendências e padrões inteligentes</span>
              </div>         
            </div> */}

          </div>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          icon={<FolderOpen className="w-7 h-7" />}
          value={statisticsData.totalProjects}
          label="Total de Projetos Ativos"
          // trend={{ value: 12, isPositive: true }}
          color="#f59e0b"
          bgPattern="radial-gradient(circle at 50% 50%, #f59e0b 1px, transparent 1px)"
        />
        
        <StatCard
          icon={<FileText className="w-7 h-7" />}
          value={statisticsData.totalFiles}
          label="Documentos Processados"
          // trend={{ value: 8, isPositive: true }}
          color="var(--primary)"
          bgPattern="radial-gradient(circle at 50% 50%, var(--primary) 1px, transparent 1px)"
        />
        
        <StatCard
          icon={<Users className="w-7 h-7" />}
          value={statisticsData.projectOwners}
          label="Proprietários de Projetos"
          // trend={{ value: 5, isPositive: true }}
          color="#f97316"
          bgPattern="radial-gradient(circle at 50% 50%, #f97316 1px, transparent 1px)"
        />
      </div>

      {/* Enhanced Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* <StatCard
          icon={<Activity className="w-7 h-7" />}
          value={statisticsData.activeUsers}
          label="Usuários Ativos (24h)"
          trend={{ value: 15, isPositive: true }}
          color="#10b981"
          bgPattern="radial-gradient(circle at 50% 50%, #10b981 1px, transparent 1px)"
        /> */}

        <StatCard
          icon={<Database className="w-7 h-7" />}
          value={statisticsData.storageUsed}
          label="Armazenamento Utilizado"
          // trend={{ value: 3, isPositive: false }}
          color="#3b82f6"
          bgPattern="radial-gradient(circle at 50% 50%, #3b82f6 1px, transparent 1px)"
        />
        
        <StatCard
          icon={<Target className="w-7 h-7" />}
          value={statisticsData.averageProjectSize}
          label="Tamanho Médio por Projeto"
          color="#6366f1"
          bgPattern="radial-gradient(circle at 50% 50%, #6366f1 1px, transparent 1px)"
        />
      </div>

      {/* Enhanced Charts and Analytics Section */}
      <div className="sr-card p-8 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/5 to-transparent rounded-full -translate-y-32 translate-x-32" />
        
        <div className="relative z-10 flex flex-col component-gap">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between component-gap">
            <div className="flex items-center element-gap">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="section-title">Centro de Analytics Avançados</h2>
                <p className="body-text text-muted-foreground">Visualizações interativas e insights acionáveis</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center element-gap px-4 py-2 bg-gradient-to-r from-primary-soft to-[#e6f3ff] rounded-full">
                <Zap className="w-4 h-4 text-primary" />
                <span className="body-text-sm text-primary font-medium">9 Visualizações</span>
              </div>
              <div className="flex items-center element-gap px-4 py-2 bg-gradient-to-r from-[#f0fdf4] to-[#ecfdf5] rounded-full">
                <Activity className="w-4 h-4 text-[#10b981]" />
                <span className="body-text-sm text-[#10b981] font-medium">Interativo</span>
              </div>
            </div>
          </div>
          
          <ChartAccordion items={accordionItems} />
        </div>
      </div>

      {/* Enhanced Quick Actions */}
      <div className="sr-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between component-gap">
          <div className="flex items-center element-gap">
            <Target className="w-6 h-6 text-primary" />
            <div>
              <h3 className="component-title">Ações Rápidas</h3>
              <p className="body-text-sm text-muted-foreground">Acesso direto às funcionalidades principais</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button 
              className="sr-button primary"
              onClick={() => onNavigate?.('Projetos')}
            >
              <FolderOpen className="w-5 h-5" />
              Ver Todos os Projetos
            </button>

            {/* <button className="sr-button secondary">
              <FileText className="w-5 h-5" />
              Exportar Relatório
            </button>
            <button className="sr-button ghost">
              <TrendingUp className="w-5 h-5" />
              Configurar Métricas
            </button> */}
          </div>
        </div>
      </div>
    </div>
  );
}
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { Clock } from "lucide-react";


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

interface ProjectProps{
  chartProjectOverTime: InteractProjectOverTime[];
  //chartProjectOverTimeColors: ColorsProject;
  chartColors: ColorsProject;
  //chartProjectOverTimeColors: Record<string, string>;  
}

// Exemplo de dados
// let chartProjectOverTime2222: InteractProjectOverTime[] = [
//   {
//     date: "2025-10-03",
//     formatted: "03/10",
//     projetos: [
//       { project_name: 'Artigo Back Hole 2', interactions: 1 },
//       { project_name: 'Artigo Black Hole 3', interactions: 0 },
//       { project_name: 'Artigo Black Hole 4', interactions: 0 },
//       { project_name: 'Artigo Black Hole 5', interactions: 0 },
//       { project_name: 'Artigo de Espaco 10', interactions: 0 },
//       { project_name: 'Artigo de Espaco 6', interactions: 0 },
//       { project_name: 'Artigo de Espaco 7', interactions: 0 },
//       { project_name: 'Artigo de Espaco 9', interactions: 0 },
//       { project_name: 'Artigo de FISICA 2', interactions: 0 },
//       { project_name: 'Artigo de FISICA 7', interactions: 0 },
//       { project_name: 'Artigo de FISICA 8', interactions: 0 }
//     ]
//   }
// ];

// Mapeamento de cores para os projetos
const projectColors: { [key: string]: string } = {
  'Artigo Back Hole 2': '#3b82f6',
  'Artigo Black Hole 3': '#f59e0b',
  'Artigo Black Hole 4': '#10b981',
  'Artigo Black Hole 5': '#dc2626',
  'Artigo de Espaco 10': 'var(--primary)',
  'Artigo de Espaco 6': '#f97316',
  'Artigo de Espaco 7': '#eab308',
  'Artigo de Espaco 9': '#84cc16',
  'Artigo de FISICA 2': '#22d3ee',
  'Artigo de FISICA 7': '#a855f7',
  'Artigo de FISICA 8': '#ec4899'
};


//export default function ProjectInteractionsTimelineChart() {
export default function ProjectInteractionsTimelineChart(props: ProjectProps) {


//console.log("ProjectProps: ", props.chartProjectOverTime, props.chartProjectOverTimeColors)
 //console.log(props.chartProjectOverTimeColors)
 //console.log(projectColors)


  return (
    <div className="flex flex-col component-gap">
      <div className="flex items-center element-gap mb-4">
        <Clock className="w-5 h-5 text-[#a855f7]" />
        <h3 className="component-title">Interações por Projeto ao Longo do Tempo</h3>
      </div>
      
      <p className="body-text text-muted-foreground mb-6">
        Este gráfico apresenta a evolução das interações de cada projeto individualmente ao longo do tempo, 
        permitindo comparar a atividade entre diferentes projetos.
      </p>

      <div className="bg-surface p-6 rounded-lg border border-line">
        <div className="mb-6">
          <h4 className="component-title text-center">Interações por Projeto ao Longo do Tempo</h4>
        </div>
        
        <div className="h-[450px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              //data={chartData}
              data={props.chartProjectOverTime.map(item => ({
                formatted: item.formatted,
                ...item.projetos.reduce((acc, projeto) => {
                  acc[projeto.project_name] = projeto.interactions;
                  return acc;
                }, {} as { [key: string]: number })
              }))}


              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 80
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis 
                dataKey="formatted"
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
                tick={{ fill: 'var(--muted-foreground)' }}
                label={{ 
                  value: 'Data', 
                  position: 'insideBottom', 
                  offset: -15,
                  style: { textAnchor: 'middle', fill: 'var(--muted-foreground)' }
                }}
              />
              <YAxis 
                label={{ 
                  value: 'Interações', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: 'var(--muted-foreground)' }
                }}
                fontSize={12}
                tick={{ fill: 'var(--muted-foreground)' }}
                domain={[0, 'dataMax + 2']}
              />
              <Legend 
                wrapperStyle={{ 
                  paddingTop: '20px',
                  fontSize: '12px'
                }}
              />   


              {/* Lines for each project */}
              {Object.keys(props.chartColors).map(projectName  => (
                <Line
                  key={projectName}
                  type="monotone"
                  dataKey={projectName}
                  stroke={props.chartColors[projectName]}
                  strokeWidth={2}
                  dot={{ fill: props.chartColors[projectName], strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke:props.chartColors[projectName], strokeWidth: 2, fill: 'var(--surface)' }}
                  name={projectName}
                />
              ) )} 


            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 text-center">
          <span className="body-text-sm text-muted-foreground">Período de análise por projeto</span>
        </div>
      </div>
    </div>
  );
}
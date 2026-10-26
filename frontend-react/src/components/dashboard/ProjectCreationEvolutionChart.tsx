import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { TrendingUp } from "lucide-react";


// const chartData = [
//   { date: '2025-06', projects: 6, month: 'Jun/2025' },
//   { date: '2025-07', projects: 3, month: 'Jul/2025' }
// ];
interface EvolGroupProjectDate {
  date: string;
  projects: number;
  month: string; 
}[];

//export default function ProjectCreationEvolutionChart() {
export default function ProjectCreationEvolutionChart({ chartDataEvolData }: { chartDataEvolData: EvolGroupProjectDate[] }) {

  return (
    <div className="flex flex-col component-gap">
      <div className="flex items-center element-gap mb-4">
        <TrendingUp className="w-5 h-5 text-[#10b981]" />
        <h3 className="component-title">Evolução da Criação de Projetos</h3>
      </div>
      
      <p className="body-text text-muted-foreground mb-6">
        Este gráfico mostra a linha do tempo da criação de projetos, permitindo visualizar tendências ao 
        longo do tempo.
      </p>

      <div className="bg-surface p-6 rounded-lg border border-line">
        <div className="mb-6">
          <h4 className="component-title text-center">Linha do Tempo da Criação de Projetos</h4>
        </div>
        
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartDataEvolData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 60
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis 
                dataKey="month"
                fontSize={12}
                tick={{ fill: 'var(--muted-foreground)' }}
                label={{ 
                  value: 'Mês/Ano', 
                  position: 'insideBottom', 
                  offset: -10,
                  style: { textAnchor: 'middle', fill: 'var(--muted-foreground)' }
                }}
              />
              <YAxis 
                label={{ 
                  value: 'Projetos Criados', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: 'var(--muted-foreground)' }
                }}
                fontSize={12}
                tick={{ fill: 'var(--muted-foreground)' }}
                domain={[0, 'dataMax + 1']}
              />
              <Line 
                type="monotone" 
                dataKey="projects" 
                stroke="var(--primary)" 
                strokeWidth={3}
                dot={{ fill: 'var(--primary)', strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8, stroke: 'var(--primary)', strokeWidth: 2, fill: 'var(--surface)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 text-center">
          <span className="body-text-sm text-muted-foreground">Período de análise</span>
        </div>
      </div>
    </div>
  );
}
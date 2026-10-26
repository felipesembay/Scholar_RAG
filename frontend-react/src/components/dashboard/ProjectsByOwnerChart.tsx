import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Users } from "lucide-react";
interface ProjectByOwner {
  name: string;
  projects: number;
}


//export default function ProjectsByOwnerChart() {
export default function ProjectsByOwnerChart({ chartProjectByOwner }: { chartProjectByOwner: ProjectByOwner[] }) {


  return (
    <div className="flex flex-col component-gap">
      <div className="flex items-center element-gap mb-4">
        <Users className="w-5 h-5 text-[#f97316]" />
        <h3 className="component-title">Projetos por Dono</h3>
      </div>
      
      <p className="body-text text-muted-foreground mb-6">
        O gráfico abaixo mostra a distribuição de projetos por dono, permitindo identificar quais 
        responsáveis possuem mais projetos.
      </p>

      <div className="bg-surface p-6 rounded-lg border border-line">
        <div className="mb-6">
          <h4 className="component-title text-center">Distribuição de Projetos por Dono</h4>
        </div>
        
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartProjectByOwner}
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
                  value: 'Quantidade de Projetos', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: 'var(--muted-foreground)' }
                }}
                fontSize={12}
                tick={{ fill: 'var(--muted-foreground)' }}
                domain={[0, 'dataMax + 1']}
              />
              <Bar 
                dataKey="projects" 
                fill="#f59e0b" 
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 text-center">
          <span className="body-text-sm text-muted-foreground">Donos de Projetos</span>
        </div>
      </div>
    </div>
  );
}
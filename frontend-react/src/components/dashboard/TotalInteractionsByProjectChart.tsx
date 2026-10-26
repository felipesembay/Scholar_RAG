import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Activity } from "lucide-react";

interface InteractProject{
  name: string;
  interactions: number;
  shortName: string;
}[];


//export default function TotalInteractionsByProjectChart() {
export default function TotalInteractionsByProjectChart( { chartProjectInteract }: { chartProjectInteract: InteractProject[] } ) {
  return (
    <div className="flex flex-col component-gap">
      <div className="flex items-center element-gap mb-4">
        <Activity className="w-5 h-5 text-[#ec4899]" />
        <h3 className="component-title">Interações Totais por Projeto</h3>
      </div>
      
      <p className="body-text text-muted-foreground mb-6">
        Este gráfico apresenta o total de interações de cada projeto, mostrando quais projetos 
        são mais utilizados pelos usuários da plataforma.
      </p>

      <div className="bg-surface p-6 rounded-lg border border-line">
        <div className="mb-6">
          <h4 className="component-title text-center">Total de Interações por Projeto</h4>
        </div>
        
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartProjectInteract}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 80
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis 
                dataKey="shortName" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
                tick={{ fill: 'var(--muted-foreground)' }}
              />
              <YAxis 
                label={{ 
                  value: 'Total de Interações', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: 'var(--muted-foreground)' }
                }}
                fontSize={12}
                tick={{ fill: 'var(--muted-foreground)' }}
                domain={[0, 'dataMax + 2']}
              />
              <Bar 
                dataKey="interactions" 
                fill="#0891b2" 
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
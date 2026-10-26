import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Calendar } from "lucide-react";

interface InteractByData{
  date: string;
  interactions: number;
  formatted: string;
}[]

// const chartData = [
//   { date: '2025-07-16', interactions: 6, formatted: '16/07' },
//   { date: '2025-07-21', interactions: 2, formatted: '21/07' },
//   { date: '2025-07-21', interactions: 1, formatted: '21/07' },
//   { date: '2025-07-26', interactions: 3, formatted: '26/07' },
//   { date: '2025-07-26', interactions: 2, formatted: '26/07' },
//   { date: '2025-07-31', interactions: 13, formatted: '31/07' },
//   { date: '2025-08-05', interactions: 3, formatted: '05/08' },
//   { date: '2025-08-10', interactions: 3, formatted: '10/08' },
//   { date: '2025-08-15', interactions: 3, formatted: '15/08' },
//   { date: '2025-08-20', interactions: 3, formatted: '20/08' }
// ];


//export default function TotalInteractionsTimelineChart() {
export default function TotalInteractionsTimelineChart({ chartDateInteract }: { chartDateInteract: InteractByData[] } ) {

  return (
    <div className="flex flex-col component-gap">
      <div className="flex items-center element-gap mb-4">
        <Calendar className="w-5 h-5 text-[#84cc16]" />
        <h3 className="component-title">Interações Totais ao Longo do Tempo</h3>
      </div>
      
      <p className="body-text text-muted-foreground mb-6">
        Este gráfico mostra a evolução das interações totais ao longo do tempo, permitindo identificar 
        padrões de uso e picos de atividade na plataforma.
      </p>

      <div className="bg-surface p-6 rounded-lg border border-line">
        <div className="mb-6">
          <h4 className="component-title text-center">Interações Totais ao Longo do Tempo</h4>
        </div>
        
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartDateInteract}
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
              <Line 
                type="monotone" 
                dataKey="interactions" 
                stroke="var(--primary)" 
                strokeWidth={3}
                dot={{ fill: 'var(--primary)', strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8, stroke: 'var(--primary)', strokeWidth: 2, fill: 'var(--surface)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 text-center">
          <span className="body-text-sm text-muted-foreground">Período de Análise</span>
        </div>
      </div>
    </div>
  );
}
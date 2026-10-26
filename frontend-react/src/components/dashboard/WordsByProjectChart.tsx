import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { MessageSquare } from "lucide-react";


interface ProjectWord {
  name: string;
  words: number;
  shortName: string;
}[];

export default function WordsByProjectChart({ chartDataWord }: { chartDataWord: ProjectWord[] }) {

  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  return (
    <div className="flex flex-col component-gap">
      <div className="flex items-center element-gap mb-4">
        <MessageSquare className="w-5 h-5 text-[#06b6d4]" />
        <h3 className="component-title">Palavras por Projeto</h3>
      </div>
      
      <p className="body-text text-muted-foreground mb-6">
        O gráfico abaixo mostra a quantidade de palavras por projeto, permitindo identificar a densidade de 
        conteúdo em cada projeto.
      </p>

      <div className="bg-surface p-6 rounded-lg border border-line">
        <div className="mb-6">
          <h4 className="component-title text-center">Quantidade de Palavras por Projeto</h4>
          <p className="body-text-sm text-center text-muted-foreground mt-2">Valores em milhões (M) e milhares (K)</p>
        </div>
        
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartDataWord}
              margin={{
                top: 20,
                right: 30,
                left: 60,
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
                  value: 'Quantidade de Palavras', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: 'var(--muted-foreground)' }
                }}
                fontSize={12}
                tick={{ fill: 'var(--muted-foreground)' }}
                tickFormatter={formatNumber}
                domain={[0, 'dataMax']}
              />
              <Bar 
                dataKey="words" 
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
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
import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import type { EquityPoint } from '@/types/trading';

interface DrawdownChartProps {
  equityCurve: EquityPoint[];
}

export function DrawdownChart({ equityCurve }: DrawdownChartProps) {
  const data = useMemo(() => {
    return equityCurve.map(point => ({
      date: point.date.toLocaleDateString(),
      drawdown: point.drawdown
    }));
  }, [equityCurve]);
  
  const maxDrawdown = useMemo(() => {
    return Math.max(...equityCurve.map(e => e.drawdown));
  }, [equityCurve]);
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass p-3 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground mb-2">{label}</p>
          <p className="text-sm font-medium text-red-400">
            Drawdown: -{payload[0].value.toFixed(2)}%
          </p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="chart-container h-[250px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Drawdown Analysis</h3>
        <div className="text-sm">
          <span className="text-muted-foreground">Max Drawdown: </span>
          <span className="text-red-400 font-medium">-{maxDrawdown.toFixed(2)}%</span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorDrawdown" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--chart-grid))" 
            vertical={false}
          />
          
          <XAxis 
            dataKey="date" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            minTickGap={30}
          />
          
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `-${val.toFixed(1)}%`}
            domain={[0, 'auto']}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Area
            type="monotone"
            dataKey="drawdown"
            stroke="#ef4444"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorDrawdown)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

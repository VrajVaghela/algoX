import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import type { EquityPoint } from '@/types/trading';

interface EquityChartProps {
  equityCurve: EquityPoint[];
  initialCapital?: number;
}

export function EquityChart({ equityCurve, initialCapital = 100000 }: EquityChartProps) {
  const data = useMemo(() => {
    return equityCurve.map(point => ({
      date: point.date.toLocaleDateString(),
      equity: point.equity,
      drawdown: point.drawdown,
      benchmark: initialCapital * (1 + point.benchmark / 100)
    }));
  }, [equityCurve, initialCapital]);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass p-3 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground mb-2">{label}</p>
          <p className="text-sm font-medium text-emerald-400">
            Equity: {formatCurrency(payload[0].value)}
          </p>
          {payload[1] && (
            <p className="text-sm font-medium text-blue-400">
              Benchmark: {formatCurrency(payload[1].value)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="chart-container h-[400px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Equity Curve</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Strategy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">Buy & Hold</span>
          </div>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorBenchmark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
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
            tickFormatter={formatCurrency}
            domain={['auto', 'auto']}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <ReferenceLine 
            y={initialCapital} 
            stroke="hsl(var(--muted-foreground))" 
            strokeDasharray="3 3"
            strokeOpacity={0.5}
          />
          
          <Area
            type="monotone"
            dataKey="equity"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorEquity)"
          />
          
          <Area
            type="monotone"
            dataKey="benchmark"
            stroke="#3b82f6"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            fillOpacity={1}
            fill="url(#colorBenchmark)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

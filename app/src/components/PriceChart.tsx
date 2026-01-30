import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Scatter
} from 'recharts';
import type { OHLCV, Trade, Signal } from '@/types/trading';
import { calculateBollingerBands, calculateSMA } from '@/utils/indicators';

interface PriceChartProps {
  data: OHLCV[];
  trades: Trade[];
  signals: Signal[];
  showIndicators?: boolean;
}

export function PriceChart({ data, signals, showIndicators = true }: PriceChartProps) {
  const chartData = useMemo(() => {
    const closes = data.map(d => d.close);
    const bb = showIndicators ? calculateBollingerBands(closes, 20, 2) : null;
    const sma20 = showIndicators ? calculateSMA(closes, 20) : null;
    const sma50 = showIndicators ? calculateSMA(closes, 50) : null;
    
    return data.map((candle, i) => ({
      date: candle.date.toLocaleDateString(),
      close: candle.close,
      high: candle.high,
      low: candle.low,
      bbUpper: bb?.upper[i],
      bbMiddle: bb?.middle[i],
      bbLower: bb?.lower[i],
      sma20: sma20?.[i],
      sma50: sma50?.[i]
    }));
  }, [data, showIndicators]);
  
  // Prepare trade markers
  const buySignals = useMemo(() => {
    return signals
      .filter(s => s.type === 'BUY')
      .map(s => ({
        date: s.date.toLocaleDateString(),
        price: s.price,
        type: 'buy'
      }));
  }, [signals]);
  
  const sellSignals = useMemo(() => {
    return signals
      .filter(s => s.type === 'EXIT' || s.type === 'SELL')
      .map(s => ({
        date: s.date.toLocaleDateString(),
        price: s.price,
        type: 'sell'
      }));
  }, [signals]);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(value);
  };
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="glass p-3 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground mb-2">{label}</p>
          <p className="text-sm font-medium">
            Close: {formatCurrency(data.close)}
          </p>
          {data.bbUpper && (
            <>
              <p className="text-xs text-blue-400 mt-1">
                BB Upper: {formatCurrency(data.bbUpper)}
              </p>
              <p className="text-xs text-gray-400">
                BB Middle: {formatCurrency(data.bbMiddle)}
              </p>
              <p className="text-xs text-blue-400">
                BB Lower: {formatCurrency(data.bbLower)}
              </p>
            </>
          )}
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="chart-container h-[450px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Price Chart with Signals</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Buy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Sell</span>
          </div>
          {showIndicators && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-blue-400" />
                <span className="text-muted-foreground">BB</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-amber-400" />
                <span className="text-muted-foreground">SMA20</span>
              </div>
            </>
          )}
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
          
          {/* Bollinger Bands */}
          {showIndicators && (
            <>
              <Line
                type="monotone"
                dataKey="bbUpper"
                stroke="#60a5fa"
                strokeWidth={1}
                strokeOpacity={0.6}
                dot={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="bbMiddle"
                stroke="#9ca3af"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="bbLower"
                stroke="#60a5fa"
                strokeWidth={1}
                strokeOpacity={0.6}
                dot={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="sma20"
                stroke="#fbbf24"
                strokeWidth={1.5}
                dot={false}
                connectNulls={false}
              />
            </>
          )}
          
          {/* Price Line */}
          <Line
            type="monotone"
            dataKey="close"
            stroke="#e5e7eb"
            strokeWidth={2}
            dot={false}
          />
          
          {/* Buy Signals */}
          <Scatter
            data={buySignals}
            fill="#10b981"
            shape="triangle"
            legendType="none"
          />
          
          {/* Sell Signals */}
          <Scatter
            data={sellSignals}
            fill="#ef4444"
            shape="triangle"
            legendType="none"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

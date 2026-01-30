import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area
} from 'recharts';
import type { OHLCV, Trade, Signal, IndicatorData } from '@/types/trading';
import { 
  calculateBollingerBands, 
  calculateSMA, 
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateVWAP,
  calculateStochastic,
  calculateATR,
  calculateADX
} from '@/utils/indicators';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

interface EnhancedPriceChartProps {
  data: OHLCV[];
  trades: Trade[];
  signals: Signal[];
}

interface IndicatorConfig {
  sma20: boolean;
  sma50: boolean;
  sma200: boolean;
  ema9: boolean;
  ema21: boolean;
  bb: boolean;
  rsi: boolean;
  macd: boolean;
  vwap: boolean;
  stoch: boolean;
  atr: boolean;
  adx: boolean;
}

export function EnhancedPriceChart({ data, trades: _trades, signals }: EnhancedPriceChartProps) {
  const [indicators, setIndicators] = useState<IndicatorConfig>({
    sma20: true,
    sma50: false,
    sma200: false,
    ema9: false,
    ema21: false,
    bb: true,
    rsi: false,
    macd: false,
    vwap: false,
    stoch: false,
    atr: false,
    adx: false,
  });

  const [showSignals, setShowSignals] = useState(true);

  // Calculate all indicators
  const indicatorData = useMemo((): IndicatorData => {
    const closes = data.map(d => d.close);
    
    return {
      sma: indicators.sma20 ? calculateSMA(closes, 20) : undefined,
      ema: indicators.ema9 ? calculateEMA(closes, 9) : undefined,
      bb: indicators.bb ? calculateBollingerBands(closes, 20, 2) : undefined,
      rsi: indicators.rsi ? calculateRSI(closes, 14) : undefined,
      macd: indicators.macd ? calculateMACD(closes, 12, 26, 9) : undefined,
      vwap: indicators.vwap ? calculateVWAP(data) : undefined,
      stoch: indicators.stoch ? calculateStochastic(data, 14, 3) : undefined,
      atr: indicators.atr ? calculateATR(data, 14).atr : undefined,
      adx: indicators.adx ? calculateADX(data, 14) : undefined,
    };
  }, [data, indicators]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return data.map((candle, i) => ({
      date: candle.date.toLocaleDateString(),
      timestamp: candle.date.getTime(),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      sma20: indicatorData.sma?.[i],
      sma50: indicators.sma50 ? calculateSMA(data.map(d => d.close), 50)[i] : undefined,
      sma200: indicators.sma200 ? calculateSMA(data.map(d => d.close), 200)[i] : undefined,
      ema9: indicatorData.ema?.[i],
      ema21: indicators.ema21 ? calculateEMA(data.map(d => d.close), 21)[i] : undefined,
      bbUpper: indicatorData.bb?.upper[i],
      bbMiddle: indicatorData.bb?.middle[i],
      bbLower: indicatorData.bb?.lower[i],
      rsi: indicatorData.rsi?.[i],
      macd: indicatorData.macd?.macd[i],
      macdSignal: indicatorData.macd?.signal[i],
      macdHist: indicatorData.macd?.histogram[i],
      vwap: indicatorData.vwap?.[i],
      stochK: indicatorData.stoch?.k[i],
      stochD: indicatorData.stoch?.d[i],
      atr: indicatorData.atr?.[i],
      adx: indicatorData.adx?.adx[i],
      plusDI: indicatorData.adx?.plusDI[i],
      minusDI: indicatorData.adx?.minusDI[i],
    }));
  }, [data, indicatorData, indicators]);

  // Prepare signal markers
  const buySignals = useMemo(() => {
    if (!showSignals) return [];
    return signals
      .filter(s => s.type === 'BUY')
      .map(s => ({
        x: s.date.toLocaleDateString(),
        y: s.price,
      }));
  }, [signals, showSignals]);

  // Sell signals for future use
  useMemo(() => {
    if (!showSignals) return [];
    return signals
      .filter(s => s.type === 'EXIT' || s.type === 'SELL')
      .map(s => ({
        x: s.date.toLocaleDateString(),
        y: s.price,
      }));
  }, [signals, showSignals]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="glass p-3 rounded-lg border border-border min-w-[200px]">
          <p className="text-sm text-muted-foreground mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">O:</span> {formatCurrency(d.open)}</p>
            <p><span className="text-muted-foreground">H:</span> {formatCurrency(d.high)}</p>
            <p><span className="text-muted-foreground">L:</span> {formatCurrency(d.low)}</p>
            <p><span className="text-muted-foreground">C:</span> <strong>{formatCurrency(d.close)}</strong></p>
            <p><span className="text-muted-foreground">V:</span> {d.volume.toLocaleString()}</p>
            
            {d.rsi && !isNaN(d.rsi) && (
              <p className="text-blue-400">RSI: {d.rsi.toFixed(1)}</p>
            )}
            {d.macd && !isNaN(d.macd) && (
              <p className="text-purple-400">MACD: {d.macd.toFixed(2)}</p>
            )}
            {d.atr && !isNaN(d.atr) && (
              <p className="text-amber-400">ATR: {d.atr.toFixed(2)}</p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const toggleIndicator = (key: keyof IndicatorConfig) => {
    setIndicators(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="chart-container">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSignals(!showSignals)}
          className="gap-2"
        >
          {showSignals ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          Signals
        </Button>
        
        <div className="h-4 w-px bg-border mx-2" />
        
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Moving Averages:</span>
        {[
          { key: 'sma20' as const, label: 'SMA20', color: '#fbbf24' },
          { key: 'sma50' as const, label: 'SMA50', color: '#3b82f6' },
          { key: 'sma200' as const, label: 'SMA200', color: '#8b5cf6' },
          { key: 'ema9' as const, label: 'EMA9', color: '#10b981' },
          { key: 'ema21' as const, label: 'EMA21', color: '#f97316' },
        ].map(({ key, label, color }) => (
          <Button
            key={key}
            variant={indicators[key] ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleIndicator(key)}
            className="text-xs px-2 py-1 h-7"
            style={indicators[key] ? { backgroundColor: color, borderColor: color } : {}}
          >
            {label}
          </Button>
        ))}
        
        <div className="h-4 w-px bg-border mx-2" />
        
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Indicators:</span>
        {[
          { key: 'bb' as const, label: 'BB' },
          { key: 'rsi' as const, label: 'RSI' },
          { key: 'macd' as const, label: 'MACD' },
          { key: 'vwap' as const, label: 'VWAP' },
        ].map(({ key, label }) => (
          <Button
            key={key}
            variant={indicators[key] ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleIndicator(key)}
            className="text-xs px-2 py-1 h-7"
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Main Price Chart */}
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" vertical={false} />
            
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />
            
            <YAxis 
              yAxisId="price"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCurrency}
              domain={['auto', 'auto']}
            />
            
            <YAxis 
              yAxisId="volume"
              orientation="right"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${(v/1000).toFixed(0)}K`}
              domain={[0, 'auto']}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* Volume */}
            <Bar 
              yAxisId="volume"
              dataKey="volume" 
              fill="hsl(var(--muted-foreground))" 
              fillOpacity={0.2}
              barSize={2}
            />
            
            {/* Bollinger Bands */}
            {indicators.bb && (
              <>
                <Area
                  yAxisId="price"
                  type="monotone"
                  dataKey="bbUpper"
                  stroke="#60a5fa"
                  strokeWidth={1}
                  strokeOpacity={0.6}
                  fill="#60a5fa"
                  fillOpacity={0.05}
                />
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="bbMiddle"
                  stroke="#9ca3af"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                />
                <Area
                  yAxisId="price"
                  type="monotone"
                  dataKey="bbLower"
                  stroke="#60a5fa"
                  strokeWidth={1}
                  strokeOpacity={0.6}
                  fill="transparent"
                />
              </>
            )}
            
            {/* Moving Averages */}
            {indicators.sma20 && (
              <Line yAxisId="price" type="monotone" dataKey="sma20" stroke="#fbbf24" strokeWidth={1.5} dot={false} />
            )}
            {indicators.sma50 && (
              <Line yAxisId="price" type="monotone" dataKey="sma50" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
            )}
            {indicators.sma200 && (
              <Line yAxisId="price" type="monotone" dataKey="sma200" stroke="#8b5cf6" strokeWidth={1.5} dot={false} />
            )}
            {indicators.ema9 && (
              <Line yAxisId="price" type="monotone" dataKey="ema9" stroke="#10b981" strokeWidth={1.5} dot={false} />
            )}
            {indicators.ema21 && (
              <Line yAxisId="price" type="monotone" dataKey="ema21" stroke="#f97316" strokeWidth={1.5} dot={false} />
            )}
            
            {/* VWAP */}
            {indicators.vwap && (
              <Line yAxisId="price" type="monotone" dataKey="vwap" stroke="#ec4899" strokeWidth={1.5} dot={false} />
            )}
            
            {/* Price Line */}
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="close"
              stroke="#e5e7eb"
              strokeWidth={2}
              dot={false}
            />
            
            {/* Signal markers */}
            {showSignals && buySignals.length > 0 && (
              <ReferenceLine yAxisId="price" y={buySignals[0]?.y} stroke="#10b981" strokeDasharray="3 3" />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* RSI Sub-chart */}
      {indicators.rsi && (
        <div className="h-[120px] mt-4 border-t border-border pt-4">
          <div className="text-xs text-muted-foreground mb-2">RSI (14)</div>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" vertical={false} />
              <XAxis dataKey="date" hide />
              <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
              <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" />
              <ReferenceLine y={50} stroke="#6b7280" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="rsi" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* MACD Sub-chart */}
      {indicators.macd && (
        <div className="h-[120px] mt-4 border-t border-border pt-4">
          <div className="text-xs text-muted-foreground mb-2">MACD (12, 26, 9)</div>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" vertical={false} />
              <XAxis dataKey="date" hide />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <ReferenceLine y={0} stroke="#6b7280" />
              <Bar dataKey="macdHist" fill="#3b82f6" barSize={2} />
              <Line type="monotone" dataKey="macd" stroke="#fbbf24" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="macdSignal" stroke="#ef4444" strokeWidth={1.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

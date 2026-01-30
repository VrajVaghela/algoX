import { useState } from 'react';
import type { StrategyType, StrategyParams } from '@/types/trading';
import { strategyInfos } from '@/utils/strategies';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Play, RotateCcw, Settings2, TrendingUp, Activity, BarChart3, Zap, Layers } from 'lucide-react';

interface StrategySelectorProps {
  selectedStrategy: StrategyType;
  onStrategyChange: (strategy: StrategyType) => void;
  params: StrategyParams;
  onParamsChange: (params: StrategyParams) => void;
  onRunBacktest: () => void;
  isLoading?: boolean;
}

const categoryIcons: Record<string, React.ElementType> = {
  'Mean Reversion': Activity,
  'Trend Following': TrendingUp,
  'Momentum': Zap,
  'Volatility': BarChart3,
  'Combined': Layers,
};

const categoryColors: Record<string, string> = {
  'Mean Reversion': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Trend Following': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Momentum': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Volatility': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Combined': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

export function StrategySelector({
  selectedStrategy,
  onStrategyChange,
  params,
  onParamsChange,
  onRunBacktest,
  isLoading = false
}: StrategySelectorProps) {
  const [showParams, setShowParams] = useState(false);
  
  const currentStrategy = strategyInfos.find(s => s.id === selectedStrategy);
  
  const handleParamChange = (key: keyof StrategyParams, value: number) => {
    onParamsChange({
      ...params,
      [key]: value
    });
  };

  const getParamFields = () => {
    switch (selectedStrategy) {
      case 'mean-reversion':
        return [
          { key: 'lookbackPeriod', label: 'Lookback Period', min: 5, max: 100, step: 1 },
          { key: 'stdDevMultiplier', label: 'Std Dev Multiplier', min: 0.5, max: 4, step: 0.1 },
          { key: 'stopLossPercent', label: 'Stop Loss (%)', min: 0.5, max: 10, step: 0.5 },
          { key: 'takeProfitPercent', label: 'Take Profit (%)', min: 0.5, max: 10, step: 0.5 },
        ];
      case 'momentum':
        return [
          { key: 'fastPeriod', label: 'Fast Period', min: 5, max: 30, step: 1 },
          { key: 'slowPeriod', label: 'Slow Period', min: 10, max: 50, step: 1 },
          { key: 'stopLossPercent', label: 'Stop Loss (%)', min: 0.5, max: 10, step: 0.5 },
          { key: 'takeProfitPercent', label: 'Take Profit (%)', min: 0.5, max: 10, step: 0.5 },
        ];
      case 'vwap-bounce':
        return [
          { key: 'vwapDeviation', label: 'VWAP Deviation (%)', min: 0.1, max: 2, step: 0.1 },
          { key: 'stopLossPercent', label: 'Stop Loss (%)', min: 0.5, max: 10, step: 0.5 },
          { key: 'takeProfitPercent', label: 'Take Profit (%)', min: 0.5, max: 10, step: 0.5 },
        ];
      case 'rsi':
        return [
          { key: 'rsiOversold', label: 'RSI Oversold', min: 10, max: 40, step: 5 },
          { key: 'rsiOverbought', label: 'RSI Overbought', min: 60, max: 90, step: 5 },
          { key: 'stopLossPercent', label: 'Stop Loss (%)', min: 0.5, max: 10, step: 0.5 },
          { key: 'takeProfitPercent', label: 'Take Profit (%)', min: 0.5, max: 10, step: 0.5 },
        ];
      case 'breakout':
        return [
          { key: 'lookbackPeriod', label: 'Lookback Period', min: 5, max: 50, step: 1 },
          { key: 'stopLossPercent', label: 'Stop Loss (%)', min: 0.5, max: 10, step: 0.5 },
          { key: 'takeProfitPercent', label: 'Take Profit (%)', min: 0.5, max: 10, step: 0.5 },
        ];
      case 'ema-crossover':
        return [
          { key: 'fastPeriod', label: 'Fast EMA', min: 5, max: 20, step: 1 },
          { key: 'slowPeriod', label: 'Slow EMA', min: 10, max: 50, step: 1 },
          { key: 'stopLossPercent', label: 'Stop Loss (%)', min: 0.5, max: 10, step: 0.5 },
          { key: 'takeProfitPercent', label: 'Take Profit (%)', min: 0.5, max: 10, step: 0.5 },
        ];
      case 'stochastic':
        return [
          { key: 'stopLossPercent', label: 'Stop Loss (%)', min: 0.5, max: 10, step: 0.5 },
          { key: 'takeProfitPercent', label: 'Take Profit (%)', min: 0.5, max: 10, step: 0.5 },
        ];
      case 'atr-trailing':
        return [
          { key: 'lookbackPeriod', label: 'ATR Period', min: 5, max: 30, step: 1 },
          { key: 'atrMultiplier', label: 'ATR Multiplier', min: 1, max: 5, step: 0.5 },
        ];
      case 'combined':
        return [
          { key: 'stopLossPercent', label: 'Stop Loss (%)', min: 0.5, max: 10, step: 0.5 },
          { key: 'takeProfitPercent', label: 'Take Profit (%)', min: 0.5, max: 10, step: 0.5 },
        ];
      default:
        return [
          { key: 'stopLossPercent', label: 'Stop Loss (%)', min: 0.5, max: 10, step: 0.5 },
          { key: 'takeProfitPercent', label: 'Take Profit (%)', min: 0.5, max: 10, step: 0.5 },
        ];
    }
  };
  
  return (
    <div className="trading-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Strategy Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Select and configure your trading strategy
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowParams(!showParams)}
        >
          <Settings2 className="w-4 h-4 mr-2" />
          {showParams ? 'Hide' : 'Show'} Parameters
        </Button>
      </div>
      
      {/* Strategy Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {strategyInfos.map((strategy) => {
          const Icon = categoryIcons[strategy.category] || Activity;
          const isSelected = selectedStrategy === strategy.id;
          
          return (
            <button
              key={strategy.id}
              onClick={() => onStrategyChange(strategy.id)}
              className={`p-4 rounded-lg border text-left transition-all relative overflow-hidden ${
                isSelected
                  ? 'border-primary bg-primary/10 ring-1 ring-primary'
                  : 'border-border hover:border-primary/50 hover:bg-secondary/50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold">{strategy.name}</span>
                </div>
                <Badge variant="outline" className={`text-xs ${categoryColors[strategy.category]}`}>
                  {strategy.category}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {strategy.description}
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Best for:</span>
                <span className="text-primary">{strategy.bestMarket}</span>
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
      
      {/* Selected Strategy Info */}
      {currentStrategy && (
        <div className="p-4 bg-secondary/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium">{currentStrategy.name}</span>
            <Badge variant="outline" className={categoryColors[currentStrategy.category]}>
              {currentStrategy.category}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{currentStrategy.description}</p>
        </div>
      )}
      
      {/* Parameters */}
      {showParams && (
        <div className="space-y-4 pt-4 border-t border-border animate-fade-in">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Strategy Parameters
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {getParamFields().map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key} className="text-xs">
                  {field.label}
                </Label>
                <Input
                  id={field.key}
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={params[field.key as keyof StrategyParams] || field.min}
                  onChange={(e) => handleParamChange(field.key as keyof StrategyParams, parseFloat(e.target.value))}
                  className="h-9"
                />
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          onClick={onRunBacktest}
          disabled={isLoading}
          className="flex-1"
          size="lg"
        >
          {isLoading ? (
            <>
              <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
              Running Backtest...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Run Backtest
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

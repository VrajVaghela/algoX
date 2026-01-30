import { useState } from 'react';
import type { StrategyComparison as StrategyComparisonType, PerformanceMetrics } from '@/types/trading';
import { TrendingUp, TrendingDown, Target, BarChart3, Activity, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StrategyComparisonProps {
  comparisons: StrategyComparisonType[];
  onSelectStrategy?: (strategy: string) => void;
}

export function StrategyComparison({ comparisons, onSelectStrategy }: StrategyComparisonProps) {
  const [selectedMetric, setSelectedMetric] = useState<keyof PerformanceMetrics>('sharpeRatio');

  const formatValue = (value: number, metric: keyof PerformanceMetrics): string => {
    if (metric === 'totalTrades' || metric === 'winningTrades' || metric === 'losingTrades' || 
        metric === 'maxDrawdownDuration') {
      return value.toFixed(0);
    }
    if (metric === 'sharpeRatio' || metric === 'sortinoRatio' || metric === 'calmarRatio' || 
        metric === 'profitFactor') {
      return value.toFixed(2);
    }
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getMetricColor = (value: number, metric: keyof PerformanceMetrics): string => {
    const isGood = (() => {
      switch (metric) {
        case 'sharpeRatio': return value >= 1;
        case 'sortinoRatio': return value >= 1;
        case 'winRate': return value >= 50;
        case 'profitFactor': return value >= 1.5;
        case 'calmarRatio': return value >= 1;
        case 'totalReturn': return value > 0;
        case 'maxDrawdown': return value < 15;
        default: return value > 0;
      }
    })();
    
    return isGood ? 'text-emerald-400' : 'text-red-400';
  };

  const metricOptions: { key: keyof PerformanceMetrics; label: string; icon: React.ElementType }[] = [
    { key: 'sharpeRatio', label: 'Sharpe Ratio', icon: Activity },
    { key: 'totalReturn', label: 'Total Return', icon: TrendingUp },
    { key: 'maxDrawdown', label: 'Max Drawdown', icon: TrendingDown },
    { key: 'winRate', label: 'Win Rate', icon: Target },
    { key: 'profitFactor', label: 'Profit Factor', icon: BarChart3 },
  ];

  // Sort by selected metric
  const sortedComparisons = [...comparisons].sort((a, b) => {
    const aVal = a.metrics[selectedMetric] as number;
    const bVal = b.metrics[selectedMetric] as number;
    // For drawdown, lower is better
    if (selectedMetric === 'maxDrawdown') {
      return aVal - bVal;
    }
    return bVal - aVal;
  });

  const bestStrategy = sortedComparisons[0];

  return (
    <div className="trading-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Strategy Comparison</h3>
          <p className="text-sm text-muted-foreground">
            Compare all strategies side by side
          </p>
        </div>
        {bestStrategy && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <Award className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Best: {bestStrategy.strategyName}
            </span>
          </div>
        )}
      </div>

      <Tabs defaultValue="table" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="table">Comparison Table</TabsTrigger>
          <TabsTrigger value="chart">Visual Chart</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2">Strategy</th>
                  <th className="text-right py-3 px-2">Trades</th>
                  <th className="text-right py-3 px-2">Win Rate</th>
                  <th className="text-right py-3 px-2">Total Return</th>
                  <th className="text-right py-3 px-2">Sharpe</th>
                  <th className="text-right py-3 px-2">Max DD</th>
                  <th className="text-right py-3 px-2">Profit Factor</th>
                  <th className="text-center py-3 px-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedComparisons.map((comp, index) => (
                  <tr 
                    key={comp.strategy} 
                    className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${
                      index === 0 ? 'bg-emerald-500/5' : ''
                    }`}
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {index === 0 && <Award className="w-4 h-4 text-emerald-500" />}
                        <span className="font-medium">{comp.strategyName}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-2">{comp.metrics.totalTrades}</td>
                    <td className={`text-right py-3 px-2 ${getMetricColor(comp.metrics.winRate, 'winRate')}`}>
                      {comp.metrics.winRate.toFixed(1)}%
                    </td>
                    <td className={`text-right py-3 px-2 ${getMetricColor(comp.metrics.totalReturn, 'totalReturn')}`}>
                      {comp.metrics.totalReturn >= 0 ? '+' : ''}{comp.metrics.totalReturn.toFixed(2)}%
                    </td>
                    <td className={`text-right py-3 px-2 ${getMetricColor(comp.metrics.sharpeRatio, 'sharpeRatio')}`}>
                      {comp.metrics.sharpeRatio.toFixed(2)}
                    </td>
                    <td className={`text-right py-3 px-2 ${getMetricColor(comp.metrics.maxDrawdown, 'maxDrawdown')}`}>
                      -{comp.metrics.maxDrawdown.toFixed(2)}%
                    </td>
                    <td className={`text-right py-3 px-2 ${getMetricColor(comp.metrics.profitFactor, 'profitFactor')}`}>
                      {comp.metrics.profitFactor.toFixed(2)}
                    </td>
                    <td className="text-center py-3 px-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelectStrategy?.(comp.strategy)}
                      >
                        Select
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="chart" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {metricOptions.map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={selectedMetric === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMetric(key)}
                className="gap-2"
              >
                <Icon className="w-4 h-4" />
                {label}
              </Button>
            ))}
          </div>

          <div className="space-y-3">
            {sortedComparisons.map((comp) => {
              const value = comp.metrics[selectedMetric] as number;
              const maxValue = Math.max(...sortedComparisons.map(c => Math.abs(c.metrics[selectedMetric] as number)));
              const percentage = maxValue > 0 ? (Math.abs(value) / maxValue) * 100 : 0;
              
              return (
                <div key={comp.strategy} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{comp.strategyName}</span>
                    <span className={getMetricColor(value, selectedMetric)}>
                      {formatValue(value, selectedMetric)}
                    </span>
                  </div>
                  <div className="h-6 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        value >= 0 ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState } from 'react';
import type { PerformanceMetrics } from '@/types/trading';
import { TrendingUp, TrendingDown, Activity, BarChart3, Target, Percent, Zap, DollarSign, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MetricsPanelProps {
  metrics: PerformanceMetrics;
}

export function MetricsPanel({ metrics }: MetricsPanelProps) {
  const [showAll, setShowAll] = useState(false);
  
  const formatPercent = (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
  const formatNumber = (val: number) => val.toFixed(2);
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  const getColorClass = (value: number, type: 'positive' | 'negative' | 'neutral' = 'positive') => {
    if (type === 'positive') return value >= 0 ? 'text-emerald-400' : 'text-red-400';
    if (type === 'negative') return value <= 0 ? 'text-emerald-400' : 'text-red-400';
    return value >= 1 ? 'text-emerald-400' : value >= 0.5 ? 'text-amber-400' : 'text-red-400';
  };

  const primaryMetrics = [
    { 
      label: 'Total Return', 
      value: formatPercent(metrics.totalReturn), 
      icon: TrendingUp, 
      color: getColorClass(metrics.totalReturn, 'positive'),
      subtext: `CAGR: ${formatPercent(metrics.cagr)}`
    },
    { 
      label: 'Sharpe Ratio', 
      value: formatNumber(metrics.sharpeRatio), 
      icon: Activity, 
      color: getColorClass(metrics.sharpeRatio, 'neutral'),
      subtext: `Sortino: ${formatNumber(metrics.sortinoRatio)}`
    },
    { 
      label: 'Max Drawdown', 
      value: formatPercent(-metrics.maxDrawdown), 
      icon: TrendingDown, 
      color: 'text-red-400',
      subtext: `${metrics.maxDrawdownDuration} bars`
    },
    { 
      label: 'Win Rate', 
      value: formatPercent(metrics.winRate), 
      icon: Target, 
      color: getColorClass(metrics.winRate - 50, 'positive'),
      subtext: `${metrics.winningTrades}W / ${metrics.losingTrades}L`
    },
    { 
      label: 'Profit Factor', 
      value: formatNumber(metrics.profitFactor), 
      icon: BarChart3, 
      color: getColorClass(metrics.profitFactor - 1, 'neutral'),
      subtext: `Expectancy: ${formatPercent(metrics.expectancy)}`
    },
    { 
      label: 'Total Trades', 
      value: metrics.totalTrades.toString(), 
      icon: Percent, 
      color: 'text-foreground',
      subtext: `${formatNumber(metrics.avgTradeDuration)}h avg`
    },
  ];

  const secondaryMetrics = [
    { label: 'Annualized Return', value: formatPercent(metrics.annualizedReturn), icon: TrendingUp },
    { label: 'Calmar Ratio', value: formatNumber(metrics.calmarRatio), icon: Activity },
    { label: 'Volatility', value: formatPercent(metrics.volatility), icon: Zap },
    { label: 'Avg Trade', value: formatPercent(metrics.avgTradeReturn), icon: Percent },
    { label: 'Avg Win', value: `+${formatPercent(metrics.avgWinningTrade)}`, icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Avg Loss', value: `${formatPercent(metrics.avgLosingTrade)}`, icon: TrendingDown, color: 'text-red-400' },
    { label: 'Largest Win', value: formatCurrency(metrics.largestWin), icon: DollarSign, color: 'text-emerald-400' },
    { label: 'Largest Loss', value: formatCurrency(metrics.largestLoss), icon: DollarSign, color: 'text-red-400' },
    { label: 'Net Profit', value: formatCurrency(metrics.netProfit), icon: PieChart, color: getColorClass(metrics.netProfit, 'positive') },
    { label: 'Commission', value: formatCurrency(metrics.commissionPaid), icon: DollarSign },
  ];
  
  return (
    <div className="space-y-4">
      {/* Primary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {primaryMetrics.map((metric, index) => (
          <div key={index} className="metric-card">
            <div className="flex items-center gap-2">
              <metric.icon className="w-4 h-4 text-muted-foreground" />
              <span className="metric-label">{metric.label}</span>
            </div>
            <span className={`metric-value ${metric.color}`}>
              {metric.value}
            </span>
            {metric.subtext && (
              <span className="text-xs text-muted-foreground">
                {metric.subtext}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Secondary Metrics */}
      {showAll && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-fade-in">
          {secondaryMetrics.map((metric, index) => (
            <div key={index} className="metric-card bg-secondary/30">
              <div className="flex items-center gap-2">
                <metric.icon className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{metric.label}</span>
              </div>
              <span className={`text-lg font-semibold tabular-nums ${metric.color || ''}`}>
                {metric.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Toggle Button */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Show Less' : 'Show All Metrics'}
        </Button>
      </div>
    </div>
  );
}

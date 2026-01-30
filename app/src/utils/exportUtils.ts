// Export Utilities - CSV, JSON, Trade Log, Config
import type { OHLCV, Trade, EquityPoint, PerformanceMetrics, BacktestConfig, Signal } from '@/types/trading';

// ============================================
// CSV EXPORT
// ============================================

export function exportToCSV(data: Record<string, any>[], filename: string): void {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (val instanceof Date) return val.toISOString();
        if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
        return String(val);
      }).join(',')
    )
  ].join('\n');
  
  downloadFile(csvContent, filename, 'text/csv');
}

export function exportTradesToCSV(trades: Trade[], filename: string = 'trades.csv'): void {
  const data = trades.map(t => ({
    id: t.id,
    type: t.type,
    entryDate: t.entryDate.toISOString(),
    entryPrice: t.entryPrice.toFixed(4),
    exitDate: t.exitDate?.toISOString() || '',
    exitPrice: t.exitPrice?.toFixed(4) || '',
    pnl: t.pnl?.toFixed(4) || '',
    pnlPercent: t.pnlPercent?.toFixed(4) || '',
    exitReason: t.exitReason || '',
    status: t.status
  }));
  
  exportToCSV(data, filename);
}

export function exportEquityCurveToCSV(equityCurve: EquityPoint[], filename: string = 'equity_curve.csv'): void {
  const data = equityCurve.map((e, i) => ({
    index: i,
    date: e.date.toISOString(),
    equity: e.equity.toFixed(4),
    drawdown: e.drawdown.toFixed(4),
    benchmark: e.benchmark.toFixed(4)
  }));
  
  exportToCSV(data, filename);
}

export function exportSignalsToCSV(signals: Signal[], filename: string = 'signals.csv'): void {
  const data = signals.map((s, i) => ({
    index: i,
    date: s.date.toISOString(),
    type: s.type,
    price: s.price.toFixed(4),
    reason: s.reason
  }));
  
  exportToCSV(data, filename);
}

export function exportOHLCVToCSV(data: OHLCV[], filename: string = 'ohlcv_data.csv'): void {
  const csvData = data.map((d, i) => ({
    index: i,
    date: d.date.toISOString(),
    open: d.open.toFixed(4),
    high: d.high.toFixed(4),
    low: d.low.toFixed(4),
    close: d.close.toFixed(4),
    volume: d.volume
  }));
  
  exportToCSV(csvData, filename);
}

// ============================================
// JSON EXPORT
// ============================================

export function exportToJSON(data: any, filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, 'application/json');
}

export interface CompleteBacktestExport {
  metadata: {
    exportDate: string;
    version: string;
    platform: string;
  };
  config: BacktestConfig;
  metrics: PerformanceMetrics;
  trades: (Omit<Trade, 'entryDate' | 'exitDate'> & { entryDate: string; exitDate?: string })[];
  equityCurve: (Omit<EquityPoint, 'date'> & { date: string })[];
  signals: (Omit<Signal, 'date'> & { date: string })[];
  summary: {
    totalTrades: number;
    winRate: number;
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
}

export function exportBacktestToJSON(
  trades: Trade[],
  equityCurve: EquityPoint[],
  metrics: PerformanceMetrics,
  config: BacktestConfig,
  signals: Signal[],
  filename: string = 'backtest_results.json'
): void {
  const exportData: CompleteBacktestExport = {
    metadata: {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      platform: 'QuantFlow Pro'
    },
    config: {
      ...config,
      startDate: config.startDate,
      endDate: config.endDate
    },
    metrics,
    trades: trades.map(t => ({
      ...t,
      entryDate: t.entryDate.toISOString(),
      exitDate: t.exitDate?.toISOString()
    })),
    equityCurve: equityCurve.map(e => ({
      ...e,
      date: e.date.toISOString()
    })),
    signals: signals.map(s => ({
      ...s,
      date: s.date.toISOString()
    })),
    summary: {
      totalTrades: metrics.totalTrades,
      winRate: metrics.winRate,
      totalReturn: metrics.totalReturn,
      sharpeRatio: metrics.sharpeRatio,
      maxDrawdown: metrics.maxDrawdown
    }
  };
  
  exportToJSON(exportData, filename);
}

// ============================================
// CONFIGURATION EXPORT/IMPORT
// ============================================

export interface StrategyConfig {
  name: string;
  description?: string;
  strategy: string;
  params: Record<string, number>;
  riskManagement: {
    stopLossPercent: number;
    takeProfitPercent: number;
    maxPositionSize: number;
    maxDrawdownPercent: number;
  };
  backtestSettings: {
    initialCapital: number;
    commission: number;
    slippage: number;
  };
}

export function exportStrategyConfig(
  strategyName: string,
  params: Record<string, number>,
  riskSettings: StrategyConfig['riskManagement'],
  backtestSettings: StrategyConfig['backtestSettings'],
  filename: string = 'strategy_config.json'
): void {
  const config: StrategyConfig = {
    name: strategyName,
    description: `Configuration for ${strategyName} strategy`,
    strategy: strategyName,
    params,
    riskManagement: riskSettings,
    backtestSettings
  };
  
  exportToJSON(config, filename);
}

export function importStrategyConfig(jsonContent: string): StrategyConfig | null {
  try {
    const config = JSON.parse(jsonContent) as StrategyConfig;
    
    // Validate required fields
    if (!config.strategy || !config.params) {
      throw new Error('Invalid config format');
    }
    
    return config;
  } catch (error) {
    console.error('Error importing config:', error);
    return null;
  }
}

// ============================================
// TRADE LOG FORMATTED EXPORT
// ============================================

export interface FormattedTradeLog {
  header: string;
  trades: string[];
  summary: string;
}

export function generateTradeLog(trades: Trade[], metrics: PerformanceMetrics): string {
  const lines: string[] = [];
  
  // Header
  lines.push('='.repeat(100));
  lines.push('QUANTFLOW PRO - TRADE LOG');
  lines.push('='.repeat(100));
  lines.push('');
  
  // Summary
  lines.push('SUMMARY');
  lines.push('-'.repeat(100));
  lines.push(`Total Trades:     ${metrics.totalTrades}`);
  lines.push(`Winning Trades:   ${metrics.winningTrades} (${metrics.winRate.toFixed(2)}%)`);
  lines.push(`Losing Trades:    ${metrics.losingTrades}`);
  lines.push(`Net Profit:       ${metrics.netProfit.toFixed(2)}`);
  lines.push(`Total Return:     ${metrics.totalReturn.toFixed(2)}%`);
  lines.push(`Sharpe Ratio:     ${metrics.sharpeRatio.toFixed(2)}`);
  lines.push(`Max Drawdown:     ${metrics.maxDrawdown.toFixed(2)}%`);
  lines.push('');
  
  // Trade details
  lines.push('TRADE DETAILS');
  lines.push('-'.repeat(100));
  lines.push(
    `${'ID'.padEnd(5)} ${'Type'.padEnd(8)} ${'Entry Date'.padEnd(20)} ${'Entry'.padEnd(12)} ` +
    `${'Exit Date'.padEnd(20)} ${'Exit'.padEnd(12)} ${'P&L'.padEnd(12)} ${'P&L%'.padEnd(10)} Exit Reason`
  );
  lines.push('-'.repeat(100));
  
  for (const trade of trades) {
    const entryDate = trade.entryDate.toLocaleString('en-GB');
    const exitDate = trade.exitDate?.toLocaleString('en-GB') || 'N/A';
    const pnl = trade.pnl?.toFixed(2) || 'N/A';
    const pnlPct = trade.pnlPercent?.toFixed(2) || 'N/A';
    
    lines.push(
      `${String(trade.id).padEnd(5)} ${trade.type.padEnd(8)} ${entryDate.padEnd(20)} ` +
      `${trade.entryPrice.toFixed(2).padEnd(12)} ${exitDate.padEnd(20)} ` +
      `${(trade.exitPrice?.toFixed(2) || 'N/A').padEnd(12)} ${pnl.padEnd(12)} ` +
      `${pnlPct.padEnd(10)} ${trade.exitReason || ''}`
    );
  }
  
  lines.push('='.repeat(100));
  
  return lines.join('\n');
}

export function exportTradeLog(trades: Trade[], metrics: PerformanceMetrics, filename: string = 'trade_log.txt'): void {
  const content = generateTradeLog(trades, metrics);
  downloadFile(content, filename, 'text/plain');
}

// ============================================
// EXCEL-FRIENDLY EXPORT (Multiple sheets)
// ============================================

export function exportAllToZip(
  trades: Trade[],
  equityCurve: EquityPoint[],
  _metrics: PerformanceMetrics,
  config: BacktestConfig,
  signals: Signal[],
  rawData?: OHLCV[]
): void {
  // For now, we'll export each as separate files
  // In a real implementation, you'd use JSZip to create a single zip file
  
  const timestamp = new Date().toISOString().split('T')[0];
  const prefix = `backtest_${config.strategy}_${timestamp}`;
  
  // Export trades
  exportTradesToCSV(trades, `${prefix}_trades.csv`);
  
  // Export equity curve
  setTimeout(() => {
    exportEquityCurveToCSV(equityCurve, `${prefix}_equity.csv`);
  }, 100);
  
  // Export signals
  setTimeout(() => {
    exportSignalsToCSV(signals, `${prefix}_signals.csv`);
  }, 200);
  
  // Export config
  setTimeout(() => {
    exportStrategyConfig(
      config.strategy,
      config.params as Record<string, number>,
      {
        stopLossPercent: config.params.stopLossPercent || 2,
        takeProfitPercent: config.params.takeProfitPercent || 3,
        maxPositionSize: config.params.maxPositionSize || 1,
        maxDrawdownPercent: 15
      },
      {
        initialCapital: config.initialCapital,
        commission: config.commission,
        slippage: config.slippage
      },
      `${prefix}_config.json`
    );
  }, 300);
  
  // Export raw data if provided
  if (rawData) {
    setTimeout(() => {
      exportOHLCVToCSV(rawData, `${prefix}_data.csv`);
    }, 400);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<boolean> {
  return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
}

// ============================================
// METRICS SUMMARY EXPORT
// ============================================

export function generateMetricsSummary(metrics: PerformanceMetrics): string {
  const lines: string[] = [];
  
  lines.push('Performance Metrics Summary');
  lines.push('==========================');
  lines.push('');
  lines.push('RETURN METRICS');
  lines.push(`  Total Return:        ${metrics.totalReturn.toFixed(2)}%`);
  lines.push(`  Annualized Return:   ${metrics.annualizedReturn.toFixed(2)}%`);
  lines.push(`  CAGR:                ${metrics.cagr.toFixed(2)}%`);
  lines.push('');
  lines.push('RISK METRICS');
  lines.push(`  Sharpe Ratio:        ${metrics.sharpeRatio.toFixed(2)}`);
  lines.push(`  Sortino Ratio:       ${metrics.sortinoRatio.toFixed(2)}`);
  lines.push(`  Max Drawdown:        ${metrics.maxDrawdown.toFixed(2)}%`);
  lines.push(`  Max DD Duration:     ${metrics.maxDrawdownDuration} bars`);
  lines.push(`  Calmar Ratio:        ${metrics.calmarRatio.toFixed(2)}`);
  lines.push(`  Volatility:          ${metrics.volatility.toFixed(2)}%`);
  lines.push('');
  lines.push('TRADE METRICS');
  lines.push(`  Total Trades:        ${metrics.totalTrades}`);
  lines.push(`  Win Rate:            ${metrics.winRate.toFixed(2)}%`);
  lines.push(`  Profit Factor:       ${metrics.profitFactor.toFixed(2)}`);
  lines.push(`  Expectancy:          ${metrics.expectancy.toFixed(2)}%`);
  lines.push(`  Avg Trade Return:    ${metrics.avgTradeReturn.toFixed(2)}%`);
  lines.push(`  Avg Win:             ${metrics.avgWinningTrade.toFixed(2)}%`);
  lines.push(`  Avg Loss:            ${metrics.avgLosingTrade.toFixed(2)}%`);
  lines.push(`  Largest Win:         ${metrics.largestWin.toFixed(2)}`);
  lines.push(`  Largest Loss:        ${metrics.largestLoss.toFixed(2)}`);
  lines.push(`  Avg Trade Duration:  ${metrics.avgTradeDuration.toFixed(2)} hours`);
  lines.push('');
  lines.push('FINANCIAL SUMMARY');
  lines.push(`  Gross Profit:        ${metrics.grossProfit.toFixed(2)}`);
  lines.push(`  Gross Loss:          ${metrics.grossLoss.toFixed(2)}`);
  lines.push(`  Net Profit:          ${metrics.netProfit.toFixed(2)}`);
  lines.push(`  Commission Paid:     ${metrics.commissionPaid.toFixed(2)}`);
  
  return lines.join('\n');
}

export function exportMetricsSummary(metrics: PerformanceMetrics, filename: string = 'metrics_summary.txt'): void {
  const content = generateMetricsSummary(metrics);
  downloadFile(content, filename, 'text/plain');
}

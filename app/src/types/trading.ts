// Trading Types and Interfaces - EXTENDED

export interface OHLCV {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Trade {
  id: number;
  entryDate: Date;
  exitDate?: Date;
  entryPrice: number;
  exitPrice?: number;
  type: 'LONG' | 'SHORT';
  size: number;
  pnl?: number;
  pnlPercent?: number;
  status: 'OPEN' | 'CLOSED';
  exitReason?: string;
}

export interface StrategyParams {
  name?: string;
  description?: string;
  // Mean Reversion / Bollinger Bands
  lookbackPeriod?: number;
  stdDevMultiplier?: number;
  // Momentum / MACD
  fastPeriod?: number;
  slowPeriod?: number;
  // VWAP
  vwapDeviation?: number;
  // RSI
  rsiOversold?: number;
  rsiOverbought?: number;
  // ATR
  atrMultiplier?: number;
  // Common Params
  stopLossPercent?: number;
  takeProfitPercent?: number;
  maxPositionSize?: number;
}

export interface BacktestResult {
  trades: Trade[];
  equityCurve: EquityPoint[];
  metrics: PerformanceMetrics;
  signals: Signal[];
  config: BacktestConfig;
}

export interface BacktestConfig {
  strategy: StrategyType;
  params: StrategyParams;
  initialCapital: number;
  commission: number;
  slippage: number;
  startDate: Date;
  endDate: Date;
}

export interface EquityPoint {
  date: Date;
  equity: number;
  drawdown: number;
  benchmark: number;
}

export interface Signal {
  date: Date;
  type: 'BUY' | 'SELL' | 'EXIT';
  price: number;
  reason: string;
}

export interface PerformanceMetrics {
  // Return Metrics
  totalReturn: number;
  annualizedReturn: number;
  cagr: number;
  
  // Risk Metrics
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  calmarRatio: number;
  volatility: number;
  
  // Trade Metrics
  winRate: number;
  profitFactor: number;
  expectancy: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgTradeReturn: number;
  avgWinningTrade: number;
  avgLosingTrade: number;
  largestWin: number;
  largestLoss: number;
  avgTradeDuration: number;
  
  // Additional Metrics
  grossProfit: number;
  grossLoss: number;
  netProfit: number;
  commissionPaid: number;
}

export type StrategyType = 
  | 'mean-reversion' 
  | 'momentum' 
  | 'vwap-bounce' 
  | 'rsi'
  | 'breakout'
  | 'ema-crossover'
  | 'stochastic'
  | 'atr-trailing'
  | 'combined';

export interface DatasetInfo {
  id: string;
  name: string;
  symbol: string;
  timeframe: string;
  startDate: Date;
  endDate: Date;
  totalBars: number;
  source: 'upload' | 'sample' | 'builtin';
}

export interface StrategyComparison {
  strategy: StrategyType;
  strategyName: string;
  metrics: PerformanceMetrics;
  trades: Trade[];
}

export interface IndicatorData {
  sma?: number[];
  ema?: number[];
  bb?: {
    upper: number[];
    middle: number[];
    lower: number[];
    bandwidth: number[];
    percentB: number[];
  };
  rsi?: number[];
  macd?: {
    macd: number[];
    signal: number[];
    histogram: number[];
  };
  vwap?: number[];
  stoch?: {
    k: number[];
    d: number[];
  };
  atr?: number[];
  adx?: {
    adx: number[];
    plusDI: number[];
    minusDI: number[];
  };
}

export interface ExportData {
  trades: Trade[];
  equityCurve: EquityPoint[];
  metrics: PerformanceMetrics;
  signals: Signal[];
  config: BacktestConfig;
  rawData: OHLCV[];
}

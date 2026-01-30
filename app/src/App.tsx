import { useState, useEffect, useCallback } from 'react';
import type { OHLCV, DatasetInfo, StrategyType, StrategyParams, BacktestResult, StrategyComparison as StrategyComparisonType } from '@/types/trading';
import { loadBuiltinDataset, processUploadedFile, generateSampleData, getDatasetInfo } from '@/utils/dataLoader';
import { runBacktest, compareStrategies } from '@/utils/backtest';
import { strategyInfos } from '@/utils/strategies';
import { 
  exportBacktestToJSON, 
  exportTradesToCSV, 
  exportEquityCurveToCSV,
  exportSignalsToCSV,
  exportTradeLog,
  exportStrategyConfig,
  exportAllToZip
} from '@/utils/exportUtils';
import { MetricsPanel } from '@/components/MetricsPanel';
import { EquityChart } from '@/components/EquityChart';
import { EnhancedPriceChart } from '@/components/EnhancedPriceChart';
import { DrawdownChart } from '@/components/DrawdownChart';
import { TradesTable } from '@/components/TradesTable';
import { StrategySelector } from '@/components/StrategySelector';
import { DatasetSelector } from '@/components/DatasetSelector';
import { StrategyComparison } from '@/components/StrategyComparison';
import { FileUpload } from '@/components/FileUpload';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, 
  TrendingUp, 
  Activity, 
  BarChart3, 
  Download,
  FileText,
  RefreshCw,
  Upload,
  FileSpreadsheet,
  Settings,
  Zap,
  Layers
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

// Default strategy parameters
const defaultParams: StrategyParams = {
  name: 'Default Strategy',
  description: 'Optimized parameters for Indian indices',
  lookbackPeriod: 20,
  stdDevMultiplier: 2,
  fastPeriod: 12,
  slowPeriod: 26,
  vwapDeviation: 0.5,
  rsiOversold: 30,
  rsiOverbought: 70,
  stopLossPercent: 2,
  takeProfitPercent: 3,
  maxPositionSize: 1
};

function App() {
  // State
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [data, setData] = useState<OHLCV[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>('mean-reversion');
  const [params, setParams] = useState<StrategyParams>(defaultParams);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [strategyComparisons, setStrategyComparisons] = useState<StrategyComparisonType[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showUpload, setShowUpload] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // Load initial datasets
  useEffect(() => {
    const loadInitialDatasets = async () => {
      setIsDataLoading(true);
      const loadedDatasets: DatasetInfo[] = [];
      
      try {
        // Load FINNIFTY
        const finnifty = await loadBuiltinDataset('FINNIFTY Minute');
        if (finnifty) {
          loadedDatasets.push(finnifty.info);
        }
      } catch (e) { console.warn('Failed to load FINNIFTY'); }
      
      try {
        // Load BANKNIFTY
        const banknifty = await loadBuiltinDataset('BANKNIFTY Daily');
        if (banknifty) {
          loadedDatasets.push(banknifty.info);
        }
      } catch (e) { console.warn('Failed to load BANKNIFTY'); }
      
      // Add sample data
      const sampleData = generateSampleData(1000);
      loadedDatasets.push(getDatasetInfo(sampleData, 'Sample Data', 'SAMPLE', '1m', 'sample'));
      
      setDatasets(loadedDatasets);
      
      if (loadedDatasets.length > 0) {
        await handleDatasetSelect(loadedDatasets[0].name);
      }
      
      setIsDataLoading(false);
    };
    
    loadInitialDatasets();
  }, []);

  // Handle dataset selection
  const handleDatasetSelect = async (name: string) => {
    setSelectedDataset(name);
    setIsDataLoading(true);
    
    try {
      const result = await loadBuiltinDataset(name);
      if (result) {
        setData(result.data);
        toast.success(`Loaded ${result.data.length.toLocaleString()} bars from ${name}`);
      }
    } catch (error) {
      toast.error(`Failed to load dataset: ${name}`);
    }
    
    setIsDataLoading(false);
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setIsDataLoading(true);
    
    try {
      const result = await processUploadedFile(file);
      if (result) {
        setData(result.data);
        setDatasets(prev => [...prev, result.info]);
        setSelectedDataset(result.info.name);
        toast.success(`Uploaded ${result.data.length.toLocaleString()} bars from ${file.name}`);
        setShowUpload(false);
      } else {
        toast.error('Failed to process file. Please check the format.');
      }
    } catch (error) {
      toast.error('Error processing file');
    }
    
    setIsDataLoading(false);
  };

  // Run backtest
  const handleRunBacktest = useCallback(() => {
    if (data.length === 0) {
      toast.error('No data loaded');
      return;
    }
    
    setIsLoading(true);
    setShowComparison(false);
    
    setTimeout(() => {
      try {
        const result = runBacktest(data, selectedStrategy, params, 100000, 0.0005, 0.001);
        setBacktestResult(result);
        toast.success(`Backtest completed: ${result.trades.length} trades`);
        setActiveTab('overview');
      } catch (error) {
        toast.error('Backtest failed: ' + (error as Error).message);
      }
      setIsLoading(false);
    }, 100);
  }, [data, selectedStrategy, params]);

  // Compare all strategies
  const handleCompareStrategies = useCallback(() => {
    if (data.length === 0) {
      toast.error('No data loaded');
      return;
    }
    
    setIsComparing(true);
    
    setTimeout(() => {
      try {
        const strategiesToCompare = strategyInfos.map(s => ({
          type: s.id,
          name: s.name,
          params: { ...defaultParams, ...s.defaultParams }
        }));
        
        const comparisons = compareStrategies(data, strategiesToCompare, 100000, 0.0005, 0.001);
        setStrategyComparisons(comparisons);
        setShowComparison(true);
        toast.success(`Compared ${comparisons.length} strategies`);
      } catch (error) {
        toast.error('Comparison failed: ' + (error as Error).message);
      }
      setIsComparing(false);
    }, 100);
  }, [data]);

  // Export functions
  const handleExportJSON = () => {
    if (!backtestResult) return;
    exportBacktestToJSON(
      backtestResult.trades,
      backtestResult.equityCurve,
      backtestResult.metrics,
      backtestResult.config,
      backtestResult.signals,
      `backtest_${selectedStrategy}_${new Date().toISOString().split('T')[0]}.json`
    );
    toast.success('Results exported to JSON');
  };

  const handleExportTradesCSV = () => {
    if (!backtestResult) return;
    exportTradesToCSV(backtestResult.trades, `trades_${selectedStrategy}.csv`);
    toast.success('Trades exported to CSV');
  };

  const handleExportEquityCSV = () => {
    if (!backtestResult) return;
    exportEquityCurveToCSV(backtestResult.equityCurve, `equity_${selectedStrategy}.csv`);
    toast.success('Equity curve exported to CSV');
  };

  const handleExportSignalsCSV = () => {
    if (!backtestResult) return;
    exportSignalsToCSV(backtestResult.signals, `signals_${selectedStrategy}.csv`);
    toast.success('Signals exported to CSV');
  };

  const handleExportTradeLog = () => {
    if (!backtestResult) return;
    exportTradeLog(backtestResult.trades, backtestResult.metrics, `trade_log_${selectedStrategy}.txt`);
    toast.success('Trade log exported');
  };

  const handleExportConfig = () => {
    exportStrategyConfig(
      selectedStrategy,
      params as Record<string, number>,
      {
        stopLossPercent: params.stopLossPercent || 2,
        takeProfitPercent: params.takeProfitPercent || 3,
        maxPositionSize: params.maxPositionSize || 1,
        maxDrawdownPercent: 15
      },
      {
        initialCapital: 100000,
        commission: 0.0005,
        slippage: 0.001
      },
      `config_${selectedStrategy}.json`
    );
    toast.success('Configuration exported');
  };

  const handleExportAll = () => {
    if (!backtestResult) return;
    exportAllToZip(
      backtestResult.trades,
      backtestResult.equityCurve,
      backtestResult.metrics,
      backtestResult.config,
      backtestResult.signals,
      data
    );
    toast.success('All files exported');
  };

  // Run initial backtest when data changes
  useEffect(() => {
    if (data.length > 0 && !backtestResult) {
      handleRunBacktest();
    }
  }, [data, backtestResult, handleRunBacktest]);

  return (
    <div className="min-h-screen gradient-bg">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">QuantFlow Pro</h1>
                <p className="text-xs text-muted-foreground">Algorithmic Trading Platform</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground mr-4">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>System Ready</span>
              </div>
              
              <Button variant="outline" size="sm" onClick={handleCompareStrategies} disabled={isComparing || data.length === 0}>
                <Layers className="w-4 h-4 mr-2" />
                {isComparing ? 'Comparing...' : 'Compare All'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dataset Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Dataset Selection
            </h2>
            <Button variant="outline" size="sm" onClick={() => setShowUpload(!showUpload)}>
              <Upload className="w-4 h-4 mr-2" />
              {showUpload ? 'Hide Upload' : 'Upload CSV'}
            </Button>
          </div>
          
          {showUpload && (
            <div className="mb-4 animate-fade-in">
              <FileUpload onFileUpload={handleFileUpload} />
            </div>
          )}
          
          {datasets.length > 0 && (
            <DatasetSelector
              datasets={datasets}
              selectedDataset={selectedDataset}
              onSelect={handleDatasetSelect}
            />
          )}
        </section>

        {/* Strategy Configuration */}
        <section className="mb-8">
          <StrategySelector
            selectedStrategy={selectedStrategy}
            onStrategyChange={setSelectedStrategy}
            params={params}
            onParamsChange={setParams}
            onRunBacktest={handleRunBacktest}
            isLoading={isLoading || isDataLoading}
          />
        </section>

        {/* Strategy Comparison */}
        {showComparison && strategyComparisons && (
          <section className="mb-8 animate-fade-in">
            <StrategyComparison 
              comparisons={strategyComparisons}
              onSelectStrategy={(strategy) => {
                setSelectedStrategy(strategy as StrategyType);
                handleRunBacktest();
              }}
            />
          </section>
        )}

        {/* Export Buttons */}
        {backtestResult && (
          <section className="mb-8">
            <div className="trading-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export Results
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleExportJSON}>
                  <FileText className="w-4 h-4 mr-2" />
                  JSON
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportTradesCSV}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Trades CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportEquityCSV}>
                  <LineChart className="w-4 h-4 mr-2" />
                  Equity CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportSignalsCSV}>
                  <Zap className="w-4 h-4 mr-2" />
                  Signals CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportTradeLog}>
                  <FileText className="w-4 h-4 mr-2" />
                  Trade Log
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportConfig}>
                  <Settings className="w-4 h-4 mr-2" />
                  Config
                </Button>
                <Button variant="default" size="sm" onClick={handleExportAll}>
                  <Download className="w-4 h-4 mr-2" />
                  Export All
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Results Tabs */}
        {backtestResult && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="overview" className="gap-2">
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="charts" className="gap-2">
                <LineChart className="w-4 h-4" />
                <span className="hidden sm:inline">Charts</span>
              </TabsTrigger>
              <TabsTrigger value="trades" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Trades</span>
              </TabsTrigger>
              <TabsTrigger value="analysis" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Analysis</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <MetricsPanel metrics={backtestResult.metrics} />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <EquityChart 
                  equityCurve={backtestResult.equityCurve} 
                  initialCapital={100000}
                />
                <DrawdownChart equityCurve={backtestResult.equityCurve} />
              </div>
            </TabsContent>

            {/* Charts Tab */}
            <TabsContent value="charts" className="space-y-6">
              <EnhancedPriceChart 
                data={data} 
                trades={backtestResult.trades}
                signals={backtestResult.signals}
              />
            </TabsContent>

            {/* Trades Tab */}
            <TabsContent value="trades" className="space-y-6">
              <TradesTable trades={backtestResult.trades} />
            </TabsContent>

            {/* Analysis Tab */}
            <TabsContent value="analysis" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Trade Distribution */}
                <div className="trading-card p-6">
                  <h3 className="text-lg font-semibold mb-4">Trade Distribution</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Winning Trades</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 transition-all"
                            style={{ 
                              width: `${backtestResult.metrics.totalTrades > 0 
                                ? (backtestResult.metrics.winningTrades / backtestResult.metrics.totalTrades) * 100 
                                : 0}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {backtestResult.metrics.winningTrades}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Losing Trades</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-red-500 transition-all"
                            style={{ 
                              width: `${backtestResult.metrics.totalTrades > 0 
                                ? (backtestResult.metrics.losingTrades / backtestResult.metrics.totalTrades) * 100 
                                : 0}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {backtestResult.metrics.losingTrades}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-border space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Average Win</span>
                      <span className="text-emerald-400 font-medium">
                        +{backtestResult.metrics.avgWinningTrade.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Average Loss</span>
                      <span className="text-red-400 font-medium">
                        {backtestResult.metrics.avgLosingTrade.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Largest Win</span>
                      <span className="text-emerald-400 font-medium">
                        +{backtestResult.metrics.largestWin.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Largest Loss</span>
                      <span className="text-red-400 font-medium">
                        {backtestResult.metrics.largestLoss.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Expectancy</span>
                      <span className={backtestResult.metrics.expectancy >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {backtestResult.metrics.expectancy >= 0 ? '+' : ''}{backtestResult.metrics.expectancy.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Performance Summary */}
                <div className="trading-card p-6">
                  <h3 className="text-lg font-semibold mb-4">Performance Summary</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">Calmar Ratio</div>
                        <div className={`text-xl font-bold ${
                          backtestResult.metrics.calmarRatio >= 1 ? 'text-emerald-400' : ''
                        }`}>
                          {backtestResult.metrics.calmarRatio.toFixed(2)}
                        </div>
                      </div>
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">Avg Trade</div>
                        <div className={`text-xl font-bold ${
                          backtestResult.metrics.avgTradeReturn >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {backtestResult.metrics.avgTradeReturn >= 0 ? '+' : ''}
                          {backtestResult.metrics.avgTradeReturn.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">Sortino Ratio</div>
                        <div className={`text-xl font-bold ${
                          backtestResult.metrics.sortinoRatio >= 1 ? 'text-emerald-400' : ''
                        }`}>
                          {backtestResult.metrics.sortinoRatio.toFixed(2)}
                        </div>
                      </div>
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">Volatility</div>
                        <div className="text-xl font-bold">
                          {backtestResult.metrics.volatility.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-secondary/30 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-2">Strategy Assessment</div>
                      <div className="text-sm">
                        {backtestResult.metrics.sharpeRatio >= 1.5 && backtestResult.metrics.maxDrawdown < 15 ? (
                          <span className="text-emerald-400">
                            Excellent strategy with strong risk-adjusted returns.
                          </span>
                        ) : backtestResult.metrics.sharpeRatio >= 1 ? (
                          <span className="text-blue-400">
                            Good strategy with acceptable risk profile.
                          </span>
                        ) : backtestResult.metrics.winRate >= 50 ? (
                          <span className="text-amber-400">
                            Moderate performance. Consider parameter optimization.
                          </span>
                        ) : (
                          <span className="text-red-400">
                            Strategy needs significant improvement. Review entry/exit logic.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State */}
        {!backtestResult && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
              <RefreshCw className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Ready to Backtest</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Select a dataset and strategy, then click "Run Backtest" to see results.
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground">Running backtest...</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              Built for BatraHedge Algo-Trading Hackathon 2026
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span>9 Trading Strategies</span>
              <span>React + TypeScript</span>
              <span>Tailwind CSS</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

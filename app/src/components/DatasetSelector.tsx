import type { DatasetInfo } from '@/types/trading';
import { Database, Calendar, BarChart3, Clock } from 'lucide-react';

interface DatasetSelectorProps {
  datasets: DatasetInfo[];
  selectedDataset: string;
  onSelect: (name: string) => void;
}

export function DatasetSelector({ datasets, selectedDataset, onSelect }: DatasetSelectorProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };
  
  return (
    <div className="trading-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Select Dataset</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {datasets.map((dataset) => (
          <button
            key={dataset.name}
            onClick={() => onSelect(dataset.name)}
            className={`p-4 rounded-lg border text-left transition-all ${
              selectedDataset === dataset.name
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50 hover:bg-secondary/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{dataset.symbol}</span>
              <span className="text-xs px-2 py-1 rounded bg-secondary text-muted-foreground">
                {dataset.timeframe}
              </span>
            </div>
            
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(dataset.startDate)} - {formatDate(dataset.endDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-3 h-3" />
                <span>{dataset.totalBars.toLocaleString()} bars</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3" />
                <span>{dataset.name}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

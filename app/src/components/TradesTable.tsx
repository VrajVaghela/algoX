import { useState } from 'react';
import type { Trade } from '@/types/trading';
import { ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TradesTableProps {
  trades: Trade[];
}

export function TradesTable({ trades }: TradesTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const totalPages = Math.ceil(trades.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTrades = trades.slice(startIndex, startIndex + itemsPerPage);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(value);
  };
  
  const formatDate = (date: Date) => {
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="trading-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold">Trade History</h3>
        <p className="text-sm text-muted-foreground">
          Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, trades.length)} of {trades.length} trades
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="trade-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Entry Date</th>
              <th>Entry Price</th>
              <th>Exit Date</th>
              <th>Exit Price</th>
              <th>P&L</th>
              <th>P&L %</th>
              <th>Exit Reason</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTrades.map((trade) => (
              <tr key={trade.id} className="animate-fade-in">
                <td className="font-mono text-xs">#{trade.id + 1}</td>
                <td>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                    trade.type === 'LONG' 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {trade.type === 'LONG' ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {trade.type}
                  </span>
                </td>
                <td className="text-xs">{formatDate(trade.entryDate)}</td>
                <td className="font-mono">{formatCurrency(trade.entryPrice)}</td>
                <td className="text-xs">
                  {trade.exitDate ? formatDate(trade.exitDate) : '-'}
                </td>
                <td className="font-mono">
                  {trade.exitPrice ? formatCurrency(trade.exitPrice) : '-'}
                </td>
                <td className={`font-mono font-medium ${
                  (trade.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {trade.pnl !== undefined 
                    ? `${(trade.pnl || 0) >= 0 ? '+' : ''}${formatCurrency(trade.pnl)}`
                    : '-'
                  }
                </td>
                <td className={`font-mono font-medium ${
                  (trade.pnlPercent || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {trade.pnlPercent !== undefined 
                    ? `${(trade.pnlPercent || 0) >= 0 ? '+' : ''}${trade.pnlPercent.toFixed(2)}%`
                    : '-'
                  }
                </td>
                <td className="text-xs text-muted-foreground max-w-[150px] truncate">
                  {trade.exitReason || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

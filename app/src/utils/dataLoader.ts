// Data Loading and Parsing Utilities - EXTENDED
import type { OHLCV, DatasetInfo } from '@/types/trading';

// ============================================
// CSV PARSING
// ============================================

export async function loadCSVData(url: string): Promise<OHLCV[]> {
  const response = await fetch(url);
  const text = await response.text();
  return parseCSV(text);
}

export function parseCSV(csvText: string): OHLCV[] {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  
  const data: OHLCV[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    
    // Parse date and time with multiple format support
    const parsed = parseDateTime(row);
    if (!parsed) continue;
    
    const { date, time } = parsed;
    const dateObj = new Date(`${date}T${time}`);
    
    if (isNaN(dateObj.getTime())) {
      continue;
    }
    
    // Parse OHLCV values
    const open = parseFloat(row['open'] || row['o'] || '');
    const high = parseFloat(row['high'] || row['h'] || '');
    const low = parseFloat(row['low'] || row['l'] || '');
    const close = parseFloat(row['close'] || row['c'] || '');
    const volume = parseFloat(row['volume'] || row['vol'] || row['v'] || '0');
    
    if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
      continue;
    }
    
    data.push({
      date: dateObj,
      open,
      high,
      low,
      close,
      volume: isNaN(volume) ? 0 : volume
    });
  }
  
  // Sort by date
  data.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  return data;
}

function parseDateTime(row: Record<string, string>): { date: string; time: string } | null {
  let dateStr = row['date'] || row['datetime'] || '';
  let timeStr = row['time'] || '00:00:00';
  
  // Handle Excel date format
  if (dateStr.startsWith('="')) {
    dateStr = dateStr.replace(/="|"/g, '');
  }
  
  // Parse different date formats
  if (dateStr.includes('T')) {
    // ISO format: 2021-08-01T10:00:00
    const parts = dateStr.split('T');
    return { date: parts[0], time: parts[1] || '00:00:00' };
  }
  
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return { date: dateStr, time: timeStr };
    } else if (parts[2].length === 4) {
      // DD-MM-YYYY
      return { date: `${parts[2]}-${parts[1]}-${parts[0]}`, time: timeStr };
    } else {
      // DD-MM-YY
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return { date: `${year}-${parts[1]}-${parts[0]}`, time: timeStr };
    }
  }
  
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts[0].length === 4) {
      // YYYY/MM/DD
      return { date: `${parts[0]}-${parts[1]}-${parts[2]}`, time: timeStr };
    } else {
      // MM/DD/YYYY or DD/MM/YYYY - assume MM/DD/YYYY
      return { date: `${parts[2]}-${parts[0]}-${parts[1]}`, time: timeStr };
    }
  }
  
  return null;
}

// ============================================
// DATASET INFO
// ============================================

export function getDatasetInfo(
  data: OHLCV[], 
  name: string, 
  symbol: string, 
  timeframe: string,
  source: 'upload' | 'sample' | 'builtin' = 'builtin'
): DatasetInfo {
  return {
    id: `${symbol}-${timeframe}-${Date.now()}`,
    name,
    symbol,
    timeframe,
    startDate: data[0]?.date || new Date(),
    endDate: data[data.length - 1]?.date || new Date(),
    totalBars: data.length,
    source
  };
}

// ============================================
// SAMPLE DATA GENERATION
// ============================================

export function generateSampleData(bars: number = 1000, seed: number = 12345): OHLCV[] {
  const data: OHLCV[] = [];
  let price = 17000;
  const startDate = new Date('2021-08-01T10:00:00');
  
  // Simple PRNG for reproducibility
  let rnd = seed;
  const random = () => {
    rnd = (rnd * 9301 + 49297) % 233280;
    return rnd / 233280;
  };
  
  // Generate trend component
  let trend = 0;
  
  for (let i = 0; i < bars; i++) {
    const date = new Date(startDate.getTime() + i * 60000);
    
    // Random walk with mean reversion and trend
    const change = (random() - 0.48) * 15;
    trend = trend * 0.95 + (random() - 0.5) * 2;
    price += change + trend;
    
    // Ensure price doesn't go negative
    price = Math.max(price, 1000);
    
    const volatility = 12 + Math.abs(trend) * 5;
    const open = price + (random() - 0.5) * volatility;
    const close = price + (random() - 0.5) * volatility;
    const high = Math.max(open, close) + random() * volatility * 0.5;
    const low = Math.min(open, close) - random() * volatility * 0.5;
    const volume = Math.floor(5000 + random() * 15000);
    
    data.push({
      date,
      open,
      high,
      low,
      close,
      volume
    });
    
    price = close;
  }
  
  return data;
}

// ============================================
// TIMEFRAME AGGREGATION
// ============================================

export function aggregateTimeframe(data: OHLCV[], minutes: number): OHLCV[] {
  if (minutes <= 1) return data;
  
  const result: OHLCV[] = [];
  let currentBar: OHLCV | null = null;
  let barCount = 0;
  
  for (const candle of data) {
    if (barCount === 0) {
      currentBar = { ...candle };
    } else if (currentBar) {
      currentBar.high = Math.max(currentBar.high, candle.high);
      currentBar.low = Math.min(currentBar.low, candle.low);
      currentBar.close = candle.close;
      currentBar.volume += candle.volume;
    }
    
    barCount++;
    
    if (barCount >= minutes) {
      if (currentBar) {
        result.push(currentBar);
      }
      currentBar = null;
      barCount = 0;
    }
  }
  
  if (currentBar && barCount > 0) {
    result.push(currentBar);
  }
  
  return result;
}

// ============================================
// FILE UPLOAD
// ============================================

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

export async function processUploadedFile(file: File): Promise<{ data: OHLCV[]; info: DatasetInfo } | null> {
  try {
    const content = await readFileAsText(file);
    const data = parseCSV(content);
    
    if (data.length === 0) {
      throw new Error('No valid data found in file');
    }
    
    // Infer symbol and timeframe from filename
    const filename = file.name.replace(/\.[^/.]+$/, '');
    const parts = filename.split(/[_-]/);
    const symbol = parts[0]?.toUpperCase() || 'UNKNOWN';
    const timeframe = inferTimeframe(data) || '1m';
    
    const info = getDatasetInfo(data, filename, symbol, timeframe, 'upload');
    
    return { data, info };
  } catch (error) {
    console.error('Error processing file:', error);
    return null;
  }
}

function inferTimeframe(data: OHLCV[]): string | null {
  if (data.length < 2) return null;
  
  const diff = data[1].date.getTime() - data[0].date.getTime();
  const minutes = diff / (1000 * 60);
  
  if (minutes < 2) return '1m';
  if (minutes < 6) return '5m';
  if (minutes < 16) return '15m';
  if (minutes < 31) return '30m';
  if (minutes < 61) return '1h';
  if (minutes < 241) return '4h';
  if (minutes < 1441) return '1d';
  return '1w';
}

// ============================================
// BUILTIN DATASETS
// ============================================

export const builtinDatasets = [
  { name: 'FINNIFTY Minute', file: '/data/FINNIFTY_part1.csv', symbol: 'FINNIFTY', timeframe: '1m' },
  { name: 'BANKNIFTY Daily', file: '/data/BANKNIFTY_active_futures.csv', symbol: 'BANKNIFTY', timeframe: '1d' },
  { name: 'Sample Data', file: null, symbol: 'SAMPLE', timeframe: '1m' }
];

export async function loadBuiltinDataset(name: string): Promise<{ data: OHLCV[]; info: DatasetInfo } | null> {
  const dataset = builtinDatasets.find(d => d.name === name);
  if (!dataset) return null;
  
  if (dataset.file) {
    const data = await loadCSVData(dataset.file);
    const info = getDatasetInfo(data, dataset.name, dataset.symbol, dataset.timeframe, 'builtin');
    return { data, info };
  } else {
    // Sample data
    const data = generateSampleData(1000);
    const info = getDatasetInfo(data, dataset.name, dataset.symbol, dataset.timeframe, 'sample');
    return { data, info };
  }
}

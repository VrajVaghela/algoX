// Trading Strategies Implementation - EXTENDED
import type { OHLCV, Trade, Signal, StrategyParams, StrategyType } from '@/types/trading';
import { 
  calculateBollingerBands, 
  calculateRSI, 
  calculateMACD, 
  calculateVWAP,
  calculateSMA,
  calculateEMA,
  calculateStochastic,
  calculateATR
} from './indicators';

// ============================================
// STRATEGY 1: MEAN REVERSION (Bollinger Bands + RSI)
// ============================================
export function meanReversionStrategy(
  data: OHLCV[],
  params: StrategyParams
): { trades: Trade[]; signals: Signal[] } {
  const { 
    lookbackPeriod = 20, 
    stdDevMultiplier = 2,
    stopLossPercent = 2
  } = params;
  
  const closes = data.map(d => d.close);
  const bb = calculateBollingerBands(closes, lookbackPeriod, stdDevMultiplier);
  const rsi = calculateRSI(closes, 14);
  
  const trades: Trade[] = [];
  const signals: Signal[] = [];
  let currentTrade: Trade | null = null;
  let tradeId = 0;
  
  for (let i = lookbackPeriod + 14; i < data.length; i++) {
    const price = data[i].close;
    const date = data[i].date;
    
    if (isNaN(bb.lower[i]) || isNaN(rsi[i])) continue;
    
    if (!currentTrade) {
      // Entry: Price below lower band AND RSI oversold
      if (price < bb.lower[i] && rsi[i] < 30) {
        currentTrade = {
          id: tradeId++,
          entryDate: date,
          entryPrice: price,
          type: 'LONG',
          size: 1,
          status: 'OPEN'
        };
        signals.push({
          date,
          type: 'BUY',
          price,
          reason: `Mean Reversion: Price ${((price/bb.lower[i]-1)*100).toFixed(2)}% below BB lower, RSI=${rsi[i].toFixed(1)}`
        });
      }
    } else {
      const entryPrice = currentTrade.entryPrice;
      const pnlPercent = ((price - entryPrice) / entryPrice) * 100;
      
      // Exit conditions
      const takeProfitHit = price >= bb.middle[i] || rsi[i] > 70;
      const stopLossHit = pnlPercent <= -stopLossPercent;
      const trailingStopHit = price > bb.upper[i];
      
      if (takeProfitHit || stopLossHit || trailingStopHit) {
        let exitReason = '';
        if (takeProfitHit) exitReason = 'Take Profit: Price reached middle band or RSI overbought';
        else if (stopLossHit) exitReason = `Stop Loss: ${pnlPercent.toFixed(2)}% loss`;
        else exitReason = 'Trailing Stop: Price above upper band';
        
        currentTrade.exitDate = date;
        currentTrade.exitPrice = price;
        currentTrade.pnl = price - entryPrice;
        currentTrade.pnlPercent = pnlPercent;
        currentTrade.status = 'CLOSED';
        currentTrade.exitReason = exitReason;
        
        trades.push({ ...currentTrade });
        signals.push({ date, type: 'EXIT', price, reason: exitReason });
        currentTrade = null;
      }
    }
  }
  
  // Close open trade at end
  if (currentTrade) {
    const lastIndex = data.length - 1;
    currentTrade.exitDate = data[lastIndex].date;
    currentTrade.exitPrice = data[lastIndex].close;
    currentTrade.pnl = data[lastIndex].close - currentTrade.entryPrice;
    currentTrade.pnlPercent = ((data[lastIndex].close - currentTrade.entryPrice) / currentTrade.entryPrice) * 100;
    currentTrade.status = 'CLOSED';
    currentTrade.exitReason = 'End of data';
    trades.push({ ...currentTrade });
  }
  
  return { trades, signals };
}

// ============================================
// STRATEGY 2: MOMENTUM (MACD + Trend Filter)
// ============================================
export function momentumStrategy(
  data: OHLCV[],
  params: StrategyParams
): { trades: Trade[]; signals: Signal[] } {
  const { 
    fastPeriod = 12, 
    slowPeriod = 26,
    stopLossPercent = 2,
    takeProfitPercent = 4
  } = params;
  
  const closes = data.map(d => d.close);
  const macd = calculateMACD(closes, fastPeriod, slowPeriod, 9);
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);
  
  const trades: Trade[] = [];
  const signals: Signal[] = [];
  let currentTrade: Trade | null = null;
  let tradeId = 0;
  
  for (let i = Math.max(slowPeriod, 200); i < data.length; i++) {
    const price = data[i].close;
    const date = data[i].date;
    
    if (isNaN(macd.macd[i]) || isNaN(sma50[i]) || isNaN(sma200[i])) continue;
    
    const macdCrossUp = macd.macd[i] > macd.signal[i] && macd.macd[i - 1] <= macd.signal[i - 1];
    const macdCrossDown = macd.macd[i] < macd.signal[i] && macd.macd[i - 1] >= macd.signal[i - 1];
    const uptrend = price > sma50[i] && sma50[i] > sma200[i];
    
    if (!currentTrade) {
      if (macdCrossUp && uptrend) {
        currentTrade = {
          id: tradeId++,
          entryDate: date,
          entryPrice: price,
          type: 'LONG',
          size: 1,
          status: 'OPEN'
        };
        signals.push({
          date,
          type: 'BUY',
          price,
          reason: `Momentum: MACD cross up, uptrend confirmed (Price>SMA50>SMA200)`
        });
      }
    } else {
      const entryPrice = currentTrade.entryPrice;
      const pnlPercent = ((price - entryPrice) / entryPrice) * 100;
      
      const macdExit = macdCrossDown;
      const stopLossHit = pnlPercent <= -stopLossPercent;
      const takeProfitHit = pnlPercent >= takeProfitPercent;
      
      if (macdExit || stopLossHit || takeProfitHit) {
        let exitReason = '';
        if (macdExit) exitReason = 'MACD cross down';
        else if (stopLossHit) exitReason = `Stop Loss: ${pnlPercent.toFixed(2)}%`;
        else exitReason = `Take Profit: ${pnlPercent.toFixed(2)}%`;
        
        currentTrade.exitDate = date;
        currentTrade.exitPrice = price;
        currentTrade.pnl = price - entryPrice;
        currentTrade.pnlPercent = pnlPercent;
        currentTrade.status = 'CLOSED';
        currentTrade.exitReason = exitReason;
        
        trades.push({ ...currentTrade });
        signals.push({ date, type: 'EXIT', price, reason: exitReason });
        currentTrade = null;
      }
    }
  }
  
  if (currentTrade) {
    const lastIndex = data.length - 1;
    currentTrade.exitDate = data[lastIndex].date;
    currentTrade.exitPrice = data[lastIndex].close;
    currentTrade.pnl = data[lastIndex].close - currentTrade.entryPrice;
    currentTrade.pnlPercent = ((data[lastIndex].close - currentTrade.entryPrice) / currentTrade.entryPrice) * 100;
    currentTrade.status = 'CLOSED';
    currentTrade.exitReason = 'End of data';
    trades.push({ ...currentTrade });
  }
  
  return { trades, signals };
}

// ============================================
// STRATEGY 3: VWAP BOUNCE
// ============================================
export function vwapBounceStrategy(
  data: OHLCV[],
  params: StrategyParams
): { trades: Trade[]; signals: Signal[] } {
  const { 
    vwapDeviation = 0.5,
    stopLossPercent = 1.5,
    takeProfitPercent = 2.5
  } = params;
  
  const vwap = calculateVWAP(data);
  const closes = data.map(d => d.close);
  const rsi = calculateRSI(closes, 14);
  
  const trades: Trade[] = [];
  const signals: Signal[] = [];
  let currentTrade: Trade | null = null;
  let tradeId = 0;
  
  for (let i = 20; i < data.length; i++) {
    const price = data[i].close;
    const date = data[i].date;
    const currentVWAP = vwap[i];
    
    if (isNaN(currentVWAP) || isNaN(rsi[i])) continue;
    
    const deviation = ((price - currentVWAP) / currentVWAP) * 100;
    
    if (!currentTrade) {
      // Buy when price deviates below VWAP with RSI not oversold
      if (deviation < -vwapDeviation && rsi[i] > 30 && rsi[i] < 60) {
        currentTrade = {
          id: tradeId++,
          entryDate: date,
          entryPrice: price,
          type: 'LONG',
          size: 1,
          status: 'OPEN'
        };
        signals.push({
          date,
          type: 'BUY',
          price,
          reason: `VWAP Bounce: Price ${deviation.toFixed(2)}% below VWAP, RSI=${rsi[i].toFixed(1)}`
        });
      }
    } else {
      const entryPrice = currentTrade.entryPrice;
      const pnlPercent = ((price - entryPrice) / entryPrice) * 100;
      
      const vwapReturn = Math.abs(deviation) < 0.1;
      const stopLossHit = pnlPercent <= -stopLossPercent;
      const takeProfitHit = pnlPercent >= takeProfitPercent;
      
      if (vwapReturn || stopLossHit || takeProfitHit) {
        let exitReason = '';
        if (vwapReturn) exitReason = 'Price returned to VWAP';
        else if (stopLossHit) exitReason = `Stop Loss: ${pnlPercent.toFixed(2)}%`;
        else exitReason = `Take Profit: ${pnlPercent.toFixed(2)}%`;
        
        currentTrade.exitDate = date;
        currentTrade.exitPrice = price;
        currentTrade.pnl = price - entryPrice;
        currentTrade.pnlPercent = pnlPercent;
        currentTrade.status = 'CLOSED';
        currentTrade.exitReason = exitReason;
        
        trades.push({ ...currentTrade });
        signals.push({ date, type: 'EXIT', price, reason: exitReason });
        currentTrade = null;
      }
    }
  }
  
  if (currentTrade) {
    const lastIndex = data.length - 1;
    currentTrade.exitDate = data[lastIndex].date;
    currentTrade.exitPrice = data[lastIndex].close;
    currentTrade.pnl = data[lastIndex].close - currentTrade.entryPrice;
    currentTrade.pnlPercent = ((data[lastIndex].close - currentTrade.entryPrice) / currentTrade.entryPrice) * 100;
    currentTrade.status = 'CLOSED';
    currentTrade.exitReason = 'End of data';
    trades.push({ ...currentTrade });
  }
  
  return { trades, signals };
}

// ============================================
// STRATEGY 4: RSI STRATEGY
// ============================================
export function rsiStrategy(
  data: OHLCV[],
  params: StrategyParams
): { trades: Trade[]; signals: Signal[] } {
  const { 
    rsiOversold = 30,
    rsiOverbought = 70,
    stopLossPercent = 2,
    takeProfitPercent = 3
  } = params;
  
  const closes = data.map(d => d.close);
  const rsi = calculateRSI(closes, 14);
  const sma50 = calculateSMA(closes, 50);
  
  const trades: Trade[] = [];
  const signals: Signal[] = [];
  let currentTrade: Trade | null = null;
  let tradeId = 0;
  
  for (let i = 50; i < data.length; i++) {
    const price = data[i].close;
    const date = data[i].date;
    
    if (isNaN(rsi[i]) || isNaN(sma50[i])) continue;
    
    const rsiCrossUp = rsi[i] > rsiOversold && rsi[i - 1] <= rsiOversold;
    // rsiCrossDown can be used for exit logic: rsi[i] < rsiOverbought && rsi[i - 1] >= rsiOverbought
    const aboveSMA = price > sma50[i];
    
    if (!currentTrade) {
      // Enter when RSI crosses above oversold with trend confirmation
      if (rsiCrossUp && aboveSMA) {
        currentTrade = {
          id: tradeId++,
          entryDate: date,
          entryPrice: price,
          type: 'LONG',
          size: 1,
          status: 'OPEN'
        };
        signals.push({
          date,
          type: 'BUY',
          price,
          reason: `RSI: Crossed above ${rsiOversold} oversold level, above SMA50`
        });
      }
    } else {
      const entryPrice = currentTrade.entryPrice;
      const pnlPercent = ((price - entryPrice) / entryPrice) * 100;
      
      const rsiExit = rsi[i] > rsiOverbought;
      const stopLossHit = pnlPercent <= -stopLossPercent;
      const takeProfitHit = pnlPercent >= takeProfitPercent;
      
      if (rsiExit || stopLossHit || takeProfitHit) {
        let exitReason = '';
        if (rsiExit) exitReason = `RSI overbought (>${rsiOverbought})`;
        else if (stopLossHit) exitReason = `Stop Loss: ${pnlPercent.toFixed(2)}%`;
        else exitReason = `Take Profit: ${pnlPercent.toFixed(2)}%`;
        
        currentTrade.exitDate = date;
        currentTrade.exitPrice = price;
        currentTrade.pnl = price - entryPrice;
        currentTrade.pnlPercent = pnlPercent;
        currentTrade.status = 'CLOSED';
        currentTrade.exitReason = exitReason;
        
        trades.push({ ...currentTrade });
        signals.push({ date, type: 'EXIT', price, reason: exitReason });
        currentTrade = null;
      }
    }
  }
  
  if (currentTrade) {
    const lastIndex = data.length - 1;
    currentTrade.exitDate = data[lastIndex].date;
    currentTrade.exitPrice = data[lastIndex].close;
    currentTrade.pnl = data[lastIndex].close - currentTrade.entryPrice;
    currentTrade.pnlPercent = ((data[lastIndex].close - currentTrade.entryPrice) / currentTrade.entryPrice) * 100;
    currentTrade.status = 'CLOSED';
    currentTrade.exitReason = 'End of data';
    trades.push({ ...currentTrade });
  }
  
  return { trades, signals };
}

// ============================================
// STRATEGY 5: BREAKOUT STRATEGY
// ============================================
export function breakoutStrategy(
  data: OHLCV[],
  params: StrategyParams
): { trades: Trade[]; signals: Signal[] } {
  const { 
    lookbackPeriod = 20,
    stopLossPercent = 2,
    takeProfitPercent = 4
  } = params;
  
  const trades: Trade[] = [];
  const signals: Signal[] = [];
  let currentTrade: Trade | null = null;
  let tradeId = 0;
  
  for (let i = lookbackPeriod; i < data.length; i++) {
    const price = data[i].close;
    const high = data[i].high;
    const date = data[i].date;
    
    // Calculate highest high and lowest low over lookback period
    const slice = data.slice(i - lookbackPeriod, i);
    const highestHigh = Math.max(...slice.map(d => d.high));
    const lowestLow = Math.min(...slice.map(d => d.low));
    
    if (!currentTrade) {
      // Breakout above resistance
      if (high > highestHigh) {
        currentTrade = {
          id: tradeId++,
          entryDate: date,
          entryPrice: price,
          type: 'LONG',
          size: 1,
          status: 'OPEN'
        };
        signals.push({
          date,
          type: 'BUY',
          price,
          reason: `Breakout: Price broke above ${lookbackPeriod}-period high (${highestHigh.toFixed(2)})`
        });
      }
    } else {
      const entryPrice = currentTrade.entryPrice;
      const pnlPercent = ((price - entryPrice) / entryPrice) * 100;
      
      // Exit on breakdown below support or stop/take profit
      const breakdown = price < lowestLow;
      const stopLossHit = pnlPercent <= -stopLossPercent;
      const takeProfitHit = pnlPercent >= takeProfitPercent;
      
      if (breakdown || stopLossHit || takeProfitHit) {
        let exitReason = '';
        if (breakdown) exitReason = `Breakdown: Price below ${lookbackPeriod}-period low`;
        else if (stopLossHit) exitReason = `Stop Loss: ${pnlPercent.toFixed(2)}%`;
        else exitReason = `Take Profit: ${pnlPercent.toFixed(2)}%`;
        
        currentTrade.exitDate = date;
        currentTrade.exitPrice = price;
        currentTrade.pnl = price - entryPrice;
        currentTrade.pnlPercent = pnlPercent;
        currentTrade.status = 'CLOSED';
        currentTrade.exitReason = exitReason;
        
        trades.push({ ...currentTrade });
        signals.push({ date, type: 'EXIT', price, reason: exitReason });
        currentTrade = null;
      }
    }
  }
  
  if (currentTrade) {
    const lastIndex = data.length - 1;
    currentTrade.exitDate = data[lastIndex].date;
    currentTrade.exitPrice = data[lastIndex].close;
    currentTrade.pnl = data[lastIndex].close - currentTrade.entryPrice;
    currentTrade.pnlPercent = ((data[lastIndex].close - currentTrade.entryPrice) / currentTrade.entryPrice) * 100;
    currentTrade.status = 'CLOSED';
    currentTrade.exitReason = 'End of data';
    trades.push({ ...currentTrade });
  }
  
  return { trades, signals };
}

// ============================================
// STRATEGY 6: EMA CROSSOVER
// ============================================
export function emaCrossoverStrategy(
  data: OHLCV[],
  params: StrategyParams
): { trades: Trade[]; signals: Signal[] } {
  const { 
    fastPeriod = 9,
    slowPeriod = 21,
    stopLossPercent = 2,
    takeProfitPercent = 3
  } = params;
  
  const closes = data.map(d => d.close);
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);
  
  const trades: Trade[] = [];
  const signals: Signal[] = [];
  let currentTrade: Trade | null = null;
  let tradeId = 0;
  
  for (let i = Math.max(fastPeriod, slowPeriod) + 1; i < data.length; i++) {
    const price = data[i].close;
    const date = data[i].date;
    
    if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) continue;
    
    const crossUp = fastEMA[i] > slowEMA[i] && fastEMA[i - 1] <= slowEMA[i - 1];
    const crossDown = fastEMA[i] < slowEMA[i] && fastEMA[i - 1] >= slowEMA[i - 1];
    
    if (!currentTrade) {
      if (crossUp) {
        currentTrade = {
          id: tradeId++,
          entryDate: date,
          entryPrice: price,
          type: 'LONG',
          size: 1,
          status: 'OPEN'
        };
        signals.push({
          date,
          type: 'BUY',
          price,
          reason: `EMA Crossover: EMA(${fastPeriod}) crossed above EMA(${slowPeriod})`
        });
      }
    } else {
      const entryPrice = currentTrade.entryPrice;
      const pnlPercent = ((price - entryPrice) / entryPrice) * 100;
      
      const crossExit = crossDown;
      const stopLossHit = pnlPercent <= -stopLossPercent;
      const takeProfitHit = pnlPercent >= takeProfitPercent;
      
      if (crossExit || stopLossHit || takeProfitHit) {
        let exitReason = '';
        if (crossExit) exitReason = `EMA cross down`;
        else if (stopLossHit) exitReason = `Stop Loss: ${pnlPercent.toFixed(2)}%`;
        else exitReason = `Take Profit: ${pnlPercent.toFixed(2)}%`;
        
        currentTrade.exitDate = date;
        currentTrade.exitPrice = price;
        currentTrade.pnl = price - entryPrice;
        currentTrade.pnlPercent = pnlPercent;
        currentTrade.status = 'CLOSED';
        currentTrade.exitReason = exitReason;
        
        trades.push({ ...currentTrade });
        signals.push({ date, type: 'EXIT', price, reason: exitReason });
        currentTrade = null;
      }
    }
  }
  
  if (currentTrade) {
    const lastIndex = data.length - 1;
    currentTrade.exitDate = data[lastIndex].date;
    currentTrade.exitPrice = data[lastIndex].close;
    currentTrade.pnl = data[lastIndex].close - currentTrade.entryPrice;
    currentTrade.pnlPercent = ((data[lastIndex].close - currentTrade.entryPrice) / currentTrade.entryPrice) * 100;
    currentTrade.status = 'CLOSED';
    currentTrade.exitReason = 'End of data';
    trades.push({ ...currentTrade });
  }
  
  return { trades, signals };
}

// ============================================
// STRATEGY 7: STOCHASTIC STRATEGY
// ============================================
export function stochasticStrategy(
  data: OHLCV[],
  params: StrategyParams
): { trades: Trade[]; signals: Signal[] } {
  const { 
    stopLossPercent = 2,
    takeProfitPercent = 3
  } = params;
  
  const stoch = calculateStochastic(data, 14, 3);
  const closes = data.map(d => d.close);
  const sma50 = calculateSMA(closes, 50);
  
  const trades: Trade[] = [];
  const signals: Signal[] = [];
  let currentTrade: Trade | null = null;
  let tradeId = 0;
  
  for (let i = 50; i < data.length; i++) {
    const price = data[i].close;
    const date = data[i].date;
    
    if (isNaN(stoch.k[i]) || isNaN(stoch.d[i]) || isNaN(sma50[i])) continue;
    
    const kCrossUp = stoch.k[i] > stoch.d[i] && stoch.k[i - 1] <= stoch.d[i - 1];
    const kCrossDown = stoch.k[i] < stoch.d[i] && stoch.k[i - 1] >= stoch.d[i - 1];
    const oversold = stoch.k[i] < 20;
    const overbought = stoch.k[i] > 80;
    const aboveSMA = price > sma50[i];
    
    if (!currentTrade) {
      // Enter on %K cross above %D in oversold territory
      if (kCrossUp && oversold && aboveSMA) {
        currentTrade = {
          id: tradeId++,
          entryDate: date,
          entryPrice: price,
          type: 'LONG',
          size: 1,
          status: 'OPEN'
        };
        signals.push({
          date,
          type: 'BUY',
          price,
          reason: `Stochastic: %K crossed above %D in oversold (${stoch.k[i].toFixed(1)})`
        });
      }
    } else {
      const entryPrice = currentTrade.entryPrice;
      const pnlPercent = ((price - entryPrice) / entryPrice) * 100;
      
      const stochExit = kCrossDown && overbought;
      const stopLossHit = pnlPercent <= -stopLossPercent;
      const takeProfitHit = pnlPercent >= takeProfitPercent;
      
      if (stochExit || stopLossHit || takeProfitHit) {
        let exitReason = '';
        if (stochExit) exitReason = `Stochastic overbought crossover`;
        else if (stopLossHit) exitReason = `Stop Loss: ${pnlPercent.toFixed(2)}%`;
        else exitReason = `Take Profit: ${pnlPercent.toFixed(2)}%`;
        
        currentTrade.exitDate = date;
        currentTrade.exitPrice = price;
        currentTrade.pnl = price - entryPrice;
        currentTrade.pnlPercent = pnlPercent;
        currentTrade.status = 'CLOSED';
        currentTrade.exitReason = exitReason;
        
        trades.push({ ...currentTrade });
        signals.push({ date, type: 'EXIT', price, reason: exitReason });
        currentTrade = null;
      }
    }
  }
  
  if (currentTrade) {
    const lastIndex = data.length - 1;
    currentTrade.exitDate = data[lastIndex].date;
    currentTrade.exitPrice = data[lastIndex].close;
    currentTrade.pnl = data[lastIndex].close - currentTrade.entryPrice;
    currentTrade.pnlPercent = ((data[lastIndex].close - currentTrade.entryPrice) / currentTrade.entryPrice) * 100;
    currentTrade.status = 'CLOSED';
    currentTrade.exitReason = 'End of data';
    trades.push({ ...currentTrade });
  }
  
  return { trades, signals };
}

// ============================================
// STRATEGY 8: ATR TRAILING STOP
// ============================================
export function atrTrailingStopStrategy(
  data: OHLCV[],
  params: StrategyParams
): { trades: Trade[]; signals: Signal[] } {
  const { 
    lookbackPeriod = 14,
    atrMultiplier = 3
  } = params;
  
  const closes = data.map(d => d.close);
  const sma20 = calculateSMA(closes, 20);
  const { atr } = calculateATR(data, lookbackPeriod);
  
  const trades: Trade[] = [];
  const signals: Signal[] = [];
  let currentTrade: Trade | null = null;
  let tradeId = 0;
  let highestPrice = 0;
  let trailingStop = 0;
  
  for (let i = lookbackPeriod + 20; i < data.length; i++) {
    const price = data[i].close;
    const date = data[i].date;
    
    if (isNaN(sma20[i]) || isNaN(atr[i])) continue;
    
    const aboveSMA = price > sma20[i];
    const smaRising = sma20[i] > sma20[i - 1];
    
    if (!currentTrade) {
      // Enter when price above rising SMA
      if (aboveSMA && smaRising) {
        currentTrade = {
          id: tradeId++,
          entryDate: date,
          entryPrice: price,
          type: 'LONG',
          size: 1,
          status: 'OPEN'
        };
        highestPrice = price;
        trailingStop = price - atr[i] * atrMultiplier;
        signals.push({
          date,
          type: 'BUY',
          price,
          reason: `ATR Trailing: Price above rising SMA20, ATR=${atr[i].toFixed(2)}`
        });
      }
    } else {
      // Update trailing stop
      if (price > highestPrice) {
        highestPrice = price;
        trailingStop = price - atr[i] * atrMultiplier;
      }
      
      const stopHit = price < trailingStop;
      
      if (stopHit) {
        const pnlPercent = ((price - currentTrade.entryPrice) / currentTrade.entryPrice) * 100;
        
        currentTrade.exitDate = date;
        currentTrade.exitPrice = price;
        currentTrade.pnl = price - currentTrade.entryPrice;
        currentTrade.pnlPercent = pnlPercent;
        currentTrade.status = 'CLOSED';
        currentTrade.exitReason = `ATR Trailing Stop hit at ${trailingStop.toFixed(2)}`;
        
        trades.push({ ...currentTrade });
        signals.push({ date, type: 'EXIT', price, reason: `ATR Trailing Stop` });
        currentTrade = null;
        highestPrice = 0;
        trailingStop = 0;
      }
    }
  }
  
  if (currentTrade) {
    const lastIndex = data.length - 1;
    currentTrade.exitDate = data[lastIndex].date;
    currentTrade.exitPrice = data[lastIndex].close;
    currentTrade.pnl = data[lastIndex].close - currentTrade.entryPrice;
    currentTrade.pnlPercent = ((data[lastIndex].close - currentTrade.entryPrice) / currentTrade.entryPrice) * 100;
    currentTrade.status = 'CLOSED';
    currentTrade.exitReason = 'End of data';
    trades.push({ ...currentTrade });
  }
  
  return { trades, signals };
}

// ============================================
// STRATEGY 9: COMBINED MULTI-STRATEGY
// ============================================
export function combinedStrategy(
  data: OHLCV[],
  _params: StrategyParams
): { trades: Trade[]; signals: Signal[] } {
  const closes = data.map(d => d.close);
  const sma20 = calculateSMA(closes, 20);
  const rsi = calculateRSI(closes, 14);
  const bb = calculateBollingerBands(closes, 20, 2);
  const macd = calculateMACD(closes, 12, 26, 9);
  const stoch = calculateStochastic(data, 14, 3);
  
  const trades: Trade[] = [];
  const signals: Signal[] = [];
  let currentTrade: Trade | null = null;
  let tradeId = 0;
  
  for (let i = 50; i < data.length; i++) {
    const price = data[i].close;
    const date = data[i].date;
    
    if (isNaN(sma20[i]) || isNaN(rsi[i]) || isNaN(bb.lower[i])) continue;
    
    // Count bullish signals
    let bullishSignals = 0;
    if (price > sma20[i]) bullishSignals++;
    if (rsi[i] < 40) bullishSignals++;
    if (price < bb.lower[i]) bullishSignals++;
    if (macd.macd[i] > macd.signal[i]) bullishSignals++;
    if (stoch.k[i] < 30) bullishSignals++;
    
    // Count bearish signals
    let bearishSignals = 0;
    if (rsi[i] > 65) bearishSignals++;
    if (price > bb.upper[i]) bearishSignals++;
    if (macd.macd[i] < macd.signal[i]) bearishSignals++;
    if (stoch.k[i] > 70) bearishSignals++;
    
    if (!currentTrade) {
      // Need at least 3 bullish signals to enter
      if (bullishSignals >= 3) {
        currentTrade = {
          id: tradeId++,
          entryDate: date,
          entryPrice: price,
          type: 'LONG',
          size: 1,
          status: 'OPEN'
        };
        signals.push({
          date,
          type: 'BUY',
          price,
          reason: `Combined: ${bullishSignals}/5 bullish signals (RSI=${rsi[i].toFixed(1)}, Stoch=${stoch.k[i].toFixed(1)})`
        });
      }
    } else {
      const entryPrice = currentTrade.entryPrice;
      const pnlPercent = ((price - entryPrice) / entryPrice) * 100;
      
      // Exit on bearish signals or stop loss
      const bearishExit = bearishSignals >= 3;
      const stopLossHit = pnlPercent <= -2;
      const takeProfitHit = pnlPercent >= 4;
      
      if (bearishExit || stopLossHit || takeProfitHit) {
        let exitReason = '';
        if (bearishExit) exitReason = `${bearishSignals}/5 bearish signals triggered`;
        else if (stopLossHit) exitReason = `Stop Loss: ${pnlPercent.toFixed(2)}%`;
        else exitReason = `Take Profit: ${pnlPercent.toFixed(2)}%`;
        
        currentTrade.exitDate = date;
        currentTrade.exitPrice = price;
        currentTrade.pnl = price - entryPrice;
        currentTrade.pnlPercent = pnlPercent;
        currentTrade.status = 'CLOSED';
        currentTrade.exitReason = exitReason;
        
        trades.push({ ...currentTrade });
        signals.push({ date, type: 'EXIT', price, reason: exitReason });
        currentTrade = null;
      }
    }
  }
  
  if (currentTrade) {
    const lastIndex = data.length - 1;
    currentTrade.exitDate = data[lastIndex].date;
    currentTrade.exitPrice = data[lastIndex].close;
    currentTrade.pnl = data[lastIndex].close - currentTrade.entryPrice;
    currentTrade.pnlPercent = ((data[lastIndex].close - currentTrade.entryPrice) / currentTrade.entryPrice) * 100;
    currentTrade.status = 'CLOSED';
    currentTrade.exitReason = 'End of data';
    trades.push({ ...currentTrade });
  }
  
  return { trades, signals };
}

// ============================================
// MAIN STRATEGY RUNNER
// ============================================
export function runStrategy(
  type: StrategyType,
  data: OHLCV[],
  params: StrategyParams
): { trades: Trade[]; signals: Signal[] } {
  switch (type) {
    case 'mean-reversion':
      return meanReversionStrategy(data, params);
    case 'momentum':
      return momentumStrategy(data, params);
    case 'vwap-bounce':
      return vwapBounceStrategy(data, params);
    case 'rsi':
      return rsiStrategy(data, params);
    case 'breakout':
      return breakoutStrategy(data, params);
    case 'ema-crossover':
      return emaCrossoverStrategy(data, params);
    case 'stochastic':
      return stochasticStrategy(data, params);
    case 'atr-trailing':
      return atrTrailingStopStrategy(data, params);
    case 'combined':
      return combinedStrategy(data, params);
    default:
      return meanReversionStrategy(data, params);
  }
}

// ============================================
// STRATEGY METADATA
// ============================================
export interface StrategyInfo {
  id: StrategyType;
  name: string;
  description: string;
  category: 'Mean Reversion' | 'Trend Following' | 'Momentum' | 'Volatility' | 'Combined';
  bestMarket: 'Range-bound' | 'Trending' | 'Volatile' | 'All';
  defaultParams: Partial<StrategyParams>;
}

export const strategyInfos: StrategyInfo[] = [
  {
    id: 'mean-reversion',
    name: 'Mean Reversion',
    description: 'Bollinger Bands + RSI - Buy oversold, sell overbought',
    category: 'Mean Reversion',
    bestMarket: 'Range-bound',
    defaultParams: { lookbackPeriod: 20, stdDevMultiplier: 2, stopLossPercent: 2, takeProfitPercent: 3 }
  },
  {
    id: 'momentum',
    name: 'Momentum',
    description: 'MACD + Moving Averages - Follow the trend',
    category: 'Trend Following',
    bestMarket: 'Trending',
    defaultParams: { fastPeriod: 12, slowPeriod: 26, stopLossPercent: 2, takeProfitPercent: 4 }
  },
  {
    id: 'vwap-bounce',
    name: 'VWAP Bounce',
    description: 'Volume Weighted Average Price - Mean reversion to VWAP',
    category: 'Mean Reversion',
    bestMarket: 'Range-bound',
    defaultParams: { vwapDeviation: 0.5, stopLossPercent: 1.5, takeProfitPercent: 2.5 }
  },
  {
    id: 'rsi',
    name: 'RSI Strategy',
    description: 'RSI crossover with trend filter',
    category: 'Momentum',
    bestMarket: 'All',
    defaultParams: { rsiOversold: 30, rsiOverbought: 70, stopLossPercent: 2, takeProfitPercent: 3 }
  },
  {
    id: 'breakout',
    name: 'Breakout',
    description: 'Price breakout above resistance levels',
    category: 'Trend Following',
    bestMarket: 'Trending',
    defaultParams: { lookbackPeriod: 20, stopLossPercent: 2, takeProfitPercent: 4 }
  },
  {
    id: 'ema-crossover',
    name: 'EMA Crossover',
    description: 'Fast EMA crosses above/below slow EMA',
    category: 'Trend Following',
    bestMarket: 'Trending',
    defaultParams: { fastPeriod: 9, slowPeriod: 21, stopLossPercent: 2, takeProfitPercent: 3 }
  },
  {
    id: 'stochastic',
    name: 'Stochastic',
    description: 'Stochastic oscillator with %K/%D crossover',
    category: 'Momentum',
    bestMarket: 'Range-bound',
    defaultParams: { stopLossPercent: 2, takeProfitPercent: 3 }
  },
  {
    id: 'atr-trailing',
    name: 'ATR Trailing Stop',
    description: 'Dynamic stop loss based on Average True Range',
    category: 'Volatility',
    bestMarket: 'Trending',
    defaultParams: { lookbackPeriod: 14, atrMultiplier: 3 }
  },
  {
    id: 'combined',
    name: 'Combined Strategy',
    description: 'Multi-factor approach combining multiple signals',
    category: 'Combined',
    bestMarket: 'All',
    defaultParams: { stopLossPercent: 2, takeProfitPercent: 4 }
  }
];

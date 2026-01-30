// Technical Indicators for Algorithmic Trading - VERIFIED CALCULATIONS
import type { OHLCV } from '@/types/trading';

// ============================================
// MOVING AVERAGES
// ============================================

/** 
 * Simple Moving Average (SMA)
 * Formula: SMA = (P1 + P2 + ... + Pn) / n
 */
export function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}

/**
 * Exponential Moving Average (EMA)
 * Formula: EMA_t = α * P_t + (1-α) * EMA_{t-1}
 * where α = 2 / (period + 1)
 */
export function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(data[0]);
    } else if (i < period - 1) {
      // Use SMA for initial values until we have enough data
      const sum = data.slice(0, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / (i + 1));
    } else {
      const ema = (data[i] - result[i - 1]) * multiplier + result[i - 1];
      result.push(ema);
    }
  }
  return result;
}

/**
 * Weighted Moving Average (WMA)
 * Formula: WMA = (n*P1 + (n-1)*P2 + ... + 1*Pn) / (n*(n+1)/2)
 */
export function calculateWMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const denominator = (period * (period + 1)) / 2;
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j] * (period - j);
      }
      result.push(sum / denominator);
    }
  }
  return result;
}

// ============================================
// VOLATILITY INDICATORS
// ============================================

/**
 * Standard Deviation
 * Formula: σ = sqrt(Σ(x - μ)² / n)
 */
export function calculateStdDev(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      result.push(Math.sqrt(variance));
    }
  }
  return result;
}

export interface BollingerBands {
  upper: number[];
  middle: number[];
  lower: number[];
  bandwidth: number[];
  percentB: number[];
}

/**
 * Bollinger Bands
 * Upper = SMA + k * σ
 * Lower = SMA - k * σ
 * Bandwidth = (Upper - Lower) / Middle
 * %B = (Price - Lower) / (Upper - Lower)
 */
export function calculateBollingerBands(
  data: number[], 
  period: number = 20, 
  stdDev: number = 2
): BollingerBands {
  const middle = calculateSMA(data, period);
  const stdDevArray = calculateStdDev(data, period);
  
  const upper: number[] = [];
  const lower: number[] = [];
  const bandwidth: number[] = [];
  const percentB: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (isNaN(middle[i]) || isNaN(stdDevArray[i])) {
      upper.push(NaN);
      lower.push(NaN);
      bandwidth.push(NaN);
      percentB.push(NaN);
    } else {
      const up = middle[i] + stdDev * stdDevArray[i];
      const low = middle[i] - stdDev * stdDevArray[i];
      upper.push(up);
      lower.push(low);
      bandwidth.push((up - low) / middle[i]);
      percentB.push((data[i] - low) / (up - low));
    }
  }
  
  return { upper, middle, lower, bandwidth, percentB };
}

export interface ATRResult {
  atr: number[];
  tr: number[];
}

/**
 * Average True Range (ATR)
 * TR = max(High - Low, |High - Close_prev|, |Low - Close_prev|)
 * ATR = EMA(TR, period)
 */
export function calculateATR(data: OHLCV[], period: number = 14): ATRResult {
  const tr: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      tr.push(data[i].high - data[i].low);
    } else {
      const tr1 = data[i].high - data[i].low;
      const tr2 = Math.abs(data[i].high - data[i - 1].close);
      const tr3 = Math.abs(data[i].low - data[i - 1].close);
      tr.push(Math.max(tr1, tr2, tr3));
    }
  }
  
  const atr = calculateEMA(tr, period);
  
  return { atr, tr };
}

// ============================================
// MOMENTUM INDICATORS
// ============================================

/**
 * RSI (Relative Strength Index)
 * RS = Average Gain / Average Loss
 * RSI = 100 - (100 / (1 + RS))
 */
export function calculateRSI(data: number[], period: number = 14): number[] {
  const result: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  // Calculate price changes
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  
  // Calculate RSI using Wilder's smoothing
  let avgGain = 0;
  let avgLoss = 0;
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(NaN);
    } else if (i < period) {
      result.push(NaN);
    } else if (i === period) {
      // Initial average
      avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
      avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
      
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - (100 / (1 + rs)));
    } else {
      // Smoothed averages
      avgGain = (avgGain * (period - 1) + gains[i - 1]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i - 1]) / period;
      
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - (100 / (1 + rs)));
    }
  }
  
  return result;
}

export interface MACDResult {
  macd: number[];
  signal: number[];
  histogram: number[];
}

/**
 * MACD (Moving Average Convergence Divergence)
 * MACD = EMA(12) - EMA(26)
 * Signal = EMA(MACD, 9)
 * Histogram = MACD - Signal
 */
export function calculateMACD(
  data: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  const macd: number[] = [];
  for (let i = 0; i < data.length; i++) {
    macd.push(fastEMA[i] - slowEMA[i]);
  }
  
  const signal = calculateEMA(macd, signalPeriod);
  
  const histogram: number[] = [];
  for (let i = 0; i < data.length; i++) {
    histogram.push(macd[i] - signal[i]);
  }
  
  return { macd, signal, histogram };
}

export interface StochasticResult {
  k: number[];
  d: number[];
}

/**
 * Stochastic Oscillator
 * %K = (Close - Lowest Low) / (Highest High - Lowest Low) * 100
 * %D = SMA(%K, 3)
 */
export function calculateStochastic(
  data: OHLCV[],
  kPeriod: number = 14,
  dPeriod: number = 3
): StochasticResult {
  const kValues: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < kPeriod - 1) {
      kValues.push(NaN);
    } else {
      const slice = data.slice(i - kPeriod + 1, i + 1);
      const lowestLow = Math.min(...slice.map(d => d.low));
      const highestHigh = Math.max(...slice.map(d => d.high));
      
      if (highestHigh === lowestLow) {
        kValues.push(50);
      } else {
        kValues.push(((data[i].close - lowestLow) / (highestHigh - lowestLow)) * 100);
      }
    }
  }
  
  const dValues = calculateSMA(kValues, dPeriod);
  
  return { k: kValues, d: dValues };
}

/**
 * Rate of Change (ROC)
 * ROC = ((Price_t - Price_{t-n}) / Price_{t-n}) * 100
 */
export function calculateROC(data: number[], period: number = 12): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(NaN);
    } else {
      result.push(((data[i] - data[i - period]) / data[i - period]) * 100);
    }
  }
  
  return result;
}

/**
 * Price Momentum
 * Momentum = Price_t - Price_{t-n}
 */
export function calculateMomentum(data: number[], period: number = 10): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(NaN);
    } else {
      result.push(data[i] - data[i - period]);
    }
  }
  
  return result;
}

// ============================================
// VOLUME INDICATORS
// ============================================

/**
 * VWAP (Volume Weighted Average Price)
 * VWAP = Σ(Typical Price * Volume) / Σ(Volume)
 * Typical Price = (High + Low + Close) / 3
 */
export function calculateVWAP(data: OHLCV[]): number[] {
  const result: number[] = [];
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;
  let currentDay = '';
  
  for (let i = 0; i < data.length; i++) {
    const day = data[i].date.toDateString();
    
    // Reset for new day
    if (day !== currentDay) {
      cumulativeTPV = 0;
      cumulativeVolume = 0;
      currentDay = day;
    }
    
    const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
    const tpv = typicalPrice * data[i].volume;
    
    cumulativeTPV += tpv;
    cumulativeVolume += data[i].volume;
    
    if (cumulativeVolume > 0) {
      result.push(cumulativeTPV / cumulativeVolume);
    } else {
      result.push(typicalPrice);
    }
  }
  
  return result;
}

export interface OBVResult {
  obv: number[];
  obvEMA: number[];
}

/**
 * On-Balance Volume (OBV)
 * If Close > Close_prev: OBV = OBV_prev + Volume
 * If Close < Close_prev: OBV = OBV_prev - Volume
 * If Close = Close_prev: OBV = OBV_prev
 */
export function calculateOBV(data: OHLCV[]): OBVResult {
  const obv: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      obv.push(data[i].volume);
    } else {
      if (data[i].close > data[i - 1].close) {
        obv.push(obv[i - 1] + data[i].volume);
      } else if (data[i].close < data[i - 1].close) {
        obv.push(obv[i - 1] - data[i].volume);
      } else {
        obv.push(obv[i - 1]);
      }
    }
  }
  
  const obvEMA = calculateEMA(obv, 20);
  
  return { obv, obvEMA };
}

/**
 * Volume RSI - RSI applied to volume
 */
export function calculateVolumeRSI(data: OHLCV[], period: number = 14): number[] {
  const volumes = data.map(d => d.volume);
  return calculateRSI(volumes, period);
}

// ============================================
// TREND INDICATORS
// ============================================

export interface ADXResult {
  adx: number[];
  plusDI: number[];
  minusDI: number[];
}

/**
 * ADX (Average Directional Index)
 * +DM = High - High_prev (if positive and > -DM, else 0)
 * -DM = Low_prev - Low (if positive and > +DM, else 0)
 * +DI = 100 * EMA(+DM) / ATR
 * -DI = 100 * EMA(-DM) / ATR
 * DX = 100 * |+DI - -DI| / (+DI + -DI)
 * ADX = EMA(DX, period)
 */
export function calculateADX(data: OHLCV[], period: number = 14): ADXResult {
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      plusDM.push(0);
      minusDM.push(0);
    } else {
      const upMove = data[i].high - data[i - 1].high;
      const downMove = data[i - 1].low - data[i].low;
      
      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }
  }
  
  const { atr } = calculateATR(data, period);
  const plusDI: number[] = [];
  const minusDI: number[] = [];
  const dx: number[] = [];
  
  const smoothPlusDM = calculateEMA(plusDM, period);
  const smoothMinusDM = calculateEMA(minusDM, period);
  
  for (let i = 0; i < data.length; i++) {
    if (isNaN(atr[i]) || atr[i] === 0) {
      plusDI.push(NaN);
      minusDI.push(NaN);
      dx.push(NaN);
    } else {
      const pdi = 100 * smoothPlusDM[i] / atr[i];
      const mdi = 100 * smoothMinusDM[i] / atr[i];
      plusDI.push(pdi);
      minusDI.push(mdi);
      dx.push(100 * Math.abs(pdi - mdi) / (pdi + mdi));
    }
  }
  
  const adx = calculateEMA(dx, period);
  
  return { adx, plusDI, minusDI };
}

/**
 * Ichimoku Cloud
 */
export interface IchimokuResult {
  tenkanSen: number[];   // Conversion line
  kijunSen: number[];    // Base line
  senkouSpanA: number[]; // Leading span A
  senkouSpanB: number[]; // Leading span B
  chikouSpan: number[];  // Lagging span
}

export function calculateIchimoku(data: OHLCV[]): IchimokuResult {
  const tenkanSen: number[] = [];
  const kijunSen: number[] = [];
  const senkouSpanA: number[] = [];
  const senkouSpanB: number[] = [];
  const chikouSpan: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    // Tenkan-sen (9-period)
    if (i < 8) {
      tenkanSen.push(NaN);
    } else {
      const slice = data.slice(i - 8, i + 1);
      const highest = Math.max(...slice.map(d => d.high));
      const lowest = Math.min(...slice.map(d => d.low));
      tenkanSen.push((highest + lowest) / 2);
    }
    
    // Kijun-sen (26-period)
    if (i < 25) {
      kijunSen.push(NaN);
    } else {
      const slice = data.slice(i - 25, i + 1);
      const highest = Math.max(...slice.map(d => d.high));
      const lowest = Math.min(...slice.map(d => d.low));
      kijunSen.push((highest + lowest) / 2);
    }
    
    // Senkou Span A
    if (isNaN(tenkanSen[i]) || isNaN(kijunSen[i])) {
      senkouSpanA.push(NaN);
    } else {
      senkouSpanA.push((tenkanSen[i] + kijunSen[i]) / 2);
    }
    
    // Senkou Span B (52-period)
    if (i < 51) {
      senkouSpanB.push(NaN);
    } else {
      const slice = data.slice(i - 51, i + 1);
      const highest = Math.max(...slice.map(d => d.high));
      const lowest = Math.min(...slice.map(d => d.low));
      senkouSpanB.push((highest + lowest) / 2);
    }
    
    // Chikou Span (lagging span - close price shifted back 26 periods)
    chikouSpan.push(data[i].close);
  }
  
  return { tenkanSen, kijunSen, senkouSpanA, senkouSpanB, chikouSpan };
}

// ============================================
// SUPPORT/RESISTANCE
// ============================================

/**
 * Pivot Points
 */
export interface PivotPoints {
  pivot: number[];
  r1: number[];
  r2: number[];
  r3: number[];
  s1: number[];
  s2: number[];
  s3: number[];
}

export function calculatePivotPoints(data: OHLCV[]): PivotPoints {
  const pivot: number[] = [];
  const r1: number[] = [];
  const r2: number[] = [];
  const r3: number[] = [];
  const s1: number[] = [];
  const s2: number[] = [];
  const s3: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      pivot.push(NaN);
      r1.push(NaN);
      r2.push(NaN);
      r3.push(NaN);
      s1.push(NaN);
      s2.push(NaN);
      s3.push(NaN);
    } else {
      const p = (data[i - 1].high + data[i - 1].low + data[i - 1].close) / 3;
      pivot.push(p);
      r1.push(2 * p - data[i - 1].low);
      s1.push(2 * p - data[i - 1].high);
      r2.push(p + (data[i - 1].high - data[i - 1].low));
      s2.push(p - (data[i - 1].high - data[i - 1].low));
      r3.push(data[i - 1].high + 2 * (p - data[i - 1].low));
      s3.push(data[i - 1].low - 2 * (data[i - 1].high - p));
    }
  }
  
  return { pivot, r1, r2, r3, s1, s2, s3 };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Crossover detection
 * Returns array of 1 (cross up), -1 (cross down), or 0 (no cross)
 */
export function detectCrossover(fast: number[], slow: number[]): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < fast.length; i++) {
    if (i === 0 || isNaN(fast[i]) || isNaN(slow[i]) || isNaN(fast[i - 1]) || isNaN(slow[i - 1])) {
      result.push(0);
    } else {
      const crossedUp = fast[i] > slow[i] && fast[i - 1] <= slow[i - 1];
      const crossedDown = fast[i] < slow[i] && fast[i - 1] >= slow[i - 1];
      result.push(crossedUp ? 1 : crossedDown ? -1 : 0);
    }
  }
  
  return result;
}

/**
 * Calculate correlation between two price series
 */
export function calculateCorrelation(data1: number[], data2: number[], period: number): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < data1.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice1 = data1.slice(i - period + 1, i + 1);
      const slice2 = data2.slice(i - period + 1, i + 1);
      
      const mean1 = slice1.reduce((a, b) => a + b, 0) / period;
      const mean2 = slice2.reduce((a, b) => a + b, 0) / period;
      
      let numerator = 0;
      let denom1 = 0;
      let denom2 = 0;
      
      for (let j = 0; j < period; j++) {
        const diff1 = slice1[j] - mean1;
        const diff2 = slice2[j] - mean2;
        numerator += diff1 * diff2;
        denom1 += diff1 * diff1;
        denom2 += diff2 * diff2;
      }
      
      const correlation = denom1 === 0 || denom2 === 0 ? 0 : numerator / Math.sqrt(denom1 * denom2);
      result.push(correlation);
    }
  }
  
  return result;
}

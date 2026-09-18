/**
 * Standard price-action swing detection: a point is a local peak/trough
 * if it's the max/min within a window of neighbors on both sides. This
 * is a real, well-known technique (not invented for this project) but
 * is genuinely sensitive to the window size choice — a different window
 * can read the same series as a different structure. That sensitivity
 * is real and worth knowing, not hidden.
 */
export interface SwingPoint {
  index: number;
  value: number;
  type: 'peak' | 'trough';
}

export const findSwingPoints = (series: number[], window = 5): SwingPoint[] => {
  const points: SwingPoint[] = [];
  for (let i = window; i < series.length - window; i++) {
    const neighborhood = series.slice(i - window, i + window + 1);
    const center = series[i];
    if (center === Math.max(...neighborhood)) {
      points.push({ index: i, value: center, type: 'peak' });
    } else if (center === Math.min(...neighborhood)) {
      points.push({ index: i, value: center, type: 'trough' });
    }
  }
  return points;
};

export type PriceStructure = 'uptrend' | 'downtrend' | 'mixed' | 'insufficient-data';

/** Uptrend = higher high AND higher low vs. the prior swing; downtrend = lower high AND lower low; anything else is "mixed" (deliberately not forced into a bullish/bearish bucket). */
export const classifyPriceStructure = (series: number[], window = 5): PriceStructure => {
  const points = findSwingPoints(series, window);
  const peaks = points.filter(p => p.type === 'peak');
  const troughs = points.filter(p => p.type === 'trough');
  if (peaks.length < 2 || troughs.length < 2) return 'insufficient-data';

  const higherHigh = peaks[peaks.length - 1].value > peaks[peaks.length - 2].value;
  const higherLow = troughs[troughs.length - 1].value > troughs[troughs.length - 2].value;

  if (higherHigh && higherLow) return 'uptrend';
  if (!higherHigh && !higherLow) return 'downtrend';
  return 'mixed';
};

export type Direction = 'up' | 'down' | 'flat';

/** Compares the latest value to N observations back — a simple, transparent momentum read, not a smoothed/fitted trend line. */
export const recentDirection = (series: number[], lookback = 20): Direction => {
  if (series.length <= lookback) return 'flat';
  const latest = series[series.length - 1];
  const past = series[series.length - 1 - lookback];
  if (latest > past) return 'up';
  if (latest < past) return 'down';
  return 'flat';
};

/**
 * Where a current reading sits versus its own recent history — the only
 * kind of claim this project makes. Never "gold will go up/down": just
 * "this is unusually high/low compared to the last N years," which is a
 * plain descriptive fact, not a prediction.
 */
export const percentileRank = (value: number, historicalValues: number[]): number => {
  if (historicalValues.length === 0) return 50;
  const countBelow = historicalValues.filter(v => v < value).length;
  return Math.round((countBelow / historicalValues.length) * 100);
};

export type PercentileLabel = 'very low' | 'low' | 'typical' | 'high' | 'very high';

/** Plain-language bucket for a percentile — used instead of showing a bare number to someone who isn't fluent in finance jargon. */
export const percentileLabel = (percentile: number): PercentileLabel => {
  if (percentile <= 10) return 'very low';
  if (percentile <= 30) return 'low';
  if (percentile <= 70) return 'typical';
  if (percentile <= 90) return 'high';
  return 'very high';
};

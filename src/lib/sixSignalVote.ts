import type { Direction, PriceStructure } from './priceTrend';

/**
 * The 6-signal voting rule as specified by the user, not something this
 * project invented or validated:
 *   Real Yield down / DXY down / 10Y Yield down / Breakeven up /
 *   CFTC not crowded / Gold price HH-HL  -> each counts as one bullish vote
 * 4-6 bullish -> Long bias, 2-3 -> Neutral, 0-1 -> Short bias.
 *
 * This has NOT been backtested against real historical data as of this
 * writing. It is tracked here so it CAN be backtested later (see
 * scripts/log-daily-snapshot.ts) — this module must never be wired into
 * anything that places a real trade before that validation happens.
 */
export type SignalVerdict = 'bullish' | 'bearish' | 'neutral';

export interface SixSignalInputs {
  realYieldDirection: Direction;
  dollarDirection: Direction;
  nominalYieldDirection: Direction;
  breakevenDirection: Direction;
  /** true = positioning at/above the "crowded" threshold (bearish); see CFTC_CROWDED_PERCENTILE. */
  cftcCrowded: boolean;
  goldStructure: PriceStructure;
}

export interface SixSignalBreakdownEntry {
  signal: string;
  verdict: SignalVerdict;
}

export interface SixSignalResult {
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  bias: 'long' | 'neutral' | 'short';
  breakdown: SixSignalBreakdownEntry[];
}

// A threshold this project chose to define "crowded," not a
// statistically validated cutoff — disclosed here and in the UI rather
// than presented as an authoritative line.
export const CFTC_CROWDED_PERCENTILE = 80;

const directionVerdict = (direction: Direction, upIsBullish: boolean): SignalVerdict => {
  if (direction === 'flat') return 'neutral';
  const isUp = direction === 'up';
  return isUp === upIsBullish ? 'bullish' : 'bearish';
};

export const calculateSixSignalVote = (inputs: SixSignalInputs): SixSignalResult => {
  const breakdown: SixSignalBreakdownEntry[] = [
    { signal: 'Real Yield', verdict: directionVerdict(inputs.realYieldDirection, false) },
    { signal: 'DXY', verdict: directionVerdict(inputs.dollarDirection, false) },
    { signal: '10Y Yield', verdict: directionVerdict(inputs.nominalYieldDirection, false) },
    { signal: 'Breakeven', verdict: directionVerdict(inputs.breakevenDirection, true) },
    { signal: 'CFTC', verdict: inputs.cftcCrowded ? 'bearish' : 'bullish' },
    {
      signal: 'Gold price',
      verdict: inputs.goldStructure === 'uptrend' ? 'bullish' : inputs.goldStructure === 'downtrend' ? 'bearish' : 'neutral'
    }
  ];

  const bullishCount = breakdown.filter(b => b.verdict === 'bullish').length;
  const bearishCount = breakdown.filter(b => b.verdict === 'bearish').length;
  const neutralCount = breakdown.filter(b => b.verdict === 'neutral').length;

  const bias: SixSignalResult['bias'] = bullishCount >= 4 ? 'long' : bullishCount >= 2 ? 'neutral' : 'short';

  return { bullishCount, bearishCount, neutralCount, bias, breakdown };
};

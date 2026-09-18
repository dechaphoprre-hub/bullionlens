import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { getIndicators } from '../api/indicators.js';
import { percentileRank } from '../src/lib/percentile.js';
import { calculateCompositeLean } from '../src/lib/compositeLean.js';
import { recentDirection, classifyPriceStructure } from '../src/lib/priceTrend.js';
import { calculateSixSignalVote, CFTC_CROWDED_PERCENTILE } from '../src/lib/sixSignalVote.js';
import { INDICATOR_META, type IndicatorId } from '../src/lib/indicatorMeta.js';

/**
 * Runs daily (see .github/workflows/log-snapshot.yml) and appends one
 * record to public/history.json: the composite score, the 6-signal vote
 * (bias + full breakdown), and the real gold price on that date.
 *
 * This is the only way the 6-signal voting rule can ever be honestly
 * evaluated — by accumulating real daily readings and later checking
 * whether "4-6 bullish" actually preceded gold going up more often than
 * chance would predict. Nobody should trust that rule (or wire it into
 * anything that trades real money) before this history is long enough
 * to check, and the check has actually been run.
 */
const HISTORY_PATH = 'public/history.json';
const COMPOSITE_DRIVER_IDS: IndicatorId[] = [
  'real-yield-10y',
  'dollar-index-broad',
  'breakeven-inflation-10y',
  'gold-speculative-positioning',
  'geopolitical-risk-index'
];

interface HistoryRecord {
  date: string; // YYYY-MM-DD, the day this snapshot was logged
  compositeScore: number | null;
  sixSignal: {
    bias: 'long' | 'neutral' | 'short';
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
    breakdown: Array<{ signal: string; verdict: string }>;
  } | null;
  goldPriceUsd: number | null;
  goldPriceDate: string | null;
  indicators: Record<string, { value: number | null; date: string | null; percentile: number | null }>;
}

async function main() {
  const result = await getIndicators();
  const byId = new Map(result.indicators.map(i => [i.id, i]));

  const indicatorSnapshot: HistoryRecord['indicators'] = {};
  for (const id of Object.keys(INDICATOR_META) as IndicatorId[]) {
    const ind = byId.get(id);
    indicatorSnapshot[id] = {
      value: ind?.latestValue ?? null,
      date: ind?.latestDate ?? null,
      percentile: ind && ind.latestValue !== null ? percentileRank(ind.latestValue, ind.historicalValues) : null
    };
  }

  const compositeInputs = COMPOSITE_DRIVER_IDS
    .map(id => byId.get(id))
    .filter((i): i is NonNullable<typeof i> => !!i && i.latestValue !== null)
    .map(i => ({ percentile: percentileRank(i.latestValue!, i.historicalValues), higherLeansGoldBullish: INDICATOR_META[i.id as IndicatorId].higherLeansGoldBullish }));
  const compositeScore = compositeInputs.length ? calculateCompositeLean(compositeInputs) : null;

  const realYield = byId.get('real-yield-10y');
  const dollar = byId.get('dollar-index-broad');
  const nominalYield = byId.get('nominal-yield-10y');
  const breakeven = byId.get('breakeven-inflation-10y');
  const cftc = byId.get('gold-speculative-positioning');
  const goldPrice = byId.get('gold-price-usd');

  let sixSignal: HistoryRecord['sixSignal'] = null;
  if (realYield && dollar && nominalYield && breakeven && cftc && goldPrice && cftc.latestValue !== null) {
    const vote = calculateSixSignalVote({
      realYieldDirection: recentDirection(realYield.historicalValues),
      dollarDirection: recentDirection(dollar.historicalValues),
      nominalYieldDirection: recentDirection(nominalYield.historicalValues),
      breakevenDirection: recentDirection(breakeven.historicalValues),
      cftcCrowded: percentileRank(cftc.latestValue, cftc.historicalValues) >= CFTC_CROWDED_PERCENTILE,
      goldStructure: classifyPriceStructure(goldPrice.historicalValues)
    });
    sixSignal = { bias: vote.bias, bullishCount: vote.bullishCount, bearishCount: vote.bearishCount, neutralCount: vote.neutralCount, breakdown: vote.breakdown };
  }

  const today = new Date().toISOString().slice(0, 10);
  const record: HistoryRecord = {
    date: today,
    compositeScore,
    sixSignal,
    goldPriceUsd: goldPrice?.latestValue ?? null,
    goldPriceDate: goldPrice?.latestDate ?? null,
    indicators: indicatorSnapshot
  };

  mkdirSync('public', { recursive: true });
  const existing: HistoryRecord[] = existsSync(HISTORY_PATH) ? JSON.parse(readFileSync(HISTORY_PATH, 'utf-8')) : [];
  // Re-running the same day (e.g. a manual workflow_dispatch retry)
  // replaces that day's record instead of appending a duplicate.
  const withoutToday = existing.filter(r => r.date !== today);
  const updated = [...withoutToday, record].sort((a, b) => a.date.localeCompare(b.date));

  writeFileSync(HISTORY_PATH, JSON.stringify(updated, null, 2));
  console.log(`[PASS] Logged ${today}: composite=${compositeScore}, sixSignal=${sixSignal?.bias ?? 'n/a'} (${sixSignal?.bullishCount ?? '?'}/6), gold=$${goldPrice?.latestValue}. History now has ${updated.length} days.`);

  if (result.errors.length) {
    console.log(`[WARN] ${result.errors.length} source(s) failed and were logged as null: ${result.errors.map(e => e.id).join(', ')}`);
  }
}

main().catch(error => {
  console.error('[FAILED]', error instanceof Error ? error.message : error);
  process.exit(1);
});

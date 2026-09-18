import { percentileRank, percentileLabel } from '../lib/percentile.ts';
import { INDICATOR_META } from '../lib/indicatorMeta.ts';
import { calculateCompositeLean, compositeLeanLabel } from '../lib/compositeLean.ts';
import { findSwingPoints, classifyPriceStructure, recentDirection } from '../lib/priceTrend.ts';
import { calculateSixSignalVote } from '../lib/sixSignalVote.ts';

console.log('====================================================');
console.log('   BULLIONLENS - SANITY TEST   ');
console.log('====================================================\n');

let passed = 0;
let total = 0;

function assert(condition: boolean, name: string, detail?: string) {
  total++;
  if (condition) {
    console.log(`[PASS] ${name}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name}${detail ? ` -> ${detail}` : ''}`);
  }
}

assert(percentileRank(5, [1, 2, 3, 4, 6, 7, 8, 9, 10]) === 44, 'percentileRank: 5 is above 4 of 9 historical values (44%)');
assert(percentileRank(0, [1, 2, 3]) === 0, 'percentileRank: value below all history is 0th percentile');
assert(percentileRank(100, [1, 2, 3]) === 100, 'percentileRank: value above all history is 100th percentile');
assert(percentileRank(5, []) === 50, 'percentileRank: no history defaults to neutral midpoint, not a guess');

assert(percentileLabel(5) === 'very low', 'percentileLabel: 5th percentile is "very low"');
assert(percentileLabel(50) === 'typical', 'percentileLabel: 50th percentile is "typical"');
assert(percentileLabel(95) === 'very high', 'percentileLabel: 95th percentile is "very high"');
assert(percentileLabel(10) === 'very low', 'percentileLabel: boundary at 10 is inclusive on the low side');
assert(percentileLabel(90) === 'high', 'percentileLabel: boundary at 90 is inclusive on the high side (not very high)');

const expectedIndicatorIds = [
  'real-yield-10y',
  'dollar-index-broad',
  'breakeven-inflation-10y',
  'gold-speculative-positioning',
  'geopolitical-risk-index',
  'nominal-yield-10y',
  'gold-price-usd'
];
for (const id of expectedIndicatorIds) {
  assert(id in INDICATOR_META, `INDICATOR_META has an entry for "${id}"`);
}
assert(
  Object.values(INDICATOR_META).every(m => m.label.trim().length > 0 && m.whatItIs.trim().length > 0 && m.whyItMattersForGold.trim().length > 0),
  'Every indicator has a real, non-empty label and explanation'
);

assert(calculateCompositeLean([]) === 50, 'calculateCompositeLean: no inputs defaults to neutral midpoint');
assert(
  calculateCompositeLean([{ percentile: 100, higherLeansGoldBullish: true }]) === 100,
  'calculateCompositeLean: a single fully-bullish-leaning reading scores 100'
);
assert(
  calculateCompositeLean([{ percentile: 100, higherLeansGoldBullish: false }]) === 0,
  'calculateCompositeLean: a high reading on a "bearish when high" indicator inverts to 0'
);
// Real snapshot from the live site (2026-09-18): real yield at the 100th
// percentile (bearish when high -> 0), dollar at 16th (bearish when high,
// so a LOW reading is bullish -> 84), breakeven inflation at 48th
// (bullish when high -> 48), CFTC positioning at 73rd (bullish when high
// -> 73), GPR at 31st (bullish when high -> 31). Average = 47.2 -> 47.
const realSnapshot = [
  { percentile: 100, higherLeansGoldBullish: false },
  { percentile: 16, higherLeansGoldBullish: false },
  { percentile: 48, higherLeansGoldBullish: true },
  { percentile: 73, higherLeansGoldBullish: true },
  { percentile: 31, higherLeansGoldBullish: true }
];
assert(calculateCompositeLean(realSnapshot) === 47, 'calculateCompositeLean matches hand-calculated result for a real observed snapshot');
assert(compositeLeanLabel(47) === 'ปัจจัยหักล้างกัน ไม่ชัดไปทางใดทางหนึ่ง', 'compositeLeanLabel: 47 (mixed factors) reads as offsetting, not directional');
assert(compositeLeanLabel(20) === 'เอียงลบ (ปัจจัยส่วนใหญ่กดดันทองคำ)', 'compositeLeanLabel: 20 reads as clearly negative-leaning');
assert(compositeLeanLabel(85) === 'เอียงบวก (ปัจจัยส่วนใหญ่หนุนทองคำ)', 'compositeLeanLabel: 85 reads as clearly positive-leaning');

// Hand-verified swing structure: peaks at values [3,5,7], troughs at [1,2,3]
// (indices 1,4,7 and 2,5,8 respectively, window=1) -> higher high (7>5)
// AND higher low (3>2) -> uptrend.
const uptrendSeries = [1, 3, 1, 2, 5, 2, 3, 7, 3, 4];
assert(classifyPriceStructure(uptrendSeries, 1) === 'uptrend', 'classifyPriceStructure: verified higher-high + higher-low series reads as uptrend');
assert(findSwingPoints(uptrendSeries, 1).filter(p => p.type === 'peak').length === 3, 'findSwingPoints: detects exactly the 3 hand-verified peaks');
assert(findSwingPoints(uptrendSeries, 1).filter(p => p.type === 'trough').length === 3, 'findSwingPoints: detects exactly the 3 hand-verified troughs');

// Time-reversed version of the uptrend series -> lower high AND lower low -> downtrend.
const downtrendSeries = [...uptrendSeries].reverse();
assert(classifyPriceStructure(downtrendSeries, 1) === 'downtrend', 'classifyPriceStructure: time-reversed uptrend series reads as downtrend');

// Higher high (6>5) but NOT higher low (1<2) -> mixed, not forced into a bucket.
const mixedSeries = [1, 3, 1, 2, 5, 2, 3, 6, 1, 2];
assert(classifyPriceStructure(mixedSeries, 1) === 'mixed', 'classifyPriceStructure: higher-high but lower-low reads as mixed, not bullish or bearish');

assert(classifyPriceStructure([1, 2, 3], 5) === 'insufficient-data', 'classifyPriceStructure: too-short series for the window is honestly reported as insufficient, not guessed');

assert(recentDirection([...Array(25).keys()]) === 'up', 'recentDirection: a rising series over the lookback reads as up');
assert(recentDirection([...Array(25).keys()].reverse()) === 'down', 'recentDirection: a falling series over the lookback reads as down');
assert(recentDirection(Array(25).fill(5)) === 'flat', 'recentDirection: an unchanged series reads as flat');
assert(recentDirection([1, 2, 3]) === 'flat', 'recentDirection: a series shorter than the lookback defaults to flat, not a guess');

const allBullish = calculateSixSignalVote({
  realYieldDirection: 'down',
  dollarDirection: 'down',
  nominalYieldDirection: 'down',
  breakevenDirection: 'up',
  cftcCrowded: false,
  goldStructure: 'uptrend'
});
assert(allBullish.bullishCount === 6 && allBullish.bias === 'long', 'calculateSixSignalVote: all 6 signals bullish -> long bias (matches the user-specified 4-6 rule)');

const allBearish = calculateSixSignalVote({
  realYieldDirection: 'up',
  dollarDirection: 'up',
  nominalYieldDirection: 'up',
  breakevenDirection: 'down',
  cftcCrowded: true,
  goldStructure: 'downtrend'
});
assert(allBearish.bullishCount === 0 && allBearish.bias === 'short', 'calculateSixSignalVote: all 6 signals bearish -> short bias (matches the 0-1 rule)');

const mixedVote = calculateSixSignalVote({
  realYieldDirection: 'down', // bullish
  dollarDirection: 'up', // bearish
  nominalYieldDirection: 'up', // bearish
  breakevenDirection: 'up', // bullish
  cftcCrowded: false, // bullish
  goldStructure: 'mixed' // neutral
});
assert(mixedVote.bullishCount === 3 && mixedVote.bias === 'neutral', 'calculateSixSignalVote: 3 bullish / 2 bearish / 1 neutral -> neutral bias (matches the 2-3 rule)');
assert(mixedVote.neutralCount === 1, 'calculateSixSignalVote: a "mixed" gold structure counts as neutral, not forced bullish or bearish');

console.log('\n====================================================');
console.log(`   TEST SUMMARY: ${passed} / ${total} TESTS PASSED   `);
console.log('====================================================');

if (passed !== total) process.exit(1);

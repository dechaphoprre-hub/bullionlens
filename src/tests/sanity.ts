import { percentileRank, percentileLabel } from '../lib/percentile.ts';
import { INDICATOR_META } from '../lib/indicatorMeta.ts';

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
  'geopolitical-risk-index'
];
for (const id of expectedIndicatorIds) {
  assert(id in INDICATOR_META, `INDICATOR_META has an entry for "${id}"`);
}
assert(
  Object.values(INDICATOR_META).every(m => m.label.trim().length > 0 && m.whatItIs.trim().length > 0 && m.whyItMattersForGold.trim().length > 0),
  'Every indicator has a real, non-empty label and explanation'
);

console.log('\n====================================================');
console.log(`   TEST SUMMARY: ${passed} / ${total} TESTS PASSED   `);
console.log('====================================================');

if (passed !== total) process.exit(1);

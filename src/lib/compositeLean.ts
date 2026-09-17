/**
 * A single-number synthesis of where all indicators currently sit,
 * versus their own history, expressed on a 0-100 "historically
 * bearish-leaning <-> historically bullish-leaning" scale.
 *
 * This is deliberately just an equal-weighted average of percentiles —
 * not a backtested or validated model, and never claimed as one. It
 * answers "reading all of this together, which way does it lean
 * *right now*" so the reader doesn't have to mentally average five
 * cards themselves — it does not answer "what will gold do next" or
 * "what should I do." That distinction is the whole point: see
 * README.md and src/App.tsx's disclaimer copy, which must stay attached
 * to this number wherever it's shown.
 */
export interface CompositeLeanInput {
  percentile: number; // 0-100, from percentileRank()
  /** true = a higher reading has historically leaned bullish for gold; false = the opposite. From INDICATOR_META. */
  higherLeansGoldBullish: boolean;
}

export const calculateCompositeLean = (inputs: CompositeLeanInput[]): number => {
  if (inputs.length === 0) return 50;
  const bullishScores = inputs.map(i => (i.higherLeansGoldBullish ? i.percentile : 100 - i.percentile));
  return Math.round(bullishScores.reduce((sum, s) => sum + s, 0) / bullishScores.length);
};

export type CompositeLeanLabel =
  | 'เอียงลบ (ปัจจัยส่วนใหญ่กดดันทองคำ)'
  | 'เอียงลบเล็กน้อย'
  | 'ปัจจัยหักล้างกัน ไม่ชัดไปทางใดทางหนึ่ง'
  | 'เอียงบวกเล็กน้อย'
  | 'เอียงบวก (ปัจจัยส่วนใหญ่หนุนทองคำ)';

export const compositeLeanLabel = (score: number): CompositeLeanLabel => {
  if (score <= 30) return 'เอียงลบ (ปัจจัยส่วนใหญ่กดดันทองคำ)';
  if (score <= 45) return 'เอียงลบเล็กน้อย';
  if (score <= 55) return 'ปัจจัยหักล้างกัน ไม่ชัดไปทางใดทางหนึ่ง';
  if (score <= 70) return 'เอียงบวกเล็กน้อย';
  return 'เอียงบวก (ปัจจัยส่วนใหญ่หนุนทองคำ)';
};

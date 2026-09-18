/**
 * LBMA (London Bullion Market Association) — the actual primary source
 * for the gold benchmark price, not a redistributor. FRED used to carry
 * this same data but discontinued it in 2022 (confirmed: FRED's old
 * series now redirects to a removal notice). Free, no auth, no rate
 * limit encountered, real daily data back to 1968.
 */
const LBMA_GOLD_PM_URL = 'https://prices.lbma.org.uk/json/gold_pm.json';

interface LbmaRawEntry {
  d: string; // date, YYYY-MM-DD
  v: [number, number, number]; // [USD, GBP, EUR] per troy ounce
}

export interface GoldPriceResult {
  latestValue: number | null;
  latestDate: string | null;
  /** { date, value } pairs, oldest first, USD per troy ounce. */
  historicalSeries: Array<{ date: string; value: number }>;
}

export async function fetchGoldPriceUsd(yearsBack = 5): Promise<GoldPriceResult> {
  const response = await fetch(LBMA_GOLD_PM_URL);
  if (!response.ok) {
    throw new Error(`LBMA gold price fetch failed: HTTP ${response.status}`);
  }
  const raw = await response.json() as LbmaRawEntry[];

  const since = new Date();
  since.setFullYear(since.getFullYear() - yearsBack);
  const sinceStr = since.toISOString().slice(0, 10);

  const series = raw
    .filter(entry => entry.d >= sinceStr && typeof entry.v?.[0] === 'number')
    .map(entry => ({ date: entry.d, value: entry.v[0] }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const latest = series[series.length - 1];
  return {
    latestValue: latest?.value ?? null,
    latestDate: latest?.date ?? null,
    historicalSeries: series
  };
}

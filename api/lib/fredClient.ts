/**
 * FRED (Federal Reserve Economic Data) — free, official, real-time-ish
 * macro data from the St. Louis Fed. Requires a free API key from
 * fred.stlouisfed.org (30-second signup, no approval wait, unlike eBay).
 */
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

export interface FredSeriesResult {
  seriesId: string;
  latestValue: number | null;
  latestDate: string | null;
  /** All numeric observations in the requested window, oldest first — used for percentile context, not just the latest point. */
  historicalValues: number[];
}

interface FredObservation {
  date: string;
  value: string; // FRED returns "." for missing observations (e.g. market holidays)
}

/** Fetches one FRED series over a lookback window (default 5 years, matching how traders usually contextualize "unusually high/low"). */
export async function fetchFredSeries(seriesId: string, yearsBack = 5): Promise<FredSeriesResult> {
  const apiKey = process.env.FRED_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('FRED_API_KEY is required. Get a free key at https://fred.stlouisfed.org/docs/api/api_key.html');
  }

  const observationStart = new Date();
  observationStart.setFullYear(observationStart.getFullYear() - yearsBack);

  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: 'json',
    observation_start: observationStart.toISOString().slice(0, 10),
    sort_order: 'asc'
  });

  const response = await fetch(`${FRED_BASE_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`FRED API failed for series ${seriesId}: HTTP ${response.status} ${await response.text()}`);
  }

  const payload = await response.json() as { observations?: FredObservation[] };
  const observations = payload.observations || [];

  // "." is FRED's own missing-data marker (holidays, not-yet-published days) — filtered out rather than parsed as NaN.
  const historicalValues = observations
    .filter(obs => obs.value !== '.')
    .map(obs => Number(obs.value));

  const latest = [...observations].reverse().find(obs => obs.value !== '.');

  return {
    seriesId,
    latestValue: latest ? Number(latest.value) : null,
    latestDate: latest?.date ?? null,
    historicalValues
  };
}

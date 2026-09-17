/**
 * CFTC Commitments of Traders (Legacy Futures Only report) — free, official
 * weekly data via CFTC's own Socrata Open Data API. No credentials
 * required (an app token raises rate limits but isn't necessary for the
 * request volume this project makes).
 *
 * Dataset id 6dca-aqww verified directly against the live API before use
 * (not assumed from memory) — it's the real "Legacy Futures Only" report.
 */
const CFTC_DATASET_URL = 'https://publicreporting.cftc.gov/resource/6dca-aqww.json';

// The exact real exchange listing string for COMEX gold futures, as
// returned by the API itself — filtering on this (rather than just
// commodity_name=GOLD) excludes smaller/variant gold contracts and
// keeps this to the one contract traders actually mean by "gold COT".
const GOLD_MARKET_NAME = 'GOLD - COMMODITY EXCHANGE INC.';

export interface CftcPositioningResult {
  latestNetSpeculativeLong: number | null;
  latestReportDate: string | null;
  /** Net (long - short) non-commercial position for each week in the window, oldest first. */
  historicalNetSpeculativeLong: number[];
}

interface CftcRecord {
  report_date_as_yyyy_mm_dd: string;
  noncomm_positions_long_all: string;
  noncomm_positions_short_all: string;
}

/** Fetches weekly net speculative (non-commercial) gold futures positioning over a lookback window (default 5 years). */
export async function fetchGoldPositioning(yearsBack = 5): Promise<CftcPositioningResult> {
  const since = new Date();
  since.setFullYear(since.getFullYear() - yearsBack);

  const params = new URLSearchParams({
    $where: `market_and_exchange_names='${GOLD_MARKET_NAME}' AND report_date_as_yyyy_mm_dd >= '${since.toISOString().slice(0, 10)}'`,
    $order: 'report_date_as_yyyy_mm_dd ASC',
    $limit: '500'
  });

  const response = await fetch(`${CFTC_DATASET_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`CFTC API failed: HTTP ${response.status} ${await response.text()}`);
  }

  const records = await response.json() as CftcRecord[];
  const netLongSeries = records.map(r => Number(r.noncomm_positions_long_all) - Number(r.noncomm_positions_short_all));

  const latest = records[records.length - 1];

  return {
    latestNetSpeculativeLong: latest ? Number(latest.noncomm_positions_long_all) - Number(latest.noncomm_positions_short_all) : null,
    latestReportDate: latest?.report_date_as_yyyy_mm_dd ?? null,
    historicalNetSpeculativeLong: netLongSeries
  };
}

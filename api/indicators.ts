import type { IncomingMessage, ServerResponse } from 'node:http';
import { fetchFredSeries } from './lib/fredClient.js';
import { fetchGoldPositioning } from './lib/cftcClient.js';
import { fetchGeopoliticalRiskIndex } from './lib/gprClient.js';
import { fetchGoldPriceUsd } from './lib/lbmaClient.js';

export interface IndicatorSnapshot {
  id: string;
  latestValue: number | null;
  latestDate: string | null;
  historicalValues: number[];
}

export interface IndicatorsResult {
  fetchedAt: string;
  indicators: IndicatorSnapshot[];
  /** Which sources failed and why — shown honestly in the UI rather than silently dropping a signal. */
  errors: Array<{ id: string; message: string }>;
}

/**
 * Each source is fetched independently so one failure (e.g. FRED_API_KEY
 * not configured yet) doesn't take down indicators that did succeed —
 * same "degrade gracefully, never fabricate the gap" principle used
 * throughout this project's sibling, DealGap.
 */
export async function getIndicators(): Promise<IndicatorsResult> {
  const indicators: IndicatorSnapshot[] = [];
  const errors: Array<{ id: string; message: string }> = [];

  const attempts: Array<{ id: string; run: () => Promise<IndicatorSnapshot> }> = [
    {
      id: 'real-yield-10y',
      run: async () => {
        const r = await fetchFredSeries('DFII10');
        return { id: 'real-yield-10y', latestValue: r.latestValue, latestDate: r.latestDate, historicalValues: r.historicalValues };
      }
    },
    {
      id: 'dollar-index-broad',
      run: async () => {
        const r = await fetchFredSeries('DTWEXBGS');
        return { id: 'dollar-index-broad', latestValue: r.latestValue, latestDate: r.latestDate, historicalValues: r.historicalValues };
      }
    },
    {
      id: 'breakeven-inflation-10y',
      run: async () => {
        const r = await fetchFredSeries('T10YIE');
        return { id: 'breakeven-inflation-10y', latestValue: r.latestValue, latestDate: r.latestDate, historicalValues: r.historicalValues };
      }
    },
    {
      id: 'gold-speculative-positioning',
      run: async () => {
        const r = await fetchGoldPositioning();
        return { id: 'gold-speculative-positioning', latestValue: r.latestNetSpeculativeLong, latestDate: r.latestReportDate, historicalValues: r.historicalNetSpeculativeLong };
      }
    },
    {
      id: 'geopolitical-risk-index',
      run: async () => {
        const r = await fetchGeopoliticalRiskIndex();
        return { id: 'geopolitical-risk-index', latestValue: r.latestValue, latestDate: r.latestDate, historicalValues: r.historicalValues };
      }
    },
    {
      id: 'nominal-yield-10y',
      run: async () => {
        const r = await fetchFredSeries('DGS10');
        return { id: 'nominal-yield-10y', latestValue: r.latestValue, latestDate: r.latestDate, historicalValues: r.historicalValues };
      }
    },
    {
      id: 'gold-price-usd',
      run: async () => {
        const r = await fetchGoldPriceUsd();
        return { id: 'gold-price-usd', latestValue: r.latestValue, latestDate: r.latestDate, historicalValues: r.historicalSeries.map(p => p.value) };
      }
    }
  ];

  const results = await Promise.allSettled(attempts.map(a => a.run()));
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      indicators.push(result.value);
    } else {
      errors.push({ id: attempts[i].id, message: result.reason instanceof Error ? result.reason.message : String(result.reason) });
    }
  });

  return { fetchedAt: new Date().toISOString(), indicators, errors };
}

/**
 * Vercel serverless function: GET /api/indicators
 * Mirrors DealGap's api/search.ts shape/conventions (plain Node http
 * types so the same handler runs locally without the Vercel CLI).
 */
export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const result = await getIndicators();
    res.statusCode = 200;
    res.end(JSON.stringify(result));
  } catch (error) {
    console.error('[api/indicators] failed:', error);
    res.statusCode = 502;
    res.end(JSON.stringify({ error: 'Indicators are temporarily unavailable. Please try again in a moment.' }));
  }
}

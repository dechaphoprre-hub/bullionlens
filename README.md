# BullionLens

The real macro, positioning, and geopolitical signals that move gold prices, pulled live from official sources and explained in plain language — not a buy/sell signal generator.

## Why this shape

- **Not a prediction tool.** Predicting asset prices is genuinely hard even for well-resourced institutional desks. This project makes one kind of claim only: "here is where a real indicator sits right now versus its own recent history" (a percentile, not a forecast). See `src/lib/percentile.ts`.
- **No fabricated correlations.** It doesn't backtest "war → gold up" style narratives against a handful of historical events and present the result as a rule — with so few real geopolitical shocks in gold's trading history, that kind of backtest is almost guaranteed to overfit. If a divergence-flagging feature is added later, it must stay descriptive ("this combination is unusual vs. history"), never prescriptive ("therefore sell").
- **Plain-language layer is the actual differentiator.** GoldHub, MetalPrices.live, and several open-source dashboards already surface real yields, dollar strength, and CFTC positioning — checked directly before building this. None of them explain what a number means or why it matters for gold to someone who doesn't already trade macro. `src/lib/indicatorMeta.ts` is written in Thai, deliberately — that's who asked for this and who the jargon barrier is for. (This is the opposite of DealGap's English-only rule, on purpose — different project, different audience.)
- **Real data only, every source verified before use:**
  - **FRED** (Federal Reserve) — real 10-year yield (`DFII10`), broad dollar index (`DTWEXBGS`), 10-year breakeven inflation (`T10YIE`). Free API key, instant signup, no approval wait.
  - **CFTC Commitments of Traders** — real weekly gold futures positioning (dataset `6dca-aqww`, confirmed live against the API before use, not assumed from memory). No credentials required.
  - **Geopolitical Risk Index** (Caldara & Iacoviello, Federal Reserve economists) — real, monthly-updated academic index counting geopolitical-tension language in leading newspapers. The source file itself is the live data — no API, confirmed updated within days of when this was built.

## Local setup

1. `npm install`
2. Get a free FRED API key at [fred.stlouisfed.org](https://fred.stlouisfed.org/docs/api/api_key.html) (instant, no approval wait).
3. Copy `.env.example` to `.env` and fill in `FRED_API_KEY`.
4. Run the API dev server and the frontend in two terminals:
   ```
   npm run dev:api
   npm run dev
   ```
5. Open the printed local URL. CFTC and the Geopolitical Risk Index need no credentials and will work immediately; FRED indicators need the key from step 2.

## Deploying

Same shape as DealGap: static frontend + Vercel serverless functions (`api/*.ts` auto-detected, no separate backend). Set `FRED_API_KEY` in the Vercel project's environment variables.

## Testing

`npm test` runs pure-logic sanity checks (percentile math, indicator metadata completeness) — no live API credentials needed.

## Status

Scaffolded, not yet deployed. All three data sources verified reachable and returning real current data before any code was written. Not yet tested end-to-end with a real FRED API key (needs a free key — 30 seconds to get, no approval wait).

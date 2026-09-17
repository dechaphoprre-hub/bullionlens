import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Reads the Geopolitical Risk Index from the static snapshot that
 * scripts/refresh-gpr-data.ts writes to public/gpr-snapshot.json —
 * deliberately NOT parsing the source XLS file live on every request.
 * `xlsx` (the only real parser available for this file) has a known
 * high-severity vulnerability with no fix, so it's confined to that
 * offline, scheduled script and kept out of this deployed function's
 * dependencies entirely. See that script for the full reasoning.
 */
interface GprSnapshot {
  refreshedAt: string;
  observations: Array<{ date: string; value: number }>;
}

export interface GprResult {
  latestValue: number | null;
  latestDate: string | null;
  historicalValues: number[];
}

export async function fetchGeopoliticalRiskIndex(): Promise<GprResult> {
  const snapshotPath = join(process.cwd(), 'public', 'gpr-snapshot.json');
  let snapshot: GprSnapshot;
  try {
    snapshot = JSON.parse(readFileSync(snapshotPath, 'utf-8'));
  } catch (error) {
    throw new Error(
      `GPR snapshot not found at ${snapshotPath} — run "npx tsx scripts/refresh-gpr-data.ts" first. (${error instanceof Error ? error.message : error})`
    );
  }

  const latest = snapshot.observations[snapshot.observations.length - 1];
  return {
    latestValue: latest?.value ?? null,
    latestDate: latest?.date ?? null,
    historicalValues: snapshot.observations.map(o => o.value)
  };
}

import { writeFileSync, mkdirSync } from 'node:fs';
import * as XLSX from 'xlsx';

/**
 * Fetches and parses the Geopolitical Risk Index XLS file, writing a
 * plain JSON snapshot to public/gpr-snapshot.json for the live API to
 * read. Run periodically (the source updates monthly, so daily is more
 * than enough — see .github/workflows once this is deployed).
 *
 * `xlsx` (SheetJS) has a known high-severity vulnerability with no fix
 * available (prototype pollution + ReDoS — checked via `npm audit`).
 * Deliberately kept out of the deployed serverless function's runtime
 * dependencies and confined to this offline script instead, which only
 * ever parses one file from one hardcoded, trusted URL, run on a
 * schedule we control — not on every live request from every visitor.
 */
const GPR_XLS_URL = 'https://www.matteoiacoviello.com/gpr_files/data_gpr_export.xls';
const YEARS_BACK = 5;

async function main() {
  console.log(`[refresh-gpr-data] Fetching ${GPR_XLS_URL}`);
  const response = await fetch(GPR_XLS_URL);
  if (!response.ok) {
    throw new Error(`GPR index fetch failed: HTTP ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: true });

  const since = new Date();
  since.setFullYear(since.getFullYear() - YEARS_BACK);

  const parsed = rows
    .map(row => ({ date: row.month, gpr: row.GPR }))
    .filter((r): r is { date: Date; gpr: number } => r.date instanceof Date && typeof r.gpr === 'number')
    .filter(r => r.date >= since)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(r => ({ date: r.date.toISOString().slice(0, 10), value: r.gpr }));

  if (!parsed.length) {
    throw new Error('Parsed 0 valid rows from the GPR file — source format may have changed.');
  }

  mkdirSync('public', { recursive: true });
  writeFileSync('public/gpr-snapshot.json', JSON.stringify({ refreshedAt: new Date().toISOString(), observations: parsed }, null, 2));
  console.log(`[PASS] Wrote public/gpr-snapshot.json (${parsed.length} monthly observations, latest: ${parsed[parsed.length - 1].date})`);
}

main().catch(error => {
  console.error('[FAILED]', error instanceof Error ? error.message : error);
  process.exit(1);
});

import React, { useEffect, useState } from 'react';
import { INDICATOR_META, type IndicatorId } from './lib/indicatorMeta';
import { percentileRank, percentileLabel } from './lib/percentile';

interface IndicatorSnapshot {
  id: IndicatorId;
  latestValue: number | null;
  latestDate: string | null;
  historicalValues: number[];
}

interface IndicatorsResponse {
  fetchedAt: string;
  indicators: IndicatorSnapshot[];
  errors: Array<{ id: string; message: string }>;
}

const formatValue = (value: number, unit: string): string => {
  if (unit === '%') return `${value.toFixed(2)}%`;
  if (unit === 'สัญญา') return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const percentileBucketColor: Record<string, string> = {
  'very low': 'bg-blue-950 text-blue-300 border-blue-800',
  low: 'bg-slate-800 text-slate-300 border-slate-700',
  typical: 'bg-slate-800 text-slate-300 border-slate-700',
  high: 'bg-slate-800 text-slate-300 border-slate-700',
  'very high': 'bg-amber-950 text-amber-300 border-amber-800'
};

export const App: React.FC = () => {
  const [data, setData] = useState<IndicatorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch('/api/indicators');
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || `Request failed (HTTP ${response.status})`);
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 py-4">
        <div className="max-w-4xl w-full mx-auto px-4">
          <div className="flex items-center gap-2.5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="10" cy="10" r="6.5" />
              <path d="m20.5 20.5-5.4-5.4" />
            </svg>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight leading-none">
                Bullion<span className="text-amber-400">Lens</span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                สัญญาณจริงที่ขับเคลื่อนราคาทองคำ รวมไว้ที่เดียว อธิบายเป็นภาษาที่เข้าใจง่าย
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        <div className="bg-amber-950/20 border border-amber-800/40 rounded-lg p-3 mb-6 text-xs text-amber-200/90">
          ⚠️ <strong>เพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำการลงทุน</strong> — เครื่องมือนี้แสดงข้อมูลจริงและตำแหน่งเทียบสถิติย้อนหลังเท่านั้น
          ไม่มีการฟันธงว่าควรซื้อหรือขาย การตัดสินใจลงทุนเป็นความรับผิดชอบของผู้ใช้เอง
        </div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-4 animate-pulse h-40" />
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-950/40 border border-red-800 rounded-lg p-3 text-sm text-red-300 mb-4">{error}</div>
        )}

        {data && (
          <>
            {data.errors.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 mb-4 text-xs text-slate-400">
                ดึงข้อมูลบางส่วนไม่สำเร็จ: {data.errors.map(e => INDICATOR_META[e.id as IndicatorId]?.label ?? e.id).join(', ')}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.indicators.map(indicator => {
                const meta = INDICATOR_META[indicator.id];
                if (!meta || indicator.latestValue === null) return null;
                const pct = percentileRank(indicator.latestValue, indicator.historicalValues);
                const bucket = percentileLabel(pct);
                return (
                  <div key={indicator.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-sm font-bold">{meta.label}</h2>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${percentileBucketColor[bucket]}`}>
                        {bucket} ({pct}th percentile)
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-amber-400 tabular-nums mt-1">
                      {formatValue(indicator.latestValue, meta.unit)}
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2">
                      ข้อมูลล่าสุด: {indicator.latestDate} · แหล่งที่มา: {meta.source}
                    </p>
                    <p className="text-xs text-slate-300 mb-1.5">{meta.whatItIs}</p>
                    <p className="text-xs text-slate-400">{meta.whyItMattersForGold}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-slate-800 px-4 py-4 text-center text-xs text-slate-600">
        ข้อมูลทั้งหมดดึงจากแหล่งทางการจริง (Federal Reserve, CFTC, งานวิจัยของนักเศรษฐศาสตร์ Fed) ไม่มีการคาดเดาหรือสร้างข้อมูลขึ้นเอง
      </footer>
    </div>
  );
};

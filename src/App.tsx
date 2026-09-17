import React, { useEffect, useState } from 'react';
import { INDICATOR_META, type IndicatorId } from './lib/indicatorMeta';
import { percentileRank, percentileLabel } from './lib/percentile';
import { calculateCompositeLean, compositeLeanLabel } from './lib/compositeLean';

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

  // Computed once per render from the fetched snapshot — each card and
  // the composite gauge below both read from this same list, so they
  // can never disagree with each other.
  const readings = (data?.indicators ?? [])
    .map(indicator => {
      const meta = INDICATOR_META[indicator.id];
      if (!meta || indicator.latestValue === null) return null;
      const percentile = percentileRank(indicator.latestValue, indicator.historicalValues);
      return { indicator, meta, percentile };
    })
    .filter((r): r is { indicator: IndicatorSnapshot; meta: (typeof INDICATOR_META)[IndicatorId]; percentile: number } => r !== null);

  const compositeScore = readings.length
    ? calculateCompositeLean(readings.map(r => ({ percentile: r.percentile, higherLeansGoldBullish: r.meta.higherLeansGoldBullish })))
    : null;

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

            {compositeScore !== null && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold">ภาพรวมตอนนี้ (จาก {readings.length} ตัวชี้วัด)</h2>
                  <span className="text-xs font-bold text-amber-400">{compositeScore}/100</span>
                </div>
                <div className="relative h-2.5 rounded-full bg-gradient-to-r from-blue-700 via-slate-600 to-amber-500 mb-2">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-950 shadow"
                    style={{ left: `${compositeScore}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mb-2">
                  <span>เอียงลบ (กดดันทองคำ)</span>
                  <span>เป็นกลาง</span>
                  <span>เอียงบวก (หนุนทองคำ)</span>
                </div>
                <p className="text-sm font-semibold text-slate-200">{compositeLeanLabel(compositeScore)}</p>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  คำนวณจากค่าเฉลี่ยถ่วงน้ำหนักเท่ากันของ percentile ทั้ง {readings.length} ตัวด้านล่าง ไม่ใช่แบบจำลองที่ผ่านการพิสูจน์ทางสถิติ
                  และไม่ใช่การพยากรณ์ทิศทางราคา — เป็นแค่ภาพสรุปว่าปัจจัยจริงตอนนี้เอียงไปทางไหนเมื่อดูรวมกัน
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {readings.map(({ indicator, meta, percentile }) => {
                const bucket = percentileLabel(percentile);
                return (
                  <div key={indicator.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-sm font-bold">{meta.label}</h2>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${percentileBucketColor[bucket]}`}>
                        {bucket} ({percentile}th percentile)
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-amber-400 tabular-nums mt-1">
                      {formatValue(indicator.latestValue!, meta.unit)}
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

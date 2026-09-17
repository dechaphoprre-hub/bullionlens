/**
 * Plain-language layer — the actual differentiator of this project.
 * GoldHub/MetalPrices.live/etc. already show these numbers; none of
 * them explain what the number means or why it matters for gold in
 * language that doesn't assume the reader already trades macro. Written
 * in Thai since that's who asked for this and who the jargon barrier is
 * for (unlike DealGap, which is deliberately English-only — this
 * project's audience is different on purpose, not by accident).
 */
export type IndicatorId =
  | 'real-yield-10y'
  | 'dollar-index-broad'
  | 'breakeven-inflation-10y'
  | 'gold-speculative-positioning'
  | 'geopolitical-risk-index';

export interface IndicatorMeta {
  id: IndicatorId;
  label: string;
  unit: string;
  source: string;
  /** true = a higher reading has historically leaned toward higher gold prices; false = the opposite. Used only to color-code direction, never to imply a guaranteed relationship. */
  higherLeansGoldBullish: boolean;
  whatItIs: string;
  whyItMattersForGold: string;
}

export const INDICATOR_META: Record<IndicatorId, IndicatorMeta> = {
  'real-yield-10y': {
    id: 'real-yield-10y',
    label: 'ดอกเบี้ยแท้จริง (Real Yield) 10 ปี',
    unit: '%',
    source: 'Federal Reserve (FRED)',
    higherLeansGoldBullish: false,
    whatItIs: 'ผลตอบแทนพันธบัตรรัฐบาลสหรัฐฯ อายุ 10 ปี หลังหักเงินเฟ้อออกแล้ว — คือดอกเบี้ยที่ "ได้จริง" หลังเงินเฟ้อกินไปแล้ว',
    whyItMattersForGold: 'ทองคำไม่มีดอกเบี้ยให้ ถ้าถือพันธบัตรได้ดอกเบี้ยแท้จริงสูง คนมักเลือกถือพันธบัตรแทนทอง ทองจึงมักถูกกดดันเวลาตัวเลขนี้สูง และมักได้แรงหนุนเวลาตัวเลขนี้ติดลบ'
  },
  'dollar-index-broad': {
    id: 'dollar-index-broad',
    label: 'ดัชนีค่าเงินดอลลาร์ (Broad Dollar Index)',
    unit: 'ดัชนี',
    source: 'Federal Reserve (FRED)',
    higherLeansGoldBullish: false,
    whatItIs: 'ค่าเงินดอลลาร์เทียบกับตะกร้าสกุลเงินคู่ค้าหลักของสหรัฐฯ (ดัชนีของ Fed เอง ไม่ใช่ DXY ที่เห็นตามข่าวทั่วไป แต่วัดสิ่งเดียวกัน)',
    whyItMattersForGold: 'ทองคำซื้อขายเป็นสกุลดอลลาร์ทั่วโลก ดอลลาร์อ่อนแปลว่าคนถือสกุลเงินอื่นซื้อทองได้ถูกลง มักดันราคาทองขึ้น ดอลลาร์แข็งมักกดราคาทองลง'
  },
  'breakeven-inflation-10y': {
    id: 'breakeven-inflation-10y',
    label: 'เงินเฟ้อคาดการณ์ 10 ปี (Breakeven Inflation)',
    unit: '%',
    source: 'Federal Reserve (FRED)',
    higherLeansGoldBullish: true,
    whatItIs: 'ตลาดพันธบัตรคาดการณ์ว่าเงินเฟ้อเฉลี่ยใน 10 ปีข้างหน้าจะอยู่ที่เท่าไหร่ คำนวณจากส่วนต่างพันธบัตรปกติกับพันธบัตรกันเงินเฟ้อ',
    whyItMattersForGold: 'ทองคำถูกมองเป็นเครื่องมือป้องกันเงินเฟ้อมานาน ถ้าตลาดเริ่มกังวลเงินเฟ้อสูงขึ้น มักมีแรงซื้อทองเพื่อป้องกันความเสี่ยงนี้'
  },
  'gold-speculative-positioning': {
    id: 'gold-speculative-positioning',
    label: 'สถานะถือครองของนักเก็งกำไร (CFTC Net Long)',
    unit: 'สัญญา',
    source: 'CFTC Commitments of Traders',
    higherLeansGoldBullish: true,
    whatItIs: 'จำนวนสัญญาซื้อ (Long) ลบด้วยสัญญาขาย (Short) ของกลุ่มนักเก็งกำไรที่ไม่ใช่ผู้ผลิต/ผู้ใช้ทองจริง รายงานทุกสัปดาห์โดยหน่วยงานกำกับดูแลตลาดล่วงหน้าสหรัฐฯ',
    whyItMattersForGold: 'ถ้ากลุ่มนี้ถือ Long เยอะผิดปกติแล้ว แปลว่าคนที่จะซื้อเพิ่มเริ่มมีน้อยลง (ซื้อไปแล้ว) และพร้อมเทขายทำกำไรได้ทุกเมื่อ ความเสี่ยงขาลงจึงสูงขึ้นเมื่อตัวเลขนี้อยู่ในระดับสุดขั้ว'
  },
  'geopolitical-risk-index': {
    id: 'geopolitical-risk-index',
    label: 'ดัชนีความเสี่ยงภูมิรัฐศาสตร์ (GPR Index)',
    unit: 'ดัชนี',
    source: 'Caldara & Iacoviello (นักเศรษฐศาสตร์ Federal Reserve)',
    higherLeansGoldBullish: true,
    whatItIs: 'นับความถี่ของคำเกี่ยวกับความตึงเครียดทางภูมิรัฐศาสตร์ในหนังสือพิมพ์ชั้นนำของโลกทุกเดือน เป็นตัวเลขจากข่าวจริง ไม่ใช่ความรู้สึก',
    whyItMattersForGold: 'ทองคำถูกมองเป็นสินทรัพย์ปลอดภัยเวลาโลกตึงเครียด แต่ไม่เสมอไป — ตัวเลขนี้ควรดูคู่กับดอกเบี้ยแท้จริงและดอลลาร์เสมอ ไม่ใช่ดูตัวเดียวแล้วสรุปเลย'
  }
};

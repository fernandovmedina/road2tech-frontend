// Small pure helpers shared by the strategy mock modules (dates, rounding, Spanish formatting, string hashing).

export const r1 = (x: number) => Math.round(x * 10) / 10;
export const r2 = (x: number) => Math.round(x * 100) / 100;
export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

const DAY = 86_400_000;
const parse = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const addDays = (iso: string, n: number) => fmt(parse(iso) + n * DAY);
export const diffDays = (a: string, b: string) => Math.round((parse(b) - parse(a)) / DAY); // b - a
export function datesBetween(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}
export const overlap = (a: { start: string; end: string }, b: { start: string; end: string }) => a.start <= b.end && b.start <= a.end;

const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const weekdayEn = (iso: string): (typeof WEEKDAYS_EN)[number] => WEEKDAYS_EN[new Date(parse(iso)).getUTCDay()];
export const WEEKDAY_ES_LONG = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const WEEKDAY_ES_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
export const weekdayEs = (iso: string) => WEEKDAY_ES_LONG[new Date(parse(iso)).getUTCDay()];
/** "03/10" */
export const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
/** "sáb 03/10" */
export const dayLabel = (iso: string) => `${WEEKDAY_ES_SHORT[new Date(parse(iso)).getUTCDay()]} ${dm(iso)}`;
export const rangeLabel = (a: string, b: string) => (a === b ? dayLabel(a) : `${dayLabel(a)} al ${dayLabel(b)}`);

const money0 = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const num1 = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
export const mxn = (v: number) => `$${money0.format(Math.round(v))}`;
export const n1 = (v: number) => num1.format(v);
export const pct0 = (frac: number) => `${Math.round(frac * 100)} %`;
export const pct1 = (frac: number) => `${num1.format(frac * 100)} %`;

/** 32-bit FNV-1a as base-36 (for ids). `hash01` from db.ts only has 10 000 values, too few for ids. */
export function hashId(key: string): string {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).padStart(7, "0");
}

export const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

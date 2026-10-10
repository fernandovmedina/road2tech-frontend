const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });

export const formatMoney = (v: number) => currency.format(Math.round(v)).replace("MXN", "").trim();
export const formatNumber = (v: number) => number.format(Math.round(v));
export const formatDecimal = (v: number) => decimal.format(v);
export const formatPct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;
export const formatSignedPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
export const formatSignedMoney = (v: number) => `${v >= 0 ? "+" : "−"}${formatMoney(Math.abs(v))}`;

export const parseIso = (iso: string) => new Date(`${iso}T12:00:00`);
export const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (iso: string, days: number) => {
  const d = parseIso(iso);
  d.setDate(d.getDate() + days);
  return toIso(d);
};
export const todayIso = () => toIso(new Date());

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(parseIso(iso));
export const formatDateLong = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" }).format(parseIso(iso));
export const formatMonth = (year: number, month: number) => {
  const s = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(new Date(year, month, 1));
  return s.charAt(0).toUpperCase() + s.slice(1);
};

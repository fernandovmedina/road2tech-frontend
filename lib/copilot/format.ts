// Number and date formatting (en-US, MXN), shared by every copilot card.

const mxn = new Intl.NumberFormat("en-US", { style: "currency", currency: "MXN", currencyDisplay: "narrowSymbol" });
const mxnCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "MXN",
  currencyDisplay: "narrowSymbol",
  notation: "compact",
  maximumFractionDigits: 1,
});
const mxnWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "MXN",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
});
const units = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export const formatMoney = (value: number): string => `${mxn.format(value)} MXN`;
export const formatMoneyWhole = (value: number): string => mxnWhole.format(value);
export const formatMoneyShort = (value: number): string => mxnCompact.format(value);
export const formatSignedMoney = (value: number): string =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${mxn.format(Math.abs(value))}`;
export const formatUnits = (value: number): string => units.format(value);
export const formatInteger = (value: number): string => integer.format(value);
export const formatSignedUnits = (value: number): string =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${units.format(Math.abs(value))}`;
export const formatPct = (value: number): string =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${units.format(Math.abs(value))}%`;

// API dates are ISO "YYYY-MM-DD"; parse as UTC so the day never shifts with the viewer's timezone.
const toDate = (iso: string): Date => new Date(`${iso.slice(0, 10)}T00:00:00Z`);
export const formatShortDate = (iso: string): string => shortDate.format(toDate(iso));
export const formatLongDate = (iso: string): string => longDate.format(toDate(iso));
export const formatRange = (from: string, to: string): string =>
  from === to ? formatShortDate(from) : `${formatShortDate(from)} – ${formatShortDate(to)}`;

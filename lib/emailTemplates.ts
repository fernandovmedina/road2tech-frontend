import { copy } from "./copy";
import { formatDate, formatMoneyExact, formatNumber } from "./format";

// Builds the supplier e-mails that the frontend sends through POST /emails. The backend sends `htmlBody` as-is,
// so every dynamic value is escaped here. Amounts are the ones the backend already gave (this only formats them).

const C = copy.mail;

export type EmailContent = { text: string; htmlBody: string };

const escapeHtml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const page = (inner: string) =>
  `<!DOCTYPE html><html lang="es"><body style="margin:0;padding:24px;background:#f3f5f4;font-family:Manrope,Arial,sans-serif;color:#101828">` +
  `<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e3e8e6;border-radius:12px;padding:24px;line-height:1.5">${inner}</div></body></html>`;

export type OrderEmailInput = {
  brand: string;
  supplierName: string;
  supplierEmail: string | null;
  productName: string;
  productId: string;
  qty: number;
  unitCost: number;
  totalCost: number;
  orderDate: string;
  expectedDelivery: string;
};

export function buildOrderEmail(o: OrderEmailInput): EmailContent {
  const O = C.order;
  const rows: [string, string][] = [
    [O.product, `${o.productName} (${o.productId})`],
    [O.qty, formatNumber(o.qty)],
    [O.unitCost, `${formatMoneyExact(o.unitCost)} MXN`],
    [O.total, `${formatMoneyExact(o.totalCost)} MXN`],
    [O.orderDate, formatDate(o.orderDate)],
    [O.delivery, formatDate(o.expectedDelivery)],
  ];
  const note = o.supplierEmail ? O.demoNote(o.supplierName, o.supplierEmail) : null;
  const text = [
    O.greeting(o.supplierName),
    "",
    O.intro(o.brand),
    ...rows.map(([k, v]) => `- ${k}: ${v}`),
    "",
    O.thanks,
    o.brand,
    ...(note ? ["", note] : []),
  ].join("\n");
  const htmlBody = page(
    `<p>${escapeHtml(O.greeting(o.supplierName))}</p><p>${escapeHtml(O.intro(o.brand))}</p>` +
      `<table cellpadding="6" style="border-collapse:collapse;width:100%">${rows
        .map(([k, v]) => `<tr><td style="border-bottom:1px solid #e3e8e6"><b>${escapeHtml(k)}</b></td><td style="border-bottom:1px solid #e3e8e6">${escapeHtml(v)}</td></tr>`)
        .join("")}</table>` +
      `<p>${escapeHtml(O.thanks)}<br>${escapeHtml(o.brand)}</p>` +
      (note ? `<p style="font-size:12px;color:#5b6776">${escapeHtml(note)}</p>` : ""),
  );
  return { text, htmlBody };
}

export function buildTestEmail(supplierName: string, supplierEmail: string): EmailContent {
  const T = C.test;
  const note = T.demoNote(supplierName, supplierEmail);
  const text = [T.greeting(supplierName), "", T.body, "", note].join("\n");
  const htmlBody = page(
    `<p>${escapeHtml(T.greeting(supplierName))}</p><p>${escapeHtml(T.body)}</p><p style="font-size:12px;color:#5b6776">${escapeHtml(note)}</p>`,
  );
  return { text, htmlBody };
}

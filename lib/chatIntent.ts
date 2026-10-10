// Intent detection for the assistant's message box. It decides which questions the deterministic analysis adapter
// answers (POST /assistant/analysis, lib/mock/strategy/chat.ts) and which ones go to POST /chat.
// It works on words, not on exact phrases, so extra words ("tendencia de ventas más baja"), missing accents and common
// typos ("despediciar", "tirrarse") still match. Adjacency-only regexes missed all three.

export type AnalysisIntent =
  | { kind: "promotion_plan" }
  | { kind: "inventory_catalog" }
  | { kind: "trend_ranking"; direction: "highest" | "lowest" }
  /** Which product is going to expire unsold. `wantsPlan`: the message also asks what to do about it. */
  | { kind: "waste_risk"; wantsPlan: boolean }
  | { kind: "stock_outlook" };

/** Lowercase, no accents, no punctuation: "¿Cuál es la tendencia…?" → "cual es la tendencia". */
export function normalizeMessage(message: string): string {
  return message
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9%\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Edit distance where swapping two neighbouring letters costs 1 ("plna" → "plan"). */
function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

const collapse = (word: string) => word.replace(/(.)\1+/g, "$1");

/**
 * True when `token` starts like `stem`. A doubled letter is ignored ("tirrarse" ~ "tirar"); stems of 7+ letters also
 * tolerate one typo (two from 9 letters) as long as the first letter matches, so short stems never match by accident
 * ("mirar" is not "tirar").
 */
function startsLike(token: string, stem: string): boolean {
  if (token.startsWith(stem)) return true;
  const t = collapse(token);
  const s = collapse(stem);
  if (t.startsWith(s)) return true;
  if (s.length < 7 || t[0] !== s[0]) return false;
  const allowed = s.length >= 9 ? 2 : 1;
  for (let len = s.length - 1; len <= s.length + 1; len++) {
    if (len <= t.length && distance(t.slice(0, len), s) <= allowed) return true;
  }
  return false;
}

const mentions = (tokens: string[], stems: readonly string[]) => tokens.some((tk) => stems.some((st) => startsLike(tk, st)));

// General commercial-decision questions use the deterministic plan engine.
const PROMOTION_ANALYSIS =
  /\b(?:evalua(?:r)? (?:hasta )?(?:cinco|5) promociones|mejor(?:es)? promocion(?:es)?|plan de promociones|que recomiendas|que conviene|oportunidades? (?:comerciales?|de venta)|como (?:mejorar|subir|incrementar) (?:las )?ventas|analiza (?:la )?sucursal)\b/;

const WASTE_STEMS = ["merma", "desperdic", "tirar", "tirad", "caduc", "venc", "expir", "perecedero", "pudr", "podrir"] as const;
const WASTE_WORDS = new Set(["tira", "tiran", "basura"]);
const WASTE_PHRASE = /\b(?:echa(?:r|rse|n)? a perder|a la basura|se pierd(?:e|en)|se va a perder)\b/;
const PLAN_STEMS = ["plan", "implement", "estrateg", "evit", "rescat", "solucion", "accion", "promocion", "oferta", "descuento", "combo", "liquid"] as const;
const PLAN_TYPOS = new Set(["plna", "paln"]);
const PLAN_PHRASE = /\b(?:que hago|como hago|que puedo hacer|como lo (?:vendo|muevo|saco))\b/;

const INVENTORY_TERMS = ["inventario", "stock", "existencia", "almacen", "bodega"] as const;
const LIST_CUE =
  /\b(?:que productos|cuales productos|que articulos|lista(?:do)?|catalogo|que hay|que tengo|que tenemos|productos (?:hay|tengo|tenemos|disponibles?|en|del)|inventario disponible)\b/;

const TREND_STEMS = ["tendencia", "crecimient", "caida", "rotacion"] as const;
const FALLING = /\b(?:caida|cae|caen|decae|decrece|desplome|baja|bajan)\b/;
const HIGH_CUE = /\b(?:mas alt[ao]|alt[ao]|mayor(?:es)?|mejor(?:es)?|crece|sube|top|crecimiento)\b/;
const LOW_CUE = /\b(?:mas baj[ao]|baj[ao]|menor(?:es)?|peor(?:es)?)\b/;
const SALES_RANK =
  /\b(?:(?:mas|menos) (?:se )?(?:vende|vendid[oa]s?)|se vende (?:mas|menos)|vende (?:mas|menos)|(?:mas|menos) ventas (?:tiene|tienen|genera|generan|registra))\b/;

const OUTLOOK_TERMS = ["agot", "cobertura"] as const;
const OUTLOOK_PHRASE = /\b(?:fin de mes|sin stock)\b/;

function trendDirection(normalized: string, tokens: string[]): "highest" | "lowest" | null {
  if (mentions(tokens, TREND_STEMS)) {
    // "mayor caída" is the weakest trend, not the strongest: words that mean falling decide first.
    if (FALLING.test(normalized)) return "lowest";
    const high = HIGH_CUE.exec(normalized)?.index ?? Infinity;
    const low = LOW_CUE.exec(normalized)?.index ?? Infinity;
    if (high === Infinity && low === Infinity) return null;
    return low < high ? "lowest" : "highest";
  }
  const sales = SALES_RANK.exec(normalized);
  if (!sales) return null;
  return /\bmenos\b/.test(sales[0]) ? "lowest" : "highest";
}

/**
 * Which analysis question the message is, or null when it is a plain store question for POST /chat
 * (a promotion request, a restock question, a product's own trend...). The first match wins, in this order.
 */
export function detectAnalysisIntent(message: string): AnalysisIntent | null {
  const normalized = normalizeMessage(message);
  if (!normalized) return null;
  const tokens = normalized.split(" ");

  if (PROMOTION_ANALYSIS.test(normalized)) return { kind: "promotion_plan" };

  if (mentions(tokens, WASTE_STEMS) || tokens.some((tk) => WASTE_WORDS.has(tk)) || WASTE_PHRASE.test(normalized)) {
    const wantsPlan = mentions(tokens, PLAN_STEMS) || tokens.some((tk) => PLAN_TYPOS.has(tk)) || PLAN_PHRASE.test(normalized);
    return { kind: "waste_risk", wantsPlan };
  }

  const outlook =
    (mentions(tokens, ["suficient"]) && mentions(tokens, INVENTORY_TERMS)) ||
    mentions(tokens, OUTLOOK_TERMS) ||
    OUTLOOK_PHRASE.test(normalized);
  if (!outlook && mentions(tokens, INVENTORY_TERMS) && LIST_CUE.test(normalized)) return { kind: "inventory_catalog" };

  const direction = trendDirection(normalized, tokens);
  if (direction) return { kind: "trend_ranking", direction };

  return outlook ? { kind: "stock_outlook" } : null;
}

# StockCopilot — Estándar visual

Fuente normativa del diseño de la interfaz. Todo componente nuevo o re-estilizado debe seguir este documento. Los tokens viven en `app/globals.css`; el copy visible en español vive en `lib/copy.ts` / `lib/labels.ts`.

Si este documento y `AGENTS.md` §5 se contradicen, **este documento manda** (y se actualizan ambos en el mismo cambio).

---

## 1. Principios

1. **El dato lleva el color.** Los fondos y el mapa base son neutros; solo los datos (riesgo, calor, escenarios, acción) usan color saturado. Un mapa base gris, una tarjeta blanca.
2. **Un solo título fuerte por pantalla.** Un único peso 800 (el título de página). Las secciones y los títulos de tarjeta usan 700, el cuerpo 500. Si todo es "negrita", nada destaca.
3. **Verde = acción / selección oscura = tinta.** El botón primario (acción, IA) es verde `primary`. La selección activa (segmentado, marcador, item activo) es tinta oscura `foreground`. Acción y selección nunca compiten por el mismo color.

Regla transversal: un color de estado nunca es el único medio para comunicar ese estado; siempre va con texto o icono.

---

## 2. Tokens

Todos los tokens están en `app/globals.css` (`@theme inline`). **No se usan valores hex literales** en componentes; tampoco los alias deprecados del mapa (marcados `/* DEPRECATED alias — remove in T09 */`). Los radios y la sombra se exponen como variables de `:root` y como utilidades Tailwind (`rounded-card`, `rounded-block`, `rounded-control`, `shadow-card`).

### Colores

| Token | Valor | Uso |
|---|---|---|
| `background` | `#f3f5f4` | Lienzo de la app |
| `foreground` | `#101828` | Texto principal · selección oscura (segmentado, marcador) |
| `card` | `#ffffff` | Fondo de tarjetas |
| `line` | `#e3e8e6` | Bordes y divisores |
| `muted` | `#5b6776` | Texto secundario |
| `subtle` | `#87928f` | Texto terciario, iconos apagados, placeholders |
| `sidebar` | `#0f1f1a` | Fondo del sidebar |
| `sidebar-text` | `#cfe3da` | Texto del sidebar |
| `sidebar-active` | `#1c4a3b` | Item activo del sidebar |
| `primary` | `#0b6e4f` | Acción principal, IA, historial |
| `primary-hover` | `#08523b` | Hover de `primary` |
| `primary-tint` | `#e3f3ec` | Tinte verde claro |
| `accent` | `#e8590c` | Pronóstico / promoción |
| `accent-tint` | `#fff1e6` | Tinte naranja claro |
| `accent-dark` | `#b34700` | Texto naranja sobre `accent-tint` |
| `alert` | `#c92a2a` | Quiebre / riesgo de stock |
| `alert-tint` | `#fdecec` | Tinte rojo claro |
| `alert-dark` | `#a31616` | Texto rojo sobre `alert-tint` |
| `info` | `#1d4e89` | Informativo / sobreabasto |
| `info-tint` | `#e7f0fb` | Tinte azul claro |
| `warning` | `#b7791f` | Advertencia / sin demanda |
| `warning-tint` | `#fff4d6` | Tinte ámbar claro |
| `warning-dark` | `#8a5a00` | Texto ámbar sobre `warning-tint` |
| `axis` | `#bdc8c4` | Ejes y líneas de referencia en gráficas |
| `heat-1 … heat-5` | `#fff3bf → #ffd43b → #ff922b → #e8590c → #a61e1e` | Escala de calor (bajo → alto) |
| `series-baseline` | `#86b6ef` | Escenario "día normal" / "Si no aceptas" |
| `series-scenario` | `#1c5cab` | Escenario "con evento" / "Si aceptas" |

### Otros tokens

| Token | Valor | Uso |
|---|---|---|
| `font-sans` | Manrope | Tipografía de toda la app (numerales tabulares) |
| `radius-card` | `16px` | Tarjetas de página, contenedores de mapa |
| `radius-block` | `12px` | Bloques interiores / tiles |
| `radius-control` | `10px` | Controles (botones, inputs, selects) |
| `shadow-card` | `0 1px 2px rgba(16,24,40,.04)` | Sombra mínima de tarjeta |

### Alias deprecados (no usar en código nuevo)

| Alias | Canonical |
|---|---|
| `ink` | `foreground` |
| `ink-secondary` | `muted` |
| `ink-muted` | `subtle` |
| `surface` | `card` |
| `plane` | `background` |
| `hairline` | `line` |
| `brand` | `primary` |
| `brand-soft` | `primary-tint` |
| `critical` | `alert` |
| `normal-day` | `series-baseline` |
| `with-event` | `series-scenario` |

---

## 3. Tipografía

Fuente Manrope, numerales tabulares para cifras (`font-variant-numeric: tabular-nums` ya está en `body`). Escala única; no se introducen tamaños ni pesos fuera de ella.

| Rol | Clase Tailwind | Tamaño / peso |
|---|---|---|
| Título de página | `text-[26px] font-extrabold leading-tight` | 26 / 800 |
| Título de sección | `text-lg font-bold` | 18 / 700 |
| Título de tarjeta | `text-base font-bold` | 16 / 700 |
| Cuerpo | `text-sm font-medium` | 14 / 500 |
| Apoyo (labels, pies) | `text-xs font-medium text-muted` | 12 / 500 muted |
| Valor de KPI | `text-2xl font-bold tracking-tight` | 24 / 700 |
| Micro (solo pies y tooltips) | `text-[11px] font-medium` | 11 / 500 |

Reglas:
- El peso 800 se reserva al título de página (uno por pantalla). Los títulos de tarjeta no pasan de 700.
- Las cifras usan `tabular-nums` (ya global); no repetir la clase salvo que un ancestro la desactive.
- KPI destacado ("Oportunidad detectada por IA") usa el mismo tamaño, solo cambia el fondo.

---

## 4. Superficies y radios

Tres niveles, de afuera hacia adentro:

1. **Lienzo** — `bg-background`. El fondo de la app.
2. **Tarjeta de página** — `bg-card` + `border-line` + `shadow-card`, radio `rounded-card` (16px), padding `p-4` o `p-5`.
3. **Bloque interior / tile** — `bg-background` o un tinte (`primary-tint`, `accent-tint`, …) dentro de una tarjeta, radio `rounded-block` (12px), **sin borde**.

| Nivel | Clase |
|---|---|
| Lienzo | `bg-background` |
| Tarjeta | `rounded-card border border-line bg-card shadow-card p-5` (o `<Card>`) |
| Bloque interior | `rounded-block bg-background p-4` (o `<Card variant="inset">`) |
| Control | `rounded-control` (10px) |

**No tarjeta dentro de tarjeta**: las secciones de un panel se separan con bloques interiores o divisores (`border-t border-line`), nunca con otra tarjeta con borde.

---

## 5. Componentes base

Viven en `components/ui/*`. Las pantallas **no** redefinen estas piezas con clases propias; si falta una variante, se amplía el componente.

### Card

```tsx
<Card variant="default">…</Card>   // tarjeta de página: rounded-card border-line bg-card shadow-card p-5
<Card variant="inset">…</Card>     // bloque interior: rounded-block bg-background p-4, sin borde
<Card variant="highlight">…</Card> // énfasis: bg-sidebar text-white (único por fila, p. ej. KPI IA)
```

### Button

```tsx
<Button variant="primary">Aceptar</Button>   // acción: bg-primary text-white hover:bg-primary-hover
<Button variant="secondary">…</Button>        // bg-card text-foreground border-line
<Button variant="ghost">…</Button>            // transparente, text-primary hover:bg-primary-tint
<Button variant="danger">…</Button>           // bg-alert text-white
<Button variant="accent">…</Button>           // bg-accent text-white
```

Tamaños: `md` (`min-h-11`, 44px) para acciones primarias, `sm` (`min-h-10`, 40px) para botones pequeños. Radio `rounded-control`.

### Badge

`tone`: `green | orange | red | blue | amber | gray`. Ejemplos:

| tone | Clase |
|---|---|
| `green` | `bg-primary-tint text-primary` |
| `orange` | `bg-accent-tint text-accent-dark` |
| `red` | `bg-alert-tint text-alert-dark` |
| `blue` | `bg-info-tint text-info` |
| `amber` | `bg-warning-tint text-warning-dark` |
| `gray` | `bg-line text-muted` |

### Kpi

Reemplaza los KPIs inline de `KpiCards` y `StoreDemandKpis`, y a `StatTile`. Un solo chip de icono de 36px + valor 24/700 + pie de contexto.

```tsx
<Kpi
  label="Ticket por venta"
  value="$48.20"
  icon={Receipt}
  caption="vs. mes anterior"
  delta={+0.034}            // fracción; solo formateo, sin cálculo en cliente
  tone="green"              // color del chip (opcional)
  variant="default"         // default | highlight (highlight = fondo oscuro)
/>
```

Estructura: `rounded-card border-line bg-card shadow-card p-4`, chip `flex size-9 items-center justify-center rounded-[10px]`, valor `text-2xl font-bold tracking-tight`, pie `text-xs text-muted`.

### SegmentedControl

```tsx
<SegmentedControl
  label="Rango"
  options={[{ value: "week", label: "Semana" }, …]}
  value={value}
  onChange={setValue}
/>
```

Contenedor `rounded-control border-line bg-background p-1`. Opción activa `bg-foreground text-white` (selección oscura); inactiva `text-muted hover:text-foreground`. Alto de opción ≥ 40px, foco visible.

### Select / SearchField

Ambos con etiqueta accesible (visible o `sr-only`), alto `min-h-11` (44px), radio `rounded-control`, borde `border-line`, foco `ring-2 ring-primary/15`.

```tsx
<Select id="store" label="Sucursal" value={…} onChange={…}>…</Select>
<SearchField id="q" label="Buscar producto" onSearch={setQ} delayMs={300} />
```

El mapa define `selectClass`; eso se sustituye por `<Select>` / `<SearchField>` en vez de duplicar clases.

### PanelSection

Sección de un panel lateral (27rem) sin borde propio: título + descripción + contenido.

```tsx
<PanelSection title="Efecto del evento" description="Cambio proyectado…">
  …contenido…
</PanelSection>
```

Se separan con divisores (`border-t border-line`) o bloques interiores, nunca tarjetas anidadas.

### DataLegend

Leyenda de gráfica/mapa: items `{ token, label, shape }` donde `shape` es `"line" | "area" | "dot" | "square"`.

```tsx
<DataLegend items={[
  { token: "foreground", label: "Historial", shape: "line" },
  { token: "primary", label: "Pronóstico", shape: "dot" },
]} />
```

Los colores se leen del token canónico (no hex), en español, con los mismos tokens que la gráfica.

### StatusMessage / Skeleton / States

```tsx
<StatusMessage tone="empty" title="Sin datos" description="…" action={…} />  // icono + texto, nunca solo color
<StatusMessage tone="error" title="No pudimos cargar" description="…" action={<Button onClick={retry}>Reintentar</Button>} />

<Skeleton className="h-[124px] rounded-card" />  // conserva las dimensiones del contenido

<ErrorState onRetry={refetch} />  // role="alert", botón Reintentar
<EmptyState title="…" text="…" action={…} />     // borde discontinuo
```

Todo panel con datos remotos muestra esqueleto en carga, estado vacío con instrucción y error con "Reintentar".

---

## 6. Patrones de pantalla

- **Encabezado** (`PageHeader`): título `text-[26px] font-extrabold`, subtítulo `text-sm text-muted`, badge "Datos de ejemplo" junto al título, controles de la página a la derecha.
- **Fila de KPIs**: `<Kpi>` en grid de 2 columnas (≥ 640px) y 4–5 columnas (≥ 1280px). El KPI "Oportunidad detectada por IA" es el único `variant="highlight"` de la fila.
- **Barra de filtros**: una sola barra sobre el contenido, controles de ≥ 40px, con `Select`, `SearchField` y `SegmentedControl` del estándar.
- **Maestro-detalle**: contenido fluido + panel lateral de ancho fijo **27rem** (`w-[27rem]`, scroll propio) en ≥ 1280px; el panel se apila debajo en pantallas menores.
- **Estados**: cada pantalla/panel muestra esqueleto → vacío → error con los componentes de §5.

---

## 7. Mapas y gráficas

- **Mapa base neutro**: clase `.basemap-neutral` sobre el contenedor (aplica `filter: grayscale(1) brightness(1.04) contrast(0.9)` a `.leaflet-tile-pane`). El contenedor `.leaflet-container` usa `radius-card` y no introduce fondos de color propios.
- **Escala de calor**: `heat-1 → heat-5` (`#fff3bf → #ffd43b → #ff922b → #e8590c → #a61e1e`), igual en mapa de demanda y mapa de calor del dashboard.
- **Marcadores**: enfocables con teclado, tooltip "Retail <colonia>" + valor principal, crecen al hover/foco. Selección = anillo `foreground`, sin cambiar el relleno de riesgo.
- **Leyendas**: visibles, en español, con los mismos tokens que la gráfica (`DataLegend`).
- **Panel de detalle**: lateral de 27rem con `PanelSection`, scroll propio en ≥ 1280px, debajo del mapa en menores.
- **Comparativo "Si no aceptas / Si aceptas"**: lado a lado con `series-baseline` ("Si no aceptas") y `series-scenario` ("Si aceptas"), mismo componente en gráfica, tarjeta y tabla. Las cifras vienen del backend; el cliente solo formatea o resta dos valores ya enviados.
- **Gráficas Recharts**: línea sólida = historial (`foreground`), discontinua = pronóstico (`accent`), banda sombreada = incertidumbre, ejes en `axis`. Sin dependencias nuevas.

---

## 8. Accesibilidad

- Controles interactivos ≥ 44px (40px en botones pequeños); áreas de clic reales.
- Foco visible en todo control (`focus-visible` con `ring-2 ring-primary/15` o `outline-2 outline-primary`).
- Botones solo-icono con `aria-label` en español y área ≥ 44×44.
- Elementos semánticos reales: `<button>`, `<a>`, `<select>`, `<dialog>`, `role` correcto en componentes compuestos.
- Contraste WCAG AA; un color de estado nunca es el único indicador (siempre texto o icono).
- Gráficas accesibles: leyenda textual o tabla equivalente para lectores de pantalla.
- Sin scroll horizontal de la página a 1440px y 1024px.

---

## 9. Copy

- Todo texto visible en **español (es-MX)** y en `lib/copy.ts` o `lib/labels.ts` (`t(kind, code)` para códigos del dataset). Nada de literales en inglés dentro de los componentes.
- Glosario de `AGENTS.md` §6: usar los términos exactos ("Ticket por venta", "Artículos sin stock", "Si no aceptas / Si aceptas", …).
- Formatos con `Intl` `es-MX` (`lib/format.ts`): moneda MXN como `$12,800` ("MXN" solo si hay ambigüedad), fechas `Intl.DateTimeFormat`.
- Proporciones como fracciones (`0.10` = 10%); el formateo es lo único que se permite en cliente, nunca cálculo.

---

## 10. Tabla de migración "antes → después"

Clases reales del repo (estilo original y del mapa) → clases del estándar.

| Antes | Después |
|---|---|
| `text-ink` | `text-foreground` |
| `text-ink-secondary` | `text-muted` |
| `text-ink-muted` | `text-subtle` |
| `bg-surface` | `bg-card` |
| `bg-surface/95` | `bg-card/95` |
| `bg-plane` | `bg-background` |
| `border-ink/10` | `border-line` |
| `border-hairline` | `border-line` |
| `bg-brand` | `bg-primary` |
| `text-brand` | `text-primary` |
| `bg-brand-soft` | `bg-primary-tint` |
| `hover:bg-brand-soft/30` | `hover:bg-primary-tint/30` |
| `text-critical` | `text-alert` |
| `focus-visible:outline-brand` | `focus-visible:outline-primary` |
| `bg-ink text-white` (botón del mapa) | `<Button variant="primary">` |
| `bg-ink` (opción activa del segmentado) | `bg-foreground` |
| `hover:bg-ink/[0.05]` | `hover:bg-background` |
| `bg-ink/[0.06]` | `bg-foreground/5` |
| `rounded-xl border border-ink/10 bg-surface` (StatTile/bloque) | `Card variant="inset"` o `<Kpi>` |
| `rounded-2xl border border-line bg-white p-5` (Card actual) | `<Card>` (default) |
| `shadow-[0_1px_2px_rgba(11,11,11,0.04)]` | `shadow-card` |
| `text-[28px] font-extrabold leading-none tabular-nums` (KPI) | `<Kpi>` (`text-2xl font-bold tracking-tight`) |
| `text-[26px] font-extrabold leading-tight` (título) | `<PageHeader title>` (único 800) |
| `text-3xl font-semibold tracking-tight text-ink` (valor grande) | `text-2xl font-bold tracking-tight text-foreground` |
| `text-[#FFB070]` (KPI IA) | `Kpi variant="highlight"` |
| `bg-[#FFF4D6] text-[#8A5A00]` (badge ámbar) | `Badge tone="amber"` (`warning-tint` / `warning-dark`) |
| `bg-[#EEF1F0]` (badge/chip gris) | `Badge tone="gray"` (`bg-line`) |
| `text-[#7f4b00] bg-[#fff0d2]` (KPI uplift) | `warning-dark` / `warning-tint` |
| `text-critical bg-[#fbe2e2]` | `alert` / `alert-tint` |
| `text-[#16785f] bg-[#d9f0e8]` | `primary` / `primary-tint` |
| `h-10 rounded-lg border border-ink/10 bg-surface px-3 text-sm` (selectClass) | `<Select>` / `<SearchField>` |
| `bg-normal-day` | `bg-series-baseline` |
| `bg-with-event` | `bg-series-scenario` |
| `ring-surface` | `ring-card` |
| `.opportunity-map .leaflet-tile-pane` (filtro gris) | `.basemap-neutral .leaflet-tile-pane` |

---

## 11. Checklist de revisión para PRs

- [ ] Sin hex literales en `components/**` / `app/**` (solo tokens de `globals.css`); sin alias deprecados (`ink`, `surface`, `plane`, `hairline`, `brand`, `critical`, `normal-day`, `with-event`).
- [ ] Toda clase de color/radio/sombra resuelve a un token del estándar.
- [ ] Tipografía dentro de la escala (§3); un solo peso 800 por pantalla; KPI en 24/700 con chip de icono.
- [ ] Superficies de 3 niveles, sin tarjeta dentro de tarjeta (§4).
- [ ] Componentes base usados, no redefinidos con clases propias (§5).
- [ ] Texto visible en español desde `lib/copy.ts` / `lib/labels.ts`; sin literales en inglés.
- [ ] Sin cálculos financieros en cliente (solo formateo).
- [ ] Controles ≥ 40px (44px primarios), foco visible, `aria-label` en iconos, semántica real.
- [ ] Estados loading/vacío/error con los componentes estándar.
- [ ] Sin scroll horizontal a 1440px y 1024px.
- [ ] `pnpm tsc --noEmit`, `pnpm lint` y `pnpm build` pasan.

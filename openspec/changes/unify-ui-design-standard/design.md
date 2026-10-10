## Context

Ver `proposal.md` para la motivación. Estado actual relevante:

- `app/globals.css` define dos paletas en el mismo `@theme`: la de `AGENTS.md` §5 (`background`, `card`, `line`, `muted`, `primary`, `accent`, `alert`, `info`, `heat-1..5`, `sidebar*`) y la del mapa (`ink`, `ink-secondary`, `ink-muted`, `surface`, `plane`, `hairline`, `axis`, `brand`, `critical`, `normal-day`, `with-event`). Los valores de ambas son casi idénticos (`ink` = `foreground` = `#101828`, `plane` = `background`, `hairline` = `line`), así que es un problema de nombres y de uso, no de color.
- 31 archivos usan alias del mapa; 18 contienen hex literales. `StoreDemandKpis` agrega datos en el cliente y todo `components/opportunities/*` tiene texto en inglés fuera de `lib/copy.ts`.
- Diferencias de lenguaje (lo que el equipo prefiere es la columna "Mapa"):

| Aspecto | Original | Mapa |
|---|---|---|
| Valor de KPI | 28 px extrabold, tarjeta alta | 20–24 px semibold, chip de icono, pie de contexto |
| Tarjeta | `rounded-2xl`, `p-5` | `rounded-xl`, borde `ink/10`, sombra mínima |
| Control activo | Botón verde | Segmentado en tinta oscura |
| Mapa base | Mosaico a color | Gris atenuado; el dato aporta el color |
| Detalle | Página o modal | Panel lateral de 27 rem con secciones |
| Jerarquía | Pesos 700–800 en casi todo | Un único título fuerte, resto 500–600 |
| Copy | `lib/copy.ts` (es-MX) | Literal en inglés |

- Restricciones del repo: Tailwind v4 (`@theme inline`), Next.js 16 con `cacheComponents`, sin dependencias nuevas, sin cálculos financieros en el cliente, UI en español.

## Goals / Non-Goals

**Goals:**
- Un estándar que se pueda aplicar mecánicamente: tokens canónicos, escala tipográfica, 3 radios, 3 superficies, un puñado de componentes base con variantes cerradas.
- Que el resultado final se sienta "más mapa" (sobrio, el dato lleva el color) sin perder la marca ni la accesibilidad del diseño aprobado.
- Dejar `docs/design-guidelines.md` suficientemente concreto (valores y ejemplos de clases) como para que un agente lo siga sin ver otras pantallas.
- Que las ~7,800 líneas de componentes se re-estilicen en paralelo con riesgo bajo de conflictos.

**Non-Goals:**
- Modo oscuro, theming dinámico o librería de componentes externa (shadcn, etc.).
- Cambios de comportamiento, de rutas de negocio, de schemas o de contrato con el backend.
- Rediseñar las gráficas de Recharts más allá de colores, ejes, leyenda y tooltip.

## Decisions

### D1. Nombres canónicos: se quedan los de `AGENTS.md`; los del mapa se vuelven alias temporales
Se conservan `background`, `foreground`, `card`, `line`, `muted`, `primary*`, `accent*`, `alert*`, `info*`, `heat-*`, `sidebar*` porque están documentados y usados en la mayoría de los componentes. Los alias del mapa se redefinen en `globals.css` como `var(--color-<canónico>)` y se marcan `/* DEPRECATED alias, remove in T09 */`, de modo que **nada se rompe mientras los agentes migran en paralelo** y el último paso los borra.
Tokens nuevos: `subtle` (`#87928F`, antes `ink-muted`), `axis` (`#BDC8C4`), `warning` / `warning-tint` / `warning-dark` (`#B7791F` / `#FFF4D6` / `#8A5A00`, sustituye los hex ámbar sueltos), `series-baseline` (`#86B6EF`) y `series-scenario` (`#1C5CAB`) para "día normal / con evento", y `shadow-card` (`0 1px 2px rgba(16,24,40,.04)`).
*Alternativa descartada:* adoptar los nombres semánticos del mapa (`ink/surface/plane`). Son más descriptivos, pero obligaría a reescribir `AGENTS.md`, el glosario y más archivos sin ganancia visual.

### D2. Qué se toma de cada estilo

| Decisión | Valor | Origen |
|---|---|---|
| Identidad de color y semántica | verde / naranja / rojo / azul / ámbar | Original |
| Sidebar oscuro, Manrope, targets ≥ 44 px, es-MX | sin cambio | Original |
| Valor de KPI | `text-2xl font-bold tracking-tight`, chip de icono 36 px, pie `text-xs` | Mapa |
| Tarjeta de página | `rounded-2xl` (16) + `border-line` + `shadow-card`, padding `p-4`/`p-5` | Híbrido |
| Bloque interior / tile | `rounded-xl` (12), fondo `background` o tinte | Mapa |
| Control | alto 40 px (44 px en acciones primarias), `rounded-[10px]`, anillo de foco `primary/15` | Híbrido |
| Control segmentado activo | fondo `foreground`, texto blanco | Mapa |
| Botón primario | verde `primary` (el negro del mapa pasa a verde) | Original |
| Jerarquía | un solo `800` por pantalla (título); secciones 700; cuerpo 500; apoyo 500 `muted` | Mapa |
| Mapa base | filtro gris compartido por ambos mapas | Mapa |
| Detalle | panel lateral `27rem` con `PanelSection` | Mapa |

Escala tipográfica: página 26/800 · sección 18/700 · tarjeta 16/700 · cuerpo 14/500 · apoyo 12/500 `muted` · KPI 24/700 · micro 11/500 solo en pies y tooltips.

### D3. Botones oscuros del mapa → botón primario verde
El mapa usa `bg-ink` para "Try again" y "Compare…". Se unifica a `Button variant="primary"`; la tinta oscura queda reservada al **estado seleccionado** (segmentado, anillo de selección del marcador). Así acción y selección nunca compiten.

### D4. Componentes base nuevos o ampliados
`Card` (variantes `default | inset | highlight`), `Kpi` (reemplaza `StatTile` y los KPIs inline de `KpiCards` y `StoreDemandKpis`; props `label`, `value`, `icon?`, `caption?`, `delta?`, `tone?`, `variant: default | highlight`), `PanelSection` (título + descripción + contenido, sin borde propio), `DataLegend` (items `{ token, label, shape }`), y ampliar `SegmentedControl`, `Select`, `SearchField` y `Button` para cubrir lo que el mapa define por su cuenta (`selectClass`, etc.). `StatTile` se mantiene como reexport hasta T09.
*Alternativa descartada:* extraer solo clases utilitarias (`@apply`). No fuerza consistencia de estructura y los agentes tienden a copiar clases con variaciones.

### D5. El mapa deja de ser un módulo aparte
- Sus textos se mueven a `lib/copy.ts` bajo `copy.opportunities` (solo la tarea del mapa toca `copy.ts` mientras corre la ola A).
- `StoreDemandKpis` deja de reducir `predictions`: la agregación pasa a `lib/api/opportunityMap.ts` (capa de datos, mock) devolviendo `summary`, con `// TODO(backend):`. Cumple la regla "sin cálculo en cliente" sin cambiar números.
- `/opportunities` se mueve a `app/(app)/opportunities/page.tsx` y `OpportunityMapFrame` pierde su rama "pantalla completa" (`min-h-dvh`, `<main>` propio); queda solo la rama embebida más `PageHeader` en la página.
- `opportunityMap.css` usa `var(--color-…)` en lugar de hex; el filtro de mosaico gris se comparte con `components/map/*` mediante una clase `.basemap-neutral` en `globals.css`.

### D6. Ejecución con el flujo multiagente del repo
Se sigue `openspec/MULTIAGENT_WORKFLOW.md` tal cual (Claude orquesta; DeepSeek `deepseek-v4-pro` ejecuta y valida con `claude -p` en worktrees; Claude valida al final). Verificado en este equipo: las variables `DEEPSEEK_*` existen en el entorno de usuario y el smoke test respondió.

Reparto (archivos de escritura disjuntos; `lib/copy.ts` solo para T05 en la ola A):

| Id | Quién | Archivos permitidos | Depende de |
|---|---|---|---|
| T00 | Claude | rama `design/unify-ui-standard`, commit base (incluye los 3 archivos del mapa sin commitear), `.agents/` en `.gitignore`, `plan.md` y fichas | — |
| T01 | **Claude** (decisión de diseño, no se delega) | `docs/design-guidelines.md`, `app/globals.css` (tokens, alias, `.basemap-neutral`), `AGENTS.md` §5 | T00 |
| T02 | Ejecutor + 2 validadores | `components/ui/**` (Kpi, PanelSection, DataLegend nuevos; Card, Button, Badge, Segmented, Select, SearchField, States, Skeleton, Meter, Tabs, Modal ajustados) | T01 |
| T03 | Ejecutor | `components/layout/**`, `app/login/**`, `app/(app)/layout.tsx`, `app/(app)/opportunities/page.tsx`, borrar `app/opportunities/**` | T02 |
| T04 | Ejecutor | `components/dashboard/**`, `components/map/**` | T02 |
| T05 | Ejecutor | `components/opportunities/**`, `lib/opportunities/**`, `lib/api/opportunityMap.ts`, `lib/copy.ts` | T02 |
| T06 | Ejecutor | `components/product/**`, `components/strategy/**`, `components/chat/**` (solo estilos) | T02 |
| T07 | Ejecutor | `components/calendar/**` | T02, tras ola A |
| T08 | Ejecutor | `components/stock/**`, `components/catalog/**` | T02, tras ola A |
| T09 | **Claude** | Quitar alias, barrido de hex e inglés, `AGENTS.md`, recorrido visual 1440/1024 en mock normal/vacío/error, `tsc`, `lint`, `build`, marcar `tasks.md`, commit | T03–T08 |

Olas: A = T03–T06 (4 en paralelo, tope del flujo), B = T07–T08. Cada ficha incluye la sección correspondiente de `docs/design-guidelines.md` copiada (no solo enlazada), el archivo ya migrado que sirve de modelo y la lista de "antes → después" de clases.

### D7. Lo que los agentes no pueden hacer lo hace Claude
Los ejecutores DeepSeek no ven capturas, así que el criterio visual (jerarquía, densidad, alineación) se revisa en T09 con el servidor de desarrollo y capturas a 1440 y 1024 px; los validadores comprueban reglas objetivas (tokens, copy, alto de controles, `aria-label`, `tsc`, `lint`).

## Risks / Trade-offs

- **Los alias temporales ocultan migraciones incompletas** → T09 hace un barrido por `grep` de alias, hex y texto en inglés; los validadores lo ejecutan por tarea sobre sus archivos.
- **Conflictos en `lib/copy.ts` o `globals.css` entre ramas paralelas** → solo T05 toca `copy.ts` en la ola A, solo Claude toca `globals.css`; los demás agentes lo tienen en "solo lectura" y reportan lo que falte en vez de añadirlo.
- **DeepSeek no disponible o con rate limit** → degradación documentada en el flujo: mismas fichas con subagentes de Claude (`Agent`), solo cambia el transporte.
- **Un agente cambia comportamiento al "limpiar"** → las fichas prohíben tocar hooks, schemas y lógica; el validador compara `git diff` contra archivos permitidos y busca cambios en imports de `lib/api`.
- **Reducir KPIs de 28 px a 24 px y quitar el peso 800 afecta la legibilidad en la demo** → se decide tras ver el dashboard en T09; el valor vive en un único token tipográfico, cambiarlo es una línea.
- **Cacheo de rutas (`cacheComponents`) con Leaflet** → no se toca la corrección ya hecha en `StoreDemandMapCanvas` (host ref); se verifica que mover `/opportunities` no reintroduce "Map container is being reused".
- **Cambios del mapa sin commitear** (`BranchAnalysis`, `OpportunityMapScreen`, `StoreDemandMapCanvas`) → se comitean en T00 en la rama nueva; los worktrees parten de ahí. Si se prefiere no comitearlos, hay que estabilizarlos primero.

## Migration Plan

1. T00: rama `design/unify-ui-standard` desde `main` (el flujo menciona `dev`, pero `dev` está 2 commits detrás de `main`).
2. Fundaciones (T01, T02) → olas A y B → T09. Cada rama `agent/Txx` se integra por orden de dependencia con `--no-ff` tras la validación final de Claude.
3. Rollback: cada tarea es una rama independiente; revertir una pantalla es revertir su merge. Los alias de token se retiran en el último commit para que el resto sea reversible por separado.
4. Al terminar: archivar el change (`/opsx:archive`) para promover los tres specs a `openspec/specs/`.

## Open Questions

- ¿El link "Mapa de demanda" (`/opportunities`) debe aparecer en el sidebar o solo se accede desde el dashboard? Se asume **no** (el dashboard ya lo embebe) y la ruta queda solo como vista ampliada; se puede añadir después sin cambiar specs.

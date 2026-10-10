## Why

La interfaz hoy tiene **dos lenguajes visuales** conviviendo en la misma pantalla. El original (dashboard, estrategias, calendario, stock) es de peso alto y tarjetas grandes: Manrope extrabold, KPIs de 28 px, `rounded-2xl`, tokens `foreground/card/line/muted`, copy en español. El del **mapa de demanda** que sumó un compañero (`components/opportunities/*`) es más sobrio y legible: mapa base en gris para que el color lo ponga el dato, KPIs con chip de icono, panel lateral de detalle, controles segmentados en negro, jerarquía en semibold y tokens `ink/surface/plane/hairline`. El equipo prefiere el estilo del mapa, pero no hay una regla escrita: cada pantalla nueva elige uno al azar, hay hex sueltos (`#fff0d2`, `#7f4b00`, `#16785f`…) y el módulo del mapa rompe reglas del repo (copy en inglés fuera de `lib/copy.ts`, agregaciones calculadas en el cliente, página fuera del shell autenticado).

Conviene unificar ahora, antes de seguir añadiendo pantallas, y dejar el resultado como **estándar documentado** que el equipo y los agentes puedan seguir sin preguntar.

## What Changes

- Definir un **estándar visual único** que toma lo mejor de cada estilo: la sobriedad, jerarquía y lenguaje de datos del mapa + la identidad de marca (verde / naranja de pronóstico / rojo de alerta / azul informativo), el sidebar oscuro, Manrope y los targets ≥ 44 px del diseño aprobado.
- Escribir `docs/design-guidelines.md` como **documento normativo** de lineamientos (principios, tokens, tipografía, superficies, componentes, patrones de pantalla, mapas y gráficas, estados, accesibilidad, copy) y enlazarlo desde `AGENTS.md` §5.
- Consolidar tokens en `app/globals.css`: un solo juego canónico, los alias del mapa (`ink`, `surface`, `plane`, `hairline`, `brand`, `critical`…) pasan a ser alias temporales y se eliminan al final; los hex sueltos pasan a tokens (incluidos tintes ámbar y los colores de serie "día normal / con evento").
- Rediseñar los componentes base de `components/ui/*` (Card, Button, Badge, StatTile con icono, SegmentedControl, Select/Field, nuevos `PanelSection` y `DataLegend`) para que ambas familias de pantallas usen las mismas piezas.
- Re-estilizar **todas las pantallas** con el estándar: shell y login, dashboard (KPIs, plan, comportamientos, ranking, chat), detalle de producto/estrategia, calendario, stock, proveedores, productos y el módulo del mapa.
- **BREAKING (convención)**: el módulo `components/opportunities/*` deja de tener copy en inglés y deja de tener su propia paleta; sus textos pasan a `lib/copy.ts` (es-MX) y las agregaciones que hoy hace `StoreDemandKpis` en el cliente pasan a la capa de datos con `// TODO(backend):`.
- La ruta `/opportunities` pasa a vivir dentro del shell autenticado (`app/(app)/`), con el mismo `PageHeader` y badge "Datos de ejemplo".
- Ejecución con el flujo `openspec/MULTIAGENT_WORKFLOW.md`: Claude define estándar, tokens y fichas; agentes DeepSeek ejecutan las pantallas en paralelo en worktrees y otros validan; Claude hace la validación final.

Fuera de alcance: cambiar contratos de API, schemas, lógica de negocio, mocks de dominio o agregar dependencias; modo oscuro; rediseñar el flujo del chat CopilotKit (change `integrate-copilot-agent-chat`), solo se le aplican tokens y superficies.

## Capabilities

### New Capabilities
- `ui-design-system`: tokens, tipografía, superficies, componentes base y reglas de accesibilidad/copy que todas las pantallas deben cumplir; incluye el documento `docs/design-guidelines.md` como fuente normativa.
- `data-visualization-style`: cómo se ven los mapas, marcadores, leyendas, gráficas y comparativos (escala de calor, colores de serie, mapa base neutro, tooltips, paneles de detalle).
- `screen-layout-patterns`: patrones de composición por pantalla (encabezado, fila de KPIs, barra de filtros, maestro-detalle, estados loading/vacío/error) y su aplicación a cada ruta.

### Modified Capabilities
<!-- Ninguna: `openspec/specs/` aún no contiene capacidades archivadas que cubran la UI visual. -->

## Impact

- Código: `app/globals.css`, `components/ui/*`, `components/layout/*`, `components/dashboard/*`, `components/strategy/*`, `components/product/*`, `components/calendar/*`, `components/stock/*`, `components/catalog/*`, `components/chat/*` (solo estilos), `components/opportunities/**`, `components/map/*`, `app/opportunities/*` → `app/(app)/opportunities/*`, `lib/copy.ts`, `lib/opportunities/*` y `lib/api/opportunityMap.ts` (mover agregaciones).
- Docs: nuevo `docs/design-guidelines.md`; `AGENTS.md` §5 apunta al nuevo documento y actualiza la tabla de tokens.
- Dependencias: ninguna nueva. APIs y schemas: sin cambios.
- Proceso: se usan worktrees `../r2t-worktrees/Txx`, ramas `agent/Txx` y `.agents/` (a `.gitignore`). Los cambios sin commitear del mapa (`BranchAnalysis`, `OpportunityMapScreen`, `StoreDemandMapCanvas`) deben quedar comiteados antes de crear los worktrees para que los agentes partan de ellos.

## 1. Preparación y orquestación (T00, Claude)

- [ ] 1.1 Crear la rama `design/unify-ui-standard` desde `main` y comitear los cambios pendientes del mapa (`BranchAnalysis`, `OpportunityMapScreen`, `StoreDemandMapCanvas`) como commit base separado
- [ ] 1.2 Agregar `.agents/` a `.gitignore` y crear `.agents/unify-ui-design-standard/{tasks,reports,verdicts,logs}`
- [ ] 1.3 Repetir el smoke test de DeepSeek (`claude -p "Responde solo: OK"` con las variables `DEEPSEEK_*` de usuario) y confirmar `pnpm install` en un worktree de prueba
- [ ] 1.4 Escribir `.agents/unify-ui-design-standard/plan.md` con la tabla de tareas T02–T08 de `design.md` D6 y las fichas `T02.md`–`T08.md` (incluyen las reglas de oro de `MULTIAGENT_WORKFLOW.md` §4, la sección relevante de los lineamientos copiada y la lista "antes → después" de clases)

## 2. Estándar y tokens (T01, Claude; no se delega)

- [ ] 2.1 Redactar `docs/design-guidelines.md`: principios, tokens, escala tipográfica, superficies y radios, componentes base y variantes, patrones de pantalla, mapas y gráficas, estados, accesibilidad, copy, y una tabla "antes → después" para migrar clases del mapa y del estilo original
- [ ] 2.2 Actualizar `app/globals.css`: tokens nuevos (`subtle`, `axis`, `warning*`, `series-baseline`, `series-scenario`, `shadow-card`, `--radius-block`), alias del mapa redefinidos a tokens canónicos con marca de obsolescencia y clase `.basemap-neutral`
- [ ] 2.3 Enlazar el documento desde `AGENTS.md` §5 y alinear su tabla de tokens con `globals.css`
- [ ] 2.4 Verificar `pnpm tsc --noEmit`, `pnpm lint` y que la app compila con los alias aún activos

## 3. Componentes base (T02, ejecutor DeepSeek + 2 validadores)

- [ ] 3.1 Crear `Kpi` (con chip de icono, pie, variación, variante destacada), `PanelSection` y `DataLegend` en `components/ui/`
- [ ] 3.2 Ajustar `Card` (variantes `default | inset | highlight`, sombra y radios del estándar), `Button`, `Badge` (tono ámbar con tokens `warning*`), `SegmentedControl`, `Select`, `SearchField`, `Field`, `Meter`, `Tabs`, `Modal`, `Skeleton`, `States` y `StatusMessage`
- [ ] 3.3 Mantener `StatTile` como reexport de `Kpi` hasta T09
- [ ] 3.4 Validadores: V-A (ficha y reglas del repo) y V-B (a11y, alto de controles, foco, sin hex); validación final de Claude y merge

## 4. Ola A — Shell, dashboard, mapa y producto (T03–T06, en paralelo, máx. 4)

- [ ] 4.1 T03: re-estilizar `components/layout/**` y login; mover `/opportunities` a `app/(app)/opportunities/page.tsx` con `PageHeader` y borrar `app/opportunities/**`; verificar redirección a `/login` sin sesión
- [ ] 4.2 T04: migrar `components/dashboard/**` a `Kpi`, barra de filtros y secciones estándar; migrar `components/map/**` al mapa base neutro compartido, leyenda con `DataLegend` y botón "volver a la vista general" igual al del mapa de demanda
- [ ] 4.3 T05: migrar `components/opportunities/**` a los componentes y tokens del estándar; mover todo su texto a `copy.opportunities` en `lib/copy.ts` (es-MX); mover la agregación de `StoreDemandKpis` a `lib/api/opportunityMap.ts` con `// TODO(backend):`; reemplazar hex de `opportunityMap.css` por variables; simplificar `OpportunityMapFrame` a la rama embebida
- [ ] 4.4 T06: migrar `components/product/**`, `components/strategy/**` y los estilos de `components/chat/**` (colores de serie, comparativo "Si no aceptas / Si aceptas", leyenda de la gráfica, panel de promoción) sin tocar hooks ni lógica
- [ ] 4.5 Por cada tarea: validador de sesión nueva, validación final de Claude (diff completo, reglas del repo, `tsc`, `lint`) y merge en orden de dependencia

## 5. Ola B — Calendario, stock y catálogos (T07–T08)

- [ ] 5.1 T07: migrar `components/calendar/**` (cuadrícula mensual, barra lateral de restock y proveedores, modal de orden, capas de contexto) al estándar de maestro-detalle y estados
- [ ] 5.2 T08: migrar `components/stock/**` y `components/catalog/**` (tabla, resumen, barras de nivel, editor de mínimos/máximos, proveedores) al estándar
- [ ] 5.3 Por cada tarea: validador, validación final de Claude y merge

## 6. Cierre y verificación (T09, Claude)

- [ ] 6.1 Retirar los alias del mapa de `globals.css` y el reexport de `StatTile`; barrido con `grep` de alias, hex literales y texto en inglés en `components/**` y `app/**` (cero resultados)
- [ ] 6.2 Ejecutar `pnpm tsc --noEmit`, `pnpm lint` y `pnpm build` sin errores nuevos
- [ ] 6.3 Recorrer en `pnpm dev` todas las rutas en mock (Normal / Vacío / Error) a 1440 px y 1024 px: sin scroll horizontal, sin errores de consola, sin "Map container is being reused", foco visible y estados loading/vacío/error
- [ ] 6.4 Capturar antes/después del dashboard, el mapa y el detalle de producto y ajustar tokens tipográficos si el KPI de 24 px/700 resta legibilidad
- [ ] 6.5 Confirmar que `docs/design-guidelines.md` y `AGENTS.md` §5 coinciden con `globals.css` y que cada requisito de los tres specs tiene su comprobación
- [ ] 6.6 Marcar este `tasks.md`, comitear, limpiar worktrees `../r2t-worktrees/Txx` y ramas `agent/Txx`, y archivar el change con `/opsx:archive`

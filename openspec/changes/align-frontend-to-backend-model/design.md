## Context

Estado actual: `lib/mock/engine.ts` calcula KPIs, promociones (fórmula de uplift), stock y reabasto a partir de 7 sucursales y 10 productos; los componentes llaman hooks de `lib/api/hooks.ts` pero algunos importan el mock directamente (`categories`, `promoGain`, `nextDeliveryDate`, `resetState`). El reloj del navegador define "hoy". Ver `proposal.md` para la motivación.

Backend (repo hermano `BackendRoad2Tech`, milestones M0–M9): dataset v2 (25 tiendas, 120 productos, 19 proveedores con ofertas en `supplier_products`, `ticket_lines`, `inventory_daily`, `promotion_campaigns` con control, `forecast_context`), 7 endpoints M0 (`tendency`, `strategies:generate`, `strategies:prompt`, `add-to-plan`, `approve`, `reject`, `plan`), envoltorio `{request_id, data_as_of, data}`, estados `draft → selected → approved → scheduled → active → measured → expired` y `rejected`. Los CSV versionados en el backend son anteriores al generador; `contracts/` y `fixtures/` aún no existen.

Restricciones: Next.js con cambios incompatibles (leer `node_modules/next/dist/docs/` antes de tocar rutas), UI en español desde `lib/copy.ts`, tipos estrictos sin `any`.

## Goals / Non-Goals

**Goals:**
- Que cambiar de mock a backend sea solo configuración (URL + flag), sin tocar componentes.
- Que los tipos, nombres y escala del frontend coincidan con el dataset real.
- Eliminar cualquier cálculo económico del cliente.
- Dejar un contrato escrito para que el backend lo apruebe en paralelo.

**Non-Goals:**
- Implementar modelo, optimizador, agente o API reales.
- Autenticación con roles o permisos por tienda.
- Generación del cliente desde OpenAPI (no existe aún); se escriben esquemas a mano y se migrará cuando haya `contracts/`.
- Editar o versionar CSV del dataset.

## Decisions

1. **Esquemas zod como fuente de tipos del dominio** (`types/` infiere con `z.infer`). Alternativa: tipos TS a mano sin validación → no detecta cambios de contrato. Los mismos esquemas validan mock y backend, de modo que el mock nunca diverge de la forma real.
2. **Un transporte con dos adaptadores** (`lib/api/transport`): `http` y `mock`, elegidos por `NEXT_PUBLIC_API_MODE`. Los hooks por recurso (`useStorePlan`, `useStock`, …) no saben cuál usan. Alternativa: MSW interceptando fetch → más fiel pero agrega herramienta y complica el SSR; se evalúa si el equipo la necesita.
3. **`data_as_of` en un contexto** (`useAsOf`) alimentado por la última respuesta de bootstrap (`GET /meta`), con respaldo al `data_as_of` de cada respuesta. Todas las ventanas de fecha derivan de él. Elimina `todayIso()`.
4. **Plan por tienda como recurso central**: `useStorePlan(storeId, period)` devuelve `{strategies, portfolio, generated_at, reason_if_fewer}`; acciones (`addToPlan`, `removeFromPlan`, `approve`, `reject`, `regenerate`) invalidan ese recurso y el portafolio llega del backend. En alcance "Todas" no se consulta plan; se usa `GET /chain/summary`.
5. **Sin slider**: el detalle recibe `proposed_discount_pct`, `baseline` y `treated` y los muestra. Se retira `PromoSimulator` (slider) y el motor local. Alternativa descartada: curva de 41 puntos por respuesta (fue ofrecida; el equipo eligió quitar interactividad).
6. **Estados de estrategia como máquina de presentación**: una tabla estado → {etiqueta, tono, acciones permitidas}; el backend decide las transiciones y la UI solo habilita acciones. Una acción rechazada por transición inválida muestra el error del backend.
7. **Traducción por diccionarios** (`lib/labels.ts`) con función `t(kind, code)` que devuelve el código original si falta la traducción. Los eventos/feriados (~40) se listan por clave exacta. Alternativa: backend localizado → rechazada por el equipo.
8. **Marca**: `displayBranchName(store)` = `"Retail " + colonia`. Única función para evitar nombres dispersos.
9. **Escala**: stock paginado y filtrado en servidor (`GET /stores/{id}/stock?page&status&category&q` y `GET /stock/summary`); categorías con selector; lista lateral del dashboard con búsqueda y tope; mapa con `fitBounds`.
10. **Mínimo/máximo por tienda**: `GET/PUT /stores/{id}/stock-policy` devuelve `reorder_point` (mínimo) y `max_stock`; la sugerencia con IA es `POST /stores/{id}/stock-policy:suggest`. La pantalla Productos exige sucursal.
11. **Datos de ejemplo reales**: script `scripts/extract-sample-data.py` lee los CSV generados por el backend (ruta por argumento o variable) y escribe JSON en `lib/mock/data/` (< 5 MB, carga perezosa por recurso). Los CSV no se versionan. Si el generador no puede ejecutarse en esta máquina, el script se acompaña de un conjunto semilla con la misma forma construido a partir del catálogo real (120 productos, 25 tiendas) para no bloquear el desarrollo.
12. **Chat con unión discriminada validada**: `ChatBlock` se valida con zod; bloques desconocidos se filtran. Herramientas como lista `tools: {name, args}[]`. Streaming queda fuera de alcance (respuesta completa).
13. **Envío de correo**: el cliente envía `{suggestion_id, supplier_id, qty}`; el backend resuelve destinatario real (buzón demo por entorno) y devuelve el destinatario "mostrado". La UI muestra el correo del proveedor y un aviso de demostración.

## Risks / Trade-offs

- [El backend cambia el contrato propuesto] → Contrato centralizado en `docs/backend-contract.md` y esquemas zod; un cambio toca un solo lugar y los fixtures fallan en validación temprana.
- [El generador no corre o tarda demasiado] → Conjunto semilla con la misma forma (decisión 11) y script reanudable.
- [Reescribir `lib/mock` rompe pantallas a mitad de camino] → Trabajo en pistas con una rama de integración; la pista de tipos/transporte entra primero y las pantallas migran una por una detrás de adaptadores compatibles.
- [Cifras sin cálculo local pueden verse inconsistentes entre pantallas] → El mock deriva todas las cifras de un único conjunto y los esquemas obligan los mismos campos; revisión cruzada en tareas de QA.
- [Sin slider se pierde interactividad de demo] → Compensar con comparación base vs. tratado y serie con P50/P80/P90 más ciclo de vida interactivo.
- [Dos changes activos se solapan (`build-initial-ui-screens`)] → Este change declara reemplazar sus requisitos contradictorios; se archiva el anterior sin sincronizar los requisitos que este reemplaza.

## Migration Plan

1. Introducir esquemas, transporte y `useAsOf` con el mock actual como adaptador temporal.
2. Cargar datos de ejemplo reales y migrar pantallas en el orden: Dashboard → Detalle → Chat → Calendario/Reabasto → Stock → Proveedores/Productos.
3. Eliminar `engine.ts` y los imports directos al mock al migrar la última pantalla.
4. Publicar `docs/backend-contract.md` para revisión del backend en cuanto esté escrito (no depende del resto).
5. Al estar listo el backend: cambiar `NEXT_PUBLIC_API_MODE=http` y `NEXT_PUBLIC_API_URL`. Reversión: volver a `mock`.

## Open Questions

- Si el chat debe flotar en todas las pantallas o seguir solo en el dashboard (se asume dashboard).
- Formato exacto de eventos de reabasto retrasados (campo `delay_days` vs. fechas); se resuelve con el backend al revisar el contrato.

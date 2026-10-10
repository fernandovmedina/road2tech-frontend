## Why

El frontend se construyó sobre un mock reducido (7 sucursales, 10 productos, 5 proveedores, IDs como `b-centro`) y con lógica financiera propia (fórmula de uplift, KPIs sumados). El backend ya definió un dataset v2 mucho mayor (25 tiendas, 120 productos, 19 proveedores, tickets, campañas con control, inventario diario), una arquitectura LangGraph + Bedrock y un contrato M0 donde **el frontend no calcula dinero** y todo plan es **por tienda** con ciclo de vida de estrategias. Hay que alinear el frontend ahora para poder conectarlo sin retrabajo cuando el backend y el modelo estén listos.

## What Changes

- Capa de datos: cliente HTTP tipado con envoltorio `{request_id, data_as_of, data}`, validación zod, flag `NEXT_PUBLIC_USE_MOCK`; `data_as_of` reemplaza al reloj del navegador.
- Tipos y mocks con la forma del dataset real (IDs `S###/P###/SUP##/C##`, ofertas por proveedor, `reorder_point`, `inventory_daily`, tickets). Subconjunto de datos de ejemplo extraído del generador del backend (sin subir CSV pesados).
- Marca genérica: tiendas mostradas como "Retail <colonia>".
- Diccionarios `labels.ts` para traducir códigos del dataset (categorías, zonas, días, clima, estados, eventos).
- **BREAKING**: se elimina toda matemática financiera del frontend (`lib/mock/engine.ts` fórmula de uplift, `simulateForPromo`, suma de ganancias en el KPI de oportunidad). El slider de descuento se elimina; se muestra el descuento propuesto por el motor y la comparación "Si aceptas / Si no aceptas".
- Plan comercial por tienda: hasta 5 estrategias (plantillas afinidad, rescate, contextual), impacto de portafolio, motivo cuando hay menos de 5, ciclo de vida completo (Borrador → En el plan → Aprobada → Programada → Activa → Medida; Rechazada/Expirada) con acciones por estado.
- Dashboard: vista "Todas" = resumen de cadena (KPIs agregados con ticket real de `ticket_lines`, mapa por zona, ranking de tiendas); el plan y los pedidos solo con una tienda elegida.
- Stock desde `inventory_daily`/lotes (existencia, cobertura, en tránsito, caducidad); paginación y filtros en servidor; calendario con capa de eventos y alertas (por caducar, pedido retrasado).
- Reabasto: fecha de pedido y de entrega separadas, urgencia, proveedores alternativos, cantidad validada contra `min_order_qty`; envío por Resend con destinatario real redirigido a buzón demo por el backend.
- Productos: min/max por sucursal (mínimo = `reorder_point` del backend); proveedores como vista por ofertas.
- Chat GenUI: bloques nuevos (tarjeta de estrategia, resumen del plan, forecast con P50/P80/P90), trazas de herramientas reales, borrador con "Agregar al plan", validación zod de bloques.
- Login preparado para `POST /auth/login` (token en cada petición).
- Documento de contrato propuesto para el backend (endpoints faltantes y campos requeridos).
- Actualizar `AGENTS.md` y el README de contexto.

## Capabilities

### New Capabilities
- `backend-api-contract`: cliente HTTP, envoltorio de respuesta, `data_as_of`, validación, flag de mock, documento de contrato propuesto al backend.
- `dataset-aligned-catalog`: sucursales, productos, categorías, proveedores y ofertas con la forma del dataset real; marca "Retail"; traducción por `labels.ts`; escala de 25 tiendas y 120 productos.
- `strategy-plan`: plan por tienda con hasta 5 estrategias, portafolio, ciclo de vida, tarjeta de estrategia y comparación sin slider.
- `chain-dashboard-scope`: dashboard con vista de cadena vs. tienda, KPIs con ticket real, mapa por zona y comportamientos observados.
- `stock-restock-ops`: stock, reabasto, calendario, pedidos con Resend y proveedores/productos por sucursal.
- `copilot-chat-genui`: bloques GenUI validados, herramientas reales y borradores.
- `real-sample-data`: extracción reproducible de datos de ejemplo desde el generador del backend.

### Modified Capabilities
<!-- Los specs de `build-initial-ui-screens` aún no están sincronizados en openspec/specs; este cambio los reemplaza con requisitos nuevos. -->

## Impact

- Código: `types/`, `lib/api/*`, `lib/mock/*` (reescrito), `lib/copy.ts`, nuevo `lib/labels.ts`, `lib/filters.ts`, todos los componentes de `components/{dashboard,product,calendar,stock,catalog,chat,map,layout}`, `app/**` y `app/login`.
- Nuevas dependencias: `zod`. Script de extracción de datos de ejemplo (Python del backend, ejecutado localmente; salida JSON pequeña en el repo).
- Docs: `public/context/*`, `AGENTS.md`, nuevo `docs/backend-contract.md`.
- Coordinación: el backend debe regenerar los CSV (faltan `ticket_lines`, `inventory_daily`, campañas, `forecast_context`), exponer los endpoints propuestos y redirigir correos a un buzón demo.
- Depende de/precede al change activo `build-initial-ui-screens` (este lo reemplaza en lo que contradice).

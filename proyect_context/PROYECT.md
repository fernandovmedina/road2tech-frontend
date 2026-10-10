# StockCopilot — Contexto del proyecto

Documento de contexto para el equipo y para los agentes de código. La guía técnica del frontend está en `AGENTS.md`; las referencias visuales aprobadas están en `proyect_context/ui/`.

## 1. El reto

**Retail Tech Challenge (Sofftek)**: 5 retos de programación e IA para transformar el comercio minorista. Elegimos el **reto 1, "Cero quiebres: pronóstico de demanda"**, y lo llevamos a una solución completa y desplegable: **un sistema de restock y promociones inteligentes**.

- Reto (palabras de Sofftek): modelo que prediga la demanda y recomiende cuándo y cuánto reabastecer; prototipo funcional con tablero, predicciones y alertas de desabasto. Datos: M5 (Walmart) y Online Retail (UCI) como referencia; nos darán un dataset.
- Lo que pidió el representante de TI de Sofftek:
  1. Modelo predictivo con catálogo de productos, historial de ventas, master de almacén y registro de eventos de comportamiento, para definir tendencias de compra y armar planes de restock inteligentes, evitando producto perecedero perdido.
  2. Alertas de riesgo de quedarse sin stock con parte accionable (en la app y por correo; llamadas automáticas en emergencias serían un plus).
  3. Opcional: chatbot que dé recomendaciones y consultas sobre la información del modelo.
  4. El modelo debe poder estimar la **merma** de un producto al cierre de un periodo y **cómo cambia con un plan de restock**, mostrando ganancias y ahorro de costos.
- Clientes finales de Sofftek: Walmart, 7-Eleven, Coppel. Objetivo: **ahorrar costos reduciendo pérdidas y aumentar ventas**.
- Consejos de los exponentes: escoger **un solo problema real de una tienda y resolverlo completo**; convertir datos en valor real, desplegado. El resurtido se pide en la mañana según la demanda, y conviene decidir qué promociones meter para subir el ticket.
- Idea del mentor: promociones para productos próximos a caducar (solo los que no están en consignación) para recuperar utilidad en vez de perderla.
- KPIs del reto: ticket por venta, ticket rechazado, número de artículos vendidos por crosssell.

## 2. Qué construimos y por qué gana

**StockCopilot** ayuda al encargado de tiendas a reducir pérdidas (quiebres, merma por caducidad, producto sin movimiento) y aumentar ventas (ticket, crosssell).

**Diferenciador: promociones inteligentes.** Todos los equipos van a presentar un pronóstico y un chatbot. Nosotros respondemos "¿cómo movemos el consumo de los clientes, evitamos pérdidas y maximizamos ganancia?":

1. Un **agente de IA** toma la predicción de demanda del modelo, analiza el comportamiento de compra con el histórico (qué productos se compran juntos, estacionalidad, quincena, clima) y el stock actual.
2. Arma **promociones con ventana de tiempo** (fecha de inicio y fin) y descuento óptimo.
3. Para cada una predice **cuánto ganamos y cuánto reducimos de pérdida**, y muestra la comparación **"si aceptas / si no aceptas"** (merma, ventas, crosssell, ganancia neta).
4. Lo básico de restock completa el cuadro: órdenes de restock para productos en alerta de límites (mínimo/máximo) o con pico de demanda previsto, enviadas al proveedor por correo (Resend) con aprobación humana.

Principio: **el agente propone, el usuario aprueba**. Cada acción lleva su impacto en pesos y se mide después contra lo que pasó realmente (ciclo cerrado).

Usuario: "encargado de las tiendas" (gerente regional ve todas las sucursales; encargado de tienda ve una).

## 3. Pantallas (diseños aprobados)

Referencias en `proyect_context/ui/` (HTML de diseño, no código de producción).

| # | Pantalla | Ruta | Contenido clave |
|---|---|---|---|
| 1 | Login | `/login` | Pantalla dividida, perfil gerente/encargado |
| 2 | Dashboard | `/` | Selects (sucursal, actuales vs predicción ML, rango), 4 KPIs, comportamientos detectados, mapa de calor de ventas + sidebar productos/promociones, chatbot GenUI |
| 3 | Tendencia y simulador de promoción | `/product/[id]` | Gráfica histórico + predicción, promoción sugerida, "qué ganas y qué pierdes" con y sin aceptar; flecha "Regresar al mapa" |
| 4 | Calendario de restock | `/calendar` | Sidebar productos/proveedores, calendario de entregas, promociones y alertas, modal "Orden Restock" con correo |
| 5 | Stock general | `/stock` | Semáforo vs mínimo/máximo, cobertura en días |
| 6 | Catálogo de proveedores | `/suppliers` | Correo por proveedor (Resend), lead time, entrega, mínimo, cumplimiento |
| 7 | Catálogo de productos | `/products` | Mínimo y máximo editables, "Sugerir min/max con IA" |

Origen del diseño: pizarrón del equipo ("Modelo" = dashboard, "Agente" = parte accionable con calendario GenUI, "Usuario" = encargado de tiendas, valor = tendencias, alertas, promociones, agente de restock y mapa de demanda de un producto).

## 4. El dataset de ejemplo

Repo: `ams-innovation/dataset-hacktahton-road2tech` (copia local en `proyect_context/dataset-hacktahton-road2tech-master/`). **El dataset del evento es solo un ejemplo: la solución no debe atarse a sus particularidades**; el día del reto pueden darnos otro. Por eso se usa un esquema canónico con un adaptador por cliente.

- **Es sintético** y de una cadena ficticia de donas y café ("Glazed Co.", EE. UU., 38 tiendas en aeropuertos, estaciones y un resort, 2025-10-01 a 2026-09-30, en USD). No son datos de Walmart, 7-Eleven ni Coppel. Sus reglas de uso dicen que se usa únicamente durante el evento y que **no se redistribuye fuera del repositorio/evento**.
- **Tablas:** sitios, tiendas, cierres, productos (con vida útil, costo, perecedero), proveedores (lead time, días de entrega, fill rate), precios, ventas diarias, inventario diario (merma, quiebre en horas, en tránsito), órdenes de compra, KPIs por tienda y día, promociones, calendario.
- **Hallazgos de nuestro análisis (calculados por nosotros sobre ese ejemplo; no son datos oficiales):**
  - ~24% de lo recibido de perecederos caduca (≈927 mil unidades, ≈$1.2M USD a costo). Con vida útil de 1 día se tira ~47%; con 2 días ~24%; con 3 días ~9.5%.
  - En ~35% de las semana-tienda-SKU hay merma y quiebre a la vez: el problema es cuándo y dónde se pide, no solo cuánto.
  - ~20% de los registros de inventario tienen horas de quiebre (~13 h cuando ocurre). Los kioscos y shop-in-shop tiran 30–33%; los full counter ~15%.
  - Un baseline de promedio móvil de 7 días tiene error medio de ~3.1 unidades sobre una venta media de ~7.2 (no hemos entrenado ningún modelo todavía).
- **Calidad de datos (errores intencionales; documentar cómo se trató cada uno):** fechas en formatos mixtos, SKU con minúsculas y espacios, duplicados (inventario, ventas, productos, KPIs), productos sin costo o con costo mayor al precio, vida útil negativa, identidad de inventario rota, ventas negativas o nulas, moneda escrita de varias formas, un SKU sin maestro, promociones con fechas invertidas, transacciones mayores al tránsito.
- **Lo que el dataset NO trae:** eventos de carrito/abandono, tickets o canastas, capacidad de anaquel, precios de competencia, marca de consignación. Por eso el crosssell y la elasticidad se **estiman y se declaran como supuestos** en el pitch.
- **Aviso:** la carpeta del dataset pesa ~80 MB. No la subas a GitHub: agrégala a `.gitignore` (y por las reglas del dataset, no la redistribuyas fuera del repositorio/evento).

Descartado como diferenciador: el rebalanceo de stock entre sucursales del mismo sitio. En el ejemplo, la cota superior recuperable era ~2% de la merma (≈$63k de margen contra ≈$1.2M de desperdicio) y el concepto ya existe en software empresarial.

## 5. Modelo de datos canónico (Postgres / Supabase)

```
stores(store_id, name, lat, lng, region, format, status)
products(sku, name, category, supplier_id, unit_cost, price, case_size,
         shelf_life_days, is_perishable, min_stock, max_stock, status)
suppliers(supplier_id, name, email, lead_time_days, delivery_days, min_order_value, fill_rate)
sales_daily(date, store_id, sku, units, net_sales, discount, promo_id)
inventory_daily(date, store_id, sku, opening, received, sold, expired, damaged,
                closing, on_order, stockout_hours)
store_kpis_daily(date, store_id, footfall, transactions, net_sales)
promotions(promo_id, name, start, end, discount_pct, scope)
calendar(date, dow, holiday, school_break)
forecast(run_id, date, store_id, sku, p10, p50, p90)
promo_suggestions(id, store_id, sku, discount_pct, start, end, scenario_without_json,
                  scenario_with_json, drivers, status, created_at)
restock_orders(id, store_id, supplier_id, lines_json, total_cost, status,
               sent_at, predicted_json, actual_json)
```

`promo_suggestions` y `restock_orders.predicted_json / actual_json` son la base del ciclo cerrado (lo predicho contra lo ocurrido).

## 6. Backend y modelos (lo construyen los compañeros; el frontend usa mocks)

Endpoints esperados:

| Endpoint | Función |
|---|---|
| `GET /kpis` | KPIs por sucursal, rango y modo (actual/predicción) |
| `GET /map/heat?sku=` | movimiento de ventas por sucursal |
| `GET /products/ranking` | ranking con filtros y orden |
| `GET /forecast` | serie + banda de incertidumbre |
| `POST /promotions/suggest` | el agente arma promociones con escenarios con/sin |
| `POST /promotions/{id}/accept` | programa la promoción |
| `POST /restock/suggest` | sugerencias de restock |
| `POST /orders` | aprueba y envía correo (Resend) |
| `GET /orders/accuracy` | predicho vs real |
| `POST /chat` | agente con tool-calling → bloques GenUI |
| `CRUD /suppliers, /products` | catálogos |

Lógica de IA:

1. Limpieza reproducible de datos; corrección de **demanda censurada** (donde hubo horas de quiebre, la venta real fue mayor).
2. **Forecast** con LightGBM cuantílico (P10/P50/P90): día de semana, feriados, vacaciones, promos, rezagos, clima (Open-Meteo), sucursal y categoría.
3. **Comportamiento de compra:** compra conjunta (reglas de asociación o similitud sobre tickets; si no hay tickets, correlación de demanda por tienda y día, declarado), estacionalidad, quincena.
4. **Riesgo de merma y quiebre:** cobertura de stock contra demanda y vida útil.
5. **Optimizador de promoción:** descuento que maximiza la ganancia neta = margen de ventas − costo de merma + crosssell, con elasticidad estimada o supuesta (declarada).
6. **Optimizador de pedido** (newsvendor con vida útil, múltiplos de caja, pedido mínimo, días de entrega y lead time).
7. **Asistente LLM** con tool-calling contra la API (`plot_trend`, `draft_restock_order`, `simulate_promotion`, `open_calendar`); nunca inventa números.
8. **Backtest:** entrenar hasta T−8 semanas y comparar política real contra la sugerida sobre las semanas siguientes; mostrar el resultado en la demo.

## 7. Plan de 24 horas (5 personas)

| Persona | Responsabilidad |
|---|---|
| A — ML/datos | limpieza, demanda censurada, forecast, backtest |
| B — Motor/API | optimizador de promoción y pedido, FastAPI |
| C — Frontend (dashboard, mapa, detalle) | este repo |
| D — Frontend (calendario, catálogos, chatbot) | este repo |
| E — DevOps/integración | Supabase, auth, Resend, despliegue, adaptador de datos, guion de demo |

Prioridades: **P0** login, datos limpios, forecast, KPIs, mapa, simulador de promoción, orden de restock con correo. **P1** chatbot GenUI, calendario completo, backtest visible, min/max sugerido. **P2** llamada automática de emergencia, clima.

## 8. Guion de demo (5 min)

1. Problema con un número (merma y quiebres, en pesos).
2. Dashboard: KPIs y comportamientos de compra detectados.
3. Mapa de calor: buscar un producto, ver dónde se mueve más, filtrar por sucursal.
4. Detalle del producto: tendencia y predicción; mover el descuento y ver "qué ganas y qué pierdes" al aceptar o no.
5. Aceptar la promoción → aparece en el calendario → "Orden Restock" → correo real al proveedor.
6. Chatbot: "muéstrame la tendencia de X con predicción" → gráfica generada.
7. Backtest y precisión del modelo: "esto predijimos, esto pasó".

## 9. Supuestos y riesgos

- El dataset del evento puede ser otro: esquema canónico y adaptador por cliente.
- Sin tickets ni elasticidad reales, el crosssell y el efecto de descuento se estiman y se declaran.
- Las ventas están censuradas por quiebres: sin corregirlas el modelo repite los quiebres.
- No prometer un % de mejora antes de medirlo con el backtest.
- Las cifras de las pantallas son ficticias (badge "Datos de ejemplo").

## 10. Preguntas abiertas para Sofftek

- ¿Evaluarán con el dataset de ejemplo o traerán datos nuevos?
- ¿Trae costo y precio por producto, fechas de caducidad y tickets por transacción?
- ¿Los clientes (Walmart, 7-Eleven, Coppel) pueden aplicar promociones por sucursal y por ventana de tiempo?

# Contrato propuesto frontend ↔ backend (StockCopilot)

Documento para revisión y aprobación del equipo de backend. Lo escribe el frontend (repo `road2tech-frontend`, change `align-frontend-to-backend-model`) a partir de `milestones.md`, `ARCHITECTURE.md`, `FLOW.md` y el diccionario de datos nuevo (`scripts/dataset/build_readme.py`) del repo `BackendRoad2Tech`.

Estado: **PROPUESTA**. Los 7 endpoints M0 ya los define el backend y aquí solo se referencian. Todo lo demás (sección 3) es lo que el frontend necesita y hoy no existe; el backend puede cambiar nombres o formas, siempre que actualice este archivo, el esquema y los fixtures en el mismo PR (regla 1 de `milestones.md`).

Ejemplos: valores tomados del dataset real (`S001` = "OXXO República Oriente", colonia `República Oriente`, zona `residential`; `P001` = Coca-Cola 600 ml, `retail_price` 20.00, categoría `C01`; `SUP01` = Northern Beverage Distributors, oferta de `P001`: `unit_cost` 13.65, `min_order_qty` 144, `lead_time_days` 3, `delivery_days` `Tue|Fri`). Las cifras de impacto de los ejemplos son ilustrativas.

---

## 0. Estado de implementación del backend (verificado contra la API desplegada el 2026-10-10)

Base URL: `https://avbylri05m.execute-api.us-east-1.amazonaws.com` (Go Lambdas sobre DynamoDB `road2tech-stores`; código en `BackendRoad2Tech/api`). Probado con el usuario demo contra las 25 tiendas: las respuestas pasan los esquemas zod del frontend (`lib/api/schemas.ts`), CORS permite cualquier origen y los errores usan `{code, message, request_id}`.

| Estado | Endpoints |
|---|---|
| **Desplegado y consumido por el frontend** | `GET /meta`, `/stores`, `/chain/summary`, `/stores/{id}/kpis`, `/heat`, `/stores/{id}/behaviors`, `/stores/{id}/stock`, `/stock/summary`, `GET/PUT /stores/{id}/stock-policy`, `POST /stores/{id}/stock-policy:suggest`, `GET /stores/{id}/restock-suggestions`, `GET /stores/{id}/calendar`, `GET /suppliers`, `/suppliers/{id}/offers`, `GET /products`, `GET /predictions/stores`, `GET /stores/{id}/predictions/products`, `POST /emails`, `POST /auth/signin`, `POST /auth/logout` |
| **Desplegado pero fuera del frontend** | `POST /chat` (se reemplaza por el agente LangGraph + CopilotKit, change `integrate-copilot-agent-chat`; el frontend solo lo consume si se lista en `NEXT_PUBLIC_API_HTTP_PATHS`); `POST /restock-orders` y `POST /suppliers/{id}/test-email` (mandan al correo del proveedor, o a `DEMO_MAILBOX` si la Lambda la tiene, y el frontend no puede elegir el destinatario) |
| **Propuesto, aún no pedido al backend** | `GET /predictions/stores` y `GET /stores/{id}/predictions/products` (§3.20 y §3.21): pronóstico de demanda por tienda y producto que alimenta el mapa de demanda del dashboard. Hoy el mapa lo simula en el cliente; ver D20 a D25 |
| **No existe aún (404)** | Los 7 M0: `GET /stores/{id}/tendency`, `POST /stores/{id}/strategies:generate`, `strategies:prompt`, `GET /drafts/{id}`, `POST /drafts/{id}/add-to-plan`, `approve`, `reject`, `GET /stores/{id}/plan` |

Los M0 existen en `BackendRoad2Tech/services/copilot-api` (FastAPI, datos en CSV/PostgreSQL), pero **no están desplegados** y su forma difiere de este contrato (por ejemplo `/stores/{id}/overview`, `/stores/{id}/restock`).

Cómo lo usa el frontend: `NEXT_PUBLIC_API_MODE=hybrid` manda al backend real los endpoints de las dos primeras filas que consume (lista en `lib/api/liveRoutes.ts`) y deja el resto (M0 y chat) en mock. Cuando el backend publique los M0 se agregan a esa lista o se pasa a `http`.

Correo a proveedores (decisión actual): el frontend arma el mensaje (`lib/emailTemplates.ts`) y lo manda con `POST /emails` (§3.19 de `api/ENDPOINTS.md` del backend: `to`, `subject`, `text`, `htmlBody`, `from_name`) a la dirección configurada por el usuario en la interfaz (`lib/mailSettings.ts`; valor inicial `daniel.sunflores@gmail.com`, se guarda en el navegador). Así el destinatario no depende de variables de entorno del backend y ningún proveedor recibe correo real. Como no pasa por `POST /restock-orders`, el pedido **no queda registrado** (no hay PO, no suma `on_order` ni cambia la sugerencia). **Petición para backend:** que `POST /restock-orders` acepte un `to` opcional (o que registre el pedido sin enviar) para unir ambas cosas.

Para no ofrecer el mismo pedido dos veces, el frontend guarda en el navegador los pedidos que el usuario ya envió (`lib/sentOrders.ts`): esa sugerencia y las demás del mismo producto cuya fecha de pedido sea anterior a la llegada salen marcadas `order_status: "sent"` ("Pedido enviado", sin botón y fuera del calendario), y el calendario dibuja la entrega "En camino". Es solo memoria de lo que hizo el usuario: no calcula nada y no ve pedidos de otros navegadores ni usuarios. Cuando el backend registre la orden y la descuente de sus propias sugerencias (`on_order`/pedidos abiertos), este registro local sobra.

Diferencias entre el backend desplegado y este contrato, ya absorbidas por el frontend:
- El login es `POST /auth/signin` (no `/auth/login`) y existe `POST /auth/logout`, que revoca el token.
- `GET /stores/{id}/stock`: `coverage_days` es `null` cuando el producto no tiene demanda prevista (la tabla muestra "—").
- `GET /predictions/stores` (§3.20) y `GET /stores/{id}/predictions/products` (§3.21) alimentan el mapa de demanda (`lib/api/storeDemand.ts`). Filas con `reason_codes: null` (sin drivers) y `coverage_days: null` (sin demanda prevista): el frontend los trata como `[]` y "—". `tag` aún no filtra (duda D20, los productos no traen etiquetas), así que no se envía. Con las Lambdas calientes `/predictions/stores` tarda ~3.4 s (carga las 25 tiendas); **petición para backend:** precalcular o cachear. Los códigos de motivo que el frontend traduce son `commute_peak`, `weather_hot`, `weather_cold`, `payday` y `holiday`; avisen si agregan más. Estos dos endpoints aún no están en `api/ENDPOINTS.md` del backend.
- **Riesgo de stock del mapa de demanda (medido el 2026-10-10): las 25 sucursales salen `critical` en la vista de todos los productos.** Causas en `api/internal/domain/predictions.go` y `functions/predictions-stores/main.go`: (1) el riesgo de la fila agregada es el *peor* de sus productos (`worstRisk`), y toda sucursal tiene entre 6 y 9 productos críticos de 120 (S001: 9 críticos, 35 en vigilancia, 76 sanos; cobertura agregada 6.9 días), así que siempre queda `critical`; (2) `PredictionRisk` y `recommended_extra_qty` usan solo `closing_qty` e ignoran `on_order_qty`: en S001, 8 de los 9 críticos ya tienen en camino más de 7 días de demanda (p. ej. P004: existencia 18, en camino 111, riesgo `critical` y `recommended_extra_qty` 19). Esto también sugiere comprar lo que ya se pidió. **Petición para backend:** a) cobertura y extra con existencia efectiva `closing_qty + on_order_qty` (o solo lo que llega antes de agotarse); b) riesgo agregado por proporción de productos en riesgo o por cobertura agregada, no por el peor producto; c) mantener `critical` para `closing_qty = 0` sin entrega en camino a tiempo. Mientras tanto, para filas agregadas (`products_count > 1`) el frontend colorea la sucursal por su `coverage_days` promedio (menos de 3 días crítico, menos de 5 vigilancia, resto sano; `lib/api/storeDemand.ts`) y cuenta las sucursales en riesgo con esa misma regla; con un solo producto sigue pintando el `risk` del backend. Se quita cuando el backend clasifique las filas agregadas.
- `GET /stores/{id}/behaviors` ya trae `restock_suggestion_id` (la mayoría de las alertas lo tiene, así que "Ver pedido sugerido" abre el pedido real) y `strategy_id`, que sigue `null` porque no hay plan. `GET /stores/{id}/stock` ya trae `expected_waste_units`.
- `GET /chain/summary`: `store_ranking` llega `null` (no `[]`) si el filtro de zona no coincide con ninguna tienda.
- `GET /chain/summary` y `GET /stores/{id}/kpis` responden `400 invalid_request` si `to > data_as_of`. En modo "Predicción ML" (rangos futuros) el frontend les pide la ventana equivalente que termina en `data_as_of`. **Duda para backend:** ¿qué significa `mode=forecast` en estos dos endpoints? Hoy devuelven lo mismo que `actual`. `GET /heat` y `GET /stores/{id}/behaviors` sí aceptan rangos futuros.
- `PUT /stores/{id}/stock-policy` devuelve solo `{store_id, items:[{product_id, reorder_point, max_stock, updated_at}], updated_at}`; la pantalla vuelve a pedir la página.
- `GET /stores/{id}/behaviors` no trae `strategy_id` ni `restock_suggestion_id` (necesitan el plan, que depende de los M0): las tarjetas de merma no enlazan a una promoción mientras tanto. Con el rango por defecto solo devuelve alertas de merma.
- `ai_opportunity_mxn`, `portfolio_impact` y la oportunidad del ranking valen 0 hasta que existan los M0. Mientras tanto, en `hybrid` el frontend toma esas cifras del motor mock (`lib/api/hybridOverlay.ts`) para que coincidan con las promociones que muestra; el resto de los KPI vienen del backend.
- **Latencia (medida el 2026-10-10):** la primera llamada tras un rato sin uso es lenta (arranque en frío de las Lambdas: `kpis` 20 s, `stock/summary` 9.7 s, `heat` 6 s, `restock-suggestions` 5.5 s); con las Lambdas calientes responden en 0.4 a 1.7 s. **Petición para backend:** concurrencia aprovisionada o un ping periódico en las Lambdas del dashboard, y revisar por qué `kpis` y `stock/summary` tardan tanto en frío. El frontend ayuda precargando `meta`, `stores`, el catálogo y el resumen de cadena al iniciar sesión, y guardando las respuestas 5 minutos.

---

## 1. Convenciones

| Tema | Regla |
|---|---|
| Envoltorio | Toda respuesta 2xx: `{ "request_id": "req_...", "data_as_of": "2026-09-30", "data": ... }` |
| Errores | `{ "code": "invalid_transition", "message": "...", "request_id": "req_..." }` con HTTP 4xx/5xx. Sin trazas internas. El frontend muestra un mensaje genérico en español y guarda el `request_id`. |
| `data_as_of` | Fecha de corte (`YYYY-MM-DD`). El frontend **no usa el reloj del navegador**: "hoy" = `data_as_of`; historial termina ahí y el forecast inicia al día siguiente. En la demo: `2026-09-30` (último día de `sales`); `forecast_context` cubre 2026-10-01 a 2026-10-14. |
| Fechas | `date` = `YYYY-MM-DD`; timestamps ISO-8601 UTC (`2026-09-30T14:05:00Z`). |
| Dinero | MXN, número con 2 decimales (`1234.50`), nunca string. El frontend da formato. |
| Proporciones | Fracciones `0..1` (`discount_pct` del dataset es fracción: `0.10` = 10 %). **Aviso:** `proposed_discount_pct` se pide también como fracción, para coincidir con `promotion_campaigns.discount_pct`. |
| IDs | Cadenas opacas: `S001..S025`, `P001..P120`, `SUP01..SUP19`, `C01..C20`; campañas `campaign_id`; borradores `draft_id`. El frontend no los interpreta ni los hardcodea. |
| Códigos | Enumeraciones en inglés tal como el dataset (`residential`, `hot`, `Tue|Fri`, `C01` + `category_name` en inglés). **El frontend traduce a español**; el backend no localiza. |
| Auth | `Authorization: Bearer <token>` en todo salvo `POST /auth/signin`. 401 → el frontend cierra sesión. Sin roles ni permisos por tienda en esta fase (todo usuario ve todas las tiendas). |
| Paginación | Query `page` (desde 1) y `page_size` (máx. 100). Respuesta: `data.items[]` y `data.page`, `data.page_size`, `data.total`. |
| Idempotencia | Acciones de estado (`approve`, `reject`, `add-to-plan`) y `POST /restock-orders` aceptan cabecera `Idempotency-Key`. |
| Tienda en rutas | Los endpoints por tienda usan `/stores/{store_id}/...`. |
| Sin cálculo en cliente | El frontend solo formatea. Todo impacto, margen, merma, portafolio, estado de stock, cobertura, fechas de entrega y totales los calcula el backend. |

---

## 2. Endpoints M0 (definidos por backend; no se redefinen aquí)

Se consumen tal cual en `milestones.md`:

| Método | Ruta | Uso en el frontend |
|---|---|---|
| GET | `/stores/{store_id}/tendency?product_id=&history_days=&forecast_days=` | Gráfico de tendencia (historial + forecast P50/P80/P90; series `baseline`/`treated` cuando aplique) |
| POST | `/stores/{store_id}/strategies:generate` | "Regenerar plan" |
| POST | `/stores/{store_id}/strategies:prompt` | Estrategia por prompt desde el chat (ver §3.17) |
| POST | `/drafts/{draft_id}/add-to-plan` | "Agregar al plan" (`draft → selected`) |
| POST | `/drafts/{draft_id}/approve` | "Aprobar" con confirmación (`selected → approved`) |
| POST | `/drafts/{draft_id}/reject` | "Rechazar / Descartar" |
| GET | `/stores/{store_id}/plan?from=&to=` | Plan por tienda y portafolio |

Estados: `draft → selected → approved → scheduled → active → measured → expired`, y `draft → rejected`. El backend decide las transiciones; el frontend solo habilita acciones según el estado y muestra el error si una transición es inválida.

Lo que el frontend asume de estos endpoints (forma en §4): `plan` devuelve `{ store_id, period, generated_at, strategies[], portfolio, reason_if_fewer }`; `tendency` incluye `p50`, `p80`, `p90` y `drivers[]`; `add-to-plan` y `approve` devuelven la estrategia actualizada **y el portafolio recalculado**. Mapeo de estados a etiquetas: `draft` Borrador, `selected` En el plan, `approved` Aprobada, `scheduled` Programada, `active` Activa, `measured` Medida, `expired` Expirada, `rejected` Rechazada.

---

## 3. Endpoints propuestos

Resumen:

| # | Método | Ruta |
|---|---|---|
| 3.1 | GET | `/meta` |
| 3.2 | GET | `/chain/summary` |
| 3.3 | GET | `/stores` |
| 3.4 | GET | `/stores/{store_id}/kpis` |
| 3.5 | GET | `/heat` |
| 3.6 | GET | `/stores/{store_id}/behaviors` |
| 3.7 | GET | `/stores/{store_id}/stock` |
| 3.8 | GET | `/stock/summary` |
| 3.9 | GET / PUT | `/stores/{store_id}/stock-policy` |
| 3.10 | POST | `/stores/{store_id}/stock-policy:suggest` |
| 3.11 | GET | `/stores/{store_id}/restock-suggestions` |
| 3.12 | POST | `/restock-orders` |
| 3.13 | GET | `/stores/{store_id}/calendar` |
| 3.14 | GET | `/suppliers`, `/suppliers/{supplier_id}/offers` |
| 3.15 | POST | `/suppliers/{supplier_id}/test-email` |
| 3.16 | GET | `/products` |
| 3.17 | POST | `/chat` |
| 3.18 | POST | `/auth/signin`, `/auth/logout` |
| 3.19 | POST | `/assistant/product-comparison` |
| 3.20 | GET | `/predictions/stores` |
| 3.21 | GET | `/stores/{store_id}/predictions/products` |

### 3.1 `GET /meta`

Bootstrap: el frontend lo llama al abrir la app para fijar `data_as_of`, catálogos pequeños y horizontes.

Parámetros: ninguno.

```json
{
  "request_id": "req_01HZX",
  "data_as_of": "2026-09-30",
  "data": {
    "data_as_of": "2026-09-30",
    "history_start": "2024-01-01",
    "forecast_horizon_days": 14,
    "horizons": { "history_days": [7, 30], "forecast_days": [7, 14, 30] },
    "default_plan_days": 7,
    "max_strategies_per_plan": 5,
    "categories": [
      { "category_id": "C01", "category_name": "Non-Alcoholic Beverages", "is_perishable": 0, "typical_shelf_life_days": 180, "requires_refrigeration": 0 }
    ],
    "zones": [
      { "zone_type": "residential", "description": "Housing neighborhoods; neighbors buy daily groceries, drinks and party supplies." }
    ],
    "demo_mode": true
  }
}
```

Requeridos: `data_as_of`, `forecast_horizon_days`, `categories[]` (las 20), `zones[]`. `demo_mode` indica si los correos se redirigen (§3.12).

### 3.2 `GET /chain/summary`

Única fuente de la vista "Todas las sucursales" (el plan y los pedidos no se muestran en esa vista).

Parámetros: `from`, `to` (fechas; por defecto ventana de 30 días terminando en `data_as_of`), `mode` = `actual | forecast` (Datos: Actuales / Predicción ML), `zone` (opcional).

```json
{
  "request_id": "req_01HZY",
  "data_as_of": "2026-09-30",
  "data": {
    "period": { "from": "2026-09-01", "to": "2026-09-30" },
    "mode": "actual",
    "kpis": {
      "average_ticket": 48.72,
      "average_ticket_delta_pct": 0.034,
      "items_per_ticket": 2.6,
      "items_per_ticket_delta_pct": 0.012,
      "stockout_products": 37,
      "no_demand_products": 9,
      "ai_opportunity_mxn": 184250.00
    },
    "portfolio_impact": {
      "net_expected_margin_increment": 184250.00,
      "confidence_interval": { "low": 131000.00, "high": 232500.00, "level": 0.8 },
      "stores_with_plan": 25,
      "strategies_count": 118
    },
    "store_ranking": [
      { "store_id": "S002", "colonia": "Saltillo 2000", "zone_type": "residential", "opportunity_mxn": 11840.00, "strategies_count": 5 },
      { "store_id": "S001", "colonia": "República Oriente", "zone_type": "residential", "opportunity_mxn": 9420.00, "strategies_count": 5 }
    ]
  }
}
```

Requeridos: `average_ticket` (monto `net_amount` promedio por `ticket_id` en `ticket_lines`), `average_ticket_delta_pct` (contra el periodo previo de igual longitud), `items_per_ticket` (suma `quantity` / tickets), `stockout_products` (producto×tienda con `stockout_flag = 1` en `inventory_daily` al corte), `no_demand_products`, `portfolio_impact.net_expected_margin_increment` (**del optimizador, no suma de tarjetas**), `store_ranking[]` ordenado por oportunidad descendente (máx. 25). Definición de "sin demanda": producto×tienda con 0 unidades en los últimos 7 días; **backend fija la regla** (duda abierta D3).

### 3.3 `GET /stores`

Parámetros: ninguno. Sin paginar (25 filas).

```json
{
  "data": {
    "items": [
      {
        "store_id": "S001",
        "store_name": "OXXO República Oriente",
        "colonia": "República Oriente",
        "latitude": 25.430881,
        "longitude": -100.983762,
        "zone_type": "residential",
        "secondary_zone_type": null,
        "size_category": "medium",
        "opening_hours": "00:00-24:00",
        "is_24h": 1,
        "opened_date": "2022-03-26"
      }
    ]
  }
}
```

Requeridos: todos los campos de `stores.csv`. El frontend **ignora `store_name`** y muestra `"Retail " + colonia`.

### 3.4 `GET /stores/{store_id}/kpis`

Parámetros: `from`, `to`, `mode`. Misma forma de `kpis` que en §3.2 más la oportunidad de la tienda:

```json
{
  "data": {
    "store_id": "S001",
    "period": { "from": "2026-09-01", "to": "2026-09-30" },
    "mode": "actual",
    "kpis": {
      "average_ticket": 51.10,
      "average_ticket_delta_pct": 0.021,
      "items_per_ticket": 2.7,
      "items_per_ticket_delta_pct": -0.004,
      "stockout_products": 3,
      "no_demand_products": 1,
      "ai_opportunity_mxn": 9420.00
    }
  }
}
```

`ai_opportunity_mxn` = `net_expected_margin_increment` del portafolio vigente de la tienda.

### 3.5 `GET /heat`

Parámetros: `product_id` (opcional), `zone` (opcional, `zone_type`), `from`, `to`, `mode`.

```json
{
  "data": {
    "product_id": "P001",
    "metric": "units_sold",
    "items": [
      { "store_id": "S001", "movement": 78, "units": 1520, "is_top": false },
      { "store_id": "S002", "movement": 100, "units": 1944, "is_top": true },
      { "store_id": "S003", "movement": 41, "units": 802, "is_top": false }
    ]
  }
}
```

Requeridos: `movement` entero 0–100 (normalizado por el backend dentro del conjunto devuelto), `is_top` (una sola tienda líder; el frontend dibuja la ★). Sin `product_id`, `movement` refleja el volumen total de la tienda. Devuelve las 25 tiendas (o las de la `zone`).

### 3.6 `GET /stores/{store_id}/behaviors`

Comportamientos de compra detectados. Parámetros: `from`, `to`, `limit` (por defecto 6).

```json
{
  "data": {
    "items": [
      {
        "id": "beh_S001_P001_P017",
        "kind": "crosssell",
        "source": "observed",
        "title": "Coca-Cola 600 ml se compra con Sabritas Original 45 g",
        "text": "31 % de los tickets con Coca-Cola 600 ml incluyen el snack.",
        "product_id": "P001",
        "related_product_id": "P017",
        "affinity": { "observed_ticket_share": 0.31, "estimated_ticket_share": null, "lift": 1.8, "tickets_sample": 4120 },
        "estimated_gain_mxn": 3180.00
      },
      {
        "id": "beh_S001_P090_waste",
        "kind": "waste",
        "source": "estimated",
        "title": "Producto con riesgo de caducar",
        "text": "Exceso frente a la demanda proyectada.",
        "product_id": "P090",
        "related_product_id": null,
        "affinity": null,
        "estimated_gain_mxn": 1250.00
      }
    ]
  }
}
```

Requeridos: `kind` ∈ `crosssell | waste | demand`, `source` ∈ `observed | estimated` (observado = medido en `ticket_lines`/campañas con control; estimado = inferido o reglas de negocio; la UI muestra "Observado"/"Estimado"), `product_id`, `estimated_gain_mxn`. Para `crosssell`, `affinity` con `observed_ticket_share` si `source = observed`, o `estimated_ticket_share` si `estimated`. Los IDs de producto del ejemplo (`P017`, `P090`) son ilustrativos.

### 3.7 `GET /stores/{store_id}/stock`

Stock por producto en una tienda. Paginado y filtrado en servidor. (Para la vista de todas las tiendas el frontend usa `store_id = all`; **duda D5**: si prefieren `GET /stock?store_id=` abierto, equivalente.)

Parámetros: `page`, `page_size`, `status` (`out | low | ok | over`), `category_id`, `q` (nombre de producto, contiene), `sort` (`coverage_days | quantity | product_name`).

```json
{
  "data": {
    "items": [
      {
        "store_id": "S001",
        "product_id": "P001",
        "product_name": "Coca-Cola 600 ml",
        "category_id": "C01",
        "closing_qty": 96,
        "on_order_qty": 144,
        "in_transit": [
          { "order_id": "PO-2026-091822", "quantity": 144, "supplier_id": "SUP01", "expected_delivery_date": "2026-10-02", "is_delayed": false }
        ],
        "reorder_point": 120,
        "max_stock": 480,
        "coverage_days": 3.2,
        "status": "low",
        "earliest_expiry": "2027-03-14",
        "expiring_qty_7d": 0,
        "lost_demand_7d": 12,
        "next_restock_date": "2026-10-02"
      }
    ],
    "page": 1, "page_size": 25, "total": 120
  }
}
```

Requeridos: `closing_qty` (de `inventory_daily` al `data_as_of`), `on_order_qty`, `in_transit[]`, `reorder_point`, `max_stock`, `coverage_days`, `status`, `earliest_expiry`, `next_restock_date`. **El estado lo calcula el backend:** `out` si `closing_qty = 0`; `low` si `0 < closing_qty <= reorder_point`; `over` si `closing_qty > max_stock`; si no, `ok`. `earliest_expiry` sale de `inventory_lots` (lotes con `quantity_remaining > 0` y `expiration_date` mínima). `lost_demand_7d` suma de `lost_demand` en 7 días.

### 3.8 `GET /stock/summary`

Conteos por estado con los mismos filtros que §3.7 (no cuenta filas cargadas).

Parámetros: `store_id` (opcional; sin él, toda la cadena), `category_id`, `q`.

```json
{
  "data": { "total": 3000, "out": 37, "low": 214, "ok": 2561, "over": 188 }
}
```

Con una tienda: `total` = 120. Debe cumplirse `out + low + ok + over = total`.

### 3.9 `GET` / `PUT /stores/{store_id}/stock-policy`

Mínimo/máximo por producto de una tienda. El **mínimo** que muestra la UI es `reorder_point` (el mismo que usa `simulate_operations.py`).

`GET` — parámetros: `page`, `page_size`, `category_id`, `q`.

```json
{
  "data": {
    "store_id": "S001",
    "items": [
      {
        "product_id": "P001",
        "product_name": "Coca-Cola 600 ml",
        "category_id": "C01",
        "unit_cost": 13.65,
        "retail_price": 20.00,
        "min_order_qty": 144,
        "shelf_life_days": 180,
        "reorder_point": 120,
        "max_stock": 480,
        "updated_at": "2026-09-12T10:00:00Z"
      }
    ],
    "page": 1, "page_size": 25, "total": 120
  }
}
```

`PUT` — body (lote; solo los cambiados):

```json
{ "items": [ { "product_id": "P001", "reorder_point": 130, "max_stock": 500 } ] }
```

Validación del backend: enteros, `0 <= reorder_point <= max_stock`; error `invalid_policy` con `code` y detalle por `product_id`. Respuesta: items actualizados y `updated_at`. `unit_cost` aquí es el de la oferta elegida por `select_supplier` (**duda D6**).

### 3.10 `POST /stores/{store_id}/stock-policy:suggest`

Body: `{ "product_ids": ["P001", "P002"] }` (vacío = todos los visibles/filtrados; el frontend manda los ids de la página).

```json
{
  "data": {
    "store_id": "S001",
    "items": [
      {
        "product_id": "P001",
        "current": { "reorder_point": 120, "max_stock": 480 },
        "suggested": { "reorder_point": 150, "max_stock": 520 },
        "reason": "Demanda proyectada de 34 u/día en los próximos 14 días (viernes y quincena) y lead time de 3 días."
      }
    ]
  }
}
```

Requeridos: `suggested.reorder_point`, `suggested.max_stock`, `reason` (una línea, en español o clave estable; **duda D7**: ¿en español, o `reason_codes[]` que el frontend traduce?). No persiste nada: el usuario aplica y guarda con `PUT`.

### 3.11 `GET /stores/{store_id}/restock-suggestions`

Parámetros: `from`, `to` (por defecto `data_as_of`..+14), `urgent_only` (bool), `page`, `page_size`.

```json
{
  "data": {
    "items": [
      {
        "id": "rs_S001_P001_20260930",
        "store_id": "S001",
        "product_id": "P001",
        "order_date": "2026-09-30",
        "expected_delivery_date": "2026-10-03",
        "is_urgent": true,
        "reasons": ["below_min", "demand_spike"],
        "suggested_qty": 288,
        "estimated_cost": 3931.20,
        "stock_at_order": 96,
        "predicted_daily_demand": 31.4,
        "supplier": {
          "supplier_id": "SUP01",
          "supplier_name": "Northern Beverage Distributors",
          "email": "northern.beverage.distributors@gmail.com",
          "unit_cost": 13.65,
          "min_order_qty": 144,
          "lead_time_days": 3,
          "delivery_days": "Tue|Fri",
          "reliability_score": 0.78
        },
        "alternatives": [
          { "supplier_id": "SUP02", "supplier_name": "Coahuila Bottling Logistics", "unit_cost": 15.04, "min_order_qty": 120, "lead_time_days": 2, "expected_delivery_date": "2026-10-02", "suggested_qty": 240, "estimated_cost": 3609.60 }
        ],
        "expected_lost_sales_if_skipped": 2100.00,
        "expected_gain_if_ordered": 1650.00,
        "expected_waste_if_ordered": 0.00
      }
    ],
    "page": 1, "page_size": 25, "total": 14
  }
}
```

Requeridos: `order_date` y `expected_delivery_date` **separados** (`expected_delivery_date = order_date + lead_time_days`), `supplier` elegido por `select_supplier()` (mismo resultado del dataset, mismas reglas: filtrar `lead_time_days > cobertura`, `qty = max(min_order_qty, ceil(demanda × (lead_time + cycle_days)))`), `is_urgent` (= ningún proveedor llega antes del quiebre), `reasons[]` ∈ `below_min | demand_spike | stockout | expiry | season`, `suggested_qty` (siempre ≥ `supplier.min_order_qty`), `estimated_cost` (= qty × unit_cost), `alternatives[]` con su `suggested_qty`, `estimated_cost` y `expected_delivery_date` ya calculados por oferta (el frontend no calcula al cambiar de proveedor). Las razones `expiry` y `season` extienden el enum del dataset (`below_min | demand_spike | stockout | season`); **duda D8**.

La UI compone: "Pide 288 a Northern Beverage Distributors hoy; llega el 3 de oct" a partir de estos campos.

### 3.12 `POST /restock-orders`

Envía el correo con Resend. **Solo se llama tras la confirmación explícita del usuario.**

Body:

```json
{ "suggestion_id": "rs_S001_P001_20260930", "supplier_id": "SUP01", "qty": 288 }
```

Respuesta 201:

```json
{
  "data": {
    "order_id": "PO-2026-091830",
    "suggestion_id": "rs_S001_P001_20260930",
    "store_id": "S001",
    "product_id": "P001",
    "supplier_id": "SUP01",
    "qty": 288,
    "unit_cost": 13.65,
    "estimated_cost": 3931.20,
    "order_date": "2026-09-30",
    "expected_delivery_date": "2026-10-03",
    "status": "sent",
    "sent_at": "2026-09-30T16:20:11Z",
    "email": {
      "to": "northern.beverage.distributors@gmail.com",
      "subject": "Orden de compra PO-2026-091830 — Retail República Oriente",
      "provider_message_id": "re_8f2c..."
    },
    "demo_redirect": true
  }
}
```

Reglas:
- El cliente **no** manda destinatario. El backend toma el correo del proveedor, y si `DEMO_MAILBOX` (variable de entorno) está definida, envía a ese buzón, pero devuelve en `email.to` el correo **mostrado** (el del proveedor, como si hubiera ido allí) y `demo_redirect: true`. La UI avisa "En demostración el envío real se redirige a un buzón de pruebas".
- Valida `qty >= min_order_qty` de la oferta; si no, `422 below_min_order_qty` con `min_order_qty` en `message`.
- Idempotente por `Idempotency-Key` / `suggestion_id` (un reintento no manda dos correos).
- Fallo de Resend: `502 email_failed`, sin cambiar el estado de la sugerencia.
- Marca: el correo usa "Retail <colonia>" como remitente/firma (el backend puede construirlo desde `colonia`).

### 3.13 `GET /stores/{store_id}/calendar`

Parámetros: `from`, `to` (mes visible), `layers` = lista separada por comas de `deliveries,strategies,alerts,context` (por defecto todas).

```json
{
  "data": {
    "store_id": "S001",
    "from": "2026-10-01",
    "to": "2026-10-31",
    "events": [
      { "id": "ev_1", "date": "2026-10-03", "kind": "delivery", "label_code": "delivery", "product_id": "P001", "supplier_id": "SUP01", "order_id": "PO-2026-091830", "qty": 288 },
      { "id": "ev_2", "date": "2026-10-04", "kind": "strategy", "strategy_id": "dr_01J...", "status": "scheduled", "strategy_type": "affinity_combo", "start_date": "2026-10-04", "end_date": "2026-10-10" },
      { "id": "ev_3", "date": "2026-10-02", "kind": "alert", "alert_type": "stockout_risk", "product_id": "P001", "severity": "high" },
      { "id": "ev_4", "date": "2026-10-05", "kind": "alert", "alert_type": "expiring_soon", "product_id": "P090", "qty": 36 },
      { "id": "ev_5", "date": "2026-09-28", "kind": "alert", "alert_type": "order_delayed", "product_id": "P002", "order_id": "PO-2026-091700", "expected_delivery_date": "2026-09-27", "delay_days": 3 }
    ],
    "context": [
      {
        "date": "2026-10-15",
        "day_of_week": "Thursday",
        "is_holiday": 0, "holiday_name": null,
        "event_name": "Mexico vs USA",
        "event_scope": "sports",
        "is_payday": 1, "is_school_vacation": 0, "is_college_vacation": 0,
        "temp_max_c": 31.2, "temp_min_c": 16.4, "precipitation_mm": 0.0, "weather_label": "hot",
        "is_forecast": true
      }
    ]
  }
}
```

Requeridos: `events[]` con `kind` ∈ `delivery | strategy | alert`; `alert_type` ∈ `stockout_risk | expiring_soon | order_delayed`. Para `order_delayed`: `delay_days` (o `expected_delivery_date` y `actual_delivery_date` nulo si sigue pendiente; **duda D9**, pendiente del diseño). `context[]` con las columnas de `calendar.csv` / `forecast_context.csv` (`event_name` y `event_scope` pueden traer varios valores separados por `|`); los feriados/eventos los traduce el frontend por clave exacta. El ejemplo de evento deportivo es ilustrativo.

### 3.14 `GET /suppliers` y `GET /suppliers/{supplier_id}/offers`

`GET /suppliers` — sin parámetros (19 filas):

```json
{
  "data": {
    "items": [
      {
        "supplier_id": "SUP01",
        "supplier_name": "Northern Beverage Distributors",
        "email": "northern.beverage.distributors@gmail.com",
        "city": "Saltillo",
        "categories_served": ["C01", "C02", "C11"],
        "reliability_score": 0.78,
        "offers_count": 41
      }
    ]
  }
}
```

`categories_served` se entrega ya como arreglo (el CSV usa `|`). `reliability_score` = probabilidad de entrega a tiempo; la UI lo rotula "Puntualidad" (no surtido).

`GET /suppliers/{supplier_id}/offers` — parámetros: `page`, `page_size`, `category_id`, `q`:

```json
{
  "data": {
    "supplier_id": "SUP01",
    "items": [
      { "product_id": "P001", "product_name": "Coca-Cola 600 ml", "category_id": "C01", "unit_cost": 13.65, "min_order_qty": 144, "lead_time_days": 3, "delivery_days": "Tue|Fri", "retail_price": 20.00 }
    ],
    "page": 1, "page_size": 25, "total": 41
  }
}
```

Editar proveedores queda fuera de alcance (solo lectura): el costo, mínimo y lead time viven en `supplier_products`.

### 3.15 `POST /suppliers/{supplier_id}/test-email`

Body: `{}`. Respuesta:

```json
{ "data": { "supplier_id": "SUP01", "status": "sent", "sent_at": "2026-09-30T16:31:00Z", "email": { "to": "northern.beverage.distributors@gmail.com" }, "demo_redirect": true } }
```

Misma política de redirección que §3.12.

### 3.16 `GET /products`

Catálogo (120 productos). Parámetros: `category_id`, `q`, `page`, `page_size`.

```json
{
  "data": {
    "items": [
      {
        "product_id": "P001",
        "product_name": "Coca-Cola 600 ml",
        "category_id": "C01",
        "brand": "Coca-Cola",
        "unit": "bottle",
        "retail_price": 20.00,
        "shelf_life_days": 180,
        "is_seasonal": 0,
        "weather_sensitivity": "hot",
        "base_daily_demand": 30.00,
        "default_supplier": { "supplier_id": "SUP01", "unit_cost": 13.65, "min_order_qty": 144 }
      }
    ],
    "page": 1, "page_size": 25, "total": 120
  }
}
```

`base_daily_demand` puede ser < 1 en baja rotación (la UI muestra decimales). El min/max por tienda va en §3.9, no aquí. También se usa para el autocompletado del mapa.

### 3.17 `POST /chat`

Chat del asistente (GenUI). Respuesta completa, sin streaming. El frontend permite iniciar en alcance cadena para preguntas de tendencia, suficiencia de stock y merma. Con `NEXT_PUBLIC_CHAT_ANALYSIS_SOURCE=compat`, esas consultas pasan por el adaptador tipado `POST /assistant/analysis`; al desplegar la Lambda que acepta tienda opcional, `backend` las manda a `POST /chat`. Ambas respuestas pueden devolver `focus_store_id` y `focus_product_id` para continuar en la sucursal y producto detectados (ver D26).

Al cargar el dashboard con una sucursal seleccionada, el frontend inicia una vez el flujo comercial por defecto. El agente debe consultar demanda prevista, histórico de ventas, stock/pedidos vigentes y restricciones; preseleccionar hasta cinco promociones viables; optimizar compatibilidad y mostrar únicamente las tres mejores. Debe conservar las respuestas estructuradas de las herramientas como fuente de verdad, declarar que el resultado es una simulación y no completar el cupo con opciones inventadas cuando menos de cinco pasan las reglas. Este flujo es de consulta: no aprueba ni activa promociones. Mientras el backend `/chat` no garantice esta orquestación, las preguntas generales de decisión comercial pasan por el adaptador determinista `/assistant/analysis`; las solicitudes específicas de una nueva promoción siguen usando `/chat`.

Las preguntas de catálogo de inventario y de ranking ("mayor/menor tendencia") también pasan por el adaptador determinista. El ranking compara los últimos 7 días contra los 7 anteriores para todos los productos activos de la sucursal y no reutiliza `context_product_id` salvo que el usuario pregunte por un producto explícito.

Body:

```json
{
  "store_id": "S001",
  "conversation_id": null,
  "message": "Aumenta las energéticas el sábado con máximo 10% de descuento"
}
```

`conversation_id` nulo la primera vez; el backend lo devuelve y el frontend lo reenvía. Errores (formato §1):

- `422 store_required`: falta `store_id`.
- `400 invalid_request`: `message` vacío o de más de 2000 bytes UTF-8. El input del frontend limita a 600 caracteres, que siempre caben.
- `404 conversation_not_found`: la conversación no existe o es de otra tienda o usuario. El frontend reenvía el mismo mensaje una vez con `conversation_id: null` (la respuesta no depende del historial).
- `404 store_not_found`: tienda desconocida.

Respuesta:

```json
{
  "request_id": "req_01HZZ",
  "data_as_of": "2026-09-30",
  "data": {
    "conversation_id": "conv_01J8",
    "message_id": "msg_02",
    "tools": [
      { "name": "get_current_store_context", "args": { "store_id": "S001" } },
      { "name": "get_demand_forecast", "args": { "store_id": "S001", "horizon": 14 } },
      { "name": "get_business_constraints", "args": { "store_id": "S001" } },
      { "name": "simulate_strategy", "args": { "strategy_type": "contextual_offer", "category_id": "C01", "max_discount_pct": 0.10 } },
      { "name": "create_promotion_draft", "args": { "store_id": "S001", "draft_id": "dr_01J8ABC" } },
      { "name": "optimize_portfolio", "args": { "store_id": "S001" } }
    ],
    "interpreted_constraints": {
      "product_ids": [], "category_id": "C01", "weekday": "Saturday", "max_discount_pct": 0.10
    },
    "blocks": [
      { "type": "text", "text": "Preparé un borrador con descuento de 8 % en el sábado." },
      { "type": "strategy_card", "strategy": { "...": "ver Strategy en §4" }, "requires_approval": true },
      {
        "type": "plan_summary",
        "current_net_expected_margin_increment": 9420.00,
        "with_draft_net_expected_margin_increment": 9420.00,
        "delta": 0.00,
        "overlaps": [
          { "draft_id": "dr_01J8XYZ", "product_id": "P014", "start_date": "2026-10-03", "end_date": "2026-10-03", "type": "overlapping_product" }
        ]
      }
    ]
  }
}
```

**Unión discriminada de bloques** (`type`):

| `type` | Campos |
|---|---|
| `text` | `text` |
| `forecast_chart` | `store_id`, `product_id`, `history[]` y `forecast[]` de puntos `{ date, value }`; `forecast[]` con `p50`, `p80`, `p90`; opcional `treated[]` (Go hoy no lo envía; manda 28 días de historia y 14 de pronóstico) |
| `strategy_card` | `strategy` (forma Strategy, §4.1), `requires_approval: true` |
| `plan_summary` | `current_net_expected_margin_increment`, `with_draft_net_expected_margin_increment`, `delta`, `overlaps[]` de objetos `{ draft_id, product_id, start_date, end_date, type }` (`type` = `overlapping_product`) |
| `restock_table` | `suggestions[]` con la forma de §3.11 (máximo 5) |

El frontend filtra bloques desconocidos o inválidos. En el dashboard, `text` se muestra en la conversación y el resto de bloques se dibujan en "Interfaces generadas", junto a la conversación y debajo del mapa. `tools[]` son los realmente ejecutados, en orden (`get_current_store_context`, `get_demand_forecast`, `get_historical_insights`, `get_business_constraints`, `simulate_strategy`, `optimize_portfolio`, `create_promotion_draft`, `get_product_tendency`, `get_product_sell_strategy`).

Reglas: el chat **nunca aprueba ni activa**; si el usuario pide "actívala", responde con texto indicando que la aprobación se hace desde el plan. Un borrador creado por el chat vive como `draft` y se agrega con `POST /drafts/{draft_id}/add-to-plan`. Error de agente: HTTP 5xx con el formato de §1 (el frontend ofrece "Reintentar" con el mismo `message`).

### 3.18 `POST /auth/signin` y `POST /auth/logout`

`/auth/signin` reemplaza a `/auth/login` (misma forma). Body: `{ "email": "demo@stockcopilot.com", "password": "demo1234" }`.

```json
{ "data": { "token": "eyJhbGciOi...", "expires_at": "2026-10-01T00:00:00Z", "user": { "id": "u_01", "name": "Demo", "email": "demo@stockcopilot.com" } } }
```

Credenciales incorrectas: `401 invalid_credentials`. Token ausente, inválido, vencido o revocado en cualquier otra ruta: `401 unauthorized`.

`POST /auth/logout` (con `Authorization`, body vacío) revoca la sesión del token: `{ "data": { "logged_out": true } }`.

### 3.20 `GET /predictions/stores`

Pronóstico de demanda de **todas las tiendas** para un producto, o para el conjunto de productos que cumplan los filtros. Alimenta el mapa de demanda del dashboard (un marcador por tienda, color por `risk`, tamaño por `predicted_daily_demand`) y sus cuatro KPI. Nombre, coordenadas y zona de cada tienda salen de `GET /stores`; el frontend une por `store_id`.

Parámetros: `product_id` (opcional; sin él agrega todos los productos que pasen los filtros y devuelve `product_id: null`), `category_id` (opcional), `tag` (opcional, ver D20), `horizon_days` (opcional; por defecto `default_plan_days` de `/meta`, 7).

```json
{
  "request_id": "req_01HZY",
  "data_as_of": "2026-09-30",
  "data": {
    "product_id": "P001",
    "horizon_days": 7,
    "target_days": 4,
    "filters": { "category_id": null, "tag": null },
    "summary": {
      "stores_count": 25,
      "current_daily_demand": 611.4,
      "predicted_daily_demand": 742.0,
      "average_uplift_pct": 0.21,
      "stores_at_risk": 6,
      "recommended_extra_qty": 318
    },
    "items": [
      {
        "store_id": "S001",
        "product_id": "P001",
        "products_count": 1,
        "current_daily_demand": 24.1,
        "predicted_daily_demand": 31.4,
        "uplift_pct": 0.303,
        "confidence": 0.86,
        "closing_qty": 75,
        "on_order_qty": 279,
        "coverage_days": 2.4,
        "recommended_extra_qty": 51,
        "risk": "watch",
        "reason_codes": ["zone_pattern", "weather_hot", "weekend_event"]
      }
    ]
  }
}
```

Las cifras del ejemplo son ilustrativas (salvo `closing_qty` y `on_order_qty` de `S001`/`P001`, que son los del extracto real). La forma exacta está en `storeDemandSchema` (`lib/api/schemas.ts`).

Reglas:

- **Una fila por tienda**, siempre las 25: si el filtro no aplica a una tienda, la fila va con ceros y `risk: "healthy"`, no se omite. Si ningún producto cumple los filtros: `items: []` y `summary` en ceros.
- **Los números son los de los demás endpoints**, no un cálculo paralelo (hoy el mock del mapa sí lo es y por eso no coincide con el stock real):
  - `closing_qty` y `on_order_qty` = los de `GET /stores/{id}/stock`; `coverage_days` = el de ese endpoint (`null` si no hay demanda prevista).
  - `predicted_daily_demand` = el de `restock-suggestions` y del stock.
  - `current_daily_demand` = promedio de unidades vendidas en los últimos 14 días (`avg_daily_units_14d` del extracto).
- `uplift_pct` es **fracción** (`0.21` = +21 %), como el resto del contrato.
- `recommended_extra_qty` = unidades para cubrir `target_days` de demanda prevista menos lo disponible (`closing_qty`), nunca negativa. `target_days` viaja en la respuesta para que la leyenda diga "objetivo de N días" sin hardcodearlo.
- `risk` ∈ `critical | watch | healthy` lo calcula el backend con la **misma regla que `status`** de §3.7 (ver D21). El frontend no lo deriva de `coverage_days`.
- En filas agregadas (`product_id: null`): `current_daily_demand`, `predicted_daily_demand`, `closing_qty`, `on_order_qty` y `recommended_extra_qty` son sumas; `coverage_days` = `closing_qty / predicted_daily_demand`; `risk`, `confidence` y `reason_codes` los define el backend (**duda D21**).
- `summary` lo calcula el backend (hoy lo suma el cliente). `stores_at_risk` = tiendas con `risk != "healthy"`. `average_uplift_pct` propuesto: `predicted_daily_demand / current_daily_demand - 1` de la cadena (ponderado por demanda); hoy el mapa promedia el uplift de cada tienda sin ponderar, y hay que decidir cuál se muestra.
- `reason_codes`: lista corta y estable (máx. 3) que el frontend traduce a español, igual que los motivos de restock. Propuesta inicial: `zone_pattern`, `weather_hot`, `weather_cold`, `weekend_event`, `commute_peak`, `payday`, `holiday`, `local_trend_up`. Un código desconocido se muestra tal cual; **avisen si agregan códigos** (D23).
- Es un pronóstico: siempre mira hacia adelante desde `data_as_of`; no acepta `from`/`to`.

### 3.21 `GET /stores/{store_id}/predictions/products`

Los productos de **una tienda** ordenados por prioridad, para el panel lateral del mapa ("Productos prioritarios"). Cada fila tiene la forma de §3.20 sin `store_id` ni `products_count`; nombre y categoría salen de `GET /products`.

Parámetros: `category_id`, `tag` (D20), `horizon_days`, `sort` (`priority` por defecto | `predicted_daily_demand` | `uplift_pct` | `recommended_extra_qty`), `page`, `page_size` (máx. 100; el panel pide 8).

```json
{
  "data": {
    "store_id": "S001",
    "horizon_days": 7,
    "target_days": 4,
    "filters": { "category_id": null, "tag": null },
    "items": [
      {
        "product_id": "P001",
        "current_daily_demand": 24.1,
        "predicted_daily_demand": 31.4,
        "uplift_pct": 0.303,
        "confidence": 0.86,
        "closing_qty": 75,
        "on_order_qty": 279,
        "coverage_days": 2.4,
        "recommended_extra_qty": 51,
        "risk": "watch",
        "reason_codes": ["weather_hot", "weekend_event"]
      }
    ],
    "page": 1, "page_size": 8, "total": 120
  }
}
```

- `sort=priority` (el orden lo da el backend, el frontend no reordena): `critical` primero, luego `watch`, luego `healthy`; dentro de cada nivel, mayor `recommended_extra_qty` y después mayor `predicted_daily_demand`.
- Tienda desconocida: 404 `store_not_found`, como el resto de `/stores/{id}/...`.
- El detalle de **una tienda y un producto** (panel derecho al elegir un producto) no necesita endpoint propio: es la fila de la tienda en `GET /predictions/stores?product_id=`.

### Relación con otros endpoints

| Pantalla / endpoint | Qué responde |
|---|---|
| Mapa de demanda (§3.20, §3.21) | **Qué se espera vender y si alcanza el stock**, por tienda y producto |
| `GET /heat` (§3.5) | Lo que **se vendió** (rango pedido); no es un pronóstico |
| `GET /stores/{id}/stock` (§3.7) | Estado del stock y mínimos/máximos editables; debe coincidir con `closing_qty`, `coverage_days` y `risk` de §3.20 |
| `restock-suggestions` (§3.11) | Qué **pedir**, a qué proveedor y cuándo; usa el mismo `predicted_daily_demand` |
| M0 `tendency` y `plan` | Serie diaria con P50/P80/P90 y promociones; su `forecast` debe promediar el mismo `predicted_daily_demand` de §3.20 |

Cuando exista el modelo de predicción real **este es el punto de enganche**: el modelo escribe el pronóstico una sola vez y todos estos endpoints leen de ahí. Si dos pantallas muestran cifras distintas para la misma tienda, producto y día, es un error de datos, no de presentación.

### 3.19 `POST /assistant/product-comparison`

Lambda de comparación externa. Recibe `{ "store_id": "S003", "product_id": "P001", "query": "Coca-Cola 600 ml productos similares México" }`. La Lambda obtiene el producto interno, añade país/idioma y consulta `GET https://api.search.brave.com/res/v1/web/search` con `country=MX`, `search_lang=es`, `count<=8` y el encabezado `X-Subscription-Token`. La variable `BRAVE_SEARCH_API_KEY` vive únicamente en Secrets Manager o en el entorno cifrado de Lambda; nunca usa prefijo `NEXT_PUBLIC_`, nunca se devuelve al cliente y nunca se registra.

La respuesta usa el envelope normal y el bloque GenUI ya soportado por el frontend:

```json
{
  "data": {
    "type": "market_comparison",
    "provider": "brave",
    "query": "Coca-Cola 600 ml productos similares México",
    "searched_at": "2026-10-10T18:00:00Z",
    "items": [
      {
        "title": "Producto comparable",
        "url": "https://example.com/producto",
        "source": "example.com",
        "description": "Resumen breve derivado del resultado de búsqueda.",
        "price_text": "$22 MXN"
      }
    ]
  }
}
```

La Lambda debe validar URLs `https`, limitar el texto, deduplicar por dominio/URL, conservar la fuente y aplicar timeout. Brave es evidencia externa para comparar oferta y posicionamiento; no sustituye ventas, stock ni el modelo interno y no puede aprobar promociones.

---

## 4. Formas de Strategy y Portfolio

### 4.1 Strategy

Coincide con `StrategyCandidate` + `StrategySimulation` + `PromotionDraft` de M0, y `strategy_type` con `promotion_campaigns.strategy_type`.

```json
{
  "draft_id": "dr_01J8ABC",
  "store_id": "S001",
  "status": "selected",
  "strategy_type": "affinity_combo",
  "title": "Combo Coca-Cola 600 ml + snack",
  "anchor_product_id": "P001",
  "promoted_product_id": "P017",
  "period": { "start_date": "2026-10-03", "end_date": "2026-10-09" },
  "proposed_discount_pct": 0.10,
  "constraints": {
    "min_margin_pct": 0.12,
    "max_discount_pct": 0.25,
    "budget_mxn": 2500.00,
    "satisfied": true,
    "violations": []
  },
  "assumptions": [
    "Afinidad observada en 31 % de los tickets (ticket_lines, últimos 90 días).",
    "Uplift estimado con campañas tratadas y control similares."
  ],
  "baseline": { "units": 420, "net_revenue": 8400.00, "margin": 2650.00, "waste_units": 0, "waste_cost": 0.00, "stockout_risk": 0.18 },
  "treated":  { "units": 505, "net_revenue": 9330.00, "margin": 3120.00, "waste_units": 0, "waste_cost": 0.00, "stockout_risk": 0.22 },
  "expected_units_increment": 85,
  "expected_sales_increment": 930.00,
  "expected_margin_increment": 470.00,
  "expected_waste_reduction": 0.00,
  "confidence_interval": { "low": 210.00, "high": 720.00, "level": 0.8 },
  "explanation": "Quienes compran Coca-Cola 600 ml suelen llevar un snack; el viernes y la quincena elevan el flujo.",
  "drivers": ["bought_together", "demand"],
  "created_at": "2026-09-30T15:00:00Z",
  "approved_at": null,
  "measurement": null,
  "requires_approval": true
}
```

Requeridos: `draft_id`, `store_id`, `status` (enum de §2, incluye `rejected`), `strategy_type` ∈ `affinity_combo | rescue_bundle | contextual_offer`, `anchor_product_id` (puede ser `null` en `contextual_offer`), `promoted_product_id`, `period`, `proposed_discount_pct` (fracción), `baseline` y `treated` (ambos con `units`, `net_revenue`, `margin`, `waste_units`, `waste_cost`, `stockout_risk` 0..1), los cuatro incrementales, `confidence_interval` `{low, high, level}` sobre `expected_margin_increment`, `assumptions[]`, `constraints` (incluye `violations[]`), `explanation`, `drivers[]` ∈ `demand | weather | event | season | shelf_life | bought_together`.

Plantillas:
- `affinity_combo`: ancla + producto promovido de alta afinidad; el descuento aplica al promovido.
- `rescue_bundle`: producto con riesgo de merma (`earliest_expiry` cercano) atado a uno de alta rotación.
- `contextual_offer`: oferta por contexto (evento, clima, quincena, estacionalidad); puede ser de un solo producto.

Estrategia rechazada por restricción (demo): llega con `status: "rejected"`, `treated` presente y `constraints.satisfied: false`, `violations: [{ "code": "min_margin", "message": "...", "limit": 0.12, "actual": 0.04 }]`. Por favor incluir una en fixtures (M0 ya la pide).

Estrategia `measured`: `measurement` = `{ "measured_at": "...", "actual": { "units": 498, "net_revenue": 9210.00, "margin": 3050.00, "waste_units": 0 }, "actual_margin_increment": 400.00, "control_group_used": true }`; la UI compara con lo esperado.

### 4.2 Portfolio y respuesta de `plan`

```json
{
  "store_id": "S001",
  "period": { "from": "2026-10-01", "to": "2026-10-07" },
  "generated_at": "2026-09-30T06:00:00Z",
  "strategies": [ { "...": "Strategy" } ],
  "portfolio": {
    "net_expected_margin_increment": 9420.00,
    "confidence_interval": { "low": 6100.00, "high": 12400.00, "level": 0.8 },
    "conflicts": [
      { "strategy_ids": ["dr_01J8ABC", "dr_01J8ABD"], "type": "overlapping_product", "description": "Comparten P001 entre el 03 y el 05", "resolution": "kept_higher_impact" }
    ]
  },
  "reason_if_fewer": null
}
```

- `strategies[]` ordenadas por impacto neto descendente, máx. 5 (no cuenta `rejected`/`expired` históricas; el backend decide si las manda aparte con `include_history=true`).
- `portfolio.net_expected_margin_increment` considera canibalización y conflictos: **no es la suma de las tarjetas**.
- `reason_if_fewer`: texto o código estable cuando hay menos de 5 (p. ej. `"no_viable_candidates"`, `"constraints_filtered_2"`). Con 0 estrategias, `strategies: []` y el motivo es obligatorio.
- `add-to-plan`, `approve`, `reject` y `strategies:generate` devuelven `{ strategy, portfolio }` o el `plan` completo (cualquiera, pero con el portafolio recalculado en la misma respuesta).

---

## 5. Campos que el dataset aún no entrega y se piden

| Campo | Para qué | Propuesta de fuente |
|---|---|---|
| `reorder_point` por tienda×producto | Mínimo de stock, estados `low` | Ya usado en `simulate_operations.py` (`predicted_daily_demand × (mediana lead time + safety_days)`) pero **no se persiste**; exponerlo y permitir sobrescribirlo (§3.9) |
| `max_stock` | Estado `over`, tope visual | Definir regla (p. ej. `predicted_daily_demand × (lead_time + cycle_days + safety)`) o configuración por tienda |
| `lost_demand` agregado | "Artículos sin stock", riesgo de quiebre | Ya existe en `inventory_daily`; falta agregarlo por ventana (§3.7) |
| `earliest_expiry`, `expiring_qty_7d` | Caducidad próxima y alerta "por caducar" | Derivar de `inventory_lots` |
| Percentiles `p50/p80/p90` | Banda de incertidumbre del forecast | M4 (el contrato M0 `Forecast` ya los incluye); en histórico, solo `value` |
| `proposed_discount_pct` | Descuento propuesto por el motor (sin slider) | M5; fracción 0..1 |
| `reason_if_fewer` | Aviso cuando hay < 5 estrategias | M5 / optimizador |
| Resultados de medición (`measurement`) | Estado `measured`: real vs. esperado | M7 (`promotion.measured.v1`) usando control de `promotion_store_days` |
| `average_ticket`, `items_per_ticket` y deltas | KPIs de ticket | Agregar `ticket_lines` por ventana |
| Afinidad observada vs. estimada | Etiqueta Observado/Estimado | Athena sobre `ticket_lines` + reglas de negocio |
| Pedidos retrasados (`delay_days`) | Alerta "Pedido retrasado" | `purchase_orders.expected_delivery_date` vs. `actual_delivery_date` (o nulo con fecha vencida) |
| Correo mostrado vs. real | Aviso de demo | Variable de entorno `DEMO_MAILBOX` + `demo_redirect` (§3.12) |

---

## 6. Dataset: archivos faltantes en el repo backend y regeneración

El diccionario nuevo (`scripts/dataset/build_readme.py`) describe 17 archivos y el generador ya los produce (`run_all.py`, `SEED = 42`, 2024-01-01 a 2026-09-30, forecast de 14 días), pero **los CSV versionados en `public/softtek/dataset/dataset-hackathon-road2tech/v2/` son anteriores** al generador y no coinciden con él.

Presentes en `v2/` (versión vieja): `calendar`, `categories`, `inventory_lots`, `products`, `purchase_orders`, `sales`, `stores`, `supplier_products`, `suppliers`, `weather`, `zones`.

**Faltan** respecto al diccionario nuevo:
- `ticket_lines.csv`
- `inventory_daily.csv` (en la raíz hay un `inventory_daily.csv` del dataset original, de otro esquema)
- `promotion_campaigns.csv`
- `promotion_store_days.csv`
- `forecast_context.csv`

Además `sales.csv` vigente **no trae** las columnas nuevas `discount_amount`, `net_revenue`, `revenue`, `campaign_id`, `campaign_units`.

Pedido al backend: regenerar con `python3 scripts/dataset/run_all.py` (o el gate Docker de M0: `docker compose build dataset` y `docker compose run --rm dataset`), pasar `validate.py` y publicar el `v2/README.md` resultante. El frontend no versiona CSV: extrae un subconjunto compacto con su propio script contra esa salida, y mientras tanto usa un conjunto semilla con la misma forma construido del catálogo real.

---

## 7. Decisiones del frontend que el backend debe conocer

1. **Marca:** la arma el frontend: `"Retail " + colonia`. `store_name` ("OXXO ...") no se muestra; no hace falta cambiarlo.
2. **Traducción:** categorías, zonas, días de entrega (`Tue|Fri` → "Mar/Vie"), clima, estados, motivos, feriados y eventos (~40, por clave exacta) los traduce el frontend con diccionarios. Un código sin traducción se muestra tal cual; **avisen si agregan eventos nuevos**. Nombres de producto y marca se muestran como llegan (en inglés).
3. **Sin slider:** el detalle muestra `proposed_discount_pct` y dos escenarios (`baseline` = "Si no aceptas", `treated` = "Si aceptas"). No hay curva de descuento ni recalcular en el cliente.
4. **Sin cálculos financieros en cliente:** ni suma de portafolio, ni margen, ni estado de stock, ni fechas de entrega, ni mínimo de pedido (la UI solo valida `qty >= min_order_qty` con el valor que manda el backend).
5. **Vista "Todas":** solo usa `GET /chain/summary`, `GET /stores`, `GET /heat` y `GET /stock/summary`/`GET /stock` con filtros. No muestra plan ni pedidos. El asistente aparece debajo del mapa pidiendo elegir una tienda y no llama a `/chat` sin `store_id`. El mapa de demanda lee §3.20 y §3.21 (regla 10).
6. **Aprobación humana:** nada se aprueba ni se envía sin un diálogo de confirmación; el chat no aprueba.
7. **Filtros de la UI:** sucursal, "Datos" (`actual | forecast`) y rango relativo a `data_as_of` (últimos 7/30, próximos 14/30 días) se traducen a `from`, `to`, `mode`.
8. **Validación:** el frontend valida cada respuesta con esquemas zod; una respuesta con forma distinta se muestra como error con `request_id`. Cambios de contrato → avisar para actualizar el esquema.
9. **Modo mock:** `NEXT_PUBLIC_API_MODE=mock|hybrid|http`, `NEXT_PUBLIC_API_URL`. Con mock o hybrid aparece la insignia "Datos de ejemplo". `NEXT_PUBLIC_API_HTTP_PATHS` (p. ej. `/chat`; vale en mock y en hybrid) fuerza únicamente esas rutas al backend real, además de las que `hybrid` ya manda (`/auth` se agrega solo para que el token sea del backend).
10. **Mapa de demanda:** hoy usa un mock propio (`lib/mock/storeDemand.ts`, cifras generadas con un hash) que no coincide con el stock real. Se migrará a §3.20 y §3.21 con el mismo sobre y esquemas que el resto; el frontend no sumará ni promediará nada y no calculará el riesgo.
11. **Escala:** 25 tiendas, 120 productos, 20 categorías, 19 proveedores; listas paginadas en servidor.

---

## 8. Checklist de aceptación para backend

- [ ] Envoltorio `{request_id, data_as_of, data}` y error `{code, message, request_id}` en todos los endpoints.
- [ ] `data_as_of` consistente entre endpoints (demo: `2026-09-30`).
- [ ] CSV regenerados con `run_all.py`, `validate.py` en verde, y los 5 archivos faltantes disponibles (§6).
- [ ] Los 7 endpoints M0 con fixtures de éxito/error y la forma de Strategy/Portfolio de §4 (incluye `proposed_discount_pct`, `baseline`/`treated`, `confidence_interval`, `reason_if_fewer`).
- [ ] `GET /meta`, `GET /chain/summary`, `GET /stores`, `GET /stores/{id}/kpis`, `GET /heat`, `GET /stores/{id}/behaviors`.
- [ ] `GET /predictions/stores` y `GET /stores/{id}/predictions/products` (§3.20, §3.21) con cifras idénticas a `stock`, `restock-suggestions` y `tendency` para la misma tienda, producto y día.
- [ ] `GET /stores/{id}/stock` paginado/filtrado y `GET /stock/summary` con `out+low+ok+over = total`.
- [ ] `GET/PUT /stores/{id}/stock-policy` y `POST .../stock-policy:suggest` con `reason`.
- [ ] `GET /stores/{id}/restock-suggestions` con fechas de pedido/entrega separadas, `is_urgent`, `reasons`, alternativas con costo y fecha por oferta; cantidad nunca menor a `min_order_qty`.
- [ ] `POST /restock-orders` con Resend, `DEMO_MAILBOX`, `demo_redirect`, idempotencia y error `below_min_order_qty`.
- [ ] `GET /stores/{id}/calendar` con entregas, estrategias, alertas (sin stock, por caducar, pedido retrasado) y capa de contexto.
- [ ] `GET /suppliers`, `GET /suppliers/{id}/offers`, `POST /suppliers/{id}/test-email`, `GET /products`.
- [ ] `POST /chat` con bloques de la unión discriminada, `tools[]` reales, `conversation_id`, y `requires_approval: true` en borradores; el chat no puede aprobar.
- [x] `POST /auth/signin` con token Bearer, `POST /auth/logout` y 401 en token vencido o revocado.
- [ ] Transiciones inválidas de estado rechazadas con error claro; `approve`/`reject` idempotentes.
- [ ] CORS habilitado para el origen del frontend.
- [ ] Respuestas a nuestros dudas abiertas (§9).

---

## 9. Dudas abiertas para el backend

- **D1.** ¿`discount_pct` y `proposed_discount_pct` siempre como fracción (0.10)? El frontend asume que sí.
- **D2.** ¿`GET /plan` devuelve también estrategias `rejected`/`expired`/`measured`? Propuesta: sí, con `include_history`.
- **D3.** Regla exacta de "artículos sin demanda" y "artículos sin stock" para KPIs.
- **D4.** ¿`ai_opportunity_mxn` de la cadena es la suma de portafolios por tienda (cada uno optimizado) o un optimizador global? (Solo importa que lo calcule el backend.)
- **D5.** Forma de pedir stock de toda la cadena (`store_id=all` o `GET /stock`).
- **D6.** `unit_cost` mostrado en políticas: ¿oferta elegida por `select_supplier` o la más barata?
- **D7.** `reason` de `stock-policy:suggest` y `explanation` de estrategias: ¿texto en español o códigos?
- **D8.** Motivos de restock: ¿se agregan `expiry`/`season` al enum?
- **D9.** Forma exacta del pedido retrasado (`delay_days` vs. fechas).
- **D10.** ¿El chat flotará en todas las pantallas? Hoy solo en el dashboard, debajo del mapa; sin tienda pide elegir una.

### Peticiones adicionales surgidas al migrar las pantallas

- **D11. Tendencia por producto.** El panel lateral del dashboard muestra productos con demanda en alza o en baja, pero ningún endpoint entrega la tendencia por producto. Propuesta: `GET /products?sort=trend_desc|trend_asc` con `trend_pct` y `units_per_day` por fila (para la tienda elegida, con `store_id`). El frontend no la calcula.
- **D12. Estrategia por id.** El detalle de una estrategia depende de que esté en el plan vigente. Propuesta: `GET /drafts/{draft_id}` para abrir una estrategia rechazada, expirada o medida por enlace directo.
- **D13. Quitar del plan.** No existe transición `selected → draft`. Hoy "Quitar del plan" llama a `reject`. Aclarar si "quitar" debe ser un estado distinto (por ejemplo, volver a `draft`) o es un rechazo.
- **D14. Eventos de estrategia en el calendario.** Incluir `product_id` (o `title`) en los eventos `kind = "strategy"` para poder enlazar al producto.
- **D15. Alternativas de proveedor con correo.** Incluir `email` (y, si se puede, `expected_lost_sales_if_skipped` / `expected_gain_if_ordered` por alternativa) en `restock-suggestions[].alternatives[]`.
- **D16. Stock por producto.** El detalle del producto busca existencia con `GET /stores/{id}/stock?q=<nombre>`. Propuesta: aceptar `product_id` como filtro exacto.
- **D17. Código de transición inválida.** Confirmar el `code` de error para transiciones no permitidas (el frontend asume HTTP 409 `invalid_transition`) y la lista estable de códigos de `reason_if_fewer` y de `conflicts[].type|resolution` para traducirlos.
- **D18. Edición de proveedores.** El frontend los muestra de solo lectura. Si se necesita alta o edición, agregar `POST /suppliers` y `PUT /suppliers/{id}`.
- **D19. Demanda prevista de productos de temporada.** En `purchase_orders.predicted_daily_demand` / `stock` el producto de temporada fuera de su ventana (ej. "Three Kings' Cake", se vende solo del 26-dic al 10-ene) trae demanda prevista positiva (≈ 5.9 u/día en septiembre) aunque sus ventas reales son 0. El forecast/optimizador debe respetar la ventana de venta; el mock del frontend lo ignora con una regla local.

### Peticiones por el mapa de demanda (§3.20 y §3.21)

- **D20. Etiquetas de producto.** El mapa filtra por "motor de demanda" (`beer`, `energy`, `hot_coffee`, `party_snack`, `ice`, `disposable`...), pero el dataset y `GET /products` no traen etiquetas. Propuesta: `tags: string[]` en cada producto de `GET /products` y filtro `tag` en §3.20 y §3.21. Si no se van a ofrecer, el filtro se quita de la interfaz y solo queda categoría. El esquema del frontend ya acepta `tags` opcional.
- **D21. Riesgo de demanda vs. estado de stock.** `risk` (`critical | watch | healthy`) y `status` de §3.7 (`out | low | ok | over`) deben decir lo mismo. Propuesta: `critical` = `out` o cobertura menor al lead time; `watch` = `low` o cobertura menor a lead time + `safety_days`; `healthy` = el resto. Falta definir también cómo se agrega el riesgo cuando `product_id` es `null`.
- **D22. `confidence`.** ¿Cómo la define el modelo (p. ej. `1 - (p90 - p50) / p50` acotada a 0..1, o la que entregue el modelo)? El frontend solo la muestra como porcentaje.
- **D23. Códigos de `reason_codes`.** Lista definitiva y estable (la de §3.20 es un punto de partida) y si pueden traer parámetros (por ejemplo el nombre del evento cercano).
- **D24. Horizonte y objetivo.** ¿`horizon_days` admite los valores de `meta.horizons.forecast_days` (7, 14, 30)? ¿`target_days` es configuración global o por tienda?
- **D25. Qué descuenta `recommended_extra_qty`.** El ejemplo de §3.20 solo resta `closing_qty`. ¿Debe restar también `on_order_qty` (lo que ya viene en camino) o los pedidos retrasados? Hoy el mapa no lo hace y por eso sugiere stock extra aunque haya pedidos abiertos.

### Cambios por rediseño de promociones (v2 del contrato)

- **`GET /drafts/{draft_id}`** (resuelve D12): devuelve la estrategia (forma §4.1) más `optimal_discount_pct` y `discount_curve[]`: un punto por descuento de `0` a `max_discount_pct` en pasos de `0.01`, cada uno con `discount_pct`, `treated` (units, net_revenue, margin, waste_units, waste_cost, stockout_risk), `expected_units_increment`, `expected_sales_increment`, `expected_margin_increment`, `expected_waste_reduction` y `confidence_interval`. El `baseline` es el mismo para todos los descuentos. El frontend **no calcula dinero**: el slider solo elige un punto de esta curva.
- **`POST /drafts/{id}/approve` y `add-to-plan`**: aceptan opcionalmente `{ "discount_pct": 0.12 }`. Si viene, la estrategia queda con ese descuento (`proposed_discount_pct`) y su impacto se recalcula junto con el portafolio. Debe respetar `max_discount_pct`; si no, 422 `discount_out_of_range`.
- **`GET /stores/{id}/behaviors`**: cada comportamiento puede traer `strategy_id` (el borrador del plan que lo atiende; p. ej. la promoción de rescate para una alerta de merma). `null` si no hay.
- **Margen de los escenarios**: `baseline.margin` y `treated.margin` deben ser netos de la merma (`margen - waste_cost`) para que `treated.margin - baseline.margin = expected_margin_increment`.

### Cambios por enlace directo al pedido

- **`GET /stores/{id}/behaviors`**: cada comportamiento puede traer `restock_suggestion_id` (string o `null`): el `id` (`rs_...`) de la sugerencia de restock **vigente** (aún sin enviar) que atiende ese comportamiento. Lo usa sobre todo el pico de demanda (`kind = "demand"`) para que "Ver pedido sugerido" lleve directo al detalle del pedido (`/calendar?store=…&product=…&order=<id>`). Debe coincidir exacto con el `id` que devuelve `restock-suggestions` de esa tienda. Si el producto no tiene sugerencia vigente, `null` (la tarjeta solo ofrece "Ver en calendario"). Conviene priorizar alertas de demanda de productos que sí tienen sugerencia, como ya se hace con merma → promoción.
- **`GET /stores/{id}/restock-suggestions`**: acepta además `product_id` (filtro exacto) junto a `from`, `to`, `urgent_only`, `page` y `page_size` (hasta 100). El frontend lo usa para resolver el pedido de un enlace sin recorrer toda la lista.
- Una sugerencia puede abrirse **por id**: el calendario recibe `?order=<restock_suggestion_id>`, espera las sugerencias de la tienda y abre el modal "Orden Restock" de esa sugerencia una sola vez. Si el id ya no está vigente (se envió o dejó de sugerirse) muestra un aviso y no abre nada. Pendiente opcional para backend: `GET /restock-suggestions/{id}` (o `id` como filtro) para no depender de la ventana `from`/`to`.

- **Merma esperada por producto (`GET /stores/{id}/stock`)**: cada item puede traer `expected_waste_units` (unidades que caducarán sin venderse; `0` cuando no habrá merma). El detalle del producto lo muestra como "Merma esperada"; si el backend no lo envía y nada caduca dentro del horizonte del pronóstico, la pantalla muestra `0 u` (no un guion).

### Revisión contra `BackendRoad2Tech` `origin/main` @ `47b522b`

- **D26. Dos chats incompatibles.** La Lambda Go `POST /chat` cumple §3.17 (JSON con `blocks[].type`). El servicio Python `services/copilot-api` expone `POST /copilot` (AG-UI sobre SSE, CopilotKit). Ahí los resultados de herramientas llegan con discriminador `kind` (`product_tendency`, `product_sell_strategy`, `restock_plan`, `store_overview`, `demand_by_store`, `portfolio`, `product_search`) y la aprobación es un `interrupt` (`promotion_approval`), que contradice la regla de que el chat no aprueba. El frontend consume solo `POST /chat`. Confirmar cuál queda en producción; si es `/copilot`, hace falta un adaptador de `kind` a `blocks[]`. Además, Go en `47b522b` no tiene funciones `/drafts/*` ni `/stores/{id}/plan`. Esas rutas solo existen en Python, sobre otro almacén (`DR-…` en memoria o Postgres, frente a `dr_…` en DynamoDB) y con otras formas: `add-to-plan|approve|reject` devuelven `PromotionDraft`, no `{ strategy, portfolio }` (§4), y `plan` devuelve `PlanOut`. Por eso "Agregar al plan" desde una tarjeta del chat falla en modo http hasta que exista una sola implementación con las formas de §4.
- **D27. Datos del mapa.** Resuelta por el rediseño del mapa: ya lee §3.20 y §3.21 con `request()`, zod y el sobre normal. Lo que sigue abierto va en D20 a D25. En Python existe además `GET /products/{product_id}/demand-by-store?days=` (`recent_units`, `previous_units`, `change_pct` en %, `forecast_next_7d_units`) con otra forma, que el frontend no usa.
- **D28. `violations: null`.** En Go, si el descuento máximo pedido es menor a 1 %, `optimize` no simula ningún paso y puede devolver `status: "rejected"`, `satisfied: false` y `violations: null` sin motivo (`api/functions/chat/strategy.go`). El frontend acepta `null` como lista vacía, pero el backend debería mandar `[]` y un motivo.
- **D29. Mismas preguntas, distinta intención.** El parser de Go manda cualquier mensaje con "promo" al intent de promoción. La pregunta rápida "Mejor promoción de la semana" crea un borrador nuevo en cada clic y responde `strategy_card` + `plan_summary`; el mock solo resume el plan. Los bloques son del mismo tipo, pero la demo cambia entre modo mock y http.

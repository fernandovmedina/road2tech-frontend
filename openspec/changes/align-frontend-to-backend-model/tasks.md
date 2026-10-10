## 1. Contrato para el backend (pista independiente, inicia de inmediato)

- [x] 1.1 Escribir `docs/backend-contract.md`: endpoints propuestos (meta/bootstrap, chain summary, KPIs, heat, tendency, plan, strategies, add-to-plan/approve/reject, stock + summary, stock-policy + suggest, restock suggestions/orders, calendar, suppliers + offers, products, auth/login, chat) con método, ruta, parámetros y ejemplo de respuesta usando nombres del dataset
- [x] 1.2 Añadir al documento los campos que el dataset aún no entrega (`reorder_point`, `lost_demand`, `earliest_expiry`, percentiles P50/P80/P90, `proposed_discount_pct`, `reason_if_fewer`) y los requisitos de redirección de correo a buzón demo
- [x] 1.3 Anotar en el documento que los CSV versionados del backend están desactualizados y listar los archivos faltantes (`ticket_lines`, `inventory_daily`, campañas, `forecast_context`)

## 2. Datos de ejemplo reales (pista independiente)

- [x] 2.1 Intentar ejecutar el generador del backend (`scripts/dataset/run_all.py`) en una copia fuera del repo y registrar tiempos/errores
- [x] 2.2 Crear `scripts/extract-sample-data.py` que lea los CSV generados y escriba JSON compacto en `lib/mock/data/` (tiendas, productos, categorías, proveedores, ofertas, stock actual, en tránsito, ventas diarias 44 días, tickets agregados, calendario, `forecast_context`)
- [x] 2.3 Si el generador no corre, crear el conjunto semilla con la misma forma desde el catálogo real y documentar la limitación
- [x] 2.4 Verificar tamaño total < 5 MB, que ningún CSV esté versionado y añadir al `.gitignore` la carpeta de CSV temporales

## 3. Tipos, validación y transporte (bloquea las secciones 5–10)

- [x] 3.1 Instalar `zod`; definir esquemas de dominio y envoltorio `{request_id, data_as_of, data}` y error `{code, message, request_id}`; derivar tipos en `types/`
- [x] 3.2 Crear transporte `http`/`mock` seleccionado por `NEXT_PUBLIC_API_MODE` y `NEXT_PUBLIC_API_URL`; validar toda respuesta; mapear errores a estados de UI con `request_id`
- [x] 3.3 Crear `useAsOf` y reemplazar `todayIso()` en calendario, tendencias y rangos
- [x] 3.4 Crear `lib/labels.ts` (categorías, zonas, días, clima, estados, motivos, eventos/feriados, tipos de estrategia) y `t(kind, code)` con respaldo al código original
- [x] 3.5 Crear `displayBranchName` ("Retail <colonia>") y actualizar copy de marca
- [x] 3.6 Adaptar `lib/format.ts`: moneda con 2 decimales para precios/costos, decimales en demanda de baja rotación
- [x] 3.7 Autenticación: `POST /auth/login`, token en cada petición, 401 → cierre de sesión; cuenta demo en modo mock

## 4. Mock reescrito sobre los datos reales (depende de 2 y 3)

- [x] 4.1 Reemplazar `lib/mock/seed.ts` y `engine.ts` por adaptadores que lean los JSON de ejemplo y devuelvan las formas validadas, sin fórmulas económicas
- [x] 4.2 Incluir en el mock un plan con cinco estrategias, un plan con menos de cinco con motivo, una estrategia rechazada por restricción y ejemplos de cada estado del ciclo de vida
- [x] 4.3 Mantener latencia 300–600 ms y estados forzados vacío/error
- [x] 4.4 Eliminar imports directos al mock desde componentes (`categories`, `promoGain`, `nextDeliveryDate`, `resetState`) exponiendo hooks

## 5. Dashboard y alcance cadena/tienda (depende de 3 y 4)

- [x] 5.1 Selector de sucursal con 25 tiendas, alcance "Todas" y filtros que se conservan entre pantallas
- [x] 5.2 KPIs: ticket por venta real, artículos por ticket, sin stock, sin demanda y oportunidad del backend
- [x] 5.3 Vista de cadena: mapa con `fitBounds`, color por movimiento, filtro por zona, ranking de tiendas y aviso para elegir tienda
- [x] 5.4 Comportamientos de compra con etiqueta Observado/Estimado
- [x] 5.5 Panel lateral con búsqueda, tope de resultados y filtro de categoría como selector

## 6. Plan y estrategias (depende de 3 y 4)

- [x] 6.1 `useStorePlan` y acciones (agregar, quitar, aprobar con confirmación, rechazar, regenerar) con recálculo de portafolio del backend
- [x] 6.2 Tarjeta de estrategia (tipo, productos, vigencia, descuento, incrementales, merma evitada, riesgo de quiebre, intervalo, explicación, restricciones)
- [x] 6.3 Línea de estado del ciclo de vida y acciones por estado
- [x] 6.4 Estados vacío, "menos de cinco" con motivo y error del plan

## 7. Detalle de estrategia/producto (depende de 3 y 4)

- [x] 7.1 Gráfico con historial, series base y tratada, bandas P50/P80/P90 reales y ventana de vigencia
- [x] 7.2 Reemplazar el simulador con slider por descuento propuesto + escenarios "Si no aceptas / Si aceptas" desde el backend
- [x] 7.3 Métricas del producto con caducidad real y retirar el motor local

## 8. Chat GenUI (depende de 3 y 4)

- [x] 8.1 Esquema zod de bloques (texto, forecast, tarjeta de estrategia, resumen del plan, reabasto) y filtrado de bloques inválidos
- [x] 8.2 Lista de herramientas con nombre y parámetros reales
- [x] 8.3 Flujo de borrador por prompt: restricciones interpretadas, comparación con el plan, "Agregar al plan"/"Descartar", sin aprobar desde el chat
- [x] 8.4 Requerir tienda, identificador de conversación, errores con "Reintentar"

## 9. Stock, reabasto y calendario (depende de 3 y 4)

- [x] 9.1 Stock con paginación y filtros en servidor, resumen de conteos, en tránsito y caducidad próxima
- [x] 9.2 Sugerencias de reabasto con fecha de pedido/entrega, urgencia, motivos y proveedores alternativos
- [x] 9.3 Modal de pedido con validación de mínimo de pedido, confirmación, aviso de buzón demo y manejo de error
- [x] 9.4 Calendario con eventos de entrega/estrategia/alerta, capa de contexto y alertas (sin stock, por caducar, pedido retrasado)

## 10. Proveedores y Productos (depende de 3 y 4)

- [x] 10.1 Proveedores: correo, ciudad, categorías, puntualidad y tabla de ofertas por producto; correo de prueba con confirmación
- [x] 10.2 Productos por sucursal: mínimo (punto de reorden) y máximo editables con validación y sugerencia del backend

## 11. Pulido y documentación (al final)

- [x] 11.1 Actualizar `AGENTS.md` (glosario, contratos, escala, marca, reglas sin cálculo financiero) y `public/context/README.md` con el diccionario nuevo
- [x] 11.2 Estados de carga/vacío/error en cada pantalla y revisión a 1440px y 1024px
- [x] 11.3 Ejecutar `tsc`, lint y recorrido manual completo (login → dashboard → plan → aprobar → calendario → pedido → stock → proveedores → productos)
- [ ] 11.4 Archivar el change `build-initial-ui-screens` sin sincronizar requisitos reemplazados

## 12. Rediseño de promociones (feedback de revisión)

- [x] 12.1 Contrato y datos: `GET /drafts/{id}` con curva de descuentos, `discount_pct` en approve y `strategy_id` en comportamientos (schemas, hooks, contrato, mock)
- [x] 12.2 Dashboard: sección "Promociones para reducir pérdidas y aumentar utilidades" con las 3 mejores (tarjeta simple: línea, tres cifras, acción, "¿Cómo se calculó?") y enlace a las demás
- [x] 12.3 Dashboard: sección "Comportamientos de compra detectados" corta y con acción por tarjeta (merma → promoción de rescate, demanda → restock/calendario, venta cruzada → combo)
- [x] 12.4 Detalle de promoción como el diseño anterior: cifras arriba, gráfica, tarjeta con slider alimentado por la curva, "Si no aceptas / Si aceptas", tabla y botones; aceptar envía el descuento elegido
- [x] 12.5 Chat y calendario usan la tarjeta simple; revisión visual a 1440px y 1024px

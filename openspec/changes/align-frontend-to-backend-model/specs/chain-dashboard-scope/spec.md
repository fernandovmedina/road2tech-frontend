## Purpose

Definir el comportamiento del dashboard según el alcance (cadena o tienda): KPIs con ticket real, mapa por zona, comportamientos observados y acceso al plan solo por tienda.

## ADDED Requirements

### Requirement: Alcance cadena vs. tienda
El dashboard SHALL ofrecer "Todas las sucursales" como vista de cadena, con KPIs agregados, mapa de calor y ranking de tiendas con mayor oportunidad, sin mostrar plan de estrategias ni pedidos. Al elegir una tienda (selector o clic en el mapa) SHALL mostrar además su plan y su asistente.

#### Scenario: Vista de cadena
- **WHEN** el alcance es "Todas"
- **THEN** se muestran KPIs agregados, mapa y ranking de tiendas, y un aviso invita a elegir una tienda para ver su plan

#### Scenario: Clic en el mapa
- **WHEN** el usuario hace clic en un marcador
- **THEN** el alcance cambia a esa tienda y aparece su plan

### Requirement: KPIs con datos reales de tickets
El dashboard SHALL mostrar ticket por venta (monto neto promedio por ticket) con variación, artículos por ticket, artículos sin stock, artículos sin demanda y oportunidad detectada por IA. El valor de oportunidad MUST ser el impacto neto del portafolio entregado por el backend.

#### Scenario: KPI de ticket
- **WHEN** el backend devuelve ticket promedio y variación
- **THEN** la tarjeta muestra el monto en MXN con dos decimales y la variación con signo

#### Scenario: Oportunidad en cadena
- **WHEN** el alcance es "Todas"
- **THEN** la oportunidad es la suma que entrega el backend para la cadena, no un cálculo del cliente

### Requirement: Filtros que cambian los datos
Los controles de sucursal, modo de datos (Actuales | Predicción ML) y rango de fechas SHALL cambiar la petición enviada y los valores mostrados, y SHALL conservarse al navegar entre pantallas.

#### Scenario: Rango de fechas
- **WHEN** el usuario elige "Próximos 14 días"
- **THEN** las tarjetas y listas se recargan con ese rango relativo a `data_as_of`

### Requirement: Mapa de calor por zona
El mapa SHALL mostrar las 25 tiendas ajustando la vista a todas, colorear el movimiento (0–100), permitir filtrar por zona y buscar un producto para ver dónde se mueve más con una marca ★ en la tienda líder, y limpiar el filtro con "Quitar filtro".

#### Scenario: Búsqueda de producto
- **WHEN** el usuario busca un producto
- **THEN** el mapa muestra el movimiento de ese producto y marca la tienda líder con ★

### Requirement: Comportamientos de compra observados
Las tarjetas de comportamientos SHALL provenir de patrones observados en tickets y campañas (afinidad, merma, demanda). Cuando un patrón sea inferido o simulado, la tarjeta MUST indicarlo.

#### Scenario: Afinidad observada
- **WHEN** el backend marca un par de productos con afinidad observada en tickets
- **THEN** la tarjeta muestra el porcentaje de tickets que los combinan y la etiqueta "Observado"

#### Scenario: Afinidad inferida
- **WHEN** el backend marca la afinidad como inferida
- **THEN** la tarjeta muestra la etiqueta "Estimado"

### Requirement: Productos y promociones en el panel lateral
El panel lateral SHALL listar productos por demanda en alza o en baja con búsqueda y un máximo de resultados visibles, y la pestaña de promociones SHALL listar las estrategias del plan de la tienda seleccionada.

#### Scenario: Lista larga
- **WHEN** hay 120 productos
- **THEN** la lista muestra los primeros resultados y permite buscar o cargar más

### Requirement: Dos secciones separadas con una tienda elegida
Con una tienda seleccionada el dashboard SHALL mostrar dos secciones distintas: "Promociones para reducir pérdidas y aumentar utilidades" (las mejores tres promociones del plan) y "Comportamientos de compra detectados" (picos de demanda, riesgo de merma y ventas cruzadas observadas). Una no SHALL repetir el contenido de la otra.

#### Scenario: Secciones distintas
- **WHEN** hay una tienda elegida
- **THEN** las promociones aparecen en su sección y los comportamientos en la suya, con encabezados propios

### Requirement: Cada comportamiento termina en una acción
Cada comportamiento SHALL describirse en una frase corta y ofrecer una acción concreta: un riesgo de merma abre la promoción de rescate del plan cuando existe; un pico de demanda abre el restock o el calendario del producto; una venta cruzada observada abre la promoción de combo cuando existe. Un comportamiento sin promoción asociada MUST NOT mostrar un botón de promoción.

#### Scenario: Merma con promoción
- **WHEN** un comportamiento de merma tiene una promoción de rescate en el plan
- **THEN** la tarjeta muestra "Ver promoción" y abre su detalle

#### Scenario: Pico de demanda
- **WHEN** el comportamiento es un pico de demanda
- **THEN** la tarjeta muestra una acción hacia el restock del producto

## Purpose

Definir cómo se componen las pantallas (encabezado, KPIs, filtros, maestro-detalle y estados) y cómo se aplica el estándar a cada ruta, de modo que navegar de una pantalla a otra se sienta como una sola aplicación.

## ADDED Requirements

### Requirement: Encabezado de página uniforme
Toda ruta autenticada SHALL abrir con el mismo encabezado: título 800, subtítulo de apoyo, badge "Datos de ejemplo" mientras los datos sean simulados y, a la derecha, los controles de la página. Esto incluye `/opportunities`, que MUST vivir dentro del shell autenticado (con sidebar y redirección a `/login` sin sesión).

#### Scenario: Entrar a /opportunities sin sesión
- **WHEN** una persona sin sesión abre `/opportunities`
- **THEN** es redirigida a `/login`

#### Scenario: Entrar a /opportunities con sesión
- **WHEN** una persona con sesión abre `/opportunities`
- **THEN** ve el sidebar, el encabezado estándar con el badge de datos de ejemplo y el mapa de demanda

### Requirement: Fila de KPIs
Las filas de KPIs SHALL usar el componente de KPI del estándar en una cuadrícula de 2 columnas (≥ 640 px) y 4 o 5 columnas (≥ 1280 px). Cada KPI muestra etiqueta, valor y, si aplica, variación o pie de contexto. El KPI de "Oportunidad detectada por IA" MAY usar la variante destacada (fondo oscuro), que es la única variante destacada por fila.

#### Scenario: Dashboard con sucursal seleccionada
- **WHEN** el dashboard muestra los KPIs de una sucursal
- **THEN** las cinco tarjetas comparten estructura y solo "Oportunidad detectada por IA" usa la variante destacada

### Requirement: Barra de filtros
Los filtros de una pantalla SHALL agruparse en una sola barra sobre el contenido, con controles de 40 px de alto como mínimo, etiquetas accesibles y el mismo estilo de selector, búsqueda y control segmentado en todas las rutas.

#### Scenario: Filtros del mapa y del dashboard
- **WHEN** se comparan los filtros del mapa de demanda con los del dashboard
- **THEN** usan los mismos componentes con el mismo alto, radio y anillo de foco

### Requirement: Maestro-detalle
Las pantallas con lista o mapa y detalle (dashboard con mapa, stock, calendario con barra lateral) SHALL usar una cuadrícula de contenido fluido más un panel lateral de ancho fijo en ≥ 1280 px, y apilar el panel debajo en pantallas menores.

#### Scenario: Calendario
- **WHEN** el ancho es ≥ 1280 px
- **THEN** la cuadrícula mensual ocupa el espacio fluido y las sugerencias de restock y proveedores van en el panel lateral

### Requirement: Estados de carga, vacío y error
Cada pantalla y cada panel con datos remotos SHALL mostrar un esqueleto durante la carga, un estado vacío con texto que explique qué hacer y un estado de error con acción de reintentar, todos con los mismos componentes y textos de `lib/copy.ts`. Los esqueletos MUST conservar las dimensiones del contenido para evitar saltos de diseño.

#### Scenario: Estado "Error" de la demo
- **WHEN** se activa el estado de demo "Error" desde el sidebar
- **THEN** cada pantalla muestra el estado de error estándar con un botón "Reintentar" y no se rompe el resto del layout

#### Scenario: Estado "Vacío" en el mapa
- **WHEN** el mapa no recibe predicciones
- **THEN** se muestra el estado vacío estándar en español dentro de la tarjeta del mapa

### Requirement: Responsive sin scroll horizontal
Todas las pantallas SHALL verse correctamente a 1440 px, no romperse a 1024 px y apilarse en anchos de teléfono, sin scroll horizontal de la página.

#### Scenario: Revisión a 1024 px
- **WHEN** se abre cualquier ruta autenticada a 1024 px de ancho
- **THEN** no hay scroll horizontal de la página y ningún texto queda cortado sin truncado intencional

### Requirement: Aplicación a todas las rutas
El estándar SHALL aplicarse a login, dashboard (vista de cadena y de sucursal), detalle de producto y estrategia, calendario, stock, proveedores, productos y mapa de demanda. Ninguna ruta MUST conservar el estilo anterior (KPIs de 28 px extrabold en tarjetas `rounded-2xl` ni la paleta propia del mapa) una vez cerrado el cambio.

#### Scenario: Recorrido de demo
- **WHEN** se recorre la demo de 5 minutos entre todas las rutas
- **THEN** encabezados, tarjetas, KPIs, filtros, insignias y botones son visualmente consistentes y el comportamiento funcional no cambió

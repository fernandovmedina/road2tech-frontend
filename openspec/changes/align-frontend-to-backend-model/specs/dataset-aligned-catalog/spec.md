## Purpose

Alinear sucursales, productos, categorías y proveedores con el dataset real del backend (25 tiendas, 120 productos, 20 categorías, 19 proveedores con ofertas), con marca genérica y textos en español.

## ADDED Requirements

### Requirement: Identificadores opacos del dataset
El frontend SHALL tratar `store_id`, `product_id`, `supplier_id` y `category_id` como cadenas opacas y MUST NOT contener identificadores de ejemplo fijos en componentes o respuestas simuladas del chat.

#### Scenario: Sin IDs fijos
- **WHEN** se revisa el código de componentes
- **THEN** no aparecen literales como `b-centro` o `p-yogurt`

### Requirement: Marca genérica de sucursal
Cada sucursal SHALL mostrarse como "Retail " seguido de su colonia (por ejemplo "Retail República Oriente"); el prefijo de marca del dataset MUST NOT mostrarse.

#### Scenario: Nombre en selector y mapa
- **WHEN** una tienda tiene `store_name = "OXXO República Oriente"` y `colonia = "República Oriente"`
- **THEN** selectores, tablas y mapa muestran "Retail República Oriente"

### Requirement: Datos de sucursal ampliados
La sucursal SHALL exponer colonia, zona primaria y secundaria, tamaño, horario y si opera 24 horas; la zona SHALL mostrarse traducida y poder usarse para filtrar o colorear el mapa.

#### Scenario: Ficha en el mapa
- **WHEN** el usuario selecciona un marcador
- **THEN** ve nombre, zona traducida, tamaño y horario

### Requirement: Traducción de códigos
La interfaz SHALL traducir códigos y etiquetas del dataset a español mediante diccionarios centralizados (categorías, zonas, días de entrega, clima, estados, motivos, eventos y feriados). Los nombres de producto y marca MUST mostrarse como llegan. Un código sin traducción SHALL mostrarse tal cual sin fallar.

#### Scenario: Días de entrega
- **WHEN** una oferta trae `delivery_days = "Tue|Fri"`
- **THEN** se muestra "Mar/Vie"

#### Scenario: Evento desconocido
- **WHEN** el calendario trae un evento sin traducción
- **THEN** se muestra el texto original sin error

### Requirement: Escala de 25 tiendas y 120 productos
Las listas SHALL seguir siendo utilizables con 25 sucursales y 120 productos: categorías mediante selector o búsqueda en lugar de una fila de chips, listas largas con búsqueda y límite de resultados, y mapa ajustado a todas las tiendas.

#### Scenario: Filtro de categoría
- **WHEN** hay 20 categorías
- **THEN** el filtro es un selector desplegable y no desborda el diseño

### Requirement: Proveedores con ofertas por producto
El proveedor SHALL mostrar nombre, correo, ciudad, categorías que atiende y puntualidad (`reliability_score`, rotulada como puntualidad, no como surtido). Tiempo de entrega, costo, mínimo de pedido y días de ruta SHALL mostrarse por oferta (proveedor × producto).

#### Scenario: Detalle de proveedor
- **WHEN** el usuario abre un proveedor
- **THEN** ve su puntualidad y la tabla de productos que ofrece con costo, mínimo, tiempo y días de entrega

### Requirement: Precios con decimales
Precios y costos unitarios SHALL mostrarse con dos decimales y la demanda de productos de baja rotación con decimales, sin redondear a cero.

#### Scenario: Producto de baja rotación
- **WHEN** un producto vende 0.25 u/día
- **THEN** se muestra "0.3 u/día" y no "0 u/día"

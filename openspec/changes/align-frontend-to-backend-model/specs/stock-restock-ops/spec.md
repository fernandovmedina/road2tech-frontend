## Purpose

Cubrir stock, reabasto, calendario, pedidos por correo, catálogo de productos con min/max por sucursal y proveedores, alineados al dataset y a la regla de mejor proveedor del backend.

## ADDED Requirements

### Requirement: Stock por tienda y producto
La pantalla de stock SHALL mostrar existencia, cobertura en días, unidades en tránsito, caducidad más próxima y estado (sin stock, bajo mínimo, en rango, sobrestock) por tienda y producto, usando mínimo y máximo entregados por el backend.

#### Scenario: Estado bajo mínimo
- **WHEN** la existencia es menor al punto de reorden de esa tienda
- **THEN** el estado es "Bajo mínimo"

#### Scenario: Unidades en tránsito
- **WHEN** hay pedidos sin fecha de entrega real
- **THEN** la fila muestra las unidades en tránsito y la fecha esperada

### Requirement: Paginación y resumen en servidor
Con la vista de todas las tiendas, la tabla SHALL paginarse y filtrarse en el servidor, y las cuatro tarjetas de conteo SHALL provenir de un resumen del backend, no de contar filas cargadas.

#### Scenario: Conteos con filtros
- **WHEN** hay más filas que las de la página actual
- **THEN** las tarjetas muestran el total real de cada estado

### Requirement: Sugerencia de reabasto con mejor proveedor
Cada sugerencia SHALL mostrar fecha de pedido y fecha esperada de entrega por separado, proveedor elegido, cantidad, costo estimado, marca de urgencia, motivos (bajo mínimo, pico de demanda, quiebre, caducidad, estacionalidad) y proveedores alternativos con su costo y tiempo de entrega.

#### Scenario: Pedido urgente
- **WHEN** la sugerencia está marcada como urgente
- **THEN** se muestra la etiqueta "Urgente" y el mensaje "Pide X a Y hoy; llega el D"

#### Scenario: Proveedor alternativo
- **WHEN** el usuario cambia de proveedor entre las alternativas
- **THEN** se actualizan costo, cantidad mínima y fecha de entrega con valores del backend

### Requirement: Cantidad mínima de pedido
La cantidad editable del pedido MUST ser mayor o igual al mínimo de pedido de la oferta del proveedor elegido.

#### Scenario: Cantidad menor al mínimo
- **WHEN** el usuario captura una cantidad menor al mínimo
- **THEN** se muestra un error en español y se bloquea el envío

### Requirement: Envío de pedido con confirmación
Enviar un pedido SHALL requerir confirmación explícita. La pantalla SHALL mostrar el correo del proveedor como destinatario y MUST NOT enviar nada sin confirmación. Un aviso SHALL indicar que, en demostración, el envío real se redirige a un buzón de pruebas.

#### Scenario: Envío confirmado
- **WHEN** el usuario confirma "Enviar correo"
- **THEN** se llama al backend, se muestra la confirmación y la sugerencia pasa a "Pedido enviado"

#### Scenario: Fallo de envío
- **WHEN** el backend responde un error
- **THEN** se muestra el error con "Reintentar" y la sugerencia no cambia de estado

### Requirement: Calendario con contexto y alertas
El calendario SHALL mostrar entregas, estrategias y alertas, y una capa de contexto (feriados, eventos, quincena, vacaciones y clima pronosticado) para explicar picos de demanda. Las alertas SHALL incluir sin stock, por caducar y pedido retrasado.

#### Scenario: Pedido retrasado
- **WHEN** un pedido llegó después de su fecha esperada o sigue pendiente
- **THEN** aparece una alerta "Pedido retrasado" en el calendario

#### Scenario: Capa de contexto
- **WHEN** el usuario activa la capa de contexto
- **THEN** los días con evento o feriado muestran su etiqueta traducida

### Requirement: Mínimo y máximo por sucursal
La pantalla de productos SHALL requerir una sucursal y mostrar, por producto, mínimo (punto de reorden) y máximo de esa tienda. Los valores SHALL poder editarse con validación (enteros, mínimo ≤ máximo) y el botón "Sugerir min/max con IA" SHALL mostrar la sugerencia del backend con su motivo antes de aplicarla.

#### Scenario: Sin sucursal
- **WHEN** no hay sucursal elegida
- **THEN** se invita a elegir una y no se muestran campos editables

#### Scenario: Sugerencia aplicada
- **WHEN** el usuario aplica las sugerencias
- **THEN** los campos se rellenan, quedan marcados como sin guardar y se guardan solo al confirmar

### Requirement: Proveedores como catálogo con ofertas
La pantalla de proveedores SHALL listar proveedores con correo, ciudad, categorías y puntualidad, y mostrar sus ofertas por producto. La tarjeta "Resend conectado" SHALL permitir un correo de prueba con confirmación.

#### Scenario: Correo de prueba
- **WHEN** el usuario confirma "Enviar correo de prueba"
- **THEN** se solicita al backend y se muestra el resultado

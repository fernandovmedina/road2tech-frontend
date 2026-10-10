## Purpose

Definir lo que el usuario ve y puede hacer con el asistente: componentes elegidos según su consulta, resultados validados, tarjeta de aprobación con confirmación y reglas que impiden que el modelo ejecute contenido o decida por el usuario.

## ADDED Requirements

### Requirement: Componente según la consulta
Cuando el agente use una herramienta, el asistente SHALL mostrar el componente que corresponde a esa herramienta: gráfico de tendencia para `get_product_tendency`, tarjeta de promoción para `get_product_sell_strategy`, tabla de pedidos para `get_restock_suggestions`. Para `get_store_overview`, `get_demand_by_store`, `generate_store_plan` y `search_products` SHALL mostrar su componente propio o, mientras no exista, la tarjeta genérica.

#### Scenario: Pregunta de tendencia
- **WHEN** el usuario pregunta cómo se vende un producto y el agente usa `get_product_tendency`
- **THEN** el chat muestra el gráfico con historial, pronóstico y rangos del resultado de la herramienta

#### Scenario: Pregunta de promoción
- **WHEN** el agente usa `get_product_sell_strategy`
- **THEN** el chat muestra la tarjeta con descuento, vigencia, escenarios "Si no aceptas" y "Si aceptas" y el impacto neto esperado, tal como los entregó la herramienta

### Requirement: Resultados validados y cerrados
Cada resultado de herramienta SHALL validarse con un esquema antes de mostrarse. Un resultado inválido o una herramienta desconocida MUST mostrarse como tarjeta genérica con aviso, sin interrumpir el chat. La interfaz MUST NOT interpretar como HTML o código el texto del modelo ni los campos de los resultados.

#### Scenario: Herramienta nueva
- **WHEN** el agente usa una herramienta que el frontend no conoce
- **THEN** se muestra la tarjeta genérica con su nombre y el resto de la conversación continúa

#### Scenario: Resultado con forma inesperada
- **WHEN** el resultado de una herramienta conocida no cumple el esquema
- **THEN** se muestra la tarjeta genérica con aviso y no se lanza ningún error visible

### Requirement: Las cifras vienen del backend
El asistente MUST NOT calcular montos, impactos, márgenes ni fechas de entrega. Solo SHALL dar formato a los valores recibidos (moneda MXN, porcentajes, fechas) y convertir unidades de presentación, como mostrar `8` como "8 %".

#### Scenario: Descuento recibido
- **WHEN** la herramienta entrega un descuento de 8 (porcentaje)
- **THEN** la tarjeta muestra "8 %" sin recalcular ninguna otra cifra

### Requirement: Herramientas visibles en español
Cada respuesta SHALL mostrar las herramientas consultadas con una etiqueta en español y su nombre técnico. Una herramienta desconocida MUST mostrarse por su nombre técnico.

#### Scenario: Herramienta conocida
- **WHEN** el agente usa `get_restock_suggestions`
- **THEN** se muestra su etiqueta en español junto al nombre técnico

### Requirement: Aprobación con tarjeta y confirmación
Cuando el agente pause para pedir aprobación de una promoción, el asistente SHALL mostrar una tarjeta con producto, vigencia, descuento, impacto neto esperado, rango de confianza y riesgo de quedarse sin stock, con las acciones "Aprobar", "Rechazar" y "Después". "Aprobar" MUST abrir un diálogo de confirmación y SOLO tras confirmarlo se envía la decisión al agente. Ninguna promoción SHALL aprobarse o activarse sin esa confirmación explícita, ni por texto escrito en el chat.

#### Scenario: Aprobar con confirmación
- **WHEN** el usuario pulsa "Aprobar" y confirma en el diálogo
- **THEN** se envía la decisión de aprobar y la tarjeta muestra el estado final que reporta el agente

#### Scenario: Cancelar la confirmación
- **WHEN** el usuario pulsa "Aprobar" y cancela el diálogo
- **THEN** no se envía ninguna decisión y la tarjeta sigue pendiente

#### Scenario: Rechazar o dejar para después
- **WHEN** el usuario pulsa "Rechazar" o "Después"
- **THEN** se envía esa decisión y la tarjeta refleja que la promoción quedó rechazada o guardada como borrador

#### Scenario: Pedir activar por texto
- **WHEN** el usuario escribe "actívala" sin usar la tarjeta
- **THEN** no cambia el estado de ninguna promoción

### Requirement: Indicadores de espera
Mientras el agente trabaja, el asistente SHALL mostrar un indicador de escritura y, para cada herramienta en curso, un estado de carga. Si la espera supera 8 segundos MUST indicar que el asistente sigue analizando.

#### Scenario: Herramienta en curso
- **WHEN** el agente está ejecutando una herramienta
- **THEN** el espacio del resultado muestra un estado de carga hasta que llegue el resultado

### Requirement: Chat de respaldo disponible
Mientras el agente no esté habilitado, el chat de respaldo existente SHALL seguir mostrando respuestas con bloques y herramientas, con la regla de que no aprueba promociones.

#### Scenario: Modo de ejemplo
- **WHEN** la aplicación corre en modo mock
- **THEN** el asistente responde con el chat de respaldo y el distintivo "Datos de ejemplo" sigue visible

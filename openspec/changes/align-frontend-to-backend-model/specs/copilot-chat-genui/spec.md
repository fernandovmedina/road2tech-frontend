## Purpose

Definir el asistente conversacional: bloques de interfaz validados, herramientas reales visibles, borradores de estrategia por prompt y separación entre proponer y aprobar.

## ADDED Requirements

### Requirement: Respuestas con bloques validados
El asistente SHALL renderizar únicamente bloques de un conjunto conocido (texto, gráfico de forecast, tarjeta de estrategia, resumen del plan, tabla o calendario de reabasto). Cada respuesta SHALL validarse contra un esquema; un bloque desconocido o inválido MUST descartarse con un aviso discreto. La interfaz MUST NOT ejecutar HTML ni JavaScript generado por el modelo.

#### Scenario: Bloque desconocido
- **WHEN** la respuesta incluye un bloque de tipo no soportado
- **THEN** ese bloque no se renderiza y el resto de la respuesta se muestra

### Requirement: Herramientas visibles
Cada respuesta SHALL mostrar las herramientas consultadas como una lista con nombre y parámetros (por ejemplo `get_demand_forecast`, `simulate_strategy`, `optimize_portfolio`, `create_promotion_draft`), tomadas de la respuesta del backend.

#### Scenario: Varias herramientas
- **WHEN** una respuesta usó tres herramientas
- **THEN** se muestran las tres en orden de ejecución

### Requirement: Estrategia por prompt como borrador
Cuando el usuario pida una estrategia, el asistente SHALL mostrar las restricciones interpretadas (producto o categoría, día, descuento máximo), la tarjeta de estrategia como borrador con sus escenarios base y tratado, y una comparación con el plan actual. Las acciones SHALL ser "Agregar al plan" y "Descartar".

#### Scenario: Petición con restricción
- **WHEN** el usuario pide "aumentar energéticas el sábado con máximo 10% de descuento"
- **THEN** se muestran las restricciones interpretadas y un borrador con descuento no mayor a 10%

#### Scenario: Agregar al plan
- **WHEN** el usuario pulsa "Agregar al plan"
- **THEN** el borrador pasa al plan y el impacto del portafolio se actualiza con el valor del backend

### Requirement: Alcance por tienda y conversación
El asistente SHALL operar sobre la tienda seleccionada y SHALL conservar un identificador de conversación para retomar un borrador. Sin tienda seleccionada MUST pedir elegir una.

#### Scenario: Sin tienda
- **WHEN** el alcance es "Todas"
- **THEN** el asistente invita a elegir una tienda antes de proponer estrategias

### Requirement: Proponer no es aprobar
El asistente MUST NOT aprobar ni activar promociones. La aprobación SHALL ocurrir solo desde las acciones del plan con confirmación.

#### Scenario: Petición de activar
- **WHEN** el usuario escribe "actívala"
- **THEN** el asistente indica que la aprobación se hace desde el plan y no cambia ningún estado

### Requirement: Estados de carga y error
El asistente SHALL mostrar indicador de escritura durante la espera, un mensaje con "Reintentar" ante error y conservar el historial de la sesión.

#### Scenario: Error del agente
- **WHEN** la petición falla
- **THEN** se muestra el error en la conversación con "Reintentar" y el historial se conserva

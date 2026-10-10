## Purpose

Mostrar el plan comercial por tienda (hasta cinco estrategias priorizadas), su impacto de portafolio, el ciclo de vida de cada estrategia y la comparación con y sin aceptar, sin cálculos económicos en el cliente.

## ADDED Requirements

### Requirement: Plan por tienda y periodo
Con una tienda seleccionada, el sistema SHALL mostrar el plan vigente de esa tienda para un periodo (por defecto siete días desde `data_as_of`) con hasta cinco estrategias ordenadas por impacto neto esperado, más el impacto neto del portafolio completo.

#### Scenario: Plan con cinco estrategias
- **WHEN** el backend devuelve cinco estrategias viables
- **THEN** se muestran cinco tarjetas ordenadas por impacto y el total del portafolio proviene del backend

#### Scenario: Menos de cinco oportunidades
- **WHEN** el backend devuelve tres estrategias y un motivo
- **THEN** se muestran tres tarjetas y el motivo en un aviso, sin rellenar con estrategias falsas

#### Scenario: Plan vacío
- **WHEN** no hay estrategias viables
- **THEN** se muestra un estado vacío con el motivo y la acción "Regenerar plan"

### Requirement: Tarjeta de estrategia
Cada estrategia SHALL mostrar tipo (combo de afinidad, combo de rescate o promoción contextual), productos y tienda, vigencia, acción o descuento propuesto, ventas e ingresos incrementales, margen incremental, merma evitada, riesgo de quiebre, intervalo de incertidumbre, explicación y restricciones consideradas.

#### Scenario: Combo de dos productos
- **WHEN** la estrategia es un combo con producto ancla y producto promovido
- **THEN** la tarjeta lista ambos productos y el descuento propuesto

#### Scenario: Incertidumbre visible
- **WHEN** la estrategia trae un intervalo de confianza
- **THEN** el impacto se muestra como estimación con su rango, nunca como valor garantizado

### Requirement: Comparación con y sin aceptar sin slider
El detalle SHALL mostrar el descuento propuesto por el motor y dos escenarios, "Si no aceptas" y "Si aceptas", con unidades, ingresos, margen, merma, riesgo de quiebre e impacto neto, y la diferencia. La interfaz MUST NOT ofrecer un control para ajustar el descuento.

#### Scenario: Escenarios del backend
- **WHEN** se abre el detalle de una estrategia
- **THEN** las series base y tratada y las cifras de ambos escenarios provienen del backend

#### Scenario: Sin control de descuento
- **WHEN** se abre el detalle
- **THEN** no existe un slider ni campo para modificar el descuento

### Requirement: Ciclo de vida visible
Cada estrategia SHALL mostrar su estado y una línea de pasos Borrador → En el plan → Aprobada → Programada → Activa → Medida, además de Rechazada y Expirada. Las acciones disponibles SHALL depender del estado.

#### Scenario: Borrador
- **WHEN** el estado es borrador
- **THEN** las acciones son "Agregar al plan" y "Descartar"

#### Scenario: En el plan
- **WHEN** el estado es "En el plan"
- **THEN** las acciones son "Aprobar", "Rechazar" y "Quitar del plan"

#### Scenario: Medida
- **WHEN** el estado es "Medida"
- **THEN** se muestra el resultado real frente al esperado y no hay acciones de cambio

### Requirement: Recalculo de portafolio
Al agregar o quitar una estrategia del plan, el sistema SHALL solicitar al backend el nuevo impacto del portafolio y mostrar un estado de carga hasta recibirlo. El total mostrado MUST NOT ser la suma de las tarjetas calculada en el cliente.

#### Scenario: Agregar al plan
- **WHEN** el usuario agrega un borrador al plan
- **THEN** el total del portafolio se actualiza con el valor devuelto por el backend

### Requirement: Aprobación humana explícita
Una estrategia SHALL pasar a aprobada solo mediante una acción explícita del usuario con confirmación. Ninguna acción automática de la interfaz MUST aprobar una estrategia.

#### Scenario: Confirmación de aprobación
- **WHEN** el usuario pulsa "Aprobar"
- **THEN** se pide confirmación y solo tras confirmar se envía la aprobación

### Requirement: Regenerar plan
El usuario SHALL poder pedir "Regenerar plan" para la tienda y ver el resultado actualizado.

#### Scenario: Regeneración
- **WHEN** el usuario pulsa "Regenerar plan"
- **THEN** se muestra carga y luego el plan nuevo con su fecha de generación

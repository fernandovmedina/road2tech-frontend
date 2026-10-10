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

### Requirement: Detalle de promoción con slider alimentado por el backend
El detalle SHALL mostrar el descuento óptimo del motor, un control (slider) para ajustar el descuento de 0 a 40 % y dos escenarios, "Si no aceptas" y "Si aceptas", con unidades, ingresos, margen, merma, riesgo de quiebre e impacto neto y su diferencia. Todas las cifras de cada descuento SHALL provenir de la curva de descuentos que entrega el backend en una sola respuesta (`GET /drafts/{id}`); el cliente MUST NOT calcular dinero al mover el slider. Aceptar SHALL enviar el descuento elegido.

#### Scenario: Mover el slider
- **WHEN** el usuario mueve el slider a 15 %
- **THEN** los escenarios, la tabla y la gráfica se actualizan al instante con el punto de la curva para 15 % y no se hace ninguna petición nueva

#### Scenario: Volver al óptimo
- **WHEN** el descuento elegido es distinto del óptimo
- **THEN** se ofrece "Usar el óptimo" que regresa el slider al descuento del motor

#### Scenario: Aceptar con descuento elegido
- **WHEN** el usuario acepta tras confirmar con un descuento distinto del propuesto
- **THEN** la aprobación se envía con ese descuento

#### Scenario: Estrategia no editable
- **WHEN** la estrategia ya está aprobada, rechazada o expirada
- **THEN** el slider está deshabilitado y se muestran las cifras del descuento aplicado

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

### Requirement: Mejores tres promociones del periodo
La sección "Promociones para reducir pérdidas y aumentar utilidades" SHALL mostrar las 3 promociones del plan con mayor ganancia neta esperada, ordenadas de mayor a menor, con un enlace para ver las restantes del plan (hasta 5). Cada una SHALL indicar su tipo con una etiqueta simple (Combo, Evitar merma u Oferta por contexto).

#### Scenario: Plan con cinco estrategias
- **WHEN** el plan trae cinco estrategias
- **THEN** se muestran las tres de mayor ganancia y un enlace "Ver las otras 2"

#### Scenario: Plan con dos estrategias
- **WHEN** el plan trae dos estrategias
- **THEN** se muestran las dos sin enlace adicional y con el motivo que entrega el backend

### Requirement: Tarjeta de promoción entendible
Cada tarjeta de promoción SHALL mostrar: la promoción en una línea (producto o productos, descuento y fechas), tres cifras con nombre simple en lenguaje cotidiano (lo que ganarías, la merma que evitas y el riesgo de quedarte sin stock en palabras bajo/medio/alto) y una acción. Los términos técnicos (margen incremental, rango, nivel de confianza, supuestos y restricciones) SHALL estar disponibles en un bloque plegado "¿Cómo se calculó?" y MUST NOT ocupar la tarjeta.

#### Scenario: Lectura rápida
- **WHEN** el usuario ve la tarjeta
- **THEN** entiende qué se promueve, a qué descuento, en qué fechas y cuánto gana sin abrir el detalle

#### Scenario: Ver cómo se calculó
- **WHEN** el usuario abre "¿Cómo se calculó?"
- **THEN** ve la explicación, el rango de la estimación, los supuestos y las restricciones

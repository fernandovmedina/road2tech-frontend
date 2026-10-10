## Purpose

Definir cómo el dashboard se conecta al agente LangGraph del backend: dónde se configura, cómo se autentica, cómo recibe la tienda elegida y cómo se comporta ante errores, sin dejar al usuario sin chat.

## ADDED Requirements

### Requirement: Conexión configurable al agente
El dashboard SHALL usar el agente real únicamente cuando la API esté en modo `http` y exista `NEXT_PUBLIC_COPILOT_URL`. Con esa variable ausente, o en modo mock, MUST usar el chat de respaldo existente.

#### Scenario: Agente configurado
- **WHEN** el modo es `http` y `NEXT_PUBLIC_COPILOT_URL` apunta al agente
- **THEN** el asistente del dashboard se conecta al agente y no al chat de respaldo

#### Scenario: Sin agente configurado
- **WHEN** la variable no está definida o el modo es `mock`
- **THEN** se muestra el chat de respaldo y el asistente sigue funcionando

### Requirement: Autenticación en cada petición
En modo `http`, cada petición al agente SHALL incluir el token de sesión como `Authorization: Bearer` cuando haya sesión. Una respuesta 401 MUST cerrar la sesión y llevar a `/login`, igual que el resto de la API.

#### Scenario: Sesión vencida
- **WHEN** el agente responde 401
- **THEN** se limpia la sesión y el usuario llega a `/login`

### Requirement: Tienda elegida compartida con el agente
El asistente SHALL enviar la sucursal seleccionada al agente como estado compartido antes de cada consulta, y MUST usar una conversación distinta por sucursal. Sin sucursal seleccionada MUST pedir elegir una y no permitir consultas.

#### Scenario: Cambio de sucursal
- **WHEN** el usuario cambia de la sucursal A a la B
- **THEN** el historial de A deja de mostrarse y la siguiente consulta llega al agente con la sucursal B y una conversación nueva

#### Scenario: Vista de todas las sucursales
- **WHEN** el alcance es "Todas las sucursales"
- **THEN** el asistente invita a elegir una sucursal y no envía consultas

### Requirement: Errores recuperables
Ante un fallo del agente (red, error de ejecución, respuesta inválida o 5xx) el asistente SHALL mostrar un mensaje en español tomado de `lib/copy.ts`, conservar el historial y ofrecer "Reintentar". MUST NOT mostrar trazas ni texto crudo del servidor.

#### Scenario: Agente caído
- **WHEN** no se puede conectar con el agente
- **THEN** se muestra el mensaje de error con "Reintentar" y los mensajes anteriores siguen visibles

#### Scenario: Error durante la ejecución
- **WHEN** el agente termina la ejecución con un evento de error
- **THEN** el chat muestra el mismo mensaje de error con "Reintentar" y no queda en estado de carga

### Requirement: Conversación reiniciada
Si el agente ya no recuerda la conversación (por ejemplo, tras reiniciarse), el asistente SHALL avisar de forma discreta que la conversación se reinició y permitir continuar con una nueva.

#### Scenario: Agente reiniciado
- **WHEN** el usuario envía un mensaje y el agente no conoce el hilo anterior
- **THEN** se informa que la conversación se reinició y el mensaje se procesa en un hilo nuevo

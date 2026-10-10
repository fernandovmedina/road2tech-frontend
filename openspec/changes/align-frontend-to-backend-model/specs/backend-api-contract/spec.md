## Purpose

Define cómo el frontend consume datos del backend: envoltorio común, fecha de corte, validación, alternancia mock/real y contrato propuesto para los endpoints que el backend aún no define.

## ADDED Requirements

### Requirement: Envoltorio de respuesta y fecha de corte
El frontend SHALL consumir respuestas con la forma `{ request_id, data_as_of, data }` y SHALL usar `data_as_of` como la fecha "hoy" en toda la interfaz (ventana de historial, inicio del forecast, resaltado del calendario). El reloj del navegador MUST NOT usarse para decidir qué es pasado o futuro.

#### Scenario: Fecha de corte del backend
- **WHEN** una respuesta llega con `data_as_of = 2026-09-30`
- **THEN** el historial termina el 2026-09-30, el forecast inicia el 2026-10-01 y el calendario resalta el 2026-09-30 como "hoy"

#### Scenario: Cambio de fecha de corte
- **WHEN** el backend entrega otro `data_as_of` en la siguiente respuesta
- **THEN** la interfaz recalcula ventanas y resaltados sin cambios de código

### Requirement: Validación de respuestas
El cliente SHALL validar cada respuesta contra un esquema antes de entregarla a los componentes. Una respuesta inválida MUST mostrarse como estado de error con opción de reintentar y MUST NOT romper la pantalla.

#### Scenario: Respuesta con forma inesperada
- **WHEN** el backend responde un campo requerido ausente o de tipo distinto
- **THEN** la pantalla muestra el estado de error con botón "Reintentar" y registra el `request_id`

### Requirement: Errores del backend
El cliente SHALL interpretar errores con forma `{ code, message, request_id }` y mostrar un mensaje en español sin exponer detalles internos.

#### Scenario: Error de servidor
- **WHEN** una petición devuelve un error con `code` y `request_id`
- **THEN** el usuario ve un mensaje genérico en español y puede reintentar

### Requirement: Alternancia mock/real
La aplicación SHALL poder correr con datos de ejemplo o contra el backend mediante una variable de entorno, sin cambiar componentes. Con datos de ejemplo MUST mostrarse la insignia "Datos de ejemplo".

#### Scenario: Modo ejemplo
- **WHEN** la variable de modo está en ejemplo
- **THEN** todas las pantallas leen del conjunto de ejemplo y muestran la insignia

#### Scenario: Modo backend
- **WHEN** la variable apunta a una URL de API
- **THEN** las pantallas llaman a esa API y no muestran la insignia

### Requirement: Sin cálculo financiero en el cliente
El frontend MUST NOT calcular impacto económico (ganancia incremental, margen, merma evitada, impacto de portafolio, uplift). Solo SHALL formatear y mostrar cifras que entrega el backend.

#### Scenario: Cifras de una estrategia
- **WHEN** se muestra una estrategia
- **THEN** cada cifra económica proviene de la respuesta del backend o del mock con su misma forma

### Requirement: Autenticación preparada para el backend
El inicio de sesión SHALL llamar a `POST /auth/login` con correo y contraseña y recibir un token; el token SHALL enviarse en cada petición posterior y la sesión SHALL conservarse en el navegador. Ante un 401 el sistema SHALL cerrar la sesión y redirigir a `/login`. En modo ejemplo el login SHALL seguir aceptando la cuenta demo.

#### Scenario: Token en peticiones
- **WHEN** hay una sesión iniciada
- **THEN** cada petición al backend incluye el token de autorización

#### Scenario: Sesión vencida
- **WHEN** el backend responde 401
- **THEN** se limpia la sesión y se redirige a `/login`

#### Scenario: Credenciales incorrectas
- **WHEN** el backend rechaza las credenciales
- **THEN** el formulario muestra el error de credenciales incorrectas

### Requirement: Documento de contrato propuesto
El repositorio SHALL incluir `docs/backend-contract.md` con los endpoints que el frontend necesita y que el backend no define (KPIs, mapa de calor, stock, reabasto/calendario, pedido con Resend, proveedores, productos con min/max por tienda, auth, chat), con formas de respuesta usando los nombres del dataset real.

#### Scenario: Revisión por backend
- **WHEN** el backend revisa el documento
- **THEN** encuentra por endpoint método, ruta, parámetros, ejemplo de respuesta y campos requeridos

## Why

El backend ya trae el agente real: en `BackendRoad2Tech`, la rama `m6-agent/copilot-api` (PR #1, ya en `main`) agrega un agente LangGraph (`services/copilot-api`) hecho para **interfaces generativas**: según lo que pregunta el usuario, el agente elige herramientas y el frontend pinta un componente por cada resultado (gráfico, tarjeta de promoción, tabla de restock) más una tarjeta de aprobación. Nuestro chat actual (`components/chat/*`, `POST /chat` con bloques) solo habla con el mock y es más limitado. Hay que conectar el agente real al dashboard con el menor esfuerzo posible, porque el tiempo es corto.

## What Changes

- Conectar el dashboard al agente LangGraph con **CopilotKit v2 sobre AG-UI** (el protocolo que el agente ya habla en `POST /copilot`). Dependencias nuevas: `@copilotkit/react-core` y `@ag-ui/client`.
- **Interfaces según la consulta**: un registro cerrado de componentes por nombre de herramienta (`get_product_tendency`, `get_product_sell_strategy`, `get_restock_suggestions`, `get_store_overview`, `get_demand_by_store`, `generate_store_plan`, `search_products`). Cada resultado se valida con zod antes de pintarse; una herramienta desconocida o un resultado inválido muestra una tarjeta genérica, nunca rompe el chat ni ejecuta HTML.
- **Tarjeta de aprobación** dentro del chat para el `interrupt()` del agente: Aprobar / Rechazar / Después, con diálogo de confirmación. **BREAKING (regla)**: hoy la documentación dice "el chat nunca aprueba"; pasa a "el chat solo aprueba con la tarjeta y una confirmación explícita". Se actualizan `AGENTS.md`, `docs/backend-contract.md` §3.17 y los specs.
- La tienda elegida en el dashboard viaja al agente como estado compartido; cada tienda tiene su propia conversación.
- Un interruptor por variable de entorno: con `NEXT_PUBLIC_COPILOT_URL` el dashboard usa el agente; sin ella (o en modo mock) sigue el chat actual, que queda como respaldo hasta que el agente esté probado.
- Primero un **spike corto** (puerta de decisión) para confirmar que CopilotKit funciona con nuestro React 19.3 / zod 4 y con el agente real antes de construir los renderers.

Fuera de alcance: streaming del chat actual, nuevos endpoints del backend, que el panel "Plan comercial" lea los borradores del agente (queda como dependencia con el backend, ver design.md R2), despliegue del agente.

## Capabilities

### New Capabilities
- `copilot-chat-transport`: cómo el dashboard se conecta al agente: URL, autenticación, estado compartido de la tienda, conversación por tienda, errores y respaldo al chat actual.
- `copilot-chat-dashboard`: lo que el usuario ve: componentes elegidos por el agente, validación de resultados, tarjeta de aprobación y reglas de seguridad del chat.

### Modified Capabilities
<!-- Ninguna: `copilot-chat-genui` vive en el cambio `align-frontend-to-backend-model` (sin archivar); este cambio lo complementa y cambia una de sus reglas (aprobación), que debe reconciliarse al archivar. -->

## Impact

- Código (frontend): nuevo `components/copilot/*` (proveedor, chat, renderers, tarjeta de aprobación), `lib/api/schemas.ts` (esquemas de resultados del agente), `types/index.ts`, `lib/copy.ts`, `lib/labels.ts` (etiquetas de herramientas), `components/chat/AssistantChat.tsx` (interruptor), `package.json`, `.env.example` (nuevo).
- Docs: `AGENTS.md` (§2 y §8, regla de aprobación y dependencia nueva), `docs/backend-contract.md` (§3.17 y preguntas abiertas).
- Dependencias nuevas: `@copilotkit/react-core`, `@ag-ui/client`. Peso del bundle por revisar en el spike.
- Backend (peticiones, no se edita aquí): autenticación del agente, CORS del dominio del frontend, `DEMO_AS_OF` único, checkpointer persistente, plan y borradores compartidos. Ver design.md.

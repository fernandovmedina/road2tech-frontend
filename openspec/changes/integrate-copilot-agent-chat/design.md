## Context

Motivación en `proposal.md`. Estado verificado leyendo ambos repos y la documentación oficial de CopilotKit y AG-UI. **No se ejecutó nada**: ni el agente, ni CopilotKit, ni el API Gateway. Las versiones salen del registro de npm de hoy.

**Dónde está el chatbot en `BackendRoad2Tech`**

| Pieza | Dónde | Papel en este cambio |
|---|---|---|
| Agente LangGraph + Gemini (u offline) | rama `m6-agent/copilot-api` (commit `dc4fffe`, ya en `main`), `services/copilot-api/` | **Es el objetivo.** Habla AG-UI por SSE en `POST /copilot` |
| Chat por reglas en Go | `main`, `api/functions/chat/` | Queda como respaldo; duplica borradores en DynamoDB |

**Lo que hace el agente** (leído en `agent/graph.py`, `agent/tools.py`, `agent/prompts.py`): el modelo elige entre 7 herramientas determinísticas (`get_product_tendency`, `get_product_sell_strategy`, `get_restock_suggestions`, `get_store_overview`, `get_demand_by_store`, `generate_store_plan`, `search_products`); cada una devuelve JSON con un campo `kind`; las cifras salen solo de las herramientas; una estrategia se guarda como borrador y el grafo se detiene con `interrupt()` y un payload `promotion_approval` hasta que el usuario aprueba, rechaza o deja para después. El estado del grafo ya incluye `selected_store_id`. El prompt manda responder en el idioma del usuario. Sin llave de Gemini corre en modo `offline` (intención por palabras clave). El backend probó el flujo con el evento `on_interrupt` y `forwardedProps.command.resume` (`tests/test_api.py`). `draft` puede pasar directo a `approved`.

**Lo que ofrece CopilotKit v2** (`@copilotkit/react-core/v2`, 1.78.0; peers `react ^18||^19`, `zod >=3.25`):
- `useRenderTool({ name, parameters, render })` pinta un componente por herramienta del backend; el render recibe `status` (`inProgress`/`executing`/`complete`) y `result` como **string**; existe el comodín `name: "*"`.
- `useInterrupt({ render: ({ event, resolve }) => ... })` pinta la tarjeta del `interrupt()` y `resolve(payload)` reanuda el grafo. La documentación no confirma qué recibe `interrupt()` en Python; se prueba en el spike.
- `useAgent().agent.setState(...)` escribe estado compartido.
- Conexión sin servidor intermedio: `<CopilotKit selfManagedAgents={{ id: new HttpAgent({ url }) }}>`. En ese modo el agente debe autenticar cada petición y aceptar CORS.

## Goals / Non-Goals

**Goals:**
- Que el usuario pregunte en lenguaje natural y el dashboard muestre el componente adecuado, con las cifras que calculó el backend.
- Llegar a una demo funcional con el mínimo de piezas: 3 renderers que importan (tendencia, estrategia, restock), tarjeta de aprobación y un genérico para el resto.
- Cero cálculo financiero en el cliente y cero HTML generado por el modelo.

**Non-Goals:**
- Reescribir las pantallas existentes ni migrar el panel "Plan comercial".
- Un agente falso de AG-UI para el modo mock (se conserva el chat actual en mock).
- Renderers pulidos para las 7 herramientas en la primera entrega.
- UI abierta tipo A2UI o MCP Apps: se descarta por seguridad y tiempo.

## Decisions

### D1. CopilotKit v2 + AG-UI, generative UI "tool-based"
El agente decide qué herramienta usar y nosotros decidimos qué componente la dibuja (el enfoque controlado de CopilotKit: el más predecible y seguro). Es lo que el backend ya espera (su README lo llama "CopilotKit v2 chat + tool renderers + approval card").
- **Alternativa: seguir con `POST /chat` y bloques.** Descartada por indicación del equipo: el agente real no habla ese contrato y adaptarlo cuesta trabajo del backend por cada herramienta.
- **Alternativa: `@ag-ui/client` solo, sin CopilotKit.** Es el **plan B del spike**: más control y menos peso, pero hay que escribir a mano el chat, el manejo de interrupciones y el estado. Se usa si CopilotKit no funciona con React 19.3 / zod 4.

### D2. Conexión directa del navegador al agente (`selfManagedAgents` + `HttpAgent`)
Sin ruta intermedia en Next. Es lo más simple: dos dependencias y ningún servidor Node extra.
- **Por qué no `CopilotRuntime` en una ruta de Next:** exige Node ≥ 20, arrastra dependencias pesadas (GraphQL, SDKs de IA) y peers obligatorios (`openai`, `@langchain/core`) que no usamos. Solo se adopta si el CORS o el alojamiento impiden la conexión directa.
- **Costo asumido:** el agente debe validar el token en cada petición y aceptar el dominio del frontend (hoy solo `localhost:3000`, suficiente para la demo local). La autenticación se pide al backend como mejora; para la demo local no bloquea.

### D3. Registro cerrado de renderers por nombre de herramienta
Un único `useRenderTool({ name: "*" })` recibe cualquier herramienta, parsea `result` (string JSON) con zod según el `kind` y despacha a un componente del registro. Resultado inválido o herramienta desconocida: tarjeta genérica con el nombre y un aviso, nunca excepción. Se usa el comodín para no pasar esquemas zod a CopilotKit (evita el posible choque con zod 4).
- Prioridad de renderers: `get_product_tendency` (gráfico), `get_product_sell_strategy` (tarjeta con descuento, escenarios con y sin aceptar y confianza), `get_restock_suggestions` (tabla). Después: resumen de tienda, comparación entre sucursales, plan, búsqueda.
- Los renderers leen la forma del agente tal cual (porcentaje 1 a 60, series por día) y **solo formatean**. Pueden reutilizar `components/ui/*` y los componentes de gráficas; un mapeo trivial de campos (por ejemplo `value = p50` para la línea del pronóstico) es formato, no cálculo.

### D4. Tienda y conversación
`useAgent().agent.setState({ ...agent.state, selected_store_id })` al elegir tienda; el proveedor se monta con `key` por tienda para tener una conversación nueva (hilo distinto) al cambiar. El agente en memoria pierde el historial al reiniciarse: se muestra un aviso, se pide al backend un checkpointer persistente.

### D5. Aprobación con tarjeta + confirmación
`useInterrupt` pinta `ApprovalCard` con los datos del `promotion_approval` (producto, fechas, descuento, impacto neto, rango de confianza, riesgo de quedarse sin stock). "Aprobar" abre el diálogo de confirmación existente; solo tras confirmar se llama `resolve({ decision: "approve" })`. "Rechazar" y "Después" responden `reject` y `later`. Tras la respuesta la tarjeta muestra el estado final que reporta el agente. Se actualiza la regla escrita (`AGENTS.md`, contrato) para que no contradiga el comportamiento. El humano sigue siendo quien decide.

### D6. Interruptor y respaldo
`AssistantChat` elige: modo mock o sin `NEXT_PUBLIC_COPILOT_URL` → chat actual de bloques (`components/chat/*`, intacto); con la URL → el chat del agente. Así la demo siempre tiene un chat que funciona y no hay que construir un agente falso. Cuando el agente esté probado, se retira el chat viejo en un cambio aparte.

### D7. Spike como puerta
Antes de construir renderers: levantar el agente local (`LLM_MODE=offline`, `DATASET_DIR=tests/fixtures/v2`, 3 tiendas y 12 productos) y una página mínima con CopilotKit. Se confirma: instala y compila con React 19.3 y zod 4; llega el texto; llega el resultado de una herramienta como string JSON; `setState` de la tienda llega al grafo; `interrupt` se pinta y `resolve` reanuda el grafo. Si algo falla de forma seria, se pasa al plan B de D1.

## Risks / Trade-offs

- **R1. Documentación incompleta de CopilotKit para LangGraph/Python** (interrupts, estado). → Spike antes de invertir; plan B con `@ag-ui/client`.
- **R2. Plan y borradores.** El agente guarda borradores en su propio almacén; el panel "Plan comercial" y la pantalla de producto leen de otro lado, y la forma de `GET /stores/{id}/plan` del servicio Python (`PlanOut`) no coincide con nuestro `planSchema`. Un borrador aprobado en el chat puede no verse en el panel. → En esta entrega la tarjeta de aprobación muestra su propio estado final; la sincronía con el panel es una petición al backend (dueño único del plan) y queda fuera de alcance.
- **R3. Sin autenticación en el agente** y CORS solo a `localhost:3000`. → Aceptable para demo local; antes de exponerlo, validar el JWT y abrir el dominio. Se pide al backend.
- **R4. Fechas distintas** (`DEMO_AS_OF` 2026-09-16 del agente frente a 2026-09-30 de Go). → Los renderers muestran las fechas del agente tal cual; pedir un valor único.
- **R5. Idioma.** Texto del modelo en español, pero nombres de producto y textos del motor (`recommended_action`, `reason_details`) en inglés. → Se acepta en la demo; los rótulos de la UI salen de `lib/copy.ts`.
- **R6. Latencia y costo del LLM.** → Modo `offline` como respaldo, frases rápidas ya existentes, indicador de espera.
- **R7. Peso del bundle** (CopilotKit trae `lit`, Radix, markdown, katex). → Cargarlo solo en el dashboard con tienda y revisar el tamaño en el spike.
- **R8. Cambio de regla de aprobación.** → Documentado y reflejado en `AGENTS.md` y specs; la aprobación exige clic más confirmación.

## Migration Plan

1. Spike (sin tocar producción). 2. Instalar dependencias y montar el proveedor detrás de `NEXT_PUBLIC_COPILOT_URL` (vacío = comportamiento actual). 3. Renderers y aprobación. 4. Demo con el agente local. Rollback: quitar la variable.

## Open Questions

- ¿El agente se despliega (contenedor) o la demo corre local? Define cuándo hacen falta JWT y CORS.
- ¿Gemini con llave o modo `offline` en la demo? El modo offline es más predecible; Gemini entiende mejor lenguaje libre.
- ¿Quién es el dueño del plan y los borradores a largo plazo (R2)?

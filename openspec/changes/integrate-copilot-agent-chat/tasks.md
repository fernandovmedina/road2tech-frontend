Etiquetas del flujo multiagente (`openspec/MULTIAGENT_WORKFLOW.md`): **[C]** lo hace o decide Claude (dependencias, hooks, esquemas, reglas); **[E]** apto para un ejecutor con ficha (archivos acotados). Cada tarea termina con `tsc` y lint limpios. Orden pensado para llegar rápido a una demo: lo marcado **(demo)** es el camino mínimo.

## 0. Spike: puerta de decisión (demo)

- [ ] 0.1 [C] Levantar el agente local: `services/copilot-api` con `LLM_MODE=offline` y `DATASET_DIR=tests/fixtures/v2` (`uv sync`, `uv run python -m stockcopilot`, puerto 8000).
- [ ] 0.2 [C] Instalar `@copilotkit/react-core` y `@ag-ui/client` con pnpm (esta es la dependencia nueva que pide el plan de `AGENTS.md` §11). Confirmar que compila con React 19.3, Next 16.4 y zod 4. Anotar el tamaño del bundle.
- [ ] 0.3 [C] Página temporal con `<CopilotKit selfManagedAgents>` + `HttpAgent` a `http://localhost:8000/copilot`. Verificar: llega texto; llega el resultado de una herramienta como string JSON (probar "tendencia de <producto>"); `setState` de `selected_store_id` llega al grafo; una promoción pausa en `interrupt` y `resolve({decision})` la reanuda.
- [ ] 0.4 [C] Decisión: si todo pasa, seguir. Si CopilotKit falla, cambiar al plan B (`@ag-ui/client` solo, chat y estado propios) y ajustar tareas 2 a 4. Borrar la página temporal.

## 1. Conexión y configuración (demo)

- [ ] 1.1 [C] `lib/api/config.ts`: exportar `copilotUrl` (`NEXT_PUBLIC_COPILOT_URL`) y `useCopilotAgent = !isMockMode && !!copilotUrl`. Crear `.env.example` con `NEXT_PUBLIC_API_MODE`, `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_COPILOT_URL`.
- [ ] 1.2 [C] `components/copilot/CopilotProvider.tsx`: `selfManagedAgents` con `HttpAgent` y cabecera `Authorization: Bearer` desde la sesión; 401 limpia la sesión (mismo manejador que `lib/api/http.ts`). Importar los estilos de CopilotKit solo aquí.
- [ ] 1.3 [C] `components/chat/AssistantChat.tsx`: interruptor (agente si `useCopilotAgent`, chat actual en otro caso). Cargar el chat del agente con importación dinámica para no pesar el resto de la app.
- [ ] 1.4 [C] Estado compartido: al elegir tienda, `agent.setState({ ...agent.state, selected_store_id })`; proveedor con `key` por tienda (conversación nueva). Sin tienda: mensaje de elegir sucursal.

## 2. Resultados de herramientas como componentes (demo)

- [ ] 2.1 [C] `lib/api/schemas.ts` + `types/index.ts`: esquemas zod de los resultados del agente por `kind` (`product_tendency`, `product_sell_strategy`, `restock_plan`, y los demás con campos mínimos). Unión discriminada por `kind` con `safeParse`; inválido = genérico. Tomar los campos de `services/copilot-api/src/stockcopilot/domain/models.py` y de un ejemplo real obtenido en el spike.
- [ ] 2.2 [C] `components/copilot/ToolResultRenderer.tsx`: `useRenderTool({ name: "*" })` que parsea `result` y despacha a un registro cerrado; estados `inProgress`/`executing` con esqueleto; desconocido o inválido = `GenericToolCard`.
- [ ] 2.3 [E] `components/copilot/TendencyCard.tsx`: gráfico de historial, pronóstico y bandas P80/P90, reutilizando las piezas de Recharts de `components/chat/ForecastChartBlock.tsx` o `components/product/*`; riesgos de quiebre y merma y resumen del producto, solo con formato.
- [ ] 2.4 [E] `components/copilot/StrategyResultCard.tsx`: título, descuento (de 1 a 60, mostrado como %), vigencia, "Si no aceptas / Si aceptas", impacto neto, rango de confianza, riesgo de quedarse sin stock, supuestos y aviso de "estimación simulada". Textos de `lib/copy.ts`.
- [ ] 2.5 [E] `components/copilot/RestockResultCard.tsx`: tabla con producto, proveedor, cantidad, fechas, urgencia y razones; nota de que el envío se confirma desde el calendario.
- [ ] 2.6 [E] `components/copilot/GenericToolCard.tsx`: etiqueta de la herramienta, aviso y, plegado, el resultado como texto plano (nunca HTML).
- [ ] 2.7 [E] `lib/labels.ts`: tipo `tool` con las etiquetas en español de las herramientas del agente y de las del contrato; `lib/copy.ts`: textos del chat del agente. Etiquetas visibles en el resultado (spec: herramientas visibles).

## 3. Aprobación (demo)

- [ ] 3.1 [C] `components/copilot/ApprovalCard.tsx` con `useInterrupt`: datos del payload `promotion_approval`; "Aprobar" abre el diálogo de confirmación existente y solo tras confirmar llama `resolve({ decision: "approve" })`; "Rechazar" y "Después" resuelven `reject` y `later`; estado final tras la respuesta.
- [ ] 3.2 [C] Verificar con el agente local de punta a punta (offline): promoción → tarjeta → aprobar/rechazar/después; cancelar el diálogo no envía nada; "actívala" por texto no cambia estados.

## 4. Pulido y estados

- [ ] 4.1 [E] Carga, espera larga (8 s), error con "Reintentar", conversación reiniciada, bloqueo del campo mientras corre. Textos en `lib/copy.ts`.
- [ ] 4.2 [E] Frases rápidas del agente (las de `copy.chat.quickPrompts` más una de tendencia y otra de restock) y etiquetas de accesibilidad; foco visible; 1440 px y 1024 px sin scroll horizontal.

## 5. Reglas y documentos

- [ ] 5.1 [C] `AGENTS.md` §2, §7 y §8: el chat aprueba solo con tarjeta y confirmación; nueva dependencia CopilotKit; interruptor del chat. `docs/backend-contract.md` §3.17: el camino del agente es AG-UI en `/copilot`, `POST /chat` queda como respaldo.
- [ ] 5.2 [C] Preguntas para el backend en `docs/backend-contract.md`: JWT en `/copilot`, CORS del dominio del frontend, `DEMO_AS_OF` único, checkpointer persistente (Postgres), dueño único del plan y borradores y forma de `GET /plan`, idioma de los textos del motor.

## 6. Verificación final

- [ ] 6.1 [C] Recorrido con el agente local en modo offline y, si hay llave, con Gemini: tendencia, promoción con aprobación, restock, pregunta fuera de alcance, cambio de tienda, vista "Todas", agente apagado (error con reintento).
- [ ] 6.2 [C] Modo mock: sigue el chat de respaldo sin errores; `tsc`, lint y `pnpm build` pasan; sin errores de consola.
- [ ] 6.3 [C] Decidir con el equipo cuándo retirar `components/chat/*` y `POST /chat` (cambio aparte).

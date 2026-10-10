# StockCopilot — Frontend

Interfaz de **StockCopilot**, un sistema de **promociones y restock inteligentes con IA** para cadenas de retail. Proyecto del Retail Tech Challenge (Sofftek), reto 1: pronóstico de demanda.

Un agente de IA usa la predicción de demanda, el comportamiento de compra histórico y el stock actual para armar promociones con ventana de tiempo y mostrar **cuánto se gana y cuánta pérdida se evita, con y sin aceptarlas**. Incluye órdenes de restock por correo a proveedores y un mapa de calor de ventas por sucursal.

> Este repositorio es **solo el frontend**. El modelo, el agente y el backend viven aparte; aquí todo se alimenta de una capa de datos con mocks (`/lib/api`) que se cambia por los endpoints reales sin tocar los componentes.

## Documentación

- [`AGENTS.md`](./AGENTS.md): guía técnica del frontend (pantallas, rutas, contratos de datos, sistema de diseño, definición de terminado).
- [`proyect_context/PROYECT.md`](./proyect_context/PROYECT.md): contexto del reto, diferenciador, dataset, modelos, plan de 24 h y guion de demo.
- [`proyect_context/ui/`](./proyect_context/ui): diseños aprobados de las 7 pantallas (referencia visual, no código de producción). Para verlos, sirve la carpeta (por ejemplo `python3 -m http.server`) y abre el `.dc.html`.

## Pantallas

| Ruta | Pantalla |
|---|---|
| `/login` | Inicio de sesión |
| `/` | Dashboard: KPIs, comportamientos detectados, mapa de calor, chatbot |
| `/product/[id]` | Tendencia y simulador de promoción |
| `/calendar` | Calendario de restock y órdenes |
| `/stock` | Stock general |
| `/suppliers` | Catálogo de proveedores |
| `/products` | Catálogo de productos con mínimos y máximos |

## Cómo correrlo

```bash
pnpm install
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000). Cuenta de demostración (autenticación simulada): `demo@stockcopilot.com` / `demo1234`.

Otros comandos: `pnpm build`, `pnpm lint`.

## Stack

Next.js (App Router), React, TypeScript, Tailwind CSS v4, pnpm. Se agregan según las pantallas: Recharts, react-leaflet, TanStack Query.

## Notas

- Las cifras que se ven son **datos de ejemplo**.
- El dataset de ejemplo del evento está en `proyect_context/dataset-hacktahton-road2tech-master/` (~80 MB). Por sus reglas de uso no se redistribuye fuera del repositorio/evento: no lo subas a GitHub.

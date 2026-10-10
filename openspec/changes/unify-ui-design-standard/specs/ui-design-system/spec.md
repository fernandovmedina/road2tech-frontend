## Purpose

Definir el sistema visual único de StockCopilot (tokens, tipografía, superficies, componentes base, accesibilidad y copy) y el documento de lineamientos que lo hace normativo, para que cualquier pantalla se vea y se comporte igual sin importar quién la construyó.

## ADDED Requirements

### Requirement: Documento de lineamientos normativo
El repositorio SHALL incluir `docs/design-guidelines.md` como fuente normativa del estándar visual, con: principios, tokens, tipografía, superficies y elevación, componentes base con sus variantes, patrones de pantalla, reglas de mapas y gráficas, estados, accesibilidad y reglas de copy. `AGENTS.md` §5 MUST enlazarlo y MUST NOT contradecirlo.

#### Scenario: Una persona o agente nuevo construye una pantalla
- **WHEN** alguien necesita saber qué radio, peso tipográfico, color de acción o patrón de tarjeta usar
- **THEN** la respuesta está en `docs/design-guidelines.md` con un ejemplo de uso y sin tener que inferirla de otra pantalla

#### Scenario: Conflicto entre AGENTS.md y los lineamientos
- **WHEN** un valor de token aparece en ambos documentos
- **THEN** los dos coinciden; si se cambia uno, se cambia el otro en el mismo commit

### Requirement: Un solo juego de tokens
Todos los colores, radios, sombras y tipografías usados por la interfaz SHALL provenir de los tokens definidos en `app/globals.css`. Los componentes MUST NOT usar valores hexadecimales literales ni nombres de token duplicados para el mismo concepto. Los alias heredados del mapa (`ink`, `surface`, `plane`, `hairline`, `brand`, `critical`) SHALL existir solo durante la migración y MUST eliminarse al cerrar el cambio.

#### Scenario: Barrido de hex sueltos
- **WHEN** se busca un color hexadecimal literal en `components/**` y `app/**` (excluidas las definiciones de tokens)
- **THEN** no hay resultados, salvo los estilos de Leaflet que documenten su token equivalente

#### Scenario: Alias retirados
- **WHEN** termina la migración
- **THEN** ningún componente referencia `ink`, `surface`, `plane`, `hairline`, `brand` ni `critical` y `globals.css` ya no los define

### Requirement: Semántica de color consistente
El color SHALL comunicar el mismo significado en todas las pantallas: verde = acción principal e IA, naranja = pronóstico o promoción, rojo = quiebre o riesgo, azul = informativo o sobreabasto, ámbar = advertencia o sin demanda. Un color de estado MUST NOT ser el único medio para transmitir un estado: siempre va acompañado de texto o icono.

#### Scenario: Estado de riesgo en una tabla
- **WHEN** un producto está en riesgo de quedarse sin stock
- **THEN** su fila muestra el tono rojo del estándar y además una etiqueta de texto o icono que lo nombra

### Requirement: Tipografía y números
La interfaz SHALL usar Manrope con una escala definida (título de página, título de sección, título de tarjeta, cuerpo, apoyo, valor de KPI) y numerales tabulares en cifras. Los títulos de página usan peso 800; los títulos de sección y de tarjeta, 700 o 600; el valor de un KPI, 700. Ninguna pantalla MUST introducir tamaños o pesos fuera de la escala.

#### Scenario: Dos pantallas con el mismo tipo de elemento
- **WHEN** el dashboard y el calendario muestran un valor de KPI
- **THEN** ambos usan el mismo tamaño, peso e interlineado

### Requirement: Superficies y elevación
Las superficies SHALL ser de tres niveles: lienzo (`background`), tarjeta (`card` con borde `line` y sombra mínima) y bloque interior (`background` o un tinte dentro de una tarjeta). Las tarjetas de página usan radio de 16 px, los bloques interiores 12 px y los controles 10 px. Una tarjeta MUST NOT anidar otra tarjeta con borde.

#### Scenario: Panel lateral con secciones
- **WHEN** un panel de detalle agrupa varias secciones
- **THEN** las secciones se separan con bloques interiores o divisores, no con tarjetas con borde dentro de la tarjeta

### Requirement: Componentes base compartidos
`components/ui/*` SHALL ofrecer las piezas que ambas familias de pantallas usan: tarjeta, botón (primario, secundario, fantasma, peligro, acento), insignia, KPI con chip de icono y pie opcional, control segmentado, selector y campo de búsqueda con etiqueta, sección de panel y leyenda de datos. El botón primario MUST ser verde; el estado activo de un control segmentado MUST ser el tono de tinta oscura del estándar; las pantallas MUST NOT redefinir estas piezas con clases propias.

#### Scenario: KPI en dashboard y en mapa
- **WHEN** el dashboard y el módulo del mapa muestran una fila de KPIs
- **THEN** ambos usan el mismo componente de KPI con chip de icono

#### Scenario: Acción principal frente a selección
- **WHEN** una pantalla tiene un botón "Aceptar" y un selector de rango con opción activa
- **THEN** el botón es verde y la opción activa del selector es de tinta oscura, y ambos se distinguen sin ambigüedad

### Requirement: Accesibilidad y objetivos táctiles
Todo control interactivo SHALL medir al menos 44 px de alto (40 px en botones pequeños), tener foco visible, etiqueta accesible (visible o `aria-label`) y usar elementos semánticos reales. El contraste de texto sobre su fondo MUST cumplir WCAG AA.

#### Scenario: Control de solo icono
- **WHEN** existe un botón que solo muestra un icono
- **THEN** tiene `aria-label` en español y un área de al menos 44 × 44 px

#### Scenario: Navegación por teclado
- **WHEN** la persona recorre una pantalla con Tab
- **THEN** cada control muestra un anillo de foco visible y el orden sigue el orden visual

### Requirement: Copy en español desde un solo lugar
Todo texto visible SHALL estar en español (es-MX) y definirse en `lib/copy.ts` o `lib/labels.ts`, usando el glosario de `AGENTS.md` §6. Ningún componente MUST contener texto de interfaz literal en inglés. El formato de números, moneda (MXN) y fechas usa `Intl` con `es-MX`.

#### Scenario: Módulo del mapa
- **WHEN** se recorre el mapa de demanda, sus filtros, KPIs, paneles, leyendas y mensajes de error
- **THEN** todos los textos están en español y provienen de `lib/copy.ts`

#### Scenario: Etiquetas del mapa antes en inglés
- **WHEN** se busca texto como "Forecast demand", "Try again" o "Affected branches" en `components/**`
- **THEN** no hay resultados

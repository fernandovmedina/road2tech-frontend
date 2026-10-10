## Purpose

Definir el lenguaje visual de mapas, marcadores, leyendas, gráficas y comparativos para que el color lo aporte el dato y no el fondo, y que el mapa de demanda, el mapa de calor del dashboard y las gráficas de tendencia se lean como un solo sistema.

## ADDED Requirements

### Requirement: Mapa base neutro
Todo mapa SHALL usar un mapa base en escala de grises con brillo y contraste atenuados, de modo que los colores de datos (calor, riesgo, selección) sean los únicos con saturación. El contenedor del mapa MUST usar el radio de tarjeta del estándar y no introducir fondos de color propios.

#### Scenario: Mapa de demanda y mapa de calor
- **WHEN** se muestran ambos mapas en el dashboard
- **THEN** los dos comparten el mismo tratamiento del mapa base, el mismo botón de "volver a la vista general" y los mismos controles de zoom

### Requirement: Escala de color de datos
La intensidad de ventas o demanda SHALL representarse con la escala de calor `#FFF3BF → #FFD43B → #FF922B → #E8590C → #A61E1E` definida como tokens. El riesgo MUST usar rojo, la selección MUST usar un anillo del tono de tinta oscura y la comparación de escenarios MUST usar los tokens de serie "día normal" y "con evento". Ningún tipo de dato MUST reutilizar el color de otro significado dentro de la misma vista.

#### Scenario: Sucursal seleccionada con riesgo
- **WHEN** una sucursal está seleccionada y además en riesgo de quedarse sin stock
- **THEN** su marcador conserva el relleno de riesgo y suma el anillo de selección, sin cambiar de color

### Requirement: Marcadores, tooltips y teclado
Los marcadores SHALL ser enfocables con teclado, mostrar un tooltip con el nombre de la sucursal (formato "Retail <colonia>") y su valor principal, y aumentar de tamaño al pasar el cursor o recibir foco. El estado seleccionado MUST ser visible sin depender solo del color.

#### Scenario: Selección por teclado
- **WHEN** la persona enfoca un marcador con Tab y presiona Enter
- **THEN** la sucursal se selecciona y el panel de detalle cambia a esa sucursal

### Requirement: Leyendas legibles
Todo mapa o gráfica con colores codificados SHALL tener una leyenda visible y en español, con los mismos tokens que usa la gráfica. Si hay una serie de pronóstico, el estándar es: línea sólida = historial, línea discontinua = pronóstico, banda sombreada = incertidumbre.

#### Scenario: Gráfica de tendencia
- **WHEN** se abre el detalle de un producto
- **THEN** la leyenda explica historial, pronóstico y banda de incertidumbre con los colores de la gráfica

### Requirement: Panel de detalle junto al mapa
Cuando un mapa permita seleccionar una sucursal o evento, el detalle SHALL mostrarse en un panel lateral de ancho fijo (≈ 27 rem) con desplazamiento propio en pantallas ≥ 1280 px y debajo del mapa en pantallas menores. El panel MUST organizarse en secciones con título, usando la sección de panel del estándar.

#### Scenario: Pantalla de 1024 px
- **WHEN** el ancho es de 1024 px
- **THEN** el panel de detalle aparece debajo del mapa, sin scroll horizontal de la página

### Requirement: Comparativos con y sin aceptar
Los comparativos "Si no aceptas / Si aceptas" SHALL mostrarse lado a lado con el mismo componente en gráficas, tarjetas de promoción y tabla, sin cálculos en el cliente: las cifras vienen del backend y el cliente solo da formato o resta dos valores ya enviados.

#### Scenario: Tarjeta de promoción
- **WHEN** se muestra una promoción con su comparativo
- **THEN** las dos columnas usan los tokens de serie del estándar y las cifras coinciden con las del backend

### Requirement: Gráficas sin dependencias nuevas
Las gráficas SHALL construirse con las librerías ya presentes en el repo; el cambio MUST NOT agregar paquetes. Una gráfica propia (por ejemplo el comparativo de mancuerna) MUST ser accesible: texto alternativo o tabla equivalente y colores del estándar.

#### Scenario: Comparativo de mancuerna
- **WHEN** un lector de pantalla recorre el comparativo de escenarios
- **THEN** encuentra una descripción textual con los valores de "día normal" y "con evento"

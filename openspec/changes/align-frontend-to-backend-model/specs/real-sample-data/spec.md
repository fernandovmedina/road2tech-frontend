## Purpose

Proveer datos de ejemplo con la forma y los valores del dataset real para desarrollar y demostrar el frontend sin backend, sin subir archivos pesados al repositorio.

## ADDED Requirements

### Requirement: Extracción reproducible desde el generador
El repositorio SHALL incluir un script que, a partir de los CSV generados por el backend, produzca un conjunto compacto de ejemplos en JSON. Los CSV de origen MUST NOT versionarse en este repositorio.

#### Scenario: Ejecución del script
- **WHEN** se ejecuta el script con la ruta de los CSV del backend
- **THEN** genera los archivos JSON de ejemplo y reporta conteos por archivo

#### Scenario: CSV fuera del repo
- **WHEN** se revisa el árbol versionado
- **THEN** no existen archivos CSV del dataset

### Requirement: Cobertura del conjunto de ejemplo
El conjunto SHALL incluir las 25 tiendas, los 120 productos, 20 categorías, 19 proveedores con ofertas, una ventana de al menos 44 días de historial por producto y tienda necesaria para las vistas (30 de historial más forecast), stock actual, pedidos en tránsito, tickets agregados (ticket promedio y artículos por ticket), calendario y contexto de los próximos 14 días.

#### Scenario: Escala completa
- **WHEN** se cargan los datos de ejemplo
- **THEN** el selector lista 25 tiendas y el catálogo 120 productos

### Requirement: Tamaño acotado
Los archivos de ejemplo SHALL pesar en total menos de 5 MB y cargarse de forma perezosa por pantalla.

#### Scenario: Peso total
- **WHEN** se suman los archivos de ejemplo
- **THEN** el total es menor a 5 MB

### Requirement: Estados demostrables
El modo de ejemplo SHALL permitir forzar estados vacío y de error, y simular latencia de 300–600 ms, además de incluir al menos una estrategia viable, una rechazada por restricción y un plan con menos de cinco estrategias.

#### Scenario: Estrategia rechazada
- **WHEN** se ve el plan de la tienda de demostración
- **THEN** existe una estrategia rechazada con la restricción que la impidió

### Requirement: Forma idéntica a la API
Los datos de ejemplo MUST pasar por los mismos esquemas de validación que las respuestas reales del backend.

#### Scenario: Validación en modo ejemplo
- **WHEN** el modo de ejemplo entrega una respuesta
- **THEN** el esquema la valida igual que a una respuesta real

## Purpose

Defines the "Análisis de sucursales" section: an interactive branch heatmap with product search, and a sidebar ranking products and promotions.

## ADDED Requirements

### Requirement: Branch heatmap
The system SHALL show a map centered on the Saltillo area with one marker per branch whose color/size follows the heat gradient according to sales movement.

#### Scenario: Map renders
- **WHEN** the Dashboard loads
- **THEN** all branches in the user's scope appear on the map with heat styling

### Requirement: Branch click filters dashboard
Clicking a branch marker SHALL set the dashboard branch filter to that branch.

#### Scenario: Click marker
- **WHEN** the user clicks the "Valle Real" marker
- **THEN** the Sucursal select shows Valle Real and the dashboard data updates

### Requirement: Product search on map
The system SHALL provide a catalog autocomplete; selecting a product SHALL recolor the map by that product's movement per branch and mark the top branch with ★. Clicking a branch then SHALL filter by it and move the searched product to the top of the sidebar list. A "Quitar filtro" chip SHALL clear the product filter.

#### Scenario: Search yogurt
- **WHEN** the user selects "Yogurt" in the search
- **THEN** the map shows yogurt movement per branch with ★ on the top branch and a "Quitar filtro" chip appears

#### Scenario: Clear filter
- **WHEN** the user clicks "Quitar filtro"
- **THEN** the map and list return to the unfiltered view

### Requirement: Sidebar product tab
The sidebar SHALL have tabs `Productos | Promociones`. The Productos tab SHALL offer category filter chips, sort `Demanda en alza | En baja`, and rows with trend arrow, units/day, a "Tendencia" button and a "Ver en calendario" button.

#### Scenario: Sort by falling demand
- **WHEN** the user selects "En baja"
- **THEN** rows reorder by ascending demand trend

#### Scenario: Open trend
- **WHEN** the user clicks "Tendencia" on a row
- **THEN** the product detail screen for that product opens

### Requirement: Sidebar promotions tab
The Promociones tab SHALL list suggested promotions with estimated gain, each linking to its product detail.

#### Scenario: Open promotion
- **WHEN** the user clicks a promotion row
- **THEN** the product detail simulator for that promotion opens

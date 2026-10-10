## Purpose

Defines the general stock screen: current inventory per branch with status relative to configured min/max levels.

## ADDED Requirements

### Requirement: Filters and status chips
`/stock` SHALL provide branch and category filters and status chips (Sin stock / Bajo mínimo / En rango / Sobrestock) that filter the table.

#### Scenario: Filter by status
- **WHEN** the user selects the "Sin stock" chip
- **THEN** only out-of-stock rows are listed

### Requirement: Count cards
The screen SHALL show four count cards, one per status, reflecting the active branch and category filters.

#### Scenario: Branch change
- **WHEN** the branch changes
- **THEN** the four counts update

### Requirement: Stock table
Each row SHALL show product, existence, a level bar against min and max markers, coverage in days, status, next restock date and a "Ver en calendario" button.

#### Scenario: Level bar
- **WHEN** an item's quantity is below its minimum
- **THEN** its bar fill is left of the min marker and its status is "Bajo mínimo"

#### Scenario: View in calendar
- **WHEN** the user clicks "Ver en calendario"
- **THEN** the calendar opens on that item's next restock

### Requirement: Stock reflects edits
Stock status SHALL be derived from the product's min/max, so edits in the product catalog change the status shown here.

#### Scenario: Raise minimum
- **WHEN** a product's minimum is raised above its quantity in the catalog
- **THEN** the Stock screen shows it as "Bajo mínimo"

### Requirement: Stock empty result
The screen SHALL show an empty message when filters match no rows.

#### Scenario: No matches
- **WHEN** filters match nothing
- **THEN** an empty state with a "Limpiar filtros" action is shown

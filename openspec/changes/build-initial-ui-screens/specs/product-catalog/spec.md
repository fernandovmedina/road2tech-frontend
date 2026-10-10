## Purpose

Defines the product catalog screen with editable min/max stock levels and AI-suggested levels, which feed stock status and restock suggestions.

## ADDED Requirements

### Requirement: Catalog table
`/products` SHALL list products with cost, price, case size, shelf life and editable min and max stock inputs.

#### Scenario: Table content
- **WHEN** the screen loads
- **THEN** every product row shows all those fields with inputs for min and max

### Requirement: Min/max validation and saving
Min/max inputs SHALL be labeled, accept non-negative integers, reject min greater than max with an inline error, and be saved explicitly with a confirmation.

#### Scenario: Min above max
- **WHEN** the user sets min greater than max
- **THEN** an inline error is shown and saving is disabled

#### Scenario: Save changes
- **WHEN** the user edits valid values and clicks save
- **THEN** a success message is shown and the values persist for the session

### Requirement: AI min/max suggestions
A "Sugerir min/max con IA" button SHALL display, per row, suggested min/max with a one-line reason, and an "Aplicar sugerencias" button SHALL fill the inputs without saving until the user confirms.

#### Scenario: Request suggestions
- **WHEN** the user clicks "Sugerir min/max con IA"
- **THEN** a loading state is shown and then each row shows a suggestion and reason

#### Scenario: Apply suggestions
- **WHEN** the user clicks "Aplicar sugerencias"
- **THEN** the inputs are filled with the suggested values and flagged as unsaved

### Requirement: Catalog search and filter
The screen SHALL allow filtering by name and category.

#### Scenario: Search
- **WHEN** the user types part of a product name
- **THEN** only matching rows remain

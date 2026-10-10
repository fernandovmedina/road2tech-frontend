## Purpose

Defines the Dashboard header controls, KPI cards and detected purchase behaviors, which are the entry point of the demo story.

## ADDED Requirements

### Requirement: Dashboard controls
The Dashboard SHALL offer a Sucursal select (all / one), a Datos toggle (`Actuales | Predicción ML`) and a date range (last 7/30 days, next 14/30 days), and every section on the page SHALL update when they change.

#### Scenario: Switch to ML prediction
- **WHEN** the user selects `Predicción ML`
- **THEN** KPIs, lists and charts show predicted values and forward-looking ranges are available

### Requirement: KPI cards
The Dashboard SHALL show four KPI cards: Ticket por venta with delta, Artículos sin stock, Artículos sin demanda, and Oportunidad detectada por IA (dark card, MXN).

#### Scenario: Branch filter applied
- **WHEN** the user selects one branch
- **THEN** the four KPI values change to that branch's values

### Requirement: Detected purchase behaviors
The Dashboard SHALL show three "Comportamientos de compra detectados" cards (tag Crosssell / Merma / Demanda) each with estimated gain and explanation, plus "Ver predicción" and "Ver en calendario" buttons.

#### Scenario: View prediction
- **WHEN** the user clicks "Ver predicción" on a behavior card
- **THEN** the product detail screen for that product opens

#### Scenario: View in calendar
- **WHEN** the user clicks "Ver en calendario"
- **THEN** the calendar opens on the month of the related event with it highlighted

### Requirement: Dashboard states
The Dashboard SHALL show skeletons while loading and handle empty and error states per the shell conventions.

#### Scenario: Loading
- **WHEN** the Dashboard is first opened
- **THEN** skeleton placeholders are visible until data arrives

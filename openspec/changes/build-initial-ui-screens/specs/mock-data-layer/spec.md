## Purpose

Defines the data seam between UI and backend: a typed, mocked, swappable data layer whose numbers are consistent across screens and react to filters. It exists because backend endpoints and models are not final.

## ADDED Requirements

### Requirement: UI isolated from data source
Screens and components SHALL obtain all data and perform all mutations through the data layer's typed hooks and functions, and SHALL NOT import mock data directly. Replacing the mock implementation with real endpoints SHALL NOT require changing components.

#### Scenario: Swap implementation
- **WHEN** a data function's mock implementation is replaced by a network call returning the same type
- **THEN** no component code needs to change

### Requirement: Provisional contracts marked
Domain types SHALL be defined centrally and every point where a backend call is expected SHALL be marked with a `TODO(backend)` comment, so contract changes are localized.

#### Scenario: Contract change
- **WHEN** a backend field name changes
- **THEN** the change is absorbed in the data layer mapping without UI edits where the field is not displayed differently

### Requirement: Believable demo dataset
The mock dataset SHALL include about 7 branches in the Saltillo area, about 10 products across categories, 5 suppliers, stock levels covering every status (out, low, ok, over), trend history and forecast, suggested promotions, restock suggestions and calendar events.

#### Scenario: All stock states present
- **WHEN** the Stock screen is viewed with all branches
- **THEN** at least one item exists in each of the four statuses

### Requirement: Filters change the numbers
Branch, data mode and date range SHALL change the values returned for KPIs, trends, heat and lists.

#### Scenario: Range change
- **WHEN** the date range changes from last 7 days to last 30 days
- **THEN** KPI and trend values differ accordingly

### Requirement: Single promotion calculation
Scenario figures for a promotion (units sold, revenue, margin, waste cost, cross-sell revenue, net profit) SHALL come from one calculation parameterized by discount, so the slider, both scenario cards and the optimal discount always agree. The optimal discount SHALL be the discount in 0–40% that maximizes net profit.

#### Scenario: Slider and cards agree
- **WHEN** the discount is changed
- **THEN** the "Si aceptas" figures equal the calculation for that discount and the "Si no aceptas" figures equal the calculation for 0%

### Requirement: Consistent headline numbers
A given promotion's estimated gain SHALL be identical on Dashboard, Product detail and Calendar.

#### Scenario: Yogurt promotion
- **WHEN** the yogurt promotion estimate is shown on three screens
- **THEN** the same amount appears on each

### Requirement: Simulated latency and mutation state
The layer SHALL delay responses 300–600 ms and persist mock mutations (accepted promotions, sent orders, edited suppliers, edited min/max) for the browser session so that other screens reflect them.

#### Scenario: Accepted promotion reflected
- **WHEN** a promotion is accepted
- **THEN** the Calendar shows it as scheduled without a reload

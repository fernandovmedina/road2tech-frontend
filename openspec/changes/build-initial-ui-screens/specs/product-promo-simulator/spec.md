## Purpose

Defines the product detail screen: demand trend with forecast and the promotion simulator showing what the user gains and loses by accepting or not.

## ADDED Requirements

### Requirement: Product trend chart
`/product/[id]` SHALL show a chart with 30 days of history (solid), 14 days of forecast without promotion (dashed) and with promotion (orange), an uncertainty band and a shaded promotion window, plus metric tiles for 14-day demand, stock, days to expiry and expected waste.

#### Scenario: Chart content
- **WHEN** the screen loads for a product with a suggested promotion
- **THEN** all three series, the band, the window and the four tiles are visible

### Requirement: Back navigation
A "Regresar al mapa" control SHALL return to the Dashboard preserving filters.

#### Scenario: Go back
- **WHEN** the user clicks "Regresar al mapa"
- **THEN** the Dashboard opens with the same filters

### Requirement: Discount slider
The screen SHALL provide a discount slider (0–40%) with the model's optimal discount displayed and the reasons for the suggestion (surplus vs shelf life, bought-together pattern, diminishing returns).

#### Scenario: Move slider
- **WHEN** the user changes the discount
- **THEN** the with-promotion forecast line, tiles and scenario table update immediately

#### Scenario: Reset to optimal
- **WHEN** the user chooses the optimal discount
- **THEN** the slider moves to that value

### Requirement: With and without comparison
The screen SHALL show "Si no aceptas" and "Si aceptas" scenarios side by side with a table of units sold, revenue, margin, waste cost, cross-sell revenue and net profit, including the difference between scenarios.

#### Scenario: Net profit difference
- **WHEN** the scenario table is shown
- **THEN** net profit difference equals "Si aceptas" minus "Si no aceptas"

### Requirement: Accept, dismiss, view in calendar
The screen SHALL offer "Aceptar promoción", "Descartar" and "Ver en calendario". Accepting SHALL ask for confirmation, then schedule the promotion in the calendar with the chosen discount and show a success state; dismissing SHALL mark it dismissed.

#### Scenario: Accept
- **WHEN** the user confirms "Aceptar promoción"
- **THEN** the promotion status becomes accepted and it appears in the calendar as an orange event

#### Scenario: Dismiss
- **WHEN** the user clicks "Descartar"
- **THEN** the promotion is marked dismissed and no longer listed as pending

### Requirement: Unknown product
The screen SHALL show a not-found state for an unknown product id.

#### Scenario: Bad id
- **WHEN** `/product/unknown` is opened
- **THEN** a not-found message with a link back to the Dashboard is shown

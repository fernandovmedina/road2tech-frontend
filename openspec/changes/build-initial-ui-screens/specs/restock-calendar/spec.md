## Purpose

Defines the restock calendar: planning view of deliveries, promotions and run-out alerts, and the human-approved Orden Restock flow.

## ADDED Requirements

### Requirement: Month grid
`/calendar` SHALL show a month grid with supplier deliveries (green), suggested/accepted promotions (orange) and run-out alerts (red), highlighting today and allowing month navigation.

#### Scenario: Event colors
- **WHEN** the current month is shown
- **THEN** deliveries, promotions and alerts appear in their respective colors

### Requirement: Branch selection and deep links
The calendar SHALL have a branch select and SHALL support opening on a specific date/event from other screens ("Ver en calendario"), highlighting it.

#### Scenario: Deep link
- **WHEN** the user arrives from a "Ver en calendario" button
- **THEN** the calendar shows the relevant month with that event highlighted

### Requirement: Products sidebar tab
The sidebar SHALL have tabs `Productos | Proveedores`. Productos SHALL list items to restock with a tag (demand spike, run-out, below minimum), suggested quantity, supplier and an "Orden Restock" button, plus top promotions with potential.

#### Scenario: Open order
- **WHEN** the user clicks "Orden Restock" on an item
- **THEN** the Orden Restock modal opens for that suggestion

### Requirement: Suppliers sidebar tab
The Proveedores tab SHALL show per supplier the lead time, delivery days, minimum order, fill rate, next delivery and items to order.

#### Scenario: Supplier summary
- **WHEN** the user opens the Proveedores tab
- **THEN** each supplier card shows those six fields

### Requirement: Orden Restock modal
The modal SHALL show recipient and subject, an editable quantity, estimated cost, and a comparison "Si no pides" (lost sales) vs "Si pides" (expected gain, waste) that updates when the quantity changes, and a "Enviar correo con Resend" button.

#### Scenario: Edit quantity
- **WHEN** the user changes the quantity
- **THEN** estimated cost and the comparison update

#### Scenario: Below minimum order
- **WHEN** the order value is under the supplier's minimum order
- **THEN** a warning is shown

### Requirement: Confirmed, mocked send
Sending SHALL require the explicit button click, show a sending state, then a confirmation; the order SHALL be recorded as sent and the item SHALL no longer appear as pending. Nothing is actually emailed.

#### Scenario: Send order
- **WHEN** the user clicks "Enviar correo con Resend"
- **THEN** a confirmation is shown and the order status becomes sent

#### Scenario: Close without sending
- **WHEN** the user closes the modal
- **THEN** no order is recorded

### Requirement: Calendar empty state
The calendar SHALL show an empty message for a branch with no events in the month.

#### Scenario: No events
- **WHEN** a month has no events
- **THEN** the grid renders with a "sin eventos" notice

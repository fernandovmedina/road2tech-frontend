## Purpose

Defines the supplier catalog screen, whose supplier emails are the destinations of restock orders.

## ADDED Requirements

### Requirement: Supplier table
`/suppliers` SHALL list suppliers with name, email, lead time, delivery days, minimum order and fill rate, and allow selecting one.

#### Scenario: Select supplier
- **WHEN** the user clicks a row
- **THEN** it is highlighted and the edit form shows its data

### Requirement: Edit supplier
The edit form SHALL allow changing the supplier fields with labeled inputs and validation (valid email, non-negative numbers, fill rate 0–100%), with Save and Cancel actions.

#### Scenario: Save valid edit
- **WHEN** the user changes the email and saves
- **THEN** the table updates and the new email is used as recipient in the Orden Restock modal

#### Scenario: Invalid email
- **WHEN** the user enters a malformed email and saves
- **THEN** a Spanish error is shown and nothing is saved

### Requirement: Resend card with test email
The screen SHALL show a "Resend conectado" card with a test email button that, after confirmation, shows a mocked sending state and a success message for the selected supplier's address.

#### Scenario: Send test
- **WHEN** the user clicks the test email button and confirms
- **THEN** a success message is shown and no real email is sent

### Requirement: Add supplier
The screen SHALL allow adding a new supplier through the same form.

#### Scenario: New supplier
- **WHEN** the user adds a supplier with valid data
- **THEN** it appears in the table and is selectable in other screens

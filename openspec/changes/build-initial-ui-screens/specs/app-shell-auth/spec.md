## Purpose

Defines the application frame: mocked authentication, route protection, navigation, shared filters and the common loading/empty/error conventions that every screen follows.

## ADDED Requirements

### Requirement: Mock login
The system SHALL provide a `/login` screen with email and password fields, validating input client-side with Spanish error messages and showing a loading state while submitting.

#### Scenario: Valid demo credentials
- **WHEN** the user submits `demo@stockcopilot.com` / `demo1234`
- **THEN** a session is created, persisted across reloads, and the user is redirected to `/`

#### Scenario: Wrong credentials
- **WHEN** the user submits any other credentials
- **THEN** a "wrong credentials" error is shown and no session is created

#### Scenario: Invalid input
- **WHEN** the email is malformed or the password is empty
- **THEN** a field-level Spanish error is shown and no request is made

### Requirement: Password visibility toggle
The login form SHALL provide an icon button inside the password field that toggles between hiding and showing the password, with an accessible label reflecting the current action.

#### Scenario: Reveal password
- **WHEN** the user clicks the eye button
- **THEN** the password is shown as plain text and the button label changes to "Ocultar contraseña"

### Requirement: No roles or access permissions
The system SHALL NOT distinguish user roles or restrict access by permission: every authenticated user sees all branches and all screens.

#### Scenario: Any authenticated user
- **WHEN** a user is logged in
- **THEN** all branches appear in every branch select and no screen or action is hidden or blocked by role

### Requirement: Route protection
The system SHALL redirect any route except `/login` to `/login` when there is no session, and `/login` to `/` when a session exists.

#### Scenario: Unauthenticated access
- **WHEN** an unauthenticated user opens `/stock`
- **THEN** they are redirected to `/login`

#### Scenario: Logout
- **WHEN** the user clicks "Cerrar sesión"
- **THEN** the session is cleared and they land on `/login`

### Requirement: Sidebar navigation
The system SHALL show a fixed sidebar on authenticated screens with Dashboard, Calendario de restock, Stock general, Proveedores, Productos, the user name/role and "Cerrar sesión", highlighting the active item.

#### Scenario: Navigate between screens
- **WHEN** the user clicks a sidebar item
- **THEN** the corresponding screen opens and the item is shown as active

### Requirement: Filters persist across screens
The system SHALL keep the selected branch, data mode (Actuales / Predicción ML) and date range when navigating between screens.

#### Scenario: Branch kept
- **WHEN** the user selects a branch on the Dashboard and opens the Stock screen
- **THEN** the Stock screen is filtered by that same branch

### Requirement: Sample-data badge
Every authenticated screen SHALL display a "Datos de ejemplo" badge while data comes from the mock layer.

#### Scenario: Badge visible
- **WHEN** any authenticated screen is shown
- **THEN** the badge is visible

### Requirement: Loading, empty and error states
Every data-driven screen SHALL show skeletons while loading, a clear message when there is no data, and an error message with a retry action when loading fails. The demo SHALL provide a way to trigger the empty and error states.

#### Scenario: Forced error
- **WHEN** the error demo state is triggered and a screen loads
- **THEN** an error message with a "Reintentar" action is shown, and retrying with the state cleared loads the data

### Requirement: Spanish copy and localized formats
All user-facing text SHALL be in Spanish, and numbers/currency/dates SHALL use `es-MX` formatting with MXN shown as `$12,800`.

#### Scenario: Currency display
- **WHEN** an amount of 12800 is shown
- **THEN** it renders as `$12,800`

### Requirement: Responsive and accessible layout
Screens SHALL be usable at 1440px and 1024px widths and wrap on phone width; interactive controls SHALL be keyboard-reachable with visible focus, labeled inputs and aria-labels on icon-only buttons.

#### Scenario: 1024px width
- **WHEN** a screen is viewed at 1024px
- **THEN** there is no horizontal page scroll and no overlapping content

## Purpose

Defines the "Asistente de IA" chatbot on the Dashboard, which answers with interactive components (generative UI) and keeps the user as approver of every proposed action.

## ADDED Requirements

### Requirement: Quick-prompt chips
The assistant SHALL display quick-prompt chips and a free-text input; selecting a chip sends it as a user message.

#### Scenario: Chip click
- **WHEN** the user clicks a quick-prompt chip
- **THEN** the message appears as a user message and an assistant reply follows

### Requirement: Component replies with tool label
Assistant replies SHALL be able to include text, a trend chart (history + forecast) or a restock-order table, each preceded by a visible tool label such as `plot_trend(...)` or `draft_restock_order(...)`.

#### Scenario: Trend request
- **WHEN** the user asks about a product's demand
- **THEN** the reply shows a `plot_trend(...)` label and a chart with solid history and dashed forecast

#### Scenario: Restock request
- **WHEN** the user asks what to order
- **THEN** the reply shows a `draft_restock_order(...)` label and a table of suggestions

### Requirement: Human approval for proposals
Any action proposed by the assistant (such as an order) SHALL require explicit user confirmation, and nothing SHALL be sent from the chat without it.

#### Scenario: Order from chat
- **WHEN** the user chooses to proceed on a drafted restock table
- **THEN** the Orden Restock confirmation flow opens instead of sending immediately

### Requirement: Unknown prompts and pending state
The assistant SHALL show a typing indicator while a reply is pending and a graceful fallback reply for free text it has no canned answer for.

#### Scenario: Unrecognized text
- **WHEN** the user sends text that matches no canned reply
- **THEN** the assistant replies suggesting the available quick prompts

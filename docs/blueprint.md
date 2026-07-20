# Forex Alert Bot — Bot specification

**Archetype:** finance

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

A Telegram bot that allows users to set one-time price alerts for forex pairs. When the market price crosses the user's target level (above or below), the bot sends a direct message alert and disables the alert.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- Retail forex traders
- Hobbyist traders

## Success criteria

- Users receive accurate one-time price alerts via Telegram DM when forex pairs cross target levels
- Users can create, list, and cancel alerts with clear confirmation and status tracking

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open the main menu and show onboarding/help
- **/alert** (command, actor: user, command: /alert) — Create a new price alert with format: /alert [pair] [price] [above|below]
  - inputs: currency pair, target price, direction
  - outputs: confirmation message with alert ID, Cancel button
- **/list** (command, actor: user, command: /list) — Show active alerts with cancel options
  - inputs: none
  - outputs: list of active alerts with cancel buttons
- **/cancel** (command, actor: user, command: /cancel) — Cancel a specific alert by ID
  - inputs: alert ID
  - outputs: confirmation of cancellation
- **/help** (command, actor: user, command: /help) — Show help text with examples and syntax
  - inputs: none
  - outputs: help message with examples

## Flows

### Create Alert
_Trigger:_ /alert

1. Parse currency pair, price, and direction from message
2. Show confirmation with Cancel/Confirm buttons
3. Save alert if confirmed

_Data touched:_ Alert

### List Alerts
_Trigger:_ /list

1. Retrieve active alerts for user
2. Display list with cancel buttons for each alert

_Data touched:_ Alert

### Cancel Alert
_Trigger:_ /cancel

1. Parse alert ID from message
2. Remove alert from active list

_Data touched:_ Alert

### Alert Triggering
_Trigger:_ Market price update

1. Poll forex price feed
2. Check if any active alerts are triggered
3. Send DM notification for each triggered alert
4. Mark alert as triggered

_Data touched:_ Alert

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User** _(retention: persistent)_ — Telegram user account linked to alerts
  - fields: Telegram user ID
- **Alert** _(retention: persistent)_ — One-time price alert for a forex pair
  - fields: user ID, currency pair, direction, target price, creation timestamp, status (active/triggered/expired)

## Integrations

- **Telegram** (required) — Bot API messaging and user interaction
- **Forex Price Feed** (required) — Market data for price crossing detection
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Configure forex price feed source
- Set polling frequency for price updates
- View system statistics (active alerts, triggers, etc.)

## Notifications

- Direct message alerts when price crosses target level
- Alert confirmation and cancellation notifications

## Permissions & privacy

- Telegram user ID is stored to associate alerts with users
- No personal data beyond Telegram ID and alert details is stored

## Edge cases

- Multiple identical alerts from same user
- Price exactly matches target level
- User cancels alert after it's triggered but before delivery

## Required tests

- End-to-end test of alert creation -> trigger -> notification flow
- Test alert cancellation before and after trigger
- Test handling of price equality as trigger condition

## Assumptions

- Developer will select a reliable forex price feed
- Timestamps will use UTC by default
- Price matching treats equality as a crossing

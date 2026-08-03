## Purpose

Entry point on Home for wallet security actions: view recovery phrase, lock session, and delete wallet from device storage.

## ADDED Requirements

### Requirement: Wallet settings entry on Home

The home screen SHALL provide a visible entry point to wallet security settings where the user can view recovery phrase, lock wallet, or delete wallet.

#### Scenario: Settings reachable from Home

- **WHEN** the user is on the home screen with an unlocked wallet
- **THEN** a control navigates to wallet settings

#### Scenario: Settings not shown without wallet

- **WHEN** the runtime reports `NO_WALLET`
- **THEN** the home screen is not shown and wallet settings are not reachable

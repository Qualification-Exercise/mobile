## Purpose

Entry point on Home for wallet security actions: view recovery phrase and delete wallet from device storage. Session lock is automatic on app background (not a settings button).

## ADDED Requirements

### Requirement: Wallet settings entry on Home

The home screen SHALL provide a visible entry point to wallet security settings where the user can view recovery phrase or delete wallet.

#### Scenario: Settings reachable from Home

- **WHEN** the user is on the home screen with an unlocked wallet
- **THEN** a control navigates to wallet settings

#### Scenario: Settings not shown without wallet

- **WHEN** no persisted wallet exists and WDK is not ready
- **THEN** the home screen redirects to Wallet Setup and wallet settings are not reachable

### Requirement: Reveal and delete from settings

Wallet settings SHALL expose view recovery phrase and delete wallet actions, gated by app biometry when enrolled.

#### Scenario: Reveal phrase from settings

- **WHEN** the user requests view recovery phrase in wallet settings and passes app biometry
- **THEN** the persisted mnemonic is displayed in a read-only grid

#### Scenario: Delete from settings

- **WHEN** the user confirms delete wallet in settings with biometry and destructive confirmation
- **THEN** secure storage is cleared and the user is signed out to Sign In

# wallet-seed-phrase Specification

## Purpose

Provides WDK-backed seed phrase lifecycle for the mobile app: cryptographically secure generation, encrypted device storage, import/restore, reveal, session lock/unlock, and deletion — independent of mock UI data for balances and addresses.

## Requirements

### Requirement: Generate BIP-39 mnemonic

The app SHALL generate a 12-word BIP-39 mnemonic through the WDK worklet when creating a new wallet. Generation SHALL occur in the worklet thread, not by assembling random words in application code.

#### Scenario: New wallet receives a 12-word phrase

- **WHEN** the new-wallet onboarding path requests phrase generation from the recovery-phrase screen
- **THEN** the app obtains a 12-word mnemonic from WDK and makes it available for display

#### Scenario: Generation failure is surfaced

- **WHEN** mnemonic generation fails due to worklet or engine error
- **THEN** the app shows an error state and does not display a partial or placeholder phrase

### Requirement: Persist wallet to secure storage

The app SHALL persist the wallet seed material to device secure storage through WDK after the user confirms they have saved the recovery phrase. Persistence SHALL encrypt the seed and store encryption metadata using the platform secure storage integration bundled with WDK React Native Core.

#### Scenario: Confirming backup persists the wallet

- **WHEN** the user taps "I've saved it — Continue" on the recovery-phrase screen after viewing a generated phrase
- **THEN** the wallet is written to secure storage under the app's default wallet identifier and the runtime lifecycle advances past `NO_WALLET`

#### Scenario: Abandoning before confirm does not persist

- **WHEN** the user navigates away from the recovery-phrase screen before confirming backup
- **THEN** no wallet is persisted to secure storage and a subsequent cold start still reports `NO_WALLET`

### Requirement: Restore wallet from mnemonic

The app SHALL import a user-supplied 12-word mnemonic through WDK `restoreWallet` (or equivalent lifecycle API), persisting encrypted seed material to secure storage and unlocking the runtime.

#### Scenario: Valid phrase restores and unlocks

- **WHEN** the user submits a complete, WDK-valid 12-word phrase on the restore screen
- **THEN** the phrase is imported to secure storage, the default wallet identifier is active, and the runtime reaches `READY` (or equivalent unlocked state)

#### Scenario: Duplicate wallet identifier is rejected

- **WHEN** the user attempts to restore while a wallet already exists for the default identifier
- **THEN** the app reports a clear error and does not overwrite the existing wallet silently

#### Scenario: Invalid phrase is rejected

- **WHEN** the user submits a 12-word phrase that fails WDK/worklet mnemonic validation
- **THEN** restore does not proceed, secure storage is unchanged, and the user sees an invalid-phrase indication

### Requirement: Reveal stored mnemonic

The app SHALL retrieve the stored mnemonic for display only through WDK's authenticated reveal path (`getMnemonic` or equivalent), not by reading plaintext from application memory or mock store defaults.

#### Scenario: Reveal after wallet creation

- **WHEN** the recovery-phrase screen displays words immediately after generation (pre-persist preview)
- **THEN** the displayed words match the mnemonic that will be persisted on confirm

#### Scenario: Reveal of persisted wallet requires app biometry when enrolled

- **WHEN** the user requests the mnemonic from wallet settings and app biometry is enrolled
- **THEN** the app biometry prompt is shown before WDK `getMnemonic` is invoked

#### Scenario: View phrase from wallet settings

- **WHEN** the user opens wallet settings from Home and requests to view the recovery phrase
- **THEN** the app fetches the mnemonic via WDK and displays it in a read-only grid with loading and error states

### Requirement: Session lock and unlock wallet

The app SHALL lock the in-memory wallet session when the app enters the background and require app biometry plus WDK unlock before wallet operations resume.

#### Scenario: Background locks session

- **WHEN** the app enters the background while a wallet is unlocked (`READY`)
- **THEN** the in-memory worklet session is cleared and the user must pass BiometricUnlock on return

#### Scenario: Foreground unlock loads persisted wallet

- **WHEN** the user completes app biometry on BiometricUnlock and a wallet exists in secure storage
- **THEN** the app invokes WDK `unlock('default')` if needed and navigates to Home when `READY`

### Requirement: Delete wallet

The app SHALL allow removing a wallet and all associated secure storage entries for a given wallet identifier through WDK wallet deletion APIs.

#### Scenario: Delete removes secure storage

- **WHEN** wallet deletion is invoked for an existing wallet identifier
- **THEN** secure storage no longer contains seed material for that identifier

#### Scenario: Delete from settings signs out and returns to sign-in

- **WHEN** the user confirms delete wallet in settings with required biometry and destructive confirmation
- **THEN** secure storage is cleared, the Google session is signed out, and navigation resets to Sign In

### Requirement: App biometry before sensitive wallet operations

When app biometry is enrolled, the app SHALL verify the user with `BiometryStore.verify` before reveal, delete, restore submit, open-existing, or replace-wallet operations.

#### Scenario: Delete blocked without biometry

- **WHEN** the user cancels or fails app biometry on delete wallet
- **THEN** WDK `deleteWallet` is not invoked

### Requirement: Default wallet identifier

The app SHALL use a single default wallet identifier (`default`) for the primary user wallet in this change. Multi-wallet selection UI is out of scope.

#### Scenario: Single-wallet mode

- **WHEN** any create, restore, unlock, or delete operation runs without an explicit alternate identifier
- **THEN** the operation targets the default wallet identifier

### Requirement: Wallet setup hub

When the user is authenticated and app biometry is enrolled but no wallet exists on device, the app SHALL show a Wallet Setup screen offering create-new or restore paths.

#### Scenario: Wallet setup shown when no persisted wallet

- **WHEN** boot routing resolves and `hasPersistedWallet` is false after auth and biometry gates
- **THEN** the app navigates to Wallet Setup with create and restore actions

#### Scenario: Wallet setup skipped when wallet exists

- **WHEN** a persisted wallet exists on device
- **THEN** boot routing navigates to BiometricUnlock instead of Wallet Setup

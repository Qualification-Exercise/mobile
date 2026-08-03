## Purpose

Provides WDK-backed seed phrase lifecycle for the mobile app: cryptographically secure generation, encrypted device storage, import/restore, reveal, lock/unlock, and deletion — independent of mock UI data for balances and addresses.

## ADDED Requirements

### Requirement: Generate BIP-39 mnemonic

The app SHALL generate a 12-word BIP-39 mnemonic through the WDK worklet when creating a new wallet. Generation SHALL occur in the worklet thread, not by assembling random words in application code.

#### Scenario: New wallet receives a 12-word phrase

- **WHEN** the new-wallet onboarding path requests phrase generation after the biometric gate
- **THEN** the app obtains a 12-word mnemonic from WDK and makes it available for display on the recovery-phrase screen

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

#### Scenario: Reveal of persisted wallet requires auth when configured

- **WHEN** the app requests the mnemonic for a persisted wallet and secure storage requires biometric authentication
- **THEN** the platform auth prompt is shown before words are returned

### Requirement: Lock and unlock wallet session

The app SHALL support locking the active wallet session (clearing in-memory keys and stopping the worklet wallet context) and unlocking it again from secure storage.

#### Scenario: Lock clears unlocked state

- **WHEN** the app invokes lock on an unlocked wallet
- **THEN** the runtime reports `LOCKED` (or equivalent) and signing/account operations are unavailable until unlock succeeds

#### Scenario: Unlock loads persisted wallet

- **WHEN** the user completes unlock for a wallet that exists in secure storage
- **THEN** the runtime decrypts and loads the wallet and reports `READY`

### Requirement: Delete wallet

The app SHALL allow removing a wallet and all associated secure storage entries for a given wallet identifier through WDK wallet deletion APIs.

#### Scenario: Delete removes secure storage

- **WHEN** wallet deletion is invoked for an existing wallet identifier
- **THEN** secure storage no longer contains seed material for that identifier and the runtime reports `NO_WALLET` on next boot

### Requirement: Default wallet identifier

The app SHALL use a single default wallet identifier (`default`) for the primary user wallet in this change. Multi-wallet selection UI is out of scope.

#### Scenario: Single-wallet mode

- **WHEN** any create, restore, unlock, or delete operation runs without an explicit alternate identifier
- **THEN** the operation targets the default wallet identifier

## ADDED Requirements (pending UI — see tasks §7)

### Requirement: Reveal persisted phrase from settings

The app SHALL expose a user-facing path to view the persisted recovery phrase after onboarding, using WDK `getMnemonic`, separate from the one-time onboarding preview.

#### Scenario: View phrase from wallet settings

- **WHEN** the user opens wallet settings from Home and requests to view the recovery phrase
- **THEN** the app fetches the mnemonic via WDK and displays it in a read-only grid with loading and error states

### Requirement: Manual lock and delete from settings

The app SHALL expose lock and delete wallet actions from wallet settings, wired to WDK `lock` and `deleteWallet`.

#### Scenario: Lock from settings

- **WHEN** the user confirms lock wallet in settings
- **THEN** the runtime locks the session and wallet operations require unlock before resuming

#### Scenario: Delete from settings

- **WHEN** the user confirms delete wallet in settings with required destructive confirmation
- **THEN** secure storage is cleared, runtime reports `NO_WALLET`, and navigation returns to sign-in

### Requirement: Lifecycle navigation after delete

The app SHALL navigate to sign-in when the runtime transitions to `NO_WALLET` after deleting the only wallet on the device.

#### Scenario: Delete returns to sign-in

- **WHEN** the user deletes the wallet and runtime reports `NO_WALLET`
- **THEN** the app navigates to the sign-in screen

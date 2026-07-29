# wallet-restore Specification

## Purpose

TBD - created by add-seed-phrase-recovery. Covers the restore-wallet flow: entering a recovery phrase via manual entry, paste, or QR scan, validating it live, and completing wallet restoration.

## Requirements

### Requirement: Enter recovery phrase screen

The app SHALL present a "Restore wallet" screen with a back action to sign-in, a 12-cell numbered word-entry grid, a "Paste" action, and a "Scan QR" action, matching the "Enter recovery phrase" design canvas screen.

#### Scenario: Restore screen renders an empty 12-word grid

- **WHEN** the user navigates to the restore-wallet screen
- **THEN** 12 numbered, empty, editable word cells are shown along with "Paste" and "Scan QR" actions and a disabled "Restore wallet" button

#### Scenario: Back action returns to sign-in

- **WHEN** the user taps the back action on the restore-wallet screen
- **THEN** the app navigates back to the sign-in screen

### Requirement: Fill phrase via paste

The app SHALL let the user fill all 12 word cells at once from clipboard contents via the "Paste" action.

#### Scenario: Pasting a well-formed phrase fills the grid

- **WHEN** the user taps "Paste" and the clipboard contains 12 whitespace-separated words
- **THEN** each of the 12 cells is filled with the corresponding word in order, overwriting any existing entries

#### Scenario: Pasting malformed content is ignored

- **WHEN** the user taps "Paste" and the clipboard does not contain 12 whitespace-separated words
- **THEN** the grid is left unchanged and no crash occurs

### Requirement: Fill phrase via QR scan

The app SHALL let the user fill all 12 word cells at once by scanning a QR code containing the phrase, via the "Scan QR" action.

#### Scenario: Scanning a QR code with a well-formed phrase fills the grid

- **WHEN** the user taps "Scan QR" and completes a scan whose decoded payload contains 12 whitespace-separated words
- **THEN** each of the 12 cells is filled with the corresponding word in order, overwriting any existing entries, and the scanner is dismissed

#### Scenario: Scanning is cancelled

- **WHEN** the user opens the QR scanner from the restore screen and cancels without a successful scan
- **THEN** the grid is left unchanged and the user returns to the restore screen

### Requirement: Live phrase validation

The app SHALL validate the entered phrase as the user edits it, showing a word-count indicator (`n / 12 words`) and a valid/invalid phrase indicator, and SHALL only enable the "Restore wallet" button when all 12 cells are filled with non-empty words and the phrase is considered valid.

#### Scenario: Partial entry shows progress and disables submit

- **WHEN** fewer than 12 cells contain a non-empty word
- **THEN** the word-count indicator reflects the current filled count out of 12 and the "Restore wallet" button remains disabled

#### Scenario: Complete, valid entry enables submit

- **WHEN** all 12 cells contain non-empty words that pass the app's phrase-validity check
- **THEN** the screen shows a valid-phrase indicator with the count "12 / 12 words" and enables the "Restore wallet" button

#### Scenario: Complete but invalid entry keeps submit disabled

- **WHEN** all 12 cells are filled but the phrase-validity check fails
- **THEN** the screen shows an invalid-phrase indicator and the "Restore wallet" button remains disabled

### Requirement: Completing wallet restoration

The app SHALL, when the user taps "Restore wallet" with a valid, complete phrase, replace the wallet's stored recovery phrase with the entered words and navigate to the home screen such that the sign-in/restore stack is not reachable via back navigation.

#### Scenario: Restoring a valid phrase enters the wallet

- **WHEN** the user taps "Restore wallet" with a complete, valid 12-word phrase entered
- **THEN** `WalletStore`'s seed phrase is replaced with the entered words and the app navigates to the home screen, with the restore/sign-in stack unreachable via back navigation

#### Scenario: Restore path skips biometric-gate and reveal-recovery-phrase

- **WHEN** the user restores a wallet via the "Restore wallet" button
- **THEN** the app does not show the biometric-gate screen or the reveal-recovery-phrase screen before reaching home

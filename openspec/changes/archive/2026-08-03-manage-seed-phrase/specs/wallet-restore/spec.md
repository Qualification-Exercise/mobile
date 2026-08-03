## MODIFIED Requirements

### Requirement: Live phrase validation

The app SHALL validate the entered phrase as the user edits it, showing a word-count indicator (`n / 12 words`) and a valid/invalid phrase indicator, and SHALL only enable the "Restore wallet" button when all 12 cells are filled with non-empty words and the phrase passes WDK/worklet mnemonic validation (not word-count-only or cosmetic checks).

#### Scenario: Partial entry shows progress and disables submit

- **WHEN** fewer than 12 cells contain a non-empty word
- **THEN** the word-count indicator reflects the current filled count out of 12 and the "Restore wallet" button remains disabled

#### Scenario: Complete, valid entry enables submit

- **WHEN** all 12 cells contain non-empty words that pass WDK/worklet phrase validation
- **THEN** the screen shows a valid-phrase indicator with the count "12 / 12 words" and enables the "Restore wallet" button

#### Scenario: Complete but invalid entry keeps submit disabled

- **WHEN** all 12 cells are filled but WDK/worklet validation fails
- **THEN** the screen shows an invalid-phrase indicator and the "Restore wallet" button remains disabled

### Requirement: Completing wallet restoration

The app SHALL, when the user taps "Restore wallet" with a valid, complete phrase, verify app biometry when enrolled, import the phrase through WDK restore APIs, unlock the runtime, and navigate to the home screen such that the sign-in/restore stack is not reachable via back navigation.

#### Scenario: Restoring a valid phrase enters the wallet

- **WHEN** the user taps "Restore wallet" with a complete, WDK-valid 12-word phrase entered and passes app biometry when required
- **THEN** the phrase is imported to secure storage via WDK, the runtime reaches ready, and the app navigates to the home screen with the restore/sign-in stack unreachable via back navigation

#### Scenario: Restore path skips biometric-gate and reveal-recovery-phrase for new wallet

- **WHEN** the user restores a wallet via the restore screen from Wallet Setup
- **THEN** the app does not show the recovery-phrase generation screen before reaching home

#### Scenario: Restore failure keeps user on restore screen

- **WHEN** WDK restore fails (invalid phrase, duplicate wallet, or storage error)
- **THEN** the app remains on the restore screen with an error indication and does not navigate to home

## ADDED Requirements

### Requirement: Replace wallet when one already exists

When restore fails because a wallet already exists, the app SHALL offer open-existing and replace flows with app biometry when enrolled.

#### Scenario: Open saved wallet from restore error

- **WHEN** restore fails with a wallet-already-exists error and the user chooses open saved wallet
- **THEN** the app verifies app biometry when enrolled, unlocks via WDK, and navigates to Home

#### Scenario: Replace with new phrase

- **WHEN** the user chooses replace with new phrase on the restore screen
- **THEN** the app verifies app biometry, deletes the existing wallet, and returns to restore with an empty phrase grid

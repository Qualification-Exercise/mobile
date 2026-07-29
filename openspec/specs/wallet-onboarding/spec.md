# wallet-onboarding Specification

## Purpose

TBD - created by import-wdk-wallet-screens. Covers the sign-in, biometric opt-in, and recovery-phrase backup flow, matching the WDK Wallet design canvas screens 01-03.

## Requirements

### Requirement: SSO sign-in screen

The app SHALL present a sign-in screen as its initial route, offering "Continue with Apple", "Continue with Google", and "Continue with email" actions, matching the WDK Wallet design canvas screen 01.

#### Scenario: App launches to sign-in

- **WHEN** the app finishes booting
- **THEN** the sign-in screen is the first screen shown, with the WDK Wallet mark, tagline, and the three SSO continue actions

#### Scenario: Choosing an SSO option proceeds to biometric setup

- **WHEN** the user taps any of "Continue with Apple", "Continue with Google", or "Continue with email"
- **THEN** the app navigates to the biometric-gate screen

### Requirement: Biometric gate opt-in

The app SHALL present a screen asking the user to enable a biometric unlock/approval gate, with an explicit skip path, matching screen 02.

#### Scenario: Enabling biometrics proceeds to recovery phrase

- **WHEN** the user taps "Enable Face ID"
- **THEN** `WalletStore` records biometrics as enabled and the app navigates to the recovery-phrase screen

#### Scenario: Skipping biometrics still proceeds

- **WHEN** the user taps "Not now"
- **THEN** `WalletStore` records biometrics as not enabled and the app navigates to the recovery-phrase screen

### Requirement: Recovery phrase backup

The app SHALL display a 12-word mock recovery phrase in numbered order, backup-status indicators (Device/iCloud/Backend), and a warning that the phrase cannot be recovered by WDK, matching screen 03.

#### Scenario: Recovery phrase renders all 12 words in order

- **WHEN** the recovery-phrase screen is shown
- **THEN** all 12 mock seed words from `WalletStore` render in a numbered 2-column grid in their stored order

#### Scenario: Confirming backup enters the wallet

- **WHEN** the user taps "I've saved it — Continue"
- **THEN** the app navigates to the home screen and the onboarding stack is not reachable via back navigation

## MODIFIED Requirements

### Requirement: SSO sign-in screen

The app SHALL present a sign-in screen as its initial route, offering "Continue with Apple", "Continue with Google", and "Continue with email" actions, plus a "Restore" entry point for users who already have a wallet, matching the WDK Wallet design canvas screen 01.

#### Scenario: App launches to sign-in

- **WHEN** the app finishes booting
- **THEN** the sign-in screen is the first screen shown, with the WDK Wallet mark, tagline, the three SSO continue actions, and an "Already have a wallet? Restore" link

#### Scenario: Choosing an SSO option proceeds to biometric setup

- **WHEN** the user taps any of "Continue with Apple", "Continue with Google", or "Continue with email"
- **THEN** the app navigates to the biometric-gate screen

#### Scenario: Choosing "Restore" proceeds to the restore-wallet flow

- **WHEN** the user taps the "Restore" link on the sign-in screen
- **THEN** the app navigates to the restore-wallet screen instead of the biometric-gate screen

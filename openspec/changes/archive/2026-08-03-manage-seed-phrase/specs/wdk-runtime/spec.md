## MODIFIED Requirements

### Requirement: Wallet lifecycle states are observable at boot

The wallet runtime SHALL expose lifecycle states including initializing, no wallet, locked, ready, and error. The app composition layer SHALL read initializing and error states to gate boot. When no wallet exists on device, the app SHALL render onboarding screens via `WalletSetup`. When a wallet exists, the app SHALL route through `BiometricUnlock` before Home. Create, import, unlock, and delete operations SHALL be invocable through WDK wallet manager APIs; balance fetch, send, and address display MAY still use mock data.

#### Scenario: Fresh install reaches no wallet

- **WHEN** the runtime initializes and finds no stored wallet on the device
- **THEN** the lifecycle state is no wallet and boot routing lands on Sign In then Wallet Setup after auth gates

#### Scenario: Existing wallet reaches locked or ready

- **WHEN** the runtime initializes and finds a persisted wallet on the device
- **THEN** boot routing lands on BiometricUnlock and the app does not treat the device as a fresh install

#### Scenario: Seed phrase operations use runtime

- **WHEN** the user completes new-wallet onboarding or restore with a valid phrase
- **THEN** the corresponding WDK wallet manager operation is invoked and mock store seed defaults are not the source of truth

### Requirement: Mock wallet store remains authoritative for UI

The existing mock application wallet store SHALL continue to drive user-visible **balances, transactions, and display addresses** in this change. The wallet runtime SHALL NOT replace mock store values for those fields in any screen. Seed phrase display and restore/import SHALL NOT use mock store defaults as the canonical wallet secret once this change is applied.

#### Scenario: Home shows mock balances after runtime boot

- **WHEN** the runtime reaches ready and the user navigates to the home screen via existing flows
- **THEN** asset balances and transactions match mock store data, not runtime or indexer data

#### Scenario: Seed phrase is not mock-default after wallet setup

- **WHEN** the user completes new-wallet onboarding or restore through WDK
- **THEN** the recovery phrase shown or imported is sourced from WDK lifecycle operations, not the hard-coded mock seed array in `WalletStore`

#### Scenario: Unmigrated screens remain navigable

- **WHEN** the runtime is initialized alongside mock store data
- **THEN** all existing screens remain reachable without crash or behavior change attributable to WDK integration beyond seed-phrase lifecycle wiring

## ADDED Requirements

### Requirement: Boot routing reflects auth, biometry, and wallet presence

The app SHALL compute the initial navigation stack from Google auth state, app biometry enrollment, and persisted wallet presence via `resolveBootRoute`.

#### Scenario: Unauthenticated user starts at sign-in

- **WHEN** the app launches and no Google session is restored
- **THEN** the initial route is Sign In

#### Scenario: Authenticated without biometry starts at enable biometric

- **WHEN** the user is signed in but app biometry is not enrolled
- **THEN** the initial route is Enable Biometric

#### Scenario: Authenticated with biometry but no wallet starts at wallet setup

- **WHEN** the user is signed in, biometry is enrolled, and no wallet exists on device
- **THEN** the initial route is Wallet Setup

#### Scenario: Authenticated with wallet starts at biometric unlock

- **WHEN** the user is signed in, biometry is enrolled, and a wallet exists on device
- **THEN** the initial route is Biometric Unlock

### Requirement: Navigation reflects wallet lifecycle

The app SHALL route navigation based on WDK lifecycle and wallet management events.

#### Scenario: Ready opens home after unlock

- **WHEN** the runtime transitions to `READY` from `LOCKED` or `REINITIALIZING`
- **THEN** the app navigates to the home screen

#### Scenario: Delete opens sign-in

- **WHEN** the user deletes the wallet from settings
- **THEN** the app signs out the Google session and navigates to Sign In

#### Scenario: Home redirects without wallet

- **WHEN** the user reaches Home without a persisted wallet and WDK is not `READY`
- **THEN** the app redirects to Wallet Setup

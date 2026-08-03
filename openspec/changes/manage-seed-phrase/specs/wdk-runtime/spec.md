## MODIFIED Requirements

### Requirement: Wallet lifecycle states are observable at boot

The wallet runtime SHALL expose lifecycle states including initializing, no wallet, locked, ready, and error. The app composition layer SHALL read initializing and error states to gate boot. When no wallet exists on device, the app SHALL render existing onboarding screens. When a wallet exists but is locked, the app SHALL provide an unlock path before exposing wallet operations. Create, import, unlock, and lock operations SHALL be invocable through WDK wallet manager APIs in this change; balance fetch, send, and address display MAY still use mock data until later changes migrate those features.

#### Scenario: Fresh install reaches no wallet

- **WHEN** the runtime initializes and finds no stored wallet on the device
- **THEN** the lifecycle state is no wallet and the sign-in / mock onboarding screens render

#### Scenario: Existing wallet reaches locked or ready

- **WHEN** the runtime initializes and finds a persisted wallet on the device
- **THEN** the lifecycle state is locked or ready depending on whether the session is unlocked, and the app does not treat the device as a fresh install

#### Scenario: Seed phrase operations use runtime

- **WHEN** the user completes new-wallet onboarding or restore with a valid phrase
- **THEN** the corresponding WDK wallet manager operation (create, restore, unlock) is invoked and mock store seed defaults are not the source of truth

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

## ADDED Requirements (pending UI — see tasks §7)

### Requirement: Navigation reflects wallet lifecycle

The app SHALL route navigation based on WDK lifecycle: `READY` opens home; `NO_WALLET` after delete opens sign-in.

#### Scenario: Ready opens home on cold start

- **WHEN** the runtime reaches `READY` after cold start or unlock
- **THEN** the app navigates to the home screen

#### Scenario: No wallet opens sign-in after delete

- **WHEN** the user deletes the only wallet and runtime reports `NO_WALLET`
- **THEN** the app navigates to the sign-in screen

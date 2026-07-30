## Purpose

Provides minimal WDK core setup for the React Native app: engine bundle, provider wiring, single testnet network config, and boot lifecycle gating. Feature-level wallet operations (create, import, balances, sends) and multi-chain expansion are out of scope for this capability.

## ADDED Requirements

### Requirement: Wallet runtime initializes on app boot

The app SHALL initialize a wallet runtime at the composition root on every cold start. While initialization is in progress, the app SHALL show a loading state and SHALL NOT render the main navigation stack.

#### Scenario: Cold start enters initializing state

- **WHEN** the app launches on a device with no prior runtime session
- **THEN** the wallet runtime reports an initializing state until engine startup completes or fails

#### Scenario: Initialization failure is surfaced

- **WHEN** wallet runtime initialization fails (invalid configuration or engine error at runtime)
- **THEN** the app reports an error state with a user-visible or developer-visible failure indication and does not silently continue as if initialization succeeded

### Requirement: Minimal network configuration

The wallet runtime SHALL be configured with at least one EVM testnet network (Sepolia) using the ERC-4337 wallet module. Additional networks (Spark, Tron, Arbitrum) are explicitly out of scope for this capability and SHALL be added in follow-up changes.

#### Scenario: Sepolia network is configured

- **WHEN** the wallet runtime completes initialization successfully
- **THEN** a Sepolia (`ethereum`) network entry is present in the runtime configuration

#### Scenario: Unconfigured network is not part of this change

- **WHEN** a downstream feature references a network not yet added (Spark, Tron, Arbitrum)
- **THEN** that network is not expected to work in this change; mock UI data MAY still display placeholder values from application store

### Requirement: Wallet engine bundle is present

The app SHALL include a generated wallet engine bundle containing the ERC-4337 wallet module. The bundle SHALL be loadable at runtime without requiring a live network connection solely to start the engine.

#### Scenario: Bundle present at runtime

- **WHEN** the app starts on iOS or Android after a successful native build and `npm run wdk:bundle` has been run
- **THEN** the wallet runtime can load the bundled engine and proceed past the initializing state when configuration is valid

#### Scenario: Missing bundle prevents startup

- **WHEN** the wallet engine bundle is absent or corrupt
- **THEN** the app fails to start rather than proceeding silently; a missing generated bundle (`.wdk/` / `.wdk-bundle/`) MAY fail at Metro/build time via import error, which is acceptable for this change; runtime engine failures SHALL surface through the wallet runtime error state

### Requirement: Optional environment placeholders

The project's environment example file SHALL document optional WDK Indexer and chain credential variables as commented placeholders. These variables SHALL NOT be required for the app to boot or for the wallet runtime to reach the no-wallet state in this change.

#### Scenario: App boots without indexer credentials

- **WHEN** no indexer API key is present in environment configuration
- **THEN** the app still completes runtime initialization and reaches the no-wallet state (or ready, if a wallet already exists on device)

#### Scenario: Env example documents future keys

- **WHEN** a developer reads the environment example file
- **THEN** optional indexer and chain credential variables are listed with comments indicating they are needed only for future balance/history features

### Requirement: Wallet lifecycle states are observable at boot

The wallet runtime SHALL expose lifecycle states including initializing, no wallet, locked, ready, and error. The app composition layer SHALL read initializing and error states to gate boot; other states SHALL pass through to existing mock UI without invoking wallet create, import, unlock, or account hooks.

#### Scenario: Fresh install reaches no wallet

- **WHEN** the runtime initializes and finds no stored wallet on the device
- **THEN** the lifecycle state is no wallet and the existing sign-in / mock onboarding screens render unchanged

#### Scenario: No feature calls wallet operations

- **WHEN** the user navigates through existing mock flows (sign-in, home, send, restore)
- **THEN** no screen or feature invokes wallet create, import, unlock, balance fetch, or send through the runtime in this change

### Requirement: Android minimum platform version

The Android build SHALL require a minimum SDK version of 29 to support the wallet engine's native dependencies.

#### Scenario: Android build enforces API 29 minimum

- **WHEN** the Android application is built from this project
- **THEN** the declared minimum SDK version is 29 or higher

### Requirement: Mock wallet store remains authoritative for UI

The existing mock application wallet store SHALL continue to drive all user-visible wallet data (seed phrase display, addresses, balances, transactions) in this change. The wallet runtime SHALL NOT replace mock store values in any screen.

#### Scenario: Home shows mock balances after runtime boot

- **WHEN** the runtime reaches no wallet and the user navigates to the home screen via existing mock flows
- **THEN** asset balances and transactions match mock store data, not runtime or indexer data

#### Scenario: Unmigrated screens remain navigable

- **WHEN** the runtime is initialized alongside mock store data
- **THEN** all existing screens remain reachable without crash or behavior change attributable to WDK integration

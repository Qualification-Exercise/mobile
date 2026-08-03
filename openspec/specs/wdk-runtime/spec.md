# wdk-runtime Specification

## Purpose

Provides WDK core setup for the React Native app: engine bundle, provider wiring, multi-chain network configuration (Spark, Ethereum, Arbitrum, Polygon, Tron), and boot lifecycle gating. Feature-level wallet operations (create, import, balances, sends) remain out of scope for this capability.

## Requirements

### Requirement: Wallet runtime initializes on app boot

The app SHALL initialize a wallet runtime at the composition root on every cold start. While initialization is in progress, the app SHALL show a loading state and SHALL NOT render the main navigation stack.

#### Scenario: Cold start enters initializing state

- **WHEN** the app launches on a device with no prior runtime session
- **THEN** the wallet runtime reports an initializing state until engine startup completes or fails

#### Scenario: Initialization failure is surfaced

- **WHEN** wallet runtime initialization fails (invalid configuration or engine error at runtime)
- **THEN** the app reports an error state with a user-visible or developer-visible failure indication and does not silently continue as if initialization succeeded

### Requirement: Minimal network configuration

The wallet runtime SHALL be configured with the following networks, each mapped to the correct wallet module in the worklet bundle:

| Network key | Chain / layer              | Module                              |
| ----------- | -------------------------- | ----------------------------------- |
| `spark`     | Bitcoin Spark (mainnet)    | `@tetherto/wdk-wallet-spark`        |
| `ethereum`  | EVM Sepolia testnet        | `@tetherto/wdk-wallet-evm-erc-4337` |
| `arbitrum`  | EVM Arbitrum One (mainnet) | `@tetherto/wdk-wallet-evm-erc-4337` |
| `polygon`   | EVM Polygon (mainnet)      | `@tetherto/wdk-wallet-evm-erc-4337` |
| `tron`      | TRON mainnet               | `@tetherto/wdk-wallet-tron`         |

Public RPC and bundler URLs SHALL be used for EVM networks so no paid API keys are required for runtime boot. Tron API credentials (`TRON_API_KEY`, `TRON_API_SECRET`) SHALL be optional for boot; when absent, the Tron network entry SHALL still be present with a public provider default.

Feature-level wallet operations (create, import, balances, sends) remain out of scope; mock UI data MAY still display placeholder values until features migrate.

#### Scenario: Spark network is configured

- **WHEN** the wallet runtime completes initialization successfully
- **THEN** a `spark` network entry is present in the runtime configuration with mainnet Spark settings

#### Scenario: Ethereum Sepolia network remains configured

- **WHEN** the wallet runtime completes initialization successfully
- **THEN** an `ethereum` network entry is present with Sepolia testnet chain configuration

#### Scenario: Arbitrum network is configured

- **WHEN** the wallet runtime completes initialization successfully
- **THEN** an `arbitrum` network entry is present with Arbitrum One mainnet chain configuration

#### Scenario: Polygon network is configured

- **WHEN** the wallet runtime completes initialization successfully
- **THEN** a `polygon` network entry is present with Polygon mainnet chain configuration

#### Scenario: Tron network is configured without credentials

- **WHEN** the wallet runtime completes initialization and no Tron API credentials are set in environment configuration
- **THEN** a `tron` network entry is present and runtime initialization reaches the no-wallet or ready state without failing solely due to missing Tron credentials

### Requirement: Wallet engine bundle is present

The app SHALL include a generated wallet engine bundle containing the ERC-4337, Spark, and Tron wallet modules. The bundle SHALL be loadable at runtime without requiring a live network connection solely to start the engine.

#### Scenario: Bundle includes all required modules

- **WHEN** `npm run wdk:bundle` completes successfully after this change
- **THEN** the generated bundle includes `@tetherto/wdk-wallet-evm-erc-4337`, `@tetherto/wdk-wallet-spark`, and `@tetherto/wdk-wallet-tron`

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

### Requirement: Android minimum platform version

The Android build SHALL require a minimum SDK version of 29 to support the wallet engine's native dependencies.

#### Scenario: Android build enforces API 29 minimum

- **WHEN** the Android application is built from this project
- **THEN** the declared minimum SDK version is 29 or higher

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

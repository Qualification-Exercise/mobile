## MODIFIED Requirements

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

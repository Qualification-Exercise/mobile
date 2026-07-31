## Why

The WDK runtime is wired with a single Sepolia (`ethereum`) network and one wallet module. Mock UI and upcoming features already reference Bitcoin (Spark), Ethereum, Arbitrum, Polygon, and Tron assets — the runtime must expose matching network entries and bundle modules before feature work can migrate off mock data.

## What Changes

- Expand `wdk.config.js` to register wallet modules for Spark, EVM (ERC-4337), and Tron.
- Install npm dependencies: `@tetherto/wdk-wallet-spark`, `@tetherto/wdk-wallet-tron`, and Spark peer `@buildonspark/spark-sdk` (EVM ERC-4337 module already installed).
- Extend `src/shared/config/wdk.ts` with network entries: `spark`, `ethereum` (existing Sepolia), `arbitrum`, `polygon`, and `tron`.
- Regenerate the Bare worklet bundle (`npm run wdk:bundle`) and rebuild native projects after new native transitive deps.
- Wire optional Tron API credentials from env into Tron network config when present; boot SHALL NOT require them.
- **No feature changes**: mock `WalletStore`, screens, and WDK hooks usage stay unchanged — configuration and bundle only.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `wdk-runtime`: Expand from single-network Sepolia setup to multi-chain configuration (Spark, Ethereum, Arbitrum, Polygon, Tron) and a worklet bundle containing the required wallet modules. Boot behavior, lifecycle gating, and mock-store authority remain unchanged.

## Impact

- **Dependencies**: `@tetherto/wdk-wallet-spark`, `@tetherto/wdk-wallet-tron`, `@buildonspark/spark-sdk`; possible native transitive deps (pod install / Gradle rebuild).
- **Config**: `wdk.config.js`, `src/shared/config/wdk.ts`, regenerated `.wdk/` bundle.
- **Env**: Optional `TRON_API_KEY` / `TRON_API_SECRET` usage in Tron config (placeholders already in `.env.example`).
- **Out of scope**: Indexer integration, `networkMap`, feature hooks (`useAccount`, `useBalance`, send/restore wiring), mainnet migration for `ethereum` (Sepolia retained for dev).

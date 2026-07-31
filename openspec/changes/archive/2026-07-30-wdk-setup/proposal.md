## Why

The app ships a complete WDK Wallet UX backed by mock `WalletStore` data. Before wiring create/import, balances, or transactions, the project needs WDK's core React Native plumbing installed and verified—packages, native deps, worklet bundle, and provider boot—so follow-up changes can adopt WDK hooks incrementally without a big-bang migration.

## What Changes

- Install `@tetherto/wdk-react-native-core` and **one** wallet module (`@tetherto/wdk-wallet-evm-erc-4337`) for minimal proof-of-plumbing.
- Generate a custom Bare worklet bundle via `@tetherto/wdk-worklet-bundler` (`wdk.config.js` → `.wdk/`) containing only that module.
- Add minimal `WdkConfigs` under `src/shared/config/` with **one** testnet network (Sepolia), matching the [React Native Quickstart](https://docs.wdk.tether.io/start-building/react-native-quickstart/) default.
- Wrap the app root with `WdkAppProvider`, passing the worklet bundle and configs; expose WDK lifecycle state (`INITIALIZING`, `NO_WALLET`, `LOCKED`, `READY`, `ERROR`) via a boot gate only—no feature screens call WDK hooks yet.
- Document optional indexer and chain env vars in `.env.example` (commented placeholders; **not** required for app boot in this change).
- Raise Android `minSdkVersion` from 24 to **29** (required by `react-native-bare-kit`).
- Rebuild native projects (`pod install` on iOS; Gradle rebuild on Android).
- **BREAKING**: Native Android minimum SDK increases to API 29; devices below API 29 will no longer be supported.

## Capabilities

### New Capabilities

- `wdk-runtime`: Minimal WDK core setup—worklet bundle generation, `WdkAppProvider` wiring, single-network `WdkConfigs`, platform prerequisites (Android minSdk 29), and lifecycle boot gate (`INITIALIZING` / `ERROR` / pass-through to existing mock UI). Hooks are mounted but unused by features in this change.

### Modified Capabilities

- None. Existing `wallet-*` specs and mock `WalletStore` behavior stay unchanged. Multi-chain expansion, indexer integration, wallet create/import, balances, and sends are follow-up changes.

## Impact

- **Dependencies**: `@tetherto/wdk-react-native-core`, `@tetherto/wdk-wallet-evm-erc-4337`, `@tetherto/wdk-worklet-bundler` (dev), and native transitive deps (`react-native-bare-kit`, secure storage).
- **Native**: `android/build.gradle` (`minSdkVersion` 29), iOS `Podfile` / `pod install`.
- **Config & env**: `wdk.config.js`, gitignored `.wdk/` + `npm run wdk:bundle`, `src/shared/config/wdk.ts`, optional env placeholders in `.env.example`.
- **App composition**: `WdkProvider` + `WdkGate` in `src/app`; mock `WalletStore` and all screens unchanged.
- **Deferred follow-ups**: Spark, Tron, Arbitrum networks; indexer fail-fast; `networkMap`; bridge helpers; `useWalletManager` / `useAccount` / `useBalance` in features; real restore/sign/send wiring.

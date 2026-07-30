## Context

Bare React Native 0.86.2 app with Expo modules, FSD under `src/`, MobX `RootStore`, and React Navigation native-stack. Wallet UX is complete but backed by mock `WalletStore` data — no WDK packages are installed yet (`android/build.gradle` sets `minSdkVersion = 24`). Environment loading already uses `react-native-dotenv` (`@env` alias in `babel.config.js`; `.env.example` exists).

See `proposal.md` for motivation. Requirements live in `specs/wdk-runtime/spec.md`.

Official integration path: [React Native Quickstart — Add to Existing App](https://docs.wdk.tether.io/start-building/react-native-quickstart/) steps 1–5 (install, minSdk, bundle, configs, provider). **Stop before** step 6 (using hooks in product features).

## Goals / Non-Goals

**Goals:**

- Install and wire WDK React Native Core with a **minimal** custom Bare worklet bundle (one wallet module, one network).
- Mount `WdkAppProvider` at the app composition root with a boot gate for `INITIALIZING` and `ERROR` only.
- Verify cold start reaches `NO_WALLET` (fresh install) without crash; existing mock UI flows unchanged.
- Raise Android `minSdkVersion` to 29 and rebuild native projects.
- Document optional env placeholders for future indexer/chain keys.

**Non-Goals:**

- Configuring Spark, Tron, or Arbitrum networks (follow-up: `wdk-expand-networks` or per-feature changes).
- Requiring indexer API keys or Tron credentials at boot.
- Calling WDK hooks from any screen or feature (`createWallet`, `import`, `unlock`, `useAccount`, `useBalance`, `send`).
- Bridge helpers, `networkMap`, or adapter layers in `src/shared/lib/wdk/`.
- Rewiring mock `WalletStore`, navigation, SSO, restore validation, or transaction signing.
- Production mainnet RPC/bundler selection.

## Decisions

### 1. Minimal custom worklet bundle (Option A)

Use `@tetherto/wdk-worklet-bundler` with a project-local `wdk.config.js` and generated `.wdk/` output.

**Phase 1 (this change)** — single module:

- `@tetherto/wdk-wallet-evm-erc-4337` only (Sepolia proof network)

**Phase 2 (deferred follow-up)** — add as needed when features wire up:

- `@tetherto/wdk-wallet-spark` (BTC/Spark)
- `@tetherto/wdk-wallet-tron` (Tron USDt)
- Additional EVM network entries in `wdkConfigs` (Arbitrum)

**Rationale:** Proves native build, bundle load, and provider boot with the smallest dependency surface. Multi-chain config can grow without re-proving plumbing.

**Alternatives considered:**

- Pre-built bundle — rejected; custom bundler path matches quickstart and keeps control when expanding modules.
- All four chains upfront — rejected; scope creep for "core setup only."

**Implementation notes:**

- `wdk-worklet-bundler init` at repo root → `wdk.config.js` with one module.
- Import: `import { bundle } from '../../.wdk'` from `src/app/providers/`.
- npm script `wdk:bundle`: `wdk-worklet-bundler generate`.
- Add `.wdk/` to `.gitignore`; run `npm run wdk:bundle` after clone or when `wdk.config.js` changes.
- Pin versions via `npm view @tetherto/<pkg> version` at install time.

### 2. Single Sepolia network in `WdkConfigs`

Place one network entry in `src/shared/config/wdk.ts`:

| WDK network key | Module                  | Notes                        |
| --------------- | ----------------------- | ---------------------------- |
| `ethereum`      | wdk-wallet-evm-erc-4337 | Sepolia testnet (quickstart) |

Use public Sepolia RPC and bundler URLs from the [quickstart example](https://docs.wdk.tether.io/start-building/react-native-quickstart/) so no paid RPC keys are needed.

**Deferred:** `networkMap.ts`, `assetIdToNetworkKey`, Arbitrum/Tron/Spark entries — add when dashboard/transfers migrate off mock data.

### 3. Provider placement and provider tree order

Add `src/app/providers/WdkProvider.tsx` wrapping `WdkAppProvider`.

```
SafeAreaProvider
  → WdkProvider (WdkAppProvider + bundle + wdkConfigs)
    → RootStoreContext.Provider
      → NavigationContainer
        → RootNavigator
```

No biometric or unlock wiring in this change.

### 4. Lifecycle gate — boot only, no feature integration

`WdkGate` (in `WdkProvider` or sibling file) reads `useWdkApp().state`:

| Status         | Behavior (this change)                             |
| -------------- | -------------------------------------------------- |
| `INITIALIZING` | Full-screen loading; block `RootNavigator`         |
| `ERROR`        | Full-screen error (bundle/config/engine failure)   |
| `NO_WALLET`    | Render children — existing mock onboarding UI      |
| `LOCKED`       | Render children — unlock UI deferred               |
| `READY`        | Render children — still mock data; no WDK hook use |

**No screen** imports or calls `useWalletManager`, `useAccount`, or `useBalance` in this change. Success = engine boots and mock app remains fully navigable.

### 5. Environment variables — optional placeholders only

Extend `.env.example` with **commented** placeholders:

```
# Optional — required only when indexer/balance features are wired (not this change)
# WDK_INDEXER_BASE_URL=https://wdk-api.tether.io
# WDK_INDEXER_API_KEY=
# TRON_API_KEY=
# TRON_API_SECRET=
```

Do **not** fail app boot on missing indexer keys. Omit indexer props from `WdkAppProvider` unless the React Native Core API requires them for engine startup (if required by the SDK, pass empty/defaults and document — but do not block the mock UI).

### 6. Android minSdk 29 via Gradle

Set `minSdkVersion = 29` in `android/build.gradle` `ext` block. Run `bundle exec pod install` in `ios/` after adding native deps.

### 7. Mock `WalletStore` unchanged

No edits to `WalletStore`, features, or screens for WDK data. WDK runs in parallel, idle at `NO_WALLET`. Coexistence is implicit — no bridge helpers in this change.

## Risks / Trade-offs

- **[Risk] Beta WDK packages may have breaking API changes.** → Pin exact versions; run typecheck after install.
- **[Risk] `.wdk/` not generated after clone → build fails at Metro.** → `wdk:bundle` script documented in README; runtime `WdkGate` handles engine/config errors after bundle is present.
- **[Risk] Sepolia-only config won't match mock multi-chain Home labels.** → Expected; Home stays mock until `wallet-dashboard` wiring.
- **[Risk] Second change needed to add networks before feature work.** → Accepted trade-off for minimal scope; document expansion path in tasks.
- **[Risk] Native build time/size increases.** → Single module minimizes impact.

## Migration Plan

1. Install npm packages (core + one wallet module) + `wdk-worklet-bundler init` / `generate`.
2. Add `wdk.config.js` + `src/shared/config/wdk.ts` (Sepolia only).
3. Bump Android minSdk; `pod install`; rebuild both platforms.
4. Add `WdkProvider` + `WdkGate` to `App.tsx`.
5. Verify: `INITIALIZING` → `NO_WALLET` → SignIn/Home mock flows work; missing generated bundle fails at Metro build time (acceptable).
6. **Rollback:** Remove provider + WDK deps; restore minSdk 24. Mock UI unaffected.

## Open Questions

- **Indexer props at provider mount:** Confirm during implementation whether `WdkAppProvider` accepts omitting indexer config without blocking engine startup. Adjust provider props accordingly; spec allows optional env.
- **Commit `.wdk/` vs generate-on-build:** Gitignore + manual script for now.

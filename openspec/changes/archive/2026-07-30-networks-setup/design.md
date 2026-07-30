## Context

WDK core plumbing is in place (`WdkProvider`, Sepolia-only `wdkConfigs`, single-module `wdk.config.js`, generated `.wdk/` bundle). Mock `WalletStore` lists assets on Spark, Arbitrum, and Tron; the starter template and WDK docs define public mainnet RPC/bundler defaults for EVM chains and env-driven Tron credentials.

See `proposal.md` for motivation. Requirements live in `specs/wdk-runtime/spec.md`.

## Goals / Non-Goals

**Goals:**

- Register Spark, Tron, and additional EVM networks in `wdk.config.js` and `src/shared/config/wdk.ts`.
- Install required wallet packages and regenerate the worklet bundle.
- Preserve existing boot gate behavior (`INITIALIZING` / `ERROR` only); app reaches `NO_WALLET` without Tron API keys.
- Align network keys with mock UI and future feature wiring (`spark`, `ethereum`, `arbitrum`, `polygon`, `tron`).

**Non-Goals:**

- Migrating `ethereum` from Sepolia to mainnet (keep existing Sepolia dev config).
- Indexer integration, `networkMap`, or asset-ID mapping helpers.
- Calling WDK hooks from screens or replacing mock store data.
- Tron gas-free module (`wdk-wallet-tron-gasfree`) — standard `@tetherto/wdk-wallet-tron` only for now.
- Separate Bitcoin L1 module (`wdk-wallet-btc`); Spark covers BTC in the product.

## Decisions

### 1. Network keys and module mapping

| WDK network key | Bundle package (`wdk.config.js`)    | `WdkConfigs` blockchain field |
| --------------- | ----------------------------------- | ----------------------------- |
| `spark`         | `@tetherto/wdk-wallet-spark`        | `spark`                       |
| `ethereum`      | `@tetherto/wdk-wallet-evm-erc-4337` | `ethereum`                    |
| `arbitrum`      | `@tetherto/wdk-wallet-evm-erc-4337` | `arbitrum`                    |
| `polygon`       | `@tetherto/wdk-wallet-evm-erc-4337` | `polygon`                     |
| `tron`          | `@tetherto/wdk-wallet-tron`         | `tron`                        |

Three EVM networks share one npm package; the bundler deduplicates the module. Each network gets its own `WdkConfigs` entry with distinct `chainId`, `provider`, and paymaster token addresses.

**Alternatives considered:**

- Pre-built `@tetherto/pear-wrk-wdk` bundle — rejected; larger bundle, less control.
- `wdk-wallet-btc` alongside Spark — rejected; product uses Spark for BTC, not L1 Electrum.

### 2. Chain endpoints (public defaults)

Derived from [wdk-starter-react-native `get-chains-config.ts`](https://github.com/tetherto/wdk-starter-react-native) and WDK deployment references:

**`spark`**

```typescript
spark: {
  blockchain: 'spark',
  config: { network: 'mainnet' },
}
```

**`ethereum`** — unchanged Sepolia (existing):

- `chainId: 11155111`, public Sepolia RPC, Candide bundler/paymaster for Sepolia.

**`arbitrum`**

- `chainId: 42161`, `provider: 'https://arb1.arbitrum.io/rpc'`
- Candide bundler/paymaster: `https://api.candide.dev/public/v3/arbitrum`
- USDT paymaster token: `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9`

**`polygon`**

- `chainId: 137`, `provider: 'https://polygon-rpc.com'` (or `https://1rpc.io/matic`)
- Candide bundler/paymaster: `https://api.candide.dev/public/v3/polygon`
- USDT paymaster token: `0xc2132D05D31c914a87C6611C10748AEb04B58e8F`
- `safeModulesVersion: '0.3.0'` (starter default for Polygon ERC-4337)

**`tron`**

- `provider: 'https://api.trongrid.io'`
- `apiKey` / `apiSecret` from env when defined (via `@env` or `process.env` pattern already used in project)
- Omit or leave empty when env vars unset so boot does not fail

Shared ERC-4337 fields for EVM networks: `paymasterAddress`, `entrypointAddress`, `transferMaxFee: 5000000` (same as starter).

### 3. Dependency installation

```bash
npm install @tetherto/wdk-wallet-spark @tetherto/wdk-wallet-tron @buildonspark/spark-sdk
```

Pin versions via `npm view @tetherto/<pkg> version` at install time. Run `bundle exec pod install` in `ios/` after install.

### 4. Bundle regeneration workflow

After editing `wdk.config.js`:

```bash
npm run wdk:bundle   # wdk-worklet-bundler generate --install
```

Verify `.wdk/` regenerates and Metro resolves `import { bundle } from '../../../.wdk'`.

### 5. Env wiring for Tron (optional)

Read `TRON_API_KEY` and `TRON_API_SECRET` from `@env` in `wdk.ts` (add to `babel.config.js` env allowlist if not already). Pass into `tron.config` only when defined. `.env.example` already documents placeholders.

### 6. No provider or feature changes

`WdkProvider` props stay the same (`bundle` + `wdkConfigs`). No new hooks, no `networkMap.ts` in this change.

## Risks / Trade-offs

- **[Risk] Larger bundle and native binary size.** → Acceptable; still smaller than pre-built all-chains bundle.
- **[Risk] Spark peer `@buildonspark/spark-sdk` adds native deps or version conflicts.** → Pin versions; run pod install and verify both platforms build.
- **[Risk] Mainnet EVM configs without API keys may rate-limit RPC.** → Boot-only requirement does not need live RPC; feature work can swap providers later.
- **[Risk] Tron without API keys may warn or degrade at runtime.** → Spec requires boot success; document that production Tron usage needs keys.
- **[Risk] Mock UI network labels may not match Sepolia for `ethereum`.** → Expected until features migrate; `ethereum` stays Sepolia for dev faucets.

## Migration Plan

1. Install npm packages (spark, tron, spark-sdk peer).
2. Update `wdk.config.js` network map (5 entries).
3. Extend `src/shared/config/wdk.ts` with chain configs.
4. Optionally wire Tron env vars in config.
5. Run `npm run wdk:bundle`, `pod install`, rebuild iOS/Android.
6. Verify: cold start → `INITIALIZING` → `NO_WALLET`; mock flows unchanged.
7. **Rollback:** Revert config/package changes; regenerate single-module bundle; mock UI unaffected.

## Open Questions

- **Tron gas-free vs standard:** Starter uses gas-free fields (`gasFreeProvider`, `serviceProvider`, `verifyingContract`). Confirm during implementation whether standard `@tetherto/wdk-wallet-tron` accepts minimal provider-only config for boot, or whether starter-style gas-free fields are required even when credentials are absent.

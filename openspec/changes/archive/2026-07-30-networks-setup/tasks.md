## 1. Dependencies

- [x] 1.1 Install `@tetherto/wdk-wallet-spark`, `@tetherto/wdk-wallet-tron`, and peer `@buildonspark/spark-sdk` (pin latest stable versions via `npm view`)
- [x] 1.2 Run `bundle exec pod install` in `ios/` after npm install

## 2. Worklet bundle configuration

- [x] 2.1 Update `wdk.config.js` to map network keys to packages: `spark` → `@tetherto/wdk-wallet-spark`, `ethereum` / `arbitrum` / `polygon` → `@tetherto/wdk-wallet-evm-erc-4337`, `tron` → `@tetherto/wdk-wallet-tron`
- [x] 2.2 Run `npm run wdk:bundle` and confirm `.wdk/` regenerates without errors

## 3. Runtime network configuration

- [x] 3.1 Extend `src/shared/config/wdk.ts` with `spark` (mainnet), `arbitrum` (42161), `polygon` (137), and `tron` entries per design.md; keep existing `ethereum` Sepolia config unchanged
- [x] 3.2 Wire optional `TRON_API_KEY` / `TRON_API_SECRET` from `@env` into Tron config when present; ensure config is valid when env vars are absent
- [x] 3.3 Add Tron env vars to babel `@env` allowlist if not already included

## 4. Verification

- [x] 4.1 Run `npm run typecheck` and fix any new type errors from expanded `WdkConfigs`
- [x] 4.2 Cold-start app on iOS or Android simulator: confirm `INITIALIZING` → `NO_WALLET` (no boot failure without Tron credentials)
- [x] 4.3 Smoke-test existing mock navigation flows (sign-in, home, send) — no regressions from bundle size or new native deps

## 5. Documentation

- [x] 5.1 Update README (or inline comments) noting the five configured networks and that `npm run wdk:bundle` must be re-run after `wdk.config.js` changes

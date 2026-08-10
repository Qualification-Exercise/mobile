# Real Asset Transfers — Developer Summary

## High-Level Summary

The wallet's send flow used to be a **mock**: you'd type an amount, pass a biometric check, and the app would just prepend a fake row to an in-memory list. No blockchain, no real balances, no real addresses.

This feature makes transfers **real, end-to-end**. A user can now:

- **See real balances** pulled from the chain for every supported asset.
- **See real, per-chain receive addresses** on the Receive screen (a distinct address per network, correctly formatted).
- **Actually send funds** — BTC (Bitcoin L1 + Spark), USDt (Arbitrum, Ethereum/Sepolia, Polygon, Tron), and a placeholder utility token (UTL) — with a **live fee estimate**, on-device signing, and a real broadcast.
- Have each send **reported to the backend** for confirmation tracking, and their derived addresses **registered** with the backend.

The signing/broadcasting all happens **on-device via WDK**. The backend never touches funds — it only records hashes for tracking and stores addresses for cashback payouts.

## Key Components & Flow

**Send journey (the main path):**

1. **SendScreen** — user picks an asset, types an amount (now a real keypad, plus 25/50/Max pills computed from the _real_ balance), and pastes a destination. The screen validates live: amount > 0, amount ≤ balance, and destination format matches the chain. A **debounced live fee estimate** appears once inputs are valid. "Review send" stays disabled until everything checks out.
2. **ApproveTransactionScreen** — shows a confirmation summary (amount, destination, network, fee). User confirms with **Face ID** (the one real security gate). On success it calls the transfer hook to **sign + broadcast**.
3. On a successful broadcast, in order: record a real `pending` transaction locally → refresh balances → fire the backend report (best-effort) → navigate to **PaymentSuccess** (now generalized to show asset symbol + amount + hash, no longer coupon-only).

**The plumbing underneath:**

- **Asset registry** (`assets.ts`) is the single source of truth for token metadata — one entry per (asset, network). Everything (balances, sends, addresses, the store's asset list) derives from it.
- **Transfer hooks** (`src/shared/lib/hooks/wallet/`) wrap the WDK core hooks:
  - `useAssetTransfer(assetId)` → binds a WDK account on the asset's network, exposes `estimateFee` and `send` in base units.
  - `useAssetBalances()` → real balances as a `Map<assetId, baseUnitString>`.
  - `useReceiveAddress(network)` → the derived receive address for a chain.
- **Backend integration** happens after the fact: `reportSend` posts the hash to `/transactions`; `useLinkWalletAddresses` posts derived addresses to `/wallets` once the wallet is READY and authenticated.

## Main Changes Made

**New files**

- `src/shared/config/assets.ts` — asset registry (`SUPPORTED_ASSETS`, `getAssetConfig`, `getAsset`, `getSrcChainId`, `getFeeToken`, `SUPPORTED_NETWORKS`).
- `src/shared/lib/units.ts` — pure BigInt `toBaseUnits` / `fromBaseUnits` (no floats, so 18-decimal tokens keep full precision). Unit-tested.
- `src/shared/lib/address.ts` — `isValidAddress(network, addr)` chain-aware format check. Unit-tested.
- `src/shared/lib/hooks/wallet/` — `useAssetTransfer`, `useAssetBalances`, `useReceiveAddress`, and `useEnsureWdkReady` (readiness guards).
- `src/shared/api/transactions.ts` + `wallets.ts` — the two new backend calls.
- `src/app/providers/useLinkWalletAddresses.ts` — address-linking + report-retry effect.

**Key edits**

- `wdk.ts` / `wdk.config.js` — added the **Bitcoin L1** network; hoisted USDt addresses and EVM chain ids to shared consts so the registry and WDK config can't drift.
- `WalletStore.ts` — replaced the mock `sendAsset` with `recordSentTransaction`, plus `reportSend` / `flushPendingReports` (retry queue) and an `addressesLinked` flag.
- Models — `Asset` gained machine fields (`network`, `decimals`, `isNative`, `contractAddress`, `balanceBaseUnits`); `Transaction` gained `hash`, `status`, `feeBaseUnits`, `network`, `timestamp`.
- Screens — SendScreen (editable amount, validation, live fee), ApproveTransactionScreen (real broadcast via `TypedRequest`), ReceiveScreen (real per-chain address + working chain selector), HomeScreen/AssetRow (real balances), PaymentSuccess (generalized).
- Navigation types — `ApproveTransaction` and `PaymentSuccess` params updated to carry base-unit strings and send-success data.

## Edge Cases & Rules

- **Best-effort backend, always.** Once funds move on-chain, nothing is allowed to undo or block the success UX. A failed `/transactions` report is **queued in-memory and retried** on the next wallet-ready pass (`flushPendingReports`). Address linking failures just log. Balance refresh failures are swallowed.
- **WDK readiness is gated two ways.** Writes (`send`) go through `useEnsureWdkReady`, which **alerts** the user and aborts if the wallet is initializing/busy/errored. Read-only paths (fee estimation) use the non-alerting `useIsWdkReady` flag instead — a failed estimate just shows a blank fee, never an alert.
- **No floats anywhere in money math.** Amounts, balances, quick-fill fractions, and validation all use BigInt on base-unit strings. Fractional input beyond a token's decimals is truncated.
- **Validation blocks bad sends before broadcast:** over-balance amounts and malformed addresses disable "Review send." Address checks are format-only (chain-aware regex) — deliberately _not_ a substitute for the network rejecting an unusable address. EVM checksum (EIP-55) is intentionally out of scope, so lowercase/mixed-case both pass.
- **Idempotency:** the report uses the **txHash as the Idempotency-Key**, so a retried report replays safely (200, no duplicate row).
- **Address linking is deduped** per session via the `addressesLinked` store flag, and only fires if an **EVM address is present** (backend requires it as the cashback recipient).
- **Unknown asset ids degrade gracefully** — Send shows a "can't be sent yet" fallback; Approve renders nothing rather than driving hooks with a bad id.

## Known Gaps / Things to Watch

_(Called out in the plan, still true in code.)_

- **UTL contract address is a placeholder** (`0x000…000`) — one clearly-marked `TODO` const in `assets.ts` is the single spot to swap in the real value.
- **Fiat pricing is out of scope** — no oracle configured, so `fiatValue`/`totalFiatBalance` stay at 0/placeholder.
- **ERC-4337 hash semantics** — an AA `send()` may return a _userOp_ hash while the backend Indexer observes the _settled_ tx hash; if they differ, EVM confirmation tracking may not match. Worth verifying what `send().hash` returns for the AA module.
- **Non-EVM sends** (BTC/Spark/Tron) report for history but aren't confirmed by the backend yet (`srcChainId` is EVM-only, sent as `undefined` for them).
- **The retry queue is in-memory only** — reports don't survive a full app reload yet.
- **Environments are mixed** — Ethereum is Sepolia (testnet) but Bitcoin/Tron/Arbitrum/Polygon are **mainnet**, so real funds can move there. Flagged in `wdk.ts`.

## Verification Note

This summary was written from the committed code on `feature/on-chain-transactions`. The plan lists `npm run typecheck`, `npm run lint`, and `npm run wdk:bundle` as verification steps — those were **not** run as part of writing this doc.

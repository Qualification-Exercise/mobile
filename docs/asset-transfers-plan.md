# Plan: Real asset transfers (BTC, USDt, utility token)

## Context

The wallet's send flow is currently a **UI-only mock**. `SendScreen` collects an
amount/destination, `ApproveTransactionScreen` runs a real biometric check, then
calls `WalletStore.sendAsset()` — which only prepends a fake `Transaction` row to
an in-memory array. No WDK call, no balance, no address derivation, no fee, no
broadcast. Assets, balances, and the single wallet address are hardcoded.

Meanwhile the real WDK integration (`@tetherto/wdk-react-native-core` via
`WdkAppProvider`) is only wired for wallet lifecycle (create/restore/unlock). The
core package already ships exactly the hooks a transfer needs — `useAccount`
(`.send`, `.estimateFee`, `.address`), `useBalancesForWallet`, `useAddresses` —
they are simply unused.

**Goal:** make transfers real for BTC (Bitcoin L1 + Spark), USDt (Arbitrum,
Ethereum/Sepolia, Polygon, Tron), and a utility token (Ethereum), plus the real
balances and per-chain receive addresses the send flow depends on.

**Backend model (per `wdkqualification-backend/docs/client-onchain-transactions.md`):**
the backend **never signs or moves funds** — there is no "send funds" endpoint. The
client signs & broadcasts on-device (which is exactly the WDK `useAccount.send` path
below), then **reports the broadcast hash to `POST /api/transactions`** for
confirmation tracking. This confirms the client-side approach is correct and adds a
post-send reporting step. Derived addresses are also registered via `POST /api/wallets`
(EVM address required — it is the cashback payout recipient).

### Decisions locked (from planning Q&A)

- **BTC:** add Bitcoin L1 (`@tetherto/wdk-wallet-btc`, new `bitcoin` network) **and** keep Spark.
- **Ethereum:** stay on **Sepolia testnet** (current `wdk.ts` config) — no real ETH funds. Transfer code is network-agnostic, so a later mainnet switch is config-only.
- **Utility token (UTL):** model with a **placeholder** contract address + assumed 18 decimals, wired end-to-end, real values dropped in later at one marked spot.
- **Scope:** **full** — real balances, real receive addresses, and real send + fee estimation.
- **Backend:** include **both** `POST /api/transactions` reporting and `POST /api/wallets` address linking.
- **Report failure:** **best-effort** — a failed report never blocks/undoes an on-chain send (the money already moved); log/queue for retry.
- **Tx type:** generic Send-screen transfers report as **`TRANSFER`** (`PAYMENT` reserved for the scan-to-pay/merchant flow).

---

## WDK API surface (verified, will be used as-is)

- `useAccount<T>({ accountIndex, network })` → `{ address, isLoading, error, send, estimateFee, getBalance, sign }`.
  - `send({ to, asset: IAsset, amount /* base-unit string */ })` → `{ success, hash, fee, error }`. Branches internally: `asset.isNative()` → `sendTransaction({to,value})`; else → `transfer({recipient, amount, token: contractAddress})`. (`useAccount.ts:155`)
  - `estimateFee(sameParams)` → `{ success, fee, error }` (native → `quoteSendTransaction`, token → `quoteTransfer`). (`useAccount.ts:272`)
- `useBalancesForWallet(accountIndex, IAsset[], opts?)` → `{ data: BalanceFetchResult[], isLoading, error }`; `balance` is a **base-unit string**. (`useBalance.ts:313`)
- `useAddresses()` → `{ loadAddresses(indices, networks?), getAddressesForNetwork(network), data }`. (`useAddresses.ts:53`)
- `BaseAsset` implements `IAsset` from `AssetConfig { id, network, symbol, name, decimals, isNative, address? }`. (`entities/asset.ts:69`)
- `network` strings must match `wdkConfigs.networks` keys (`spark | ethereum | arbitrum | polygon | tron`, plus new `bitcoin`).

---

## Implementation

### 1. Add the `bitcoin` (L1) network

- `package.json`: add `@tetherto/wdk-wallet-btc` (fetch latest with `npm view @tetherto/wdk-wallet-btc version` — do not hardcode).
- `wdk.config.js:31` networks map: add `bitcoin: { package: '@tetherto/wdk-wallet-btc' }`.
- `src/shared/config/wdk.ts`: add a `bitcoin` network entry: `{ blockchain: 'bitcoin', config: { host: 'electrum.blockstream.info', port: 50001, network: 'bitcoin' } }`.
- Rebundle the worklet: `npm run wdk:bundle` (regenerates `.wdk`; `NetworkName` union will gain `'bitcoin'`), then `bundle exec pod install` (native dep) before an iOS run.

### 2. Asset registry (single source of truth for token metadata)

New file `src/shared/config/assets.ts`: export `SUPPORTED_ASSETS: AssetConfig[]` and a
`getAssetConfig(id)` / `new BaseAsset(config)` helper. One entry per (asset, network):

| id              | network  | symbol | decimals | isNative | address                      |
| --------------- | -------- | ------ | -------- | -------- | ---------------------------- |
| `btc-bitcoin`   | bitcoin  | BTC    | 8        | true     | —                            |
| `btc-spark`     | spark    | BTC    | 8        | true     | —                            |
| `usdt-arbitrum` | arbitrum | USDt   | 6        | false    | `0xFd086bC7…FCbb9`           |
| `usdt-ethereum` | ethereum | USDt   | 6        | false    | `0xaA8E23Fb…433D0` (Sepolia) |
| `usdt-polygon`  | polygon  | USDt   | 6        | false    | `0xc2132D05…58e8F`           |
| `usdt-tron`     | tron     | USDt   | 6        | false    | `TR7NHqjeKQ…jLj6t`           |
| `utl-ethereum`  | ethereum | UTL    | 18       | false    | `// TODO: real UTL address`  |

- The three EVM USDt addresses are **the same values** already in `wdkConfigs...paymasterToken.address`. Hoist those to named consts in `wdk.ts` and import them into both places so they can never drift.
- Mark the UTL address with a single clearly-labeled `// TODO` const so it's the one spot to edit later.

### 3. Extend the domain models

- `src/shared/store/models/asset/Asset.ts`: extend `Asset` to carry machine fields used by transfers — `network: NetworkName`, `decimals: number`, `isNative: boolean`, `contractAddress?: string`. Keep display fields. Balance becomes a base-unit string (or add `balanceBaseUnits: string` and keep `balance` derived for display).
- `src/shared/store/models/transaction/Transaction.ts`: add optional `hash?: string`, `status?: 'pending' | 'confirmed' | 'failed'`, `feeBaseUnits?: string`, `network?: NetworkName`, real `timestamp?: number`. Keep existing display helpers working.
- `assetDisplay.ts` already keys icon/color by symbol (BTC/USDt/UTL) — no change needed.

### 4. Unit conversion helper (new)

`src/shared/lib/units.ts`: pure BigInt-based `toBaseUnits(human: string, decimals): string` and `fromBaseUnits(base: string, decimals): string`. **No floats** (avoid precision loss on 18-decimal tokens). Used by Send (amount → base units), fee display, and balance display.

### 5. Transfer hook layer (mirror the existing `useWallet` wrapper style)

New hooks under `src/shared/lib/hooks/wallet/`, each reusing the `ensureWdkReady()`
guard pattern from `useWallet.ts:191` (busy/error Alert + `WdkNotReadyError`):

- `useAssetTransfer(assetId)` — resolves the asset's `AssetConfig`, calls `useAccount({ accountIndex: 0, network })`, exposes `{ address, estimateFee(to, amountBaseUnits), send(to, amountBaseUnits) }` (builds `TransactionParams` with a `BaseAsset`). Gate `send`/`estimateFee` through `ensureWdkReady`.
- `useAssetBalances()` — wraps `useBalancesForWallet(0, SUPPORTED_ASSETS.map(c => new BaseAsset(c)))`; returns a `Map<assetId, baseUnitsString>` + `isLoading/error`. Source of truth for balances (replaces WalletStore's hardcoded numbers).
- `useReceiveAddress(network)` — wraps `useAddresses()`; calls `loadAddresses([0], [network])` on mount and returns `getAddressesForNetwork(network)[0]?.address`.
- Export all via the existing `src/shared/lib/hooks/wallet/index.ts` barrel.

### 6. Send screen — real input, validation, fee

`src/screens/send/SendScreen.tsx` + `AmountEntry.tsx`:

- Make the amount **editable** (currently only 25/50/Max pills, no keypad). Add a numeric `TextInput`; keep quick-fill pills computing fractions of the **real** balance from `useAssetBalances()`.
- Validate: amount > 0, amount ≤ balance (real **insufficient-funds** check), destination non-empty and **format-valid per chain** (bech32 `bc1`/spark, `0x…` EVM checksum, base58 `T…` Tron — a small `isValidAddress(network, addr)` helper). Disable "Review send" until valid.
- Show a **live fee estimate** via `useAssetTransfer(assetId).estimateFee(...)` (debounced) instead of the hardcoded `≈ $0.02`. Display fee in the fee-token's units via `fromBaseUnits`.
- Navigate to Approve passing `{ assetId, amountBaseUnits: string, destination }`.

### 7. Approve screen — real broadcast

`src/screens/approve-transaction/ApproveTransactionScreen.tsx`:

- Update route params to `{ assetId, amountBaseUnits, destination }` (`src/app/navigation/types.ts:14`); derive asset/network from the registry (drop the display `network` string; `amount` becomes base-unit `string`, not `number`).
- Keep the biometric gate (`biometryStore.verify` — the one real security step). On `'unlocked'`, call `useAssetTransfer(assetId).send(destination, amountBaseUnits)`.
- Wrap the send in a `TypedRequest` (`src/shared/store/typedRequest.ts`, currently unused scaffolding) for loading/error; apply the already-defined-but-unused `styles.confirmButtonBusy` during the in-flight state.
- On `success`: record a real `Transaction` (hash, status `pending`, fee, timestamp) via a rewritten `WalletStore` action, **report the broadcast to the backend best-effort** (step 10), refresh balances (`useRefreshBalance`), and navigate to `PaymentSuccess`. On send failure: surface `result.error` inline (no navigation).

### 8. Rewrite `WalletStore.sendAsset` and wire real data

`src/shared/store/domains/WalletStore.ts`:

- Replace the mock `sendAsset` (line 147) with a `recordSentTransaction(tx)` action that stores a **real** `Transaction` (the actual broadcast happens in the hook, not the store — the store just records history).
- Assets list: keep static **metadata** from the registry; balances now come from `useAssetBalances()` read in components, not hardcoded fields. `totalFiatBalance` has no price oracle configured → **fiat pricing stays out of scope** (leave existing mock fiat or show "—"); note this explicitly.

### 9. Home & Receive — real balances & addresses

- `src/screens/home/HomeScreen.tsx` / `AssetRow.tsx`: read balances from `useAssetBalances()` (format with `fromBaseUnits`), list assets from the registry.
- `src/screens/receive/ReceiveScreen.tsx`: replace the single hardcoded `walletStore.wallet.address` with `useReceiveAddress(network)` for the selected asset's chain, and make the (currently dead) chain selector switch the asset/network. Copy button copies the real per-chain address.

### 10. Backend integration (`POST /api/transactions` + `POST /api/wallets`)

Extend the existing API layer (`src/shared/api/`) — reuse `httpClient` (already does
Bearer-token injection + 401 refresh) and the `toApiError` pattern. Add exports to
`src/shared/api/index.ts` and DTO types to `src/shared/api/types.ts`.

- **`src/shared/api/transactions.ts`** — `transactionsApi.report(body, idempotencyKey)`:
  `httpClient.post('/transactions', body, { headers: { 'Idempotency-Key': idempotencyKey } })`.
  - `CreateTransactionDTO` body: `{ chain, srcChainId, txHash, type: 'TRANSFER', direction: 'out', token, amount /* base-unit integer string, ^\d{1,78}$ */, from, to, fee?, broadcastAt? }`.
  - Field mapping from the send: `chain` = registry `network`; `srcChainId` = EVM chain id from `wdkConfigs` (arbitrum 42161 / ethereum 11155111 / polygon 137); `token` = `contractAddress` (token) or symbol/identifier (native); `from` = sender address (`useReceiveAddress(network)`); `to` = destination; `amount`/`fee` = base-unit strings from `send()`; `txHash` = `send().hash`.
  - **Idempotency-Key** = the `txHash` (unique per broadcast; makes retries safe idempotent replays → 200).
  - **Best-effort**: wrap the call so a failure logs + queues but never throws into the success UX. A tiny persisted retry queue (or a `useRefreshBalance`-style deferred retry) re-sends unreported hashes on next app foreground.
- **`src/shared/api/wallets.ts`** — `walletsApi.link({ wallets })` → `POST /api/wallets`; `walletsApi.list()` → `GET /api/wallets`.
  - Called once after the wallet is `READY` (e.g. from a small effect in the app-state sync layer or on first Home mount): gather derived addresses via `useAddresses().loadAddresses([0], allNetworks)` and register `{ chain, srcChainId, address, path? }` per chain. **EVM address is required.** Dedupe so it isn't re-posted every launch (track "linked" in a store flag).

Rate limit: `POST /api/transactions` is 30/hour — fine for interactive sends.

---

## Key files

- New: `src/shared/config/assets.ts`, `src/shared/lib/units.ts`, transfer/balance/address hooks in `src/shared/lib/hooks/wallet/`.
- New API: `src/shared/api/transactions.ts`, `src/shared/api/wallets.ts`; edits to `src/shared/api/{types.ts,index.ts}`.
- Config: `package.json`, `wdk.config.js`, `src/shared/config/wdk.ts`, regenerated `.wdk`.
- Models: `src/shared/store/models/asset/Asset.ts`, `.../transaction/Transaction.ts`.
- Store: `src/shared/store/domains/WalletStore.ts`.
- Screens: `send/SendScreen.tsx`, `send/AmountEntry.tsx`, `approve-transaction/ApproveTransactionScreen.tsx`, `receive/ReceiveScreen.tsx`, `home/HomeScreen.tsx`.
- Nav: `src/app/navigation/types.ts` (`Send`, `ApproveTransaction` params).

## Conventions to follow

- `//` comments only (no block/JSDoc); `observer(function Name(){})` named components; import via `@shared`/`@screens` barrels; layer rule `app → screens → shared`.
- Every WDK write is preceded by `estimateFee` and gated by biometrics + `ensureWdkReady`; never send the full balance without the explicit user-entered amount.

## Verification

1. `npm run typecheck` and `npm run lint` clean.
2. `npm run wdk:bundle` regenerates `.wdk` with `bitcoin` in `NetworkName`; `bundle exec pod install`; `npm run ios` (or android) builds.
3. In-app, with a restored test wallet:
   - **Receive**: switch chains → each shows a distinct, correctly-formatted address (bech32 for BTC/Spark, `0x…` for EVM, `T…` for Tron) from `useAddresses`.
   - **Home**: balances populate from WDK (base-unit → display), not the old literals.
   - **Send (Sepolia USDt, safest path)**: enter amount + valid `0x…` recipient → live fee shows → Review → biometric → broadcast; verify a real tx `hash` returns, success screen shows, and history records a `pending` tx. Confirm on a Sepolia explorer.
   - **Backend report**: after that send, `POST /api/transactions` fires with the `Idempotency-Key` = txHash and a `TRANSFER`/`out` body; confirm via `GET /api/transactions` (or backend `/docs`) that the row exists with `status: PENDING`. Re-triggering with the same hash returns 200 (idempotent).
   - **Report failure is non-blocking**: with the backend unreachable, the send still shows success + local history; the report is queued and retried.
   - **Address linking**: on first `READY`, `POST /api/wallets` registers the per-chain addresses (EVM present); `GET /api/wallets` lists them; a second launch does not re-post.
   - **Validation**: over-balance amount and malformed address both block "Review send".
   - **Spark/BTC native** and **Tron USDt** smoke-tested for send + fee (small amounts; Tron needs TRX for gas).
4. Adversarial: attempt send while WDK is `LOCKED`/`INITIALIZING` → `ensureWdkReady` alerts and aborts, no partial send.

## Risks / notes

- **ERC-4337 coverage:** WDK docs list AA as fully supported on **Arbitrum**; Sepolia/Polygon via the configured Candide bundler/paymaster may need validation — Arbitrum is the reference-good EVM path. Fees on EVM are paid in the **paymaster token (USDt)**, so a USDt send needs enough USDt to also cover fee.
- **ERC-4337 hash semantics vs backend tracking:** the erc-4337 `send()` may return a **userOp hash**, while the backend Indexer observes the **settled on-chain tx hash**. If these differ, the reported `txHash` won't match what the Indexer sees — confirm what `send().hash` returns for the erc-4337 module and, if it's a userOp hash, resolve the settled tx hash before reporting (or report both). The backend doc notes the app's reference wallet is `@tetherto/wdk-wallet-evm` (non-AA), so this is specific to our erc-4337 choice.
- **Non-EVM backend verification:** the backend can **ingest** BTC/Tron/Spark transactions but does **not** verify/confirm them yet (`UnsupportedProofError`); `srcChainId` is EVM-centric. Reporting non-EVM sends still works for history, but confirmation/rewards are EVM-only. Confirm the expected `srcChainId`/`token` values for non-EVM rows with the backend.
- **Auth prerequisite:** reporting + linking require a valid backend session (Google OIDC → JWT). The send flow must degrade gracefully (best-effort) when unauthenticated.
- **PaymentSuccess coupling:** `PaymentSuccessScreen` currently reads `walletStore.coupons[0]` and hardcodes "USDt"/cashback — it assumes a coupon-cashback flow. It must be generalized to a plain send-success (asset symbol + amount + optional hash) or the send flow routed to a simpler success state.
- **Fiat pricing** (fiatValue / totalFiatBalance) has no oracle configured — explicitly out of scope; leave as mock or hide.
- Bitcoin L1 send is UTXO/Electrum-based and slower to confirm than Spark; Spark-to-Spark is near-instant/zero-fee.

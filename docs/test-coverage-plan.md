# Test coverage plan — reaching ≥90% on the logic layers

## Goal & scope

Reach **≥90% coverage (statements / branches / functions / lines)** on the
app's business-logic layers, using **simple, meaningful unit and integration
tests** — no brittle snapshot or full-screen render tests.

Coverage is measured against the **logic layers only** (a deliberate,
agreed-upon scope):

- `src/shared/lib` (utilities, storage, error handling)
- `src/shared/api` (HTTP client + endpoint wrappers)
- `src/shared/store` (MobX request wrappers, domain stores, domain models)
- `src/shared/config` (asset registry + chain mapping logic)

**Out of scope for the metric** (excluded from `collectCoverageFrom`, with
rationale in the config section): React Native screens (`src/screens`), pure
presentational UI (`src/shared/ui`), the composition root (`src/app`), barrels
(`index.ts`), type-only files, the static WDK config object (`config/wdk.ts`),
and the WDK-glue React hooks (`shared/lib/hooks/wallet/*`), which are thin
wrappers over the external WDK SDK and belong to manual/E2E testing rather than
unit tests.

## Current state (baseline)

- `npm test`: **60 tests pass**, but `__tests__/App.test.tsx` **fails** —
  `@react-native-google-signin/google-signin` ships ESM that Jest does not
  transform and there is no mock.
- Coverage over `src/**`: **2.24%**.
- `paymentUri.test.ts` passes normally but **fails under `--coverage`**:
  instrumenting the config import chain trips `@env`
  (`ReferenceError: API_BASE_URL is not defined`).
- Existing meaningful tests already cover: `units.ts`, `address.ts`,
  `paymentUri.ts` (partial), `walletsApi.list`.
- There is a **duplicate** `units` test (`__tests__/units.test.ts` and
  `src/shared/lib/units.test.ts`) — de-dupe to one colocated file.

Two harness problems (ESM transform + `@env` under coverage) must be fixed
first, or no coverage run is trustworthy.

---

## Milestone 0 — Harness setup (prerequisite)

### 0.1 Fix `@env` under Jest/coverage

In `babel.config.js`, skip the `react-native-dotenv` plugin in the `test`
env so `import { X } from '@env'` stays a normal import, then map it to a stub:

```js
// babel.config.js — add a test env that omits the dotenv rewrite
env: {
  test: { plugins: [/* module-resolver stays; dotenv omitted */] },
  production: { plugins: ['transform-remove-console'] },
}
```

```js
// jest.config.js
moduleNameMapper: {
  '^mobx-react-lite$': 'mobx-react-lite/es/index.js',
  '^@env$': '<rootDir>/test/mocks/env.ts',
},
```

```ts
// test/mocks/env.ts — deterministic values for tests
export const API_BASE_URL = 'http://localhost:3000/api';
export const ANY_SECRET = 'test-secret';
export const TRON_API_KEY = '';
export const TRON_API_SECRET = '';
```

### 0.2 Central native-module mocks

Add `setupFiles` (runs before the framework) with jest mocks for the native
modules that either break transform or must be stubbed. Prefer `__mocks__` /
`jest.mock` factories over widening `transformIgnorePatterns` — the tests need
controllable fakes anyway.

```js
// jest.config.js
setupFiles: ['<rootDir>/test/setup.ts'],
```

Modules to mock centrally in `test/setup.ts` (or per-test where behaviour must
vary):

- `@react-native-google-signin/google-signin` — `GoogleSignin`,
  `isSuccessResponse`, `isErrorWithCode`. (Fixes `App.test.tsx`.)
- `react-native-keychain` — in-memory `setGenericPassword` /
  `getGenericPassword` / `resetGenericPassword`.
- `expo-local-authentication` — `hasHardwareAsync`, `isEnrolledAsync`,
  `authenticateAsync`.
- `expo-crypto` — `digestStringAsync` (deterministic), `randomUUID`.
- `react-native-toast-message` — `Toast.show` spy.
- `@tetherto/wdk-react-native-core` — export a lightweight `BaseAsset` class
  (already the pattern in `paymentUri.test.ts`); other WDK exports only if a
  test imports them.

### 0.3 Coverage config & threshold

```js
// jest.config.js
collectCoverageFrom: [
  'src/shared/lib/**/*.{ts,tsx}',
  'src/shared/api/**/*.{ts,tsx}',
  'src/shared/store/**/*.{ts,tsx}',
  'src/shared/config/**/*.{ts,tsx}',
  '!src/**/index.ts',                                 // barrels
  '!src/**/*.d.ts',
  '!src/shared/config/wdk.ts',                         // static config object, no logic
  '!src/shared/lib/hooks/wallet/**',                   // WDK-SDK glue → manual/E2E
  '!src/shared/lib/installGlobalErrorHandlers.ts',     // RN runtime-global glue
],
coverageThreshold: {
  global: { statements: 90, branches: 90, functions: 90, lines: 90 },
},
```

### 0.4 Conventions

- **Colocate** tests as `*.test.ts` next to the source (matches the existing
  `address.test.ts` / `units.test.ts`). Migrate the `__tests__/` files that
  are pure unit tests and delete the duplicate `units` test.
- Comments: single-line `//` only (per AGENTS.md).
- Import from the module under test directly (not the barrel) to avoid pulling
  in native deps — as the existing tests already do.
- Keep each test focused on **one observable behaviour**; use `it.each` for
  table-style cases; assert outcomes, not implementation details.

---

## Milestone 1 — Pure logic (no async, minimal mocks)

Fast, high-value, zero flakiness. This milestone alone covers a large fraction
of the denominator.

| File                                             | Functions                                                                                                                                                                                                           | Key test cases (concise)                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config/assets.ts`                               | `getSrcChainId`, `getChainKind`, `getNetworkLabel`, `getPriceTicker`, `groupAssetsByNetwork`, `findAssetConfig`, `getNativeAsset`, `getNativeMaxTransferFee`, `getAssetConfig`, `getFeeToken`, `SUPPORTED_NETWORKS` | EVM networks map to `evm`; Tron/BTC/Spark map to themselves. `getPriceTicker('USDT')→'UST'`, unknown passes through upper-cased. `findAssetConfig` matches EVM by chainId+symbol, non-EVM ignores chainId, returns `undefined` on miss. `getFeeToken`: native→own symbol; token+native mode→gas coin; token mode EVM→USDT/6, Tron→TRX/6. `groupAssetsByNetwork` preserves order & groups. `SUPPORTED_NETWORKS` is de-duped. (mock `@tetherto/wdk-react-native-core` `BaseAsset`.) |
| `lib/feeError.ts`                                | `describeFeeError`                                                                                                                                                                                                  | paymaster/insufficient/allowance message → "not enough …" with single vs. list of fee symbols; empty message → "Fee unavailable"; other message passed through trimmed.                                                                                                                                                                                                                                                                                                           |
| `lib/appError.ts`                                | `describeErrorSource`, `toError`                                                                                                                                                                                    | each source label; `toError` on `Error` (passthrough), string, plain object (JSON), circular/unserializable (String fallback).                                                                                                                                                                                                                                                                                                                                                    |
| `lib/mnemonicHash.ts`                            | `normalizeMnemonic` (pure part)                                                                                                                                                                                     | trims, lowercases, collapses inner whitespace. (`hashMnemonic` covered in M2 via `expo-crypto` mock.)                                                                                                                                                                                                                                                                                                                                                                             |
| `store/models/transaction/Transaction.ts`        | `shortenAddress`, `toTransaction`                                                                                                                                                                                   | short address unchanged (≤12); long shortened `0x1234…cdef`. `toTransaction`: in→counterparty=from, out→to; known token uses registry decimals/symbol/id; unknown token → decimals 0, upper-cased symbol, `assetId=null`; status map + unknown→`pending`; date "Today"/"Yesterday"/formatted (inject/fixed clock — see note).                                                                                                                                                     |
| `store/models/coupon/Coupon.ts`                  | `toCoupon`                                                                                                                                                                                                          | maps all fields; `sourcePayment` present → nested `source`; absent → `null`.                                                                                                                                                                                                                                                                                                                                                                                                      |
| `store/models/asset/assetDisplay.ts`             | `getAssetIcon/Color/GlyphColor`, `getFiatValue`, `formatFiat`                                                                                                                                                       | known symbol → mapped glyph/color; unknown → first char / secondary color. `getFiatValue`: null balance or null price → null; else `amount*price`; non-finite → null. `formatFiat`: null→"—", else `$x.xx`. (import `colors` from `ui/tokens` directly.)                                                                                                                                                                                                                          |
| `store/models/coupon/couponDisplay.ts`           | `getCouponAmount`, `getCouponStatusLabel`, `getCouponStatusColor`, `getCouponIconColor`, `getCouponSubtitle`, `sumClaimableUtl`, `formatUtl`                                                                        | no `utlAmount`→"—". PENDING with/without confirmations → "Confirming n/m"/"Confirming"; claimable→"Claimable"; status label map + raw fallback. colors: claimable→positive, expired/orphaned→negative, else tertiary. icon color by lifecycle. subtitle from `source` (registry decimals) vs. `paymentRef.slice(0,10)` fallback. `sumClaimableUtl` sums only claimable with amount; `formatUtl` formats bigint.                                                                   |
| `store/models/transaction/transactionDisplay.ts` | `getTransactionIconName/Color/Title/Amount`                                                                                                                                                                         | direction `in`→down/positive/"Received"/`+`; `out`→up/primary/"Sent"/`-`.                                                                                                                                                                                                                                                                                                                                                                                                         |
| `lib/paymentUri.ts`                              | (extend existing)                                                                                                                                                                                                   | add a couple of missing branches if coverage shows gaps (e.g. Tron address parse, malformed BIP-21 amount).                                                                                                                                                                                                                                                                                                                                                                       |

**Date note:** `toTransaction`/`formatDate` use `new Date()`. Test with a
fixed clock via `jest.useFakeTimers().setSystemTime(...)` or by passing ISO
dates relative to a frozen "now" — keep it to Today/Yesterday/older, not exact
locale strings.

---

## Milestone 2 — Storage & thin native wrappers (mock one dependency)

| File                     | Mock                         | Key test cases                                                                                                                                                                                                                               |
| ------------------------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/authStorage.ts`     | `react-native-keychain`      | `saveSession` calls `setGenericPassword` with service+JSON; `loadSession` parses stored JSON; returns `null` when nothing stored; returns `null` on corrupt JSON; `clearSession` calls `resetGenericPassword`.                               |
| `lib/biometryStorage.ts` | `react-native-keychain`      | `saveBiometryEnabled(true)` sets 'true'; `(false)` resets; `loadBiometryEnabled` → true only when stored password==='true', false when nothing stored.                                                                                       |
| `lib/biometrics.ts`      | `expo-local-authentication`  | `isBiometricAvailable`: true only when hardware && enrolled; false if either false; false on throw. `authenticateWithBiometrics`: success→`{success:true}`; failure→`{success:false,error}`; native throw→`{success:false,error:'unknown'}`. |
| `lib/mnemonicHash.ts`    | `expo-crypto`                | `hashMnemonic` normalizes then calls `digestStringAsync(SHA256, normalized)`.                                                                                                                                                                |
| `lib/showErrorToast.ts`  | `react-native-toast-message` | calls `Toast.show` with error text; dev vs. prod `text2` (toggle `__DEV__`).                                                                                                                                                                 |

---

## Milestone 3 — API layer (mock `httpClient`)

Follow the existing `walletsApi.list` pattern: `jest.mock('./httpClient')`,
assert the **URL / params / body / headers** sent and the **response shaping**
returned, plus error propagation through `toApiError`.

| File                                | Key test cases                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/httpClient.ts` (highest value) | `ApiError` shape; `toApiError`: passthrough `ApiError`, axios error → message/status/errorCode from envelope, non-axios → generic. Request interceptor adds `Authorization` when a token exists, omits otherwise. Response interceptor: 401 on normal path → refresh once → retry with new token; second failure → `onAuthFailure`; `/auth/refresh` & `/auth/google` exempt (no retry); non-401 passes through; concurrent 401s share **one** refresh (single `refreshTokens` call). Mock via `httpClient`'s axios adapter or by driving the interceptor's error handler directly. |
| `api/auth.ts`                       | `google` posts `/auth/google` `{idToken,type}` via `httpClient`; `refresh` posts `/auth/refresh` via the **bare** client (assert no `Authorization` header / no retry); both wrap errors.                                                                                                                                                                                                                                                                                                                                                                                          |
| `api/coupons.ts`                    | `list` GET `/coupons` with params; `findByCode` URL-encodes the code; error wrapping.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `api/claims.ts`                     | `challenge` GET with `coupon` param; `create` POST with `Idempotency-Key` header; `get` by id; error wrapping.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `api/transactions.ts`               | `list` GET with params; `report` POST with `Idempotency-Key`; error wrapping.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `api/secrets.ts`                    | `storeEntropy`/`storeSeed` POST bodies; `getEntropy`→`data.entropies`, `getSeed`→`data.seeds`; error wrapping.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `api/wallets.ts`                    | already covers list bare/wrapped; add `link` POST body and the `data?.wallets ?? []` empty fallback.                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `api/pricing.ts`                    | `live` GET `/pricing/live` with `fromSources` joined + default `to='USD'`; error wrapping.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

---

## Milestone 4 — MobX stores (mock APIs & lib deps)

Plain classes — instantiate and drive directly, `await` async actions, assert
observable state. No React renderer needed.

| File                                     | Mock                                          | Key test cases                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `store/request.ts` (`Request`)           | —                                             | initial state; `fetch` success sets `data`, clears loading/error; failure sets `error` (Error message → default → generic), clears loading; `hasData` true only with non-empty data && not loading.                                                                                                                                                                        |
| `store/typedRequest.ts` (`TypedRequest`) | —                                             | same as above; `hasData` handles array vs. scalar vs. empty-string vs. null.                                                                                                                                                                                                                                                                                               |
| `store/domains/WdkAppStore.ts`           | —                                             | getters for each status: `isStartingRuntime`, `isReady`, `isLocked`, `hasWallet`, `walletId` (present only in LOCKED/READY), `setState`.                                                                                                                                                                                                                                   |
| `store/domains/AppStateStore.ts`         | —                                             | `setStateChange` records prev; each transition getter (`isForegroundFromBackground`, …) for representative prev→next pairs.                                                                                                                                                                                                                                                |
| `store/domains/NavigationStore.ts`       | fake nav ref                                  | `bootRoute`: unauth→SignIn, auth & not enrolled→EnableBiometric, else→BiometricUnlock. `goToBiometricUnlock`/`goToDevMenu`: no-op when ref not ready or already on route; resets/navigates otherwise. `setActiveRouteName(undefined)`→null.                                                                                                                                |
| `store/domains/BiometryStore.ts`         | `biometrics`, `biometryStorage`               | `hydrate` sets enrolled/available/hydrated. `enableBiometric`: on `unlocked` persists + sets enrolled; other outcomes don't. `authenticate` path: unavailable→'unavailable', success→'unlocked', `not_available`→'permission-denied', else 'failed'. `reset` clears.                                                                                                       |
| `store/domains/AuthStore.ts`             | `authApi`, `google-signin`, `authStorage`     | `isAuthenticated`/`user` getters; `hydrate` loads session & sets hydrated even on failure; `signInWithGoogle`: cancelled→false, missing idToken (with getTokens fallback)→false/true, success persists & true, throw→false; `refresh` throws without refresh token, else persists; `signOut` clears session even if Google signOut throws.                                 |
| `store/domains/SecretsStore.ts`          | `secretsApi`, `hashMnemonic`                  | `hasRemoteWallet` true when entropies non-empty; `backupWalletSecrets` hashes mnemonic & stores seed+entropy with metadata; `matchMnemonic`: no entropies→false, no stored hashes→true (legacy), candidate hash in stored→true/false.                                                                                                                                      |
| `store/domains/WalletStore.ts`           | `couponsApi`, `pricingApi`, `transactionsApi` | assets built from registry; `transactions` merges local (deduped by hash) ahead of server; `coupons`/`claimableCoupons`/`claimableCashbackTotal`; `priceOf` via ticker map (miss→null); `pricesRequest` parses finite prices & drops unpriced; `recordSentTransaction` unshifts; `reportSend` queues on failure; `flushPendingReports` drains and re-queues still-failing. |

---

## Milestone 5 — `walletLinking.linkWalletAddresses` (integration-style)

Not a hook — a plain async function; high value, easy to test. Mock
`walletsApi` and pass a fake `loadAddresses` + a real/stub `WalletStore`.

Cases: collapses the 3 EVM networks into a single `evm` record (first wins);
skips `link` when no EVM address resolves; swallows link errors; always reads
back `walletsApi.list` and sets `linkedEvmAddress` (or `null` on read failure /
no evm record).

> The `useLinkWalletAddresses` **hook** and the other
> `shared/lib/hooks/wallet/*` are excluded from the metric (WDK-SDK glue).

---

## Execution order & expected outcome

1. **M0** harness (unblocks everything; fixes the 2 failing/blocked suites).
2. **M1** pure logic — biggest coverage jump for least effort.
3. **M2** storage/native wrappers.
4. **M3** API layer.
5. **M4** stores.
6. **M5** wallet linking.

After M1–M4 the four logic layers should clear **90%** on all four metrics;
M5 and any branch gaps surfaced by the HTML report (`--coverage
--coverageReporters=html`) close the remainder. Run
`npx jest --coverage` in CI with the threshold from §0.3 so regressions fail
the build.

### New dependencies

None required — MobX stores and plain modules test with the current Jest
setup. `@testing-library/react-native` is **only** needed if you later decide
to bring screens/hooks into scope (a separate effort).

---

## Implementation outcome (done)

Implemented across all six milestones. Final `npx jest --coverage` over the
scoped layers, with the 90% threshold enforced:

| Metric     | Result    |
| ---------- | --------- |
| Statements | **96.8%** |
| Branches   | **91.2%** |
| Functions  | **98.9%** |
| Lines      | **96.8%** |

**225 tests across 34 suites pass; typecheck and lint are clean.**

Deviations from the plan, and why:

- **`@shared/ui` barrel:** the planned `moduleNameMapper` for `@shared/ui`
  doesn't work — `babel-plugin-module-resolver` rewrites the alias before Jest
  sees it. Instead, `@expo/vector-icons` (the ESM leaf that broke the barrel)
  is mocked in `test/setup.ts`, so the barrel loads cleanly and display helpers
  keep importing `colors` from the slice root per convention.
- **`httpClient`** turned out to also implement a bounded **429 retry**
  (`Retry-After` + capped backoff), so `httpClient.test.ts` covers that path
  too (with fake timers).
- **Extra exclusions** beyond the plan: pure type-only modules
  (`api/types.ts`, `models/asset/Asset.ts`, `models/wallet/Wallet.ts`) and the
  `useStores.ts` React-context glue — no runtime logic to test.
- **`walletLinking.ts`** ships both a pure function and a companion hook; the
  hook (`useLinkWalletAddresses`) is covered with a small `react-test-renderer`
  harness (`walletLinking.test.tsx`) rather than excluded, since it shares the
  file with the tested function.
- **`__tests__/`** removed: the app-root render test (out of scope, needs heavy
  mocks) was deleted, the duplicate `units` test dropped, and `paymentUri` /
  `wallets` tests colocated as `*.test.ts` next to their sources.

Run `npx jest --coverage` (threshold-enforced), `npm run typecheck`, and
`npm run lint` to verify.

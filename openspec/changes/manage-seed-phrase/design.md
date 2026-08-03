## Context

WDK runtime boot is wired (`WdkAppProvider`, multi-chain `wdkConfigs`, worklet bundle). Onboarding and restore UI exist but seed phrases are hard-coded in `WalletStore` and validated with cosmetic helpers (`isPlausiblePhrase`). `@tetherto/wdk-react-native-core` already exposes the full lifecycle via `useWalletManager`: `generateMnemonic`, `createWallet`, `restoreWallet`, `getMnemonic`, `unlock`, `lock`, `deleteWallet`, plus secure storage through `@tetherto/wdk-react-native-secure-storage` (transitive dependency).

See `proposal.md` for motivation. Requirements live in `specs/wallet-seed-phrase/spec.md` and delta specs for `wdk-runtime`, `wallet-onboarding`, and `wallet-restore`.

## Goals / Non-Goals

**Goals:**

- Wire real seed phrase generation, persistence, restore, reveal, lock/unlock through WDK wallet manager APIs.
- Keep a thin FSD feature layer (`wallet-seed-phrase`) that screens call instead of importing WDK hooks directly everywhere.
- Use single-wallet mode with `DEFAULT_WALLET_IDENTIFIER` (`default`).
- Replace cosmetic restore validation with WDK/worklet validation.
- Preserve mock `WalletStore` for balances, transactions, and display addresses.

**Non-Goals:**

- Migrating balances, sends, or multi-chain addresses to WDK (`useBalance`, `useAddresses`).
- Multi-wallet UI, 24-word mnemonics, or passphrase (25th word) support.
- iCloud/backend backup — status cards on reveal screen remain cosmetic copy.
- SSO identity binding to wallet identifier.
- Rewriting navigation structure beyond gating/error handling needed for async wallet ops.

## Decisions

### 1. Feature slice: `src/features/wallet-seed-phrase`

Add a feature module exposing:

- `WalletSeedPhraseStore` (MobX) wrapping async WDK operations via a React bridge hook, **or**
- Thin hooks + small store that screens consume.

Because WDK hooks require React context, use a **bridge component** pattern:

```
WdkSeedPhraseBridge (null render, inside WdkAppProvider)
  → registers wallet manager callbacks on a singleton/store at mount
```

Screens and MobX actions call the store; the bridge binds `useWalletManager()` once. Alternative — call hooks directly in screen components — rejected to keep FSD features testable and avoid scattering WDK imports.

**Rationale:** Matches existing MobX + `Request<R>` pattern in `src/shared/store/request.ts`.

### 2. New-wallet flow: generate → preview → persist on confirm

Sequence for onboarding after biometric gate:

1. Navigate to recovery-phrase screen.
2. Call `generateMnemonic(12)` (worklet) — show loading spinner while pending.
3. Split mnemonic into words for `SeedWordGrid` display (local/React state or `WalletStore` UI mirror only).
4. On "I've saved it — Continue": call `createWallet('default')` which generates entropy, encrypts, and writes secure storage (WDK internal flow). If generation already created a **temporary** preview wallet, use `clearTemporaryWallet` then `createWallet`, **or** use `createTemporaryWallet` for preview and convert — **prefer simpler path:**

   **Chosen path:** `generateMnemonic` for display only (no persist), then `createWallet('default')` on confirm. Words shown pre-confirm are from `generateMnemonic`; post-confirm wallet is independently created by WDK (new entropy).

   **Problem:** Words shown ≠ words stored if we generate twice.

   **Revised path (correct):**

   1. `generateEntropyAndEncrypt(12)` + `getMnemonicFromEntropy` → display words.
   2. Hold `{ encryptionKey, encryptedSeedBuffer, encryptedEntropyBuffer }` in ephemeral session state (memory only, never logged).
   3. On confirm: write buffers to secure storage via service-level APIs OR call `createWallet` only if we can pass existing entropy.

   Inspect `createWallet` — it always calls `generateEntropyAndEncrypt` internally. So for matching preview/ persist:

   **Use `createTemporaryWallet('preview', mnemonic?)` for preview** with a temp id, show mnemonic from optional param or generated. On confirm: `clearTemporaryWallet()`, then `restoreWallet(mnemonic, 'default')` OR persist temp via dedicated flow.

   **Simplest reliable approach:**

   - Preview: `generateMnemonic(12)` → store mnemonic string in feature store (memory).
   - Confirm: `restoreWallet(storedMnemonic, 'default')` if treating import-as-create, **but** restore rejects if wallet exists.
   - Better: Confirm calls `getSeedAndEntropyFromMnemonic(mnemonic)` + secure storage writes mirroring `WalletSetupService.initializeFromMnemonic` — too low-level.

   **Recommended (matches WDK API):**

   - Preview: `generateMnemonic(12)` → keep in session state.
   - Confirm: `restoreWallet(mnemonic, 'default')` — works for fresh install (no existing wallet). This persists the **same** mnemonic shown.

   Document in tasks: onboarding confirm uses `restoreWallet` with preview mnemonic on fresh device, not `createWallet`, to guarantee phrase consistency. `createWallet` reserved for programmatic create without user preview.

### 3. Restore flow: `restoreWallet(mnemonic, 'default')`

Replace `walletStore.restoreWallet(words)` with WDK restore:

1. Join 12 cells → normalized mnemonic string.
2. Validate with WDK (`validateMnemonic` from core utils for shape; full checksum via `getSeedAndEntropyFromMnemonic` attempt or worklet validation on submit).
3. `await restoreWallet(mnemonic, 'default')` — handles encrypt, store, unlock.
4. On success: optional `walletStore` UI sync (derived mock address), `navigation.reset` to Home.
5. On error: show message, stay on screen.

Remove `isPlausiblePhrase`; use async validation hook debounced on complete 12 words.

### 4. Validation strategy

| Stage    | Check                                                                                       |
| -------- | ------------------------------------------------------------------------------------------- |
| Typing   | Word count `n/12`, disable submit until 12 filled                                           |
| Complete | `validateMnemonic` (12/24 words, non-empty) from `@tetherto/wdk-react-native-core`          |
| Submit   | `getSeedAndEntropyFromMnemonic` or `restoreWallet` catch — worklet rejects invalid checksum |

Debounced async validation in restore feature when `filledCount === 12`.

### 5. Lifecycle gating in `WdkProvider`

Extend `WdkGate` to read `useWdkApp().state.status`:

| Status                            | Behavior                                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `INITIALIZING` / `REINITIALIZING` | Existing loading UI                                                                                                 |
| `ERROR`                           | Existing error UI                                                                                                   |
| `NO_WALLET`                       | Render children (onboarding)                                                                                        |
| `LOCKED`                          | Render children OR dedicated unlock screen (defer full unlock UI — auto-unlock after restore/create in this change) |
| `READY`                           | Render children                                                                                                     |

After successful create/restore, WDK sets active wallet + ready — no separate unlock screen in v1 unless cold start finds locked wallet.

**Cold start with existing wallet:** `WdkAppProvider` auto-initializes; if `LOCKED`, call `unlock('default')` from bridge on boot or show minimal unlock prompt. Check provider auto-init behavior during implementation.

### 6. WalletStore seed phrase field

- Remove hard-coded default 12-word array.
- `seedPhrase` becomes optional UI cache set after generation or cleared on logout.
- `restoreWallet` mock mutator deprecated; restore feature calls WDK directly.
- `mockAddressFromPhrase` may remain for display until address migration.

### 7. Dependencies and native setup

**Seed phrase secure storage** (per [official configuration](https://docs.wdk.tether.io/tools/react-native-secure-storage/configuration/)) — install as **direct** app dependencies:

```bash
npm install @tetherto/wdk-react-native-secure-storage react-native-keychain expo-crypto expo-local-authentication
```

These back encrypted seed/entropy/key storage via `react-native-keychain`. `WdkAppProvider` already calls `createSecureStorage()` internally; explicit install ensures native modules link in dev builds (Expo Go is insufficient for keychain flows).

**`react-native-mmkv`** is **not** part of secure storage. It is a transitive dependency of `@tetherto/wdk-react-native-core` for non-sensitive Zustand persistence (wallet list cache, etc.). Do not list MMKV in secure-storage setup; it arrives automatically with core.

Current tree (transitive only today): secure-storage + keychain + expo-local-authentication + expo-crypto under core; mmkv under core separately. For production/dev builds, promote the four secure-storage packages to direct `dependencies` and run `pod install`.

### 8. Error handling and loading UX

Wrap create/restore in MobX `Request` for consistent loading/error flags. Recovery phrase screen shows spinner during generation. Restore button shows loading during import. Surface WDK error messages user-safe (no stack traces).

## Risks / Trade-offs

- **[Risk] Preview vs persist mnemonic mismatch if API used incorrectly.** → Mitigation: use single mnemonic in session; persist via `restoreWallet` on confirm (Decision 2).
- **[Risk] `restoreWallet` on create path is semantically "import" not "create".** → Acceptable — same crypto outcome; document naming in code comments.
- **[Risk] Cold start `LOCKED` state without unlock UI.** → Mitigation: invoke `unlock('default')` after boot when wallet exists; add minimal unlock screen follow-up if biometrics block silent unlock.
- **[Risk] Duplicate restore on device with existing wallet.** → Mitigation: check `useWalletManager().wallets` / `hasWallet` before restore; show "wallet already exists" error.
- **[Risk] Native secure storage failures on simulator.** → Mitigation: document simulator limitations in README; test on device.

## Migration Plan

1. Add `wallet-seed-phrase` feature + WDK bridge component inside `WdkProvider`.
2. Update `RevealRecoveryPhrase` to load words from feature store (async generation on mount).
3. Update restore feature validation + submit to call WDK.
4. Trim `WalletStore` mock seed defaults.
5. Extend `WdkGate` for locked/ready awareness if needed.
6. Verify: fresh install → onboard → cold start → ready; restore path on second device/simulator reset.
7. **Rollback:** Revert feature wiring; mock seed defaults return; delete secure storage entries manually on test devices.

## Open Questions

- Should cold-start `LOCKED` show a dedicated unlock screen or auto-prompt biometrics silently? (Defer unlock screen unless auto-unlock fails in testing.)
- Should onboarding confirm use `createWallet` with a documented two-phase API once WDK supports persist-from-preview entropy? (Track upstream; use `restoreWallet` workaround for now.)

## Implementation progress

_Appended during apply — does not change decisions above._

| Capability                                   | Store / boot                       | User-visible UI                   |
| -------------------------------------------- | ---------------------------------- | --------------------------------- |
| Generate mnemonic (onboarding)               | Done                               | Done — recovery phrase screen     |
| Persist wallet                               | Done                               | Done — confirm on recovery screen |
| Restore / import                             | Done                               | Done — restore screen             |
| Unlock (cold start)                          | Done — `WalletBootSync`, `WdkGate` | Spinner / retry only              |
| Unlock (duplicate restore)                   | Done — `openExistingWallet`        | Done — "Open saved wallet"        |
| READY → Home routing                         | Done — `WalletNavigationContainer` | Automatic                         |
| Reveal persisted mnemonic (`getMnemonic`)    | Not bound in store                 | Not implemented                   |
| Lock wallet                                  | `lockWallet()` in store            | Not implemented                   |
| Delete wallet                                | `deleteWalletRequest` in store     | Not implemented                   |
| Replace wallet (delete + restore)            | APIs exist                         | Not implemented                   |
| NO_WALLET → Sign In after delete             | Not implemented                    | Not implemented                   |
| Sign In "Open wallet" when device has wallet | Not implemented                    | Not implemented                   |

Additional code landed during apply but was not in the original task list: `WalletBootSync`, `WalletNavigationContainer`, restore duplicate-wallet handling. Tracked in `tasks.md` §5.4–5.5 and §4.6.

Remaining work is tracked in `tasks.md` §7–§8. Do not archive this change until those sections are complete.

## 1. Dependencies and native setup

- [x] 1.1 Install secure-storage stack per [WDK docs](https://docs.wdk.tether.io/tools/react-native-secure-storage/configuration/): `@tetherto/wdk-react-native-secure-storage`, `react-native-keychain`, `expo-crypto`, `expo-local-authentication` as direct dependencies (not only transitive via core)
- [x] 1.2 Confirm `react-native-mmkv` resolves transitively via `@tetherto/wdk-react-native-core` only — no separate install needed for seed phrase storage
- [x] 1.3 Run `bundle exec pod install` in `ios/` after install; rebuild Android to confirm keychain/native modules link

## 2. Wallet seed phrase feature layer

- [x] 2.1 Create `src/features/wallet-seed-phrase/` with public barrel (`index.ts`)
- [x] 2.2 Add `WalletSeedPhraseStore` (MobX) with `Request`-wrapped actions: `generateMnemonic`, `persistWallet`, `restoreWallet`, `unlockWallet`, `lockWallet`, `deleteWallet`, `validateMnemonic`
- [x] 2.3 Add `WdkSeedPhraseBridge` null-render component that binds `useWalletManager()` to the store inside `WdkAppProvider`
- [x] 2.4 Mount `WdkSeedPhraseBridge` from `WdkProvider.tsx` (or `App` composition root below `WdkAppProvider`)
- [x] 2.5 Export `DEFAULT_WALLET_ID = 'default'` constant aligned with WDK core

## 3. New-wallet onboarding wiring

- [x] 3.1 Update `RevealRecoveryPhrase` to trigger `generateMnemonic(12)` on mount; show loading/error states until words arrive
- [x] 3.2 Display generated words from feature store (not `WalletStore` defaults); optionally mirror to `WalletStore.seedPhrase` for UI only
- [x] 3.3 On "I've saved it — Continue", call `restoreWallet(previewMnemonic, 'default')` (or equivalent persist path from design) then navigate to Home on success
- [x] 3.4 Handle persist errors with user-visible message; do not navigate on failure

## 4. Restore flow wiring

- [x] 4.1 Replace `isPlausiblePhrase` with WDK `validateMnemonic` for shape check plus async worklet validation when 12 words filled
- [x] 4.2 Update `RestoreWallet` submit handler to call `restoreWallet(mnemonic, 'default')` via feature store instead of `walletStore.restoreWallet`
- [x] 4.3 Add loading state on "Restore wallet" button during async import
- [x] 4.4 Surface WDK errors (invalid phrase, duplicate wallet) inline; keep user on restore screen on failure
- [x] 4.5 On success, optionally sync mock display address in `WalletStore` and reset navigation to Home
- [x] 4.6 When restore fails because wallet already exists, offer **Open saved wallet** (unlock existing → Home)

## 5. WalletStore and lifecycle cleanup

- [x] 5.1 Remove hard-coded default `seedPhrase` array from `WalletStore`; initialize empty or from session only
- [x] 5.2 Deprecate or remove `WalletStore.restoreWallet` mock mutator; update any remaining callers
- [x] 5.3 Extend `WdkGate` to handle `LOCKED` on cold start — attempt `unlock('default')` when persisted wallet exists (add minimal unlock UI only if auto-unlock fails in testing)
- [x] 5.4 Add `WalletBootSync` — probe/unlock persisted wallet on cold start when state is `LOCKED` or `NO_WALLET`
- [x] 5.5 Add `WalletNavigationContainer` — navigate to Home when WDK is `READY` (use `navigationRef.isReady()` + `onReady`)

## 6. Verification

- [ ] 6.1 Fresh install: SSO path → biometric gate → recovery phrase shows WDK-generated words → confirm → Home; cold restart reaches `READY`
- [ ] 6.2 Restore path: enter valid 12-word phrase → import succeeds → Home; invalid phrase keeps submit disabled / shows error
- [x] 6.3 Confirm Home balances/transactions still come from mock `WalletStore` (not WDK indexer)
- [x] 6.4 Run `openspec validate manage-seed-phrase --strict` and fix any spec issues

## 7. Wallet management UI (remaining)

- [x] 2.6 Bind `getMnemonic` in `WdkSeedPhraseBridge`; add `revealMnemonicRequest` to `WalletSeedPhraseStore`
- [x] 7.1 Create `src/features/wallet-settings` with reveal, lock, and delete actions wired to the store
- [x] 7.2 Add `WalletSettingsScreen` and register route in `RootNavigator`
- [x] 7.3 Link wallet settings from Home (header tap, gear, or wallet name action)
- [x] 7.4 View recovery phrase UI: read-only `SeedWordGrid`, loading/error, biometric when required
- [x] 7.5 Lock wallet UI: button with confirmation; user must unlock again before wallet ops resume
- [x] 7.6 Delete wallet UI: destructive confirmation; clears secure storage via WDK
- [x] 7.7 Extend `WalletNavigationContainer`: on transition to `NO_WALLET` after delete, reset navigation to Sign In
- [x] 7.8 Sign In: when wallet exists on device, show **Open wallet** action (unlock → Home)
- [x] 7.9 Restore: **Replace with new phrase** path when wallet already exists (delete → restore form)

## 8. Verification (after §7)

- [ ] 8.1 Reveal phrase from Home settings matches persisted wallet
- [ ] 8.2 Delete wallet → Sign In → restore new phrase → Home
- [ ] 8.3 Lock from settings → unlock on next open → Home

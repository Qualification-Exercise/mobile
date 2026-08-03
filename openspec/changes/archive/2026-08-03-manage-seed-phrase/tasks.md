## 1. Dependencies and native setup

- [x] 1.1 Install secure-storage stack per [WDK docs](https://docs.wdk.tether.io/tools/react-native-secure-storage/configuration/): `@tetherto/wdk-react-native-secure-storage`, `react-native-keychain`, `expo-crypto`, `expo-local-authentication` as direct dependencies (not only transitive via core)
- [x] 1.2 Confirm `react-native-mmkv` resolves transitively via `@tetherto/wdk-react-native-core` only — no separate install needed for seed phrase storage
- [x] 1.3 Run `bundle exec pod install` in `ios/` after install; rebuild Android to confirm keychain/native modules link

## 2. Wallet seed phrase feature layer

- [x] 2.1 Create `src/features/wallet-seed-phrase/` with public barrel (`index.ts`)
- [x] 2.2 Add `WalletSeedPhraseStore` (MobX) with `Request`-wrapped actions: `generateMnemonic`, `persistWallet`, `restoreWallet`, `unlockWallet`, `deleteWallet`, `validateMnemonic`
- [x] 2.3 Add `WdkSeedPhraseBridge` null-render component that binds `useWalletManager()` to the store inside `WdkAppProvider`
- [x] 2.4 Mount `WdkSeedPhraseBridge` from `WdkProvider.tsx`
- [x] 2.5 Export `DEFAULT_WALLET_ID = 'default'` constant aligned with WDK core
- [x] 2.6 Bind `getMnemonic` in `WdkSeedPhraseBridge`; add `revealMnemonicRequest` to `WalletSeedPhraseStore`
- [x] 2.7 Add `walletPresence.ts` (`hasPersistedWallet`) shared helper for wallet-exists checks
- [x] 2.8 Add `wdkSessionLock.ts` + `lockWalletSession()` for in-memory session lock (background); distinct from WDK `deleteWallet` / logout lock
- [x] 2.9 Add `WalletSessionLock` — lock session on app background, navigate to `BiometricUnlock` on foreground
- [x] 2.10 Add `walletBootStorage.ts` — persist `skipBootUnlock` across restarts after delete

## 3. New-wallet onboarding wiring

- [x] 3.1 Update `RevealRecoveryPhrase` to trigger `generateMnemonic(12)` on mount; show loading/error states until words arrive
- [x] 3.2 Display generated words from feature store (not `WalletStore` defaults); optionally mirror to `WalletStore.seedPhrase` for UI only
- [x] 3.3 On "I've saved it — Continue", call `restoreWallet(previewMnemonic, 'default')` then navigate to Home on success
- [x] 3.4 Handle persist errors with user-visible message; do not navigate on failure
- [x] 3.5 Add `WalletSetup` screen — create new wallet or restore when authenticated + biometry enrolled but no persisted wallet

## 4. Restore flow wiring

- [x] 4.1 Replace cosmetic validation with WDK `validateMnemonic` plus async worklet validation when 12 words filled
- [x] 4.2 Update `RestoreWallet` submit handler to call `restoreWallet(mnemonic, 'default')` via feature store
- [x] 4.3 Add loading state on "Restore wallet" button during async import
- [x] 4.4 Surface WDK errors (invalid phrase, duplicate wallet) inline; keep user on restore screen on failure
- [x] 4.5 On success, optionally sync mock display address in `WalletStore` and reset navigation to Home
- [x] 4.6 When restore fails because wallet already exists, offer **Open saved wallet** and **Replace with new phrase**
- [x] 4.7 Gate restore, open-existing, and replace-with-delete behind `requireWalletBiometry` when biometry is enrolled

## 5. WalletStore and lifecycle cleanup

- [x] 5.1 Remove hard-coded default `seedPhrase` array from `WalletStore`; initialize empty or from session only
- [x] 5.2 Deprecate or remove `WalletStore.restoreWallet` mock mutator; update any remaining callers
- [x] 5.3 Simplify `WdkGate` to `INITIALIZING` / `REINITIALIZING` / `ERROR` only; wallet unlock handled on `BiometricUnlockScreen`
- [x] 5.4 Add `resolveBootRoute` — boot stack: SignIn → EnableBiometric → WalletSetup (no wallet) → BiometricUnlock (has wallet)
- [x] 5.5 Add `WalletNavigationContainer` — WDK-aware initial route, delete → sign-out → SignIn, READY transition → Home
- [x] 5.6 Integrate Google Sign-In (`AuthStore`) and app biometry (`BiometryStore`) from `main` into boot routing

## 6. Verification

- [x] 6.1 Fresh install: Google Sign-In → Enable Biometric → Wallet Setup → recovery phrase shows WDK-generated words → confirm → Home; cold restart → BiometricUnlock → Home
- [x] 6.2 Restore path: Wallet Setup → restore → valid 12-word phrase → Home; invalid phrase keeps submit disabled / shows error
- [x] 6.3 Confirm Home balances/transactions still come from mock `WalletStore` (not WDK indexer)
- [x] 6.4 Run `openspec validate manage-seed-phrase --strict` and fix any spec issues

## 7. Wallet management UI

- [x] 7.1 Create `src/features/wallet-settings` with reveal and delete actions wired to the store
- [x] 7.2 Add `WalletSettingsScreen` and register route in `RootNavigator`
- [x] 7.3 Link wallet settings from Home (header tap / settings icon)
- [x] 7.4 View recovery phrase UI: read-only `SeedWordGrid`, loading/error, app biometry via `requireWalletBiometry`
- [x] 7.5 Session lock on app background via `WalletSessionLock` (replaces manual lock button in settings)
- [x] 7.6 Delete wallet UI: destructive confirmation + biometry; clears secure storage, signs out Google session, navigates to Sign In
- [x] 7.7 `WalletNavigationContainer`: on delete success (`walletDeletedSignal`), sign out and reset to Sign In
- [x] 7.8 `BiometricUnlockScreen`: after app biometry, call `openExistingWallet` when WDK not READY, then Home
- [x] 7.9 Restore: **Replace with new phrase** path when wallet already exists (biometry-gated delete → empty grid)
- [x] 7.10 `HomeScreen` guard: redirect to Wallet Setup when no persisted wallet and WDK not READY

## 8. Verification (after §7)

- [x] 8.1 Reveal phrase from Home settings matches persisted wallet
- [x] 8.2 Delete wallet → Sign In → Wallet Setup → create or restore → Home
- [x] 8.3 Background app → foreground → BiometricUnlock → Home (session lock)

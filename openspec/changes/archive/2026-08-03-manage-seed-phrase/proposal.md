## Why

The app has WDK runtime boot and mock onboarding/restore UI, but seed phrases were hard-coded in `WalletStore` — nothing was generated, encrypted, or persisted through WDK. Users could not create a real wallet, restore from a valid BIP-39 phrase, or reveal a phrase that matches what the runtime will sign with. This change wires the full seed-phrase lifecycle through `@tetherto/wdk-react-native-core` so onboarding and restore flows operate on real cryptographic material stored in secure device storage.

## What Changes

- Add a feature-layer seed phrase service that wraps `useWalletManager` (`restoreWallet`, `generateMnemonic`, `getMnemonic`, `unlock`, `deleteWallet`) behind MobX-friendly async actions.
- Wire the **new-wallet** path: after Google Sign-In and app biometry enrollment, `WalletSetup` → recovery phrase → persist on confirm.
- Wire the **restore** path: validate with WDK/worklet checks, call `restoreWallet`, unlock runtime to `READY`.
- Gate sensitive wallet operations (reveal, delete, restore submit) behind app biometry when enrolled (`requireWalletBiometry`).
- Boot routing via `resolveBootRoute`: SignIn → EnableBiometric → WalletSetup (no wallet) or BiometricUnlock (has wallet).
- Session lock on app background (`WalletSessionLock`); unlock via `BiometricUnlockScreen` + WDK `unlock`.
- Delete wallet clears secure storage, signs out Google session, returns to Sign In.
- Remove mock seed phrase as source of truth; `WalletStore.seedPhrase` is a UI cache only.
- Ensure secure storage dependencies per [WDK React Native Secure Storage configuration](https://docs.wdk.tether.io/tools/react-native-secure-storage/configuration/).

## Capabilities

### New Capabilities

- `wallet-seed-phrase`: WDK-backed seed phrase lifecycle — generation, secure persistence, restore/import, reveal (with auth), session lock/unlock, and deletion.

### Modified Capabilities

- `wdk-runtime`: Boot routing reflects auth, biometry, and wallet presence; delete returns to Sign In.
- `wallet-onboarding`: Recovery phrase displays WDK-generated mnemonic; `WalletSetup` hub for create vs restore.
- `wallet-restore`: Restore imports through WDK with biometry gating; replace-wallet flow when duplicate exists.
- `wallet-dashboard`: Home settings entry for reveal and delete; session lock replaces manual lock button.

## Impact

- `src/features/wallet-seed-phrase`, `src/features/wallet-settings`, `src/features/wallet-setup`
- `src/app/navigation/resolveBootRoute.ts`, `WalletNavigationContainer.tsx`
- `src/app/providers/WdkProvider.tsx`, `App.tsx` (auth/biometry hydration)
- `src/shared/lib/requireWalletBiometry.ts`, `walletBootStorage.ts`
- `src/shared/store/domains/AuthStore.ts`, `BiometryStore.ts`, `WalletStore.ts`
- `package.json` / native — secure storage + Google Sign-In deps

## Progress

**Status:** Implementation complete — device QA remaining (tasks §6, §8).

**Implemented:** secure storage deps, `wallet-seed-phrase` store/bridge/session lock, Google auth + app biometry boot routing, `WalletSetup` onboarding hub, generate/persist/restore, biometry-gated reveal/delete, delete → sign-out → Sign In, `BiometricUnlock` + WDK unlock, Home → settings, replace-wallet on restore, Home guard when no wallet.

**Not verified on device:** full onboarding/restore/delete/session-lock QA (§6.1–6.2, §8.1–8.3).

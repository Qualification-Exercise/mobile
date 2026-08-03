## Why

The app has WDK runtime boot and mock onboarding/restore UI, but seed phrases are still hard-coded in `WalletStore` — nothing is generated, encrypted, or persisted through WDK. Users cannot create a real wallet, restore from a valid BIP-39 phrase, or reveal a phrase that matches what the runtime will sign with. This change wires the full seed-phrase lifecycle through `@tetherto/wdk-react-native-core` so onboarding and restore flows operate on real cryptographic material stored in secure device storage.

## What Changes

- Add a feature-layer seed phrase service that wraps `useWalletManager` (`createWallet`, `restoreWallet`, `generateMnemonic`, `getMnemonic`, `unlock`, `lock`, `deleteWallet`) behind MobX-friendly async actions.
- Wire the **new-wallet** path: after SSO/biometric gate, generate a real 12-word mnemonic via WDK, show it on the recovery-phrase screen, then persist the wallet to secure storage on confirmation.
- Wire the **restore** path: validate the entered phrase with WDK/worklet checks, call `restoreWallet`, and unlock the runtime so lifecycle reaches `READY`.
- Extend `WdkGate` / navigation gating to respect WDK lifecycle (`NO_WALLET`, `LOCKED`, `READY`) alongside existing mock UI where balances/addresses are not yet migrated.
- Remove mock seed phrase as the source of truth; `WalletStore.seedPhrase` becomes a UI cache populated from WDK after generation/reveal, not a static default.
- Ensure secure storage dependencies are installed per [WDK React Native Secure Storage configuration](https://docs.wdk.tether.io/tools/react-native-secure-storage/configuration/): `@tetherto/wdk-react-native-secure-storage`, `react-native-keychain`, `expo-crypto`, `expo-local-authentication` (plus native rebuild / `pod install`).
- Add BIP-39 validation on restore using WDK utilities / worklet validation instead of word-count-only checks.

## Capabilities

### New Capabilities

- `wallet-seed-phrase`: WDK-backed seed phrase lifecycle — generation, secure persistence, restore/import, reveal (with auth), lock/unlock, and deletion — exposed to onboarding and restore features.

### Modified Capabilities

- `wdk-runtime`: Remove the requirement that mock `WalletStore` remains authoritative for seed phrases; allow wallet create/import/unlock through the runtime while balances/addresses may still be mock.
- `wallet-onboarding`: Recovery phrase backup SHALL display a WDK-generated mnemonic and persist the wallet on confirmation instead of mock words.
- `wallet-restore`: Restore SHALL import the phrase through WDK `restoreWallet` and unlock the runtime instead of only updating `WalletStore`.

## Impact

- `src/features/reveal-recovery-phrase`, `src/features/restore-wallet`, `src/features/biometric-gate` (or equivalent onboarding chain)
- New `src/features/wallet-seed-phrase` (or `src/shared/lib/wdk/seedPhrase.ts`) service/hooks layer
- `src/app/providers/WdkProvider.tsx` — lifecycle gating for `LOCKED` / post-wallet states
- `src/shared/store/domains/WalletStore.ts` — stop owning canonical seed; optional UI mirror only
- `package.json` / native projects — ensure secure storage + MMKV native deps; `pod install` on iOS
- Existing specs under `openspec/specs/` for the three modified capabilities

## Progress

**Status:** In progress — core plumbing and onboarding/restore UI landed; wallet management UI and some spec scenarios remain.

**Implemented in code (tasks §1–§5):** secure storage deps, `wallet-seed-phrase` store/bridge, onboarding generate/persist, restore + WDK validation, boot unlock (`WalletBootSync`), READY→Home routing (`WalletNavigationContainer`), duplicate-restore "Open saved wallet".

**Not yet in UI (tasks §7):** reveal persisted phrase (`getMnemonic`), manual lock, delete wallet, replace-wallet flow, Sign In "Open wallet", NO_WALLET→Sign In after delete, Home settings entry.

**Spec deltas added (pending UI):** `wallet-dashboard`, plus ADDED sections in existing capability specs — see `specs/**/spec.md`.

**Not verified on device (tasks §6, §8):** full onboarding/restore/delete QA.

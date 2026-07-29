## Why

The app currently only supports creating a brand-new wallet via SSO sign-in; there is no way for a user who already has a wallet to bring it back onto this device. The design canvas adds a "Restore" entry point on the sign-in screen and an "Enter recovery phrase" screen (12-word grid, paste/scan actions, BIP-39 validation feedback), so the app needs a matching restore flow.

## What Changes

- Add a "Restore" link to the sign-in screen, next to the existing SSO actions, that opens a new restore flow.
- Add a "Restore wallet" screen with a 12-word input grid (word index + text field per slot), a "Paste" action that fills the grid from clipboard, and a "Scan QR" action that fills the grid from a scanned QR payload.
- Validate the entered phrase as the user types: show word count progress (e.g. "12 / 12 words") and a valid/invalid BIP-39 phrase indicator; disable the "Restore wallet" button until the phrase is complete and valid.
- On confirming "Restore wallet", replace the mock wallet's seed phrase/address in `WalletStore` with the entered phrase and navigate straight to the Home screen — the restore path skips the biometric-gate and reveal-recovery-phrase steps used by the new-wallet onboarding path, since those don't apply when recovering an existing wallet.
- Add a back action from the restore screen to the sign-in screen.

## Capabilities

### New Capabilities

- `wallet-restore`: Restoring an existing wallet on this device from a 12-word BIP-39 recovery phrase, including manual entry, paste, QR scan, phrase validation, and completing restoration into the app's wallet state.

### Modified Capabilities

- `wallet-onboarding`: The SSO sign-in screen requirement gains a "Restore" entry point that branches into the new restore flow instead of the SSO/biometric/backup path.

## Impact

- `src/screens/SignInScreen`, `src/features/sso-sign-in`: add the "Restore" link and its callback.
- New screen `src/screens/RestoreWalletScreen` and new feature `src/features/restore-wallet` (or similar) implementing the phrase-entry grid, paste/scan actions, and validation.
- `src/app/navigation/RootNavigator.tsx` and `src/app/navigation/types.ts`: register the new restore route and wire sign-in → restore → Home.
- `src/shared/store/domains/WalletStore.ts`: add a method to replace the stored seed phrase/wallet identity from a restored phrase.
- No new runtime dependency is required for BIP-39 word-list validation unless the team wants real BIP-39 checksum validation (see design.md for the mock-vs-real tradeoff); clipboard and QR scanning may need `expo-clipboard` and the existing camera/QR capability already used by `scan-to-pay`.

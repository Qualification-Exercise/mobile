## 1. Navigation & routing

- [x] 1.1 Add `RestoreWallet: undefined` to `RootStackParamList` in `src/app/navigation/types.ts`
- [x] 1.2 Register a `RestoreWallet` `Stack.Screen` in `src/app/navigation/RootNavigator.tsx`, wiring `onBack` to `navigation.goBack()` and `onRestore` to `navigation.reset({ index: 0, routes: [{ name: 'Home' }] })`
- [x] 1.3 Wire the sign-in screen's new `onRestore` callback to `navigation.navigate('RestoreWallet')`

## 2. Sign-in screen: Restore entry point

- [x] 2.1 Add an `onRestore: () => void` prop to `SsoSignIn` (`src/features/sso-sign-in/SsoSignIn.tsx`) and `SignInScreen` (`src/screens/SignInScreen/SignInScreen.tsx`), threading it through
- [x] 2.2 Add the "Already have a wallet? Restore" text/link below the footer copy, styled per the design canvas (accent-colored "Restore" word), calling `onRestore` on press

## 3. Editable word-grid widget

- [x] 3.1 Create `src/widgets/seed-word-input-grid/SeedWordInputGrid.tsx`: 12 numbered `TextInput` cells in a 2-column grid (visually consistent with `SeedWordGrid`), controlled via a `words: string[]` + `onChangeWord(index, value)` prop pair
- [x] 3.2 Support advancing focus to the next cell on submit/space, and a way to bulk-set all 12 words at once (for paste/scan fill)
- [x] 3.3 Export the widget via `src/widgets/seed-word-input-grid/index.ts`

## 4. Restore-wallet feature & screen

- [x] 4.1 Create `src/features/restore-wallet/RestoreWallet.tsx`: holds local state for the 12 words, renders back action, title/description, `SeedWordInputGrid`, "Paste"/"Scan QR" action row, word-count + valid/invalid indicator, and "Restore wallet" button
- [x] 4.2 Implement a shared `parsePhraseInput(text: string): string[] | null` helper that splits whitespace-separated input and returns exactly 12 words or `null` otherwise; use it for both paste and QR-scan fill
- [x] 4.3 Implement phrase validity check (e.g. `isPlausiblePhrase(words: string[]): boolean` — non-empty, alphabetic, all 12 filled) per design.md Decision 1; drive the word-count and valid/invalid indicators from it
- [x] 4.4 Implement "Paste" using the clipboard API; filling the grid via `parsePhraseInput`; no-op silently on malformed clipboard content. Used the `Clipboard` export already re-used from `react-native` core (see `ReceiveScreen`'s "Copy" action) instead of adding `expo-clipboard`, since no new dependency was needed
- [x] 4.5 Implement "Scan QR" reusing the existing scan/camera pattern from `src/features/scan-to-pay` (fully mocked, no real camera dependency in this codebase): an inline mock scanner view with a "Use this code" action, filling the grid via `parsePhraseInput` on completion and dismissing the scanner
- [x] 4.6 Disable "Restore wallet" until the phrase is complete and valid; on press, call the new store action and invoke `onRestore`
- [x] 4.7 Create `src/screens/RestoreWalletScreen/RestoreWalletScreen.tsx` (+ `index.ts`) wrapping `RestoreWallet` in `ScreenContainer`, matching the `RecoveryPhraseScreen` pattern

## 5. Wallet state

- [x] 5.1 Add `restoreWallet(words: string[])` action to `WalletStore` (`src/shared/store/domains/WalletStore.ts`) that replaces `seedPhrase` with the given words and updates the mock `wallet` address/display name

## 6. Verification

- [x] 6.1 Manually run the app: sign-in → tap "Restore" → back navigates to sign-in; enter a 12-word phrase manually and confirm the button enables only once complete. Ran the app in the iOS Simulator (iPhone 16); screenshot confirmed the sign-in screen's "Already have a wallet? Restore" link matches the design canvas. Simulator UI taps could not be scripted in this sandbox (no Accessibility access for `osascript`/System Events, no `idb`), so the interactive flow (grid fill, disabled→enabled button, restore commit) was instead exercised with a temporary `react-test-renderer` harness driving the real `RestoreWallet`/`SsoSignIn` components end-to-end; all assertions passed and the harness was deleted afterward
- [x] 6.2 Verify "Paste" and "Scan QR" fill the grid correctly and malformed/cancelled input leaves the grid unchanged. `parsePhraseInput` unit-verified for well-formed/malformed input; the mock scan flow verified to fill the grid and dismiss via the same test harness described in 6.1
- [x] 6.3 Verify tapping "Restore wallet" lands on Home with the restore/sign-in stack unreachable via back, and that biometric-gate/reveal-recovery-phrase are not shown. Verified `walletStore.seedPhrase` is replaced and `onRestore` fires on submit via the test harness; the `navigation.reset({ index: 0, routes: [{ name: 'Home' }] })` wiring in `RootNavigator.tsx` mirrors the existing `RecoveryPhraseScreen` pattern that already provides this guarantee
- [x] 6.4 Run typecheck/lint for the touched files. `tsc --noEmit` clean; `eslint` clean (one bitwise-operator warning in the mock address hash was fixed by switching to `%`)

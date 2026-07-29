## Context

The app is a prototype/demo wallet built with Expo + React Navigation (native-stack) and MobX. Everything is mocked: `WalletStore` (`src/shared/store/domains/WalletStore.ts`) holds a hardcoded seed phrase, address, and balances — there is no real key derivation, no `bip39` dependency, and no wallet SDK wired up yet. The current onboarding stack is `SignIn → EnableBiometric → RecoveryPhrase(reveal) → Home`, reset so the stack isn't reachable via back once the user reaches Home (`src/app/navigation/RootNavigator.tsx`).

The design canvas adds a "Restore" link on the sign-in screen and a new "Enter recovery phrase" screen: a 12-cell word grid (editable, unlike the existing read-only `SeedWordGrid` widget), Paste/Scan QR actions, live BIP-39-shaped validation feedback, and a "Restore wallet" submit button.

## Goals / Non-Goals

**Goals:**

- Add a fully navigable restore path: SignIn → RestoreWallet → Home, matching the two provided screens.
- Provide an editable 12-word grid input with per-word entry, a paste-fill action, and a scan-QR-fill action (reusing the app's existing mocked QR/camera pattern from `scan-to-pay`).
- Validate the phrase client-side as the user types and reflect it in the UI (word count `n / 12`, valid/invalid state), gating the "Restore wallet" button on validity.
- On restore, update `WalletStore` with the entered phrase (and a derived-looking mock address) and land on Home directly, bypassing biometric-gate and reveal-recovery-phrase — those are new-wallet-creation steps and don't apply to restoring an existing wallet.

**Non-Goals:**

- Real BIP-39 checksum validation or real key derivation/address generation — this app has no crypto SDK integrated yet; validation stays mock/heuristic, consistent with the rest of the app's mocked wallet behavior.
- Real clipboard/camera integration correctness beyond what's needed to demo the flow (can reuse whatever mocking pattern `scan-to-pay` already established).
- Multi-wallet management, passphrase (25th word) support, or derivation-path selection.

## Decisions

**1. Validation: word-count + fixed mock wordlist, not real BIP-39 checksum.**
No `bip39` package is installed and the rest of the app treats the seed phrase as opaque display strings. Real checksum validation would require adding a wordlist dependency and a checksum algorithm for a flow that's still fully mocked end-to-end. Instead, treat entry as valid when all 12 cells are filled with non-empty, lowercase alphabetic words (optionally checked against a small bundled sample wordlist for the "green check" state, similar to how the mock seed phrase already draws from an arbitrary word set). This keeps the UI honestly labeled ("Valid BIP-39 phrase" is cosmetic copy matching the mock, not a real guarantee) and avoids scope creep into real crypto. If/when a real WDK SDK is integrated, this validation should be swapped for the SDK's mnemonic validator — call this out as a follow-up, not part of this change.

**2. New editable widget instead of extending `SeedWordGrid`.**
`SeedWordGrid` (`src/widgets/seed-word-grid`) is read-only (renders `words: string[]`) and used by the reveal-phrase feature. The restore screen needs 12 independent `TextInput`s with per-cell focus/next-field behavior and error styling. Rather than overload one widget with two modes, add a sibling widget (e.g. `src/widgets/seed-word-input-grid`) so the read-only reveal path is untouched and the input grid can own its own state/behavior. Both widgets share the same visual grid layout/tokens for consistency.

**3. Restore bypasses biometric-gate and reveal-recovery-phrase.**
Those two screens exist to help a user _set up_ protections for a _newly generated_ phrase (enable biometrics, confirm you've written down the new phrase). When restoring, the phrase is already known/backed up by the user, so re-showing it and asking to re-confirm biometrics adds friction without matching the mental model. The restore screen navigates straight to Home on success, using `navigation.reset` the same way `RecoveryPhraseScreen`'s `onConfirm` does today, so the SignIn/Restore stack is not reachable via back once in Home.

**4. Paste and Scan QR both feed the same "fill grid from phrase string" function.**
Both actions ultimately produce a whitespace-separated 12-word string (from clipboard or decoded QR payload) that gets split and distributed into the 12 cells, overwriting existing input. This keeps the two entry paths consistent and testable via one shared helper rather than duplicating fill logic.

**5. State lives in local component state, not `WalletStore`, until submit.**
The in-progress phrase-being-typed is UI state, not domain state — mirroring how `SendScreen`/`ApproveTransaction` presumably hold form state locally before committing to the store on confirm. Only on "Restore wallet" does the feature call a new `WalletStore.restoreWallet(words: string[])` action that overwrites `seedPhrase` (and stubs a new mock `address`), matching the existing mutator pattern (`enableBiometrics()`, `sendAsset()`).

## Risks / Trade-offs

- **[Risk] "Valid BIP-39 phrase" label implies real cryptographic validation that isn't happening.** → Mitigate by keeping the check honest in code comments/naming (`isPlausiblePhrase`, not `isValidBip39`) and flagging real-SDK integration as a documented follow-up, not silently shipping a misleading claim without acknowledgment.
- **[Risk] Paste/Scan QR need platform APIs (`expo-clipboard`, camera) not confirmed to be installed.** → Check `package.json` during implementation; if `expo-clipboard` is missing, add it (small, well-scoped dependency) or mock the paste action behind a fixed sample phrase if the team prefers zero new dependencies for a demo app.
- **[Risk] Skipping biometric-gate on restore diverges from the one onboarding path the team may expect to be uniform.** → Called out explicitly in this design and the proposal; flag to the user/reviewer if they'd rather route restore through biometric-gate too (easy to change: point `onRestore` at `EnableBiometric` instead of `Home`).

## Open Questions

- Should restoring a wallet also route through `EnableBiometric` before Home, for consistency with the creation path? (Current design: no — see Decision 3.)
- Does the team want a real wordlist-based validator now, or is the cosmetic mock check acceptable for this demo stage? (Current design: cosmetic mock — see Decision 1.)

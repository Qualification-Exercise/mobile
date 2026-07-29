## Why

The WDK Wallet Claude Design canvas (`WDK Wallet.dc.html`, project `3ff77be0-cecb-41c7-bc00-0c89fa09a180`) defines the full 12-screen UX for the qualification exercise's mobile wallet, but the app is currently a near-stock React Native template with no screens, no navigation, and an empty root store. Importing the design now gives the team a navigable, visually-accurate skeleton to build real WDK SDK wallet logic against later, and establishes the FSD screen/widget/entity structure the rest of the exercise will extend.

## What Changes

- Add React Navigation (native-stack) as the app's navigation library — none is installed yet — with a root stack, a modal/sheet presentation for the transaction-approval screen, and a full-screen modal presentation for scan-to-pay.
- Add a `src/shared/ui` design-system layer (color tokens, typography, `PrimaryButton`/`SecondaryButton`, `Card`, `PhoneStatusBar`-free screen scaffolding) matching the mockup's dark/green visual language.
- Add entities: `wallet` (account/address), `asset` (BTC/USDt-multichain/UTL balances), `transaction` (activity feed), `coupon` (cashback rewards).
- Add features: `sso-sign-in`, `enable-biometric`, `reveal-recovery-phrase`, `send-asset`, `receive-asset`, `approve-transaction`, `scan-to-pay`, `claim-coupon`.
- Add widgets: asset row, transaction row, coupon row, QR placeholder grid, amount keypad/entry, seed-word grid.
- Add 12 screens under `src/screens`, one per mockup frame, wired into a navigation stack in that same order: SignIn → EnableBiometric → RecoveryPhrase → Home → AssetDetail → Receive → Send → ApproveTransaction (modal) → ScanToPay (full-screen modal) → PaymentSuccess → Rewards → ClaimCoupon.
- Populate `RootStore` with a `WalletStore` (MobX) holding the same mock data as the design (balances, tx list, coupon codes, seed words, decorative QR grid) — no real WDK SDK / signing / networking in this change.
- **BREAKING**: `App.tsx` no longer renders `NewAppScreen`; the app boots straight into the SignIn screen inside the new navigation container.

## Capabilities

### New Capabilities

- `wallet-onboarding`: SSO sign-in, biometric-gate opt-in, and recovery-phrase backup (screens 01–03).
- `wallet-dashboard`: home multi-chain balance overview and per-asset detail + activity feed (screens 04–05).
- `wallet-transfers`: receive (QR + address), send (amount + destination), and biometric transaction approval (screens 06–08).
- `cashback-payments`: merchant scan-to-pay flow and the resulting payment-success + cashback-coupon-issued screen (screens 09–10).
- `rewards-coupons`: claimable coupon list and UTL coupon-code redemption (screens 11–12).

### Modified Capabilities

- None — `openspec/specs/` has no existing capabilities yet.

## Impact

- **New dependency**: `@react-navigation/native`, `@react-navigation/native-stack`, and their native peer deps (`react-native-screens`, `react-native-safe-area-context` already present, `react-native-gesture-source` as required by the navigator) — requires `pod install` for iOS.
- **Code**: `src/app` (navigation container + `RootStore` wiring), new `src/screens/*`, `src/widgets/*`, `src/features/*`, `src/entities/*`, `src/shared/ui/*`.
- **No backend/API/WDK SDK impact**: all data is mock/static, matching the design canvas exactly; wiring real wallet logic is explicitly out of scope for this change.

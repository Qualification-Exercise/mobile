## 1. Navigation dependency setup

- [x] 1.1 Add `@react-navigation/native`, `@react-navigation/native-stack`, `react-native-screens`, `react-native-gesture-handler` to `package.json` (versions per React Navigation's RN 0.86 compatibility table)
- [x] 1.2 Run `bundle exec pod install` for iOS after adding native deps; confirm Android Gradle sync is unaffected
- [x] 1.3 Add the one-line native setup each library requires (gesture-handler import at app entry, `react-native-screens` `enableScreens()` if required for RN 0.86)

## 2. Shared design-system tokens (`src/shared/ui`)

- [x] 2.1 Add `src/shared/ui/tokens.ts` with color tokens ported verbatim from the mockup's inline styles (background `#05070A`, accent `#26A17B`/`#2DBE8C`, surfaces `#12171C`/`#161B21`, text `#F2F5F7`/`#8A929B`/`#5A626B`), radii, and spacing scale
- [x] 2.2 Add `PrimaryButton` (solid accent), `SecondaryButton` (outlined), and `LightButton` (filled-light, used for "Continue with Apple") to `src/shared/ui`
- [x] 2.3 Add `Card`/`Surface` and `ScreenContainer` (safe-area + dark background wrapper) primitives to `src/shared/ui`
- [x] 2.4 Export all of the above through `src/shared/ui/index.ts`

## 3. Entities

- [x] 3.1 Add `src/entities/wallet` — `Wallet` type (address, display name) + barrel
- [x] 3.2 Add `src/entities/asset` — `Asset` type (id, symbol, name, network, balance, fiatValue) + display helpers (icon glyph, color) + barrel
- [x] 3.3 Add `src/entities/transaction` — `Transaction` type (id, direction, counterparty/source, amount, date, assetId) + barrel
- [x] 3.4 Add `src/entities/coupon` — `Coupon` type (code, merchant, amount, status) + barrel

## 4. WalletStore (MobX domain store)

- [x] 4.1 Add `src/shared/store/domains/WalletStore.ts` (or equivalent domain-store location per AGENTS.md's store kinds) seeded with the mockup's exact mock data: wallet address, 12-word seed phrase, 4 assets (BTC, USDt-Arbitrum, USDt-Tron, UTL), 5 transactions, 4 coupons, biometrics-enabled flag
- [x] 4.2 Implement observable actions: `enableBiometrics()`, `sendAsset(assetId, amount, destination)` (appends a mock outgoing transaction), `recordScanToPayment(merchant, amount, assetId)` (appends transaction + issues a coupon), `claimCoupon(code)` (marks coupon claimed, credits UTL asset balance)
- [x] 4.3 Add computed `totalFiatBalance` and `claimableCashbackTotal`
- [x] 4.4 Wire `WalletStore` into `src/app/providers/RootStore.ts`; confirm `useStores()` exposes it

## 5. Widgets (`src/widgets`)

- [x] 5.1 `asset-row` — icon, name, network, balance, fiat value (home + selectors)
- [x] 5.2 `transaction-row` — direction icon, title/subtitle, signed amount, date
- [x] 5.3 `coupon-row` — code, merchant, amount, status badge
- [x] 5.4 `qr-placeholder` — renders the mockup's 21×21 decorative finder-pattern grid at a given size
- [x] 5.5 `seed-word-grid` — numbered 2-column word list
- [x] 5.6 `amount-entry` — large numeric amount display + percentage/max quick-fill row (used by Send)
- [x] 5.7 Barrel-export each widget

## 6. Features (`src/features`)

- [x] 6.1 `sso-sign-in` — three continue actions, calls a passed `onContinue` (navigation is the screen's concern)
- [x] 6.2 `enable-biometric` — enable/skip actions wired to `WalletStore.enableBiometrics()`
- [x] 6.3 `reveal-recovery-phrase` — renders `seed-word-grid` from `WalletStore`, backup-status row, confirm action
- [x] 6.4 `send-asset` — amount entry + destination field + review action, validating non-zero amount and non-empty destination
- [x] 6.5 `approve-transaction` — pending-transaction summary + hold-to-sign action, calls `WalletStore.sendAsset(...)` on confirm
- [x] 6.6 `scan-to-pay` — mock viewfinder + merchant summary + pay action, calls `WalletStore.recordScanToPayment(...)` on confirm
- [x] 6.7 `claim-coupon` — 3-segment code entry + resolved amount + claim action, calls `WalletStore.claimCoupon(...)`
- [x] 6.8 Barrel-export each feature

## 7. Screens (`src/screens`) — onboarding

- [x] 7.1 `SignInScreen` (mockup 01)
- [x] 7.2 `EnableBiometricScreen` (mockup 02)
- [x] 7.3 `RecoveryPhraseScreen` (mockup 03)

## 8. Screens — dashboard

- [x] 8.1 `HomeScreen` (mockup 04) — total balance, quick actions, asset list from `WalletStore`
- [x] 8.2 `AssetDetailScreen` (mockup 05) — resolves `assetId` route param, renders activity feed

## 9. Screens — transfers

- [x] 9.1 `ReceiveScreen` (mockup 06)
- [x] 9.2 `SendScreen` (mockup 07)
- [x] 9.3 `ApproveTransactionScreen` (mockup 08) — presented as a modal/sheet

## 10. Screens — cashback payments

- [x] 10.1 `ScanToPayScreen` (mockup 09) — presented as a full-screen modal
- [x] 10.2 `PaymentSuccessScreen` (mockup 10)

## 11. Screens — rewards

- [x] 11.1 `RewardsScreen` (mockup 11)
- [x] 11.2 `ClaimCouponScreen` (mockup 12)

## 12. Navigation wiring (`src/app`)

- [ ] 12.1 Define the root param list (`RootStackParamList`) covering all 12 routes and their params (`AssetDetail: { assetId }`, `Send: { assetId }`, `ApproveTransaction: { amount, destination, assetId }`, `ClaimCoupon: { couponCode?: string }`, others `undefined`)
- [ ] 12.2 Build the native-stack navigator in `src/app` with `SignIn` as `initialRouteName`; register `ApproveTransaction` with sheet/modal `presentation` and `ScanToPay` with full-screen-modal `presentation`
- [ ] 12.3 Replace `NewAppScreen` usage in `App.tsx` with `NavigationContainer` wrapping the stack, inside the existing `SafeAreaProvider`/`RootStoreContext.Provider`
- [ ] 12.4 Wire every screen's navigation calls (Continue, Send, Receive, Scan, back, Claim now, Done, Claim all) per the specs' scenarios

## 13. Verification

- [ ] 13.1 `npm run typecheck` and `npm run lint` pass
- [ ] 13.2 App boots on iOS simulator (or Android emulator) straight to `SignInScreen`
- [ ] 13.3 Manually walk the full flow: SignIn → EnableBiometric → RecoveryPhrase → Home → AssetDetail (back) → Receive (back) → Send → ApproveTransaction → Home; Home → Scan → ScanToPay → PaymentSuccess → ClaimCoupon; Home → Rewards → ClaimCoupon
- [ ] 13.4 Confirm mock data on each screen matches the design canvas (balances, seed words, transactions, coupon codes) via visual comparison against `WDK Wallet.dc.html`
- [ ] 13.5 Update/add a smoke test under `__tests__` if the existing `App.test.tsx` assumed `NewAppScreen` content

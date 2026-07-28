## Context

The app is a stock React Native 0.86.2 / React 19.2.3 TypeScript template. `src/app/App.tsx` renders `NewAppScreen`; `RootStore` is empty; `src/screens`, `src/widgets`, `src/features`, `src/entities` are placeholder directories (`.gitkeep` only). No navigation library is installed. AGENTS.md fixes the FSD layering (`app → screens → widgets → features → entities → shared`), the alias set (`@app/@screens/@widgets/@features/@entities/@shared`), and the MobX conventions (`Request<R>` wrapper, root/feature/domain stores, `observer()` from `mobx-react-lite`).

The source of truth for visuals/copy/mock data is the Claude Design canvas `WDK Wallet.dc.html` (12 phone-frame mockups) rendered via `dc-runtime`'s `support.js`. That runtime and its `{{ }}` template syntax are a web-canvas preview mechanism only — nothing about it (the `<x-dc>` tags, `sc-for` loops, the phone-frame chrome, iOS status bar, home indicator) is carried into the app. Only the visual design tokens (colors, spacing, type scale), layout, copy, and the mock data literals embedded in the mockup's `Component.renderVals()` are ported.

## Goals / Non-Goals

**Goals:**

- Every one of the 12 mockup screens exists as a real, navigable React Native screen with matching visuals and mock data.
- Screens are reachable in the same flow order as the mockup (onboarding → home → asset detail → receive/send/approve → scan-to-pay → success → rewards → claim).
- FSD boundaries and import direction are respected exactly as documented in AGENTS.md; every slice ships an `index.ts` barrel.
- A `WalletStore` (MobX) is the single source of the mock wallet data so screens read observable state rather than hardcoding literals inline, matching the "domain store" pattern AGENTS.md calls out.

**Non-Goals:**

- No real WDK SDK integration, no signing, no networking, no persistence. "Send", "Approve", "Claim", "Enable Face ID" etc. update local mock store state (or simply navigate) — they do not call any wallet backend.
- No pixel-perfect font matching to the mockup's `Helvetica Neue`/web fonts — use RN system font stacks with equivalent weight/size.
- No tablet/Android-specific layout pass; screens target the same 390×844 (iPhone-class) portrait viewport the mockup uses, using RN flex layout instead of the mockup's fixed 390px canvas.
- No dark/light theme toggle — the design is dark-only, so no theme system is introduced beyond the token file.

## Decisions

**Navigation: `@react-navigation/native` + `@react-navigation/native-stack`.**
Alternative considered: a hand-rolled stack in `src/app` (zero native deps). Rejected because the mockup requires two distinct presentation styles the native-stack navigator supports out of the box — a bottom sheet-style modal for Approve (screen 08, rendered as a sheet over a dimmed home/send screen) and a full-screen modal for Scan-to-pay (screen 09) — plus back-gesture support "for free." A custom router would need to reimplement both for no real savings given this is now the repo's first screen-based feature.

**One screen component per mockup frame, named after the mockup's own labels.**
`SignInScreen`, `EnableBiometricScreen`, `RecoveryPhraseScreen`, `HomeScreen`, `AssetDetailScreen`, `ReceiveScreen`, `SendScreen`, `ApproveTransactionScreen`, `ScanToPayScreen`, `PaymentSuccessScreen`, `RewardsScreen`, `ClaimCouponScreen`. Each lives at `src/screens/<name>/` with its own `index.ts` barrel, per AGENTS.md's "one barrel per slice" rule. Screens are thin: they read from `WalletStore` via `useStores()` + `observer()` and compose widgets/features; no screen contains raw style-heavy JSX beyond layout glue.

**Route params carry only IDs/enums, never full objects.**
E.g. `AssetDetail` route takes `{ assetId: string }` and reads the asset from `WalletStore.assets`; `ClaimCoupon` takes `{ couponCode?: string }` (prefilled from Rewards, empty if entered manually). This keeps the store as the single source of truth and avoids stale param copies of observable data.

**Design tokens extracted verbatim from the mockup's inline styles into `src/shared/ui/tokens.ts`.**
Colors (`background: #05070A`, `accent: #26A17B`/`#2DBE8C` gradient, surfaces `#12171C`/`#161B21`, text `#F2F5F7`/`#8A929B`/`#5A626B`), radii (12/14/16/18/20/22), and the two button variants (solid accent, outlined, filled-light "Continue with Apple") are pulled 1:1 from the `.dc.html` inline `style` attributes so screens stay visually faithful without re-deriving values.

**`WalletStore` shape mirrors the mockup's `Component.renderVals()` literals exactly**, so screens 04/05/06/07/09/10/11/12 render the same numbers the design shows (e.g. seed words `ridge, salmon, velvet, orbit, cluster, amber, pigeon, trophy, decade, fabric, wisdom, glance`; txns list; coupons `WDK-5F2A-9K` / `WDK-2C8B-7X` / `WDK-9A1D-3P` / `WDK-4E6F-1M`; $4,182.55 total balance). This is intentional short-term duplication of "design data" — it is mock data, not a contract, and is expected to be replaced wholesale once real WDK SDK wiring lands in a future change.

**QR codes are a static decorative placeholder, not a real QR renderer.**
The mockup's `qr` array (21×21 grid with finder-pattern corners) is reproduced as-is via a `QrPlaceholder` widget (a `View` grid) rather than pulling in a QR-generation library — no scanning/encoding logic is real in this change, so a generated code would be misleading rather than more correct.

**Scan-to-pay's camera view is a static mock, not `react-native-vision-camera`/similar.**
Screen 09 shows a camera viewfinder with a scan target in the mockup; since there's no real QR-scanning logic in scope, it's rendered as a static dark gradient background with the same corner-bracket overlay — no camera permission or native camera dependency is introduced in this change.

## Risks / Trade-offs

- [Adding `react-native-screens` + gesture/reanimated peer deps for React Navigation touches native iOS/Android project files] → Mitigation: pin to the versions React Navigation's own compatibility table lists for RN 0.86, run `pod install`, and smoke-test both platforms boot before/after in the verify step.
- [Duplicating mockup mock data into `WalletStore` now means a second migration later when real WDK data replaces it] → Mitigation: keep all mock data behind the store's public interface (`assets`, `transactions`, `coupons`, `seedPhrase`) so a future change swaps the store's data source without touching screens/widgets.
- [12 screens is a large surface for one change; partial completion could leave dangling navigation routes] → Mitigation: tasks.md sequences work so the navigator only registers a screen once it exists, and the change isn't apply-complete until all 12 are wired and the app boots to SignIn.
- [`App.tsx` losing `NewAppScreen` is a breaking change to the current (placeholder) app entry] → Mitigation: acceptable since `NewAppScreen` was CLI-template scaffolding, not product code; called out explicitly as **BREAKING** in the proposal.

## Open Questions

- Should `EnableBiometricScreen`'s "Enable Face ID" actually call a biometrics-check library (e.g. `react-native-biometrics`) to reflect device capability, or stay a pure mock toggle in `WalletStore` for this change? (Assumed: pure mock toggle — no new biometrics dependency — consistent with the "static UI, mock data" scope decision; revisit when real auth is implemented.)
- Exact RN font family to substitute for the mockup's `Helvetica Neue` stack (assumed: platform default — RN's system font — since no custom font asset was supplied with the design).

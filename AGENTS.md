# AGENTS.md

## Project

A non-custodial multi-chain wallet built on the Tether Wallet Development Kit
(WDK). React Native 0.86.2 (React 19.2.3, TypeScript ~6.0.3), New Architecture
enabled (`newArchEnabled=true` in `android/gradle.properties`).

- Entry point `index.js` registers `AppRoot` from `src/app/App.tsx`.
- Navigation uses React Navigation (native-stack) — see `src/app/navigation`.
- WDK ships worklet code that must be bundled: `npm run wdk:bundle` generates
  `.wdk`. `npm start` runs the bundler in watch mode alongside Metro, and
  `postinstall` bundles automatically after `npm install`.
- iOS native deps: `bundle install` once, then `bundle exec pod install` after
  any native dependency change or first clone.

## Scripts

- `npm start` — WDK watch + Metro together.
- `npm run ios` / `npm run android` — build and run on a device/simulator.
- `npm run typecheck` — `tsc --noEmit`.
- `npm run lint` — ESLint.
- `npm test` — Jest.
- Formatting: Prettier config is `.prettierrc.js` (single quotes, trailing
  commas, `arrowParens: avoid`) — run `npx prettier --write .`. There is no
  `format` script.

## CI/CD

GitHub Actions workflows live in `.github/workflows/`:

- `ci.yml` — `lint`, `typecheck`, and `test:coverage` on every PR and push to
  `main`.
- `cd.yml` — on version tags (`v*`) and manual dispatch, builds and ships via
  Fastlane (`fastlane/Fastfile`) to **TestFlight** (iOS) and the **Play Console**
  internal track (Android).

Setup, required GitHub secrets, and one-time provisioning are documented in
[docs/ci-cd.md](./docs/ci-cd.md). The app identifier is
`com.wdk.best.wallet.sdk.wdkwallet`, shared by the iOS and Android builds.

## Comments

Use single-line `//` comments everywhere, including for multi-line notes and for
documenting functions, types, and public APIs. Do not use block (`/* */`) or
JSDoc (`/** */`) comments. For a multi-line note, prefix each line with `//`:

```ts
// Load the persisted Google account, or `null` if none is stored or the
// stored value is unreadable. Corrupt payloads are dropped so callers fall
// back to a clean state.
export async function loadGoogleAccount(): Promise<GoogleAccount | null> {
```

## Architecture

Source lives under `src/`, organized into layers:

- `src/app` — composition root (registered from `index.js`): providers, root
  store, navigation setup, global app-state sync.
- `src/screens` — screen components, one folder per screen (kebab-case).
- `src/shared` — reusable, business-agnostic code: `ui`, `lib`, `api`,
  `config`, `store`, `types`.

Import rule: a slice may only import from its own layer or layers below it
(`app → screens → shared`), never sideways or upward. Each slice exposes its
public API through an `index.ts` barrel — import from the slice root, not its
internals.

Path aliases (`babel-plugin-module-resolver` + `tsconfig` paths) map to each
layer: `@app`, `@screens`, `@features`, `@shared`, plus `@wdk-internal` for
WDK core internals. Use these instead of relative `../../../` imports.

## State management (MobX)

- Prefer a MobX store for reactive state and cross-component eventing —
  observable state, actions, and `observer` components. Do **not** hand-roll
  pub/sub (listener `Set`s, subscribe/publish functions, event emitters) when a
  store can do the job.
- Stores live under `src/shared/store`: `domains/` holds the domain stores
  (auth, biometry, navigation, wallet, secrets, app-state), `models/` holds the
  domain objects (asset, coupon, transaction, wallet). A single `RootStore`
  wires them together and is provided via `RootStoreContext`; read it with
  `useStore()`.
- Consider the four kinds of stores: root store, feature stores, domain stores,
  and domain objects.
- Wrap any component that reads observable state in `observer()` from
  `mobx-react-lite`. Always pass a **named** function with same name as
  a component — never an anonymous
  arrow: `const App = observer(function App() { … })`, not
  `observer(() => …)`, so the component has a display name in React DevTools
  and stack traces.

## Code review convention: AI-REVIEW / AI-ANSWER

The user leaves inline comments prefixed with `AI-REVIEW:` — questions, doubts,
or observations directed at the assistant. When you see one:

1. Analyze it and decide whether there is real room for improvement or a fix.
2. Write your response directly **below** it, prefixed with `AI-ANSWER:`.
3. Keep the answer in clear, plain language — explain the "why", not just
   restate the code. Avoid jargon where a simple explanation works.
4. If a fix is warranted, make it and explain what changed. If the current code
   is already correct, defend the choice honestly and note it's fine as-is.
5. Do not remove the original `AI-REVIEW:` comment — leave it above your
   `AI-ANSWER:`.

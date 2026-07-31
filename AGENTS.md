# AGENTS.md

## Project

React Native 0.86.2 app (React 19.2.3, TypeScript, New Architecture enabled — `newArchEnabled=true` in `android/gradle.properties`). Currently a near-stock CLI template: entry point `index.js` registers `App` from `App.tsx`, which wraps content in `SafeAreaProvider`/`useSafeAreaInsets` from `react-native-safe-area-context`, plus a `RootStoreContext.Provider` for MobX (see below). No navigation library is installed yet — apply the conventions below as one is introduced.

iOS native deps: `bundle install` once, then `bundle exec pod install` after any native dependency change or first clone.

Formatting: Prettier config is `.prettierrc.js` (single quotes, trailing commas, `arrowParens: avoid`) — run via `npx prettier --write .`; there is no separate `format` script.

## Production practices

### Comments

Use single-line `//` comments everywhere, including for multi-line notes and for documenting functions, types, and public APIs. Do not use block (`/* */`) or JSDoc (`/** */`) comments. For a multi-line note, prefix each line with `//`:

```ts
// Load the persisted Google account, or `null` if none is stored or the
// stored value is unreadable. Corrupt payloads are dropped so callers fall
// back to a clean state.
export async function loadGoogleAccount(): Promise<GoogleAccount | null> {
```

## Architecture (Feature-Sliced Design)

Source lives under `src/`, layered per FSD, adapted for React Native (no URL routing, so the pages layer is named `screens`):

- `src/app` — composition root (registered from `index.js`), providers, global setup.
- `src/screens` — screen components assembled from widgets/features/entities.
- `src/widgets` — composite, self-sufficient UI blocks reused across screens.
- `src/features` — user-facing actions/use-cases (e.g. `add-to-cart`, `sign-in`).
- `src/entities` — business entities (e.g. `user`, `product`) — data shape + display.
- `src/shared` — reusable, business-agnostic code: `ui`, `lib`, `api`, `config`, `types`.

Import rule: a slice may only import from its own layer or layers below it (`app → screens → widgets → features → entities → shared`), never sideways or upward. Each slice exposes its public API through an `index.ts` barrel; import from the slice root, not its internals.

Path aliases (`babel-plugin-module-resolver` + `tsconfig` paths) map to each layer: `@app/*`, `@screens/*`, `@widgets/*`, `@features/*`, `@entities/*`, `@shared/*` — use these instead of relative `../../../` imports.

## State management (MobX)

- Use a generic MobX wrapper around a single async call, `src/shared/store/request.ts` exports `Request<R>`
- Take into consideration four kinds of stores: root store, feature stores, domain stores, domain objects
- Wrap any component that reads observable state in `observer()` from `mobx-react-lite`. Always pass a **named** function — never an anonymous arrow. Use `const App = observer(function App() { … })`, not `observer(() => …)`, so the component has a display name in React DevTools and stack traces.

# AGENTS.md

## Project

React Native 0.86.2 app (React 19.2.3, TypeScript, New Architecture enabled — `newArchEnabled=true` in `android/gradle.properties`). Currently a near-stock CLI template: entry point `index.js` registers `App` from `App.tsx`, which wraps content in `SafeAreaProvider`/`useSafeAreaInsets` from `react-native-safe-area-context`. No navigation or state-management library is installed yet — apply the conventions below as those are introduced.

iOS native deps: `bundle install` once, then `bundle exec pod install` after any native dependency change or first clone.

Formatting: Prettier config is `.prettierrc.js` (single quotes, trailing commas, `arrowParens: avoid`) — run via `npx prettier --write .`; there is no separate `format` script.

## Production practices

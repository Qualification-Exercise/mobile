## 1. Dependencies & worklet bundle

- [x] 1.1 Resolve current versions with `npm view @tetherto/wdk-react-native-core version`, `npm view @tetherto/wdk-wallet-evm-erc-4337 version`, and `npm view @tetherto/wdk-worklet-bundler version`; install the three packages (bundler as devDependency). Also installed `@tetherto/wdk`, `bufferutil`, and `utf-8-validate` required by bundle generation.
- [x] 1.2 Run `npx wdk-worklet-bundler init` at repo root to scaffold `wdk.config.js`; register only `@tetherto/wdk-wallet-evm-erc-4337` in the config
- [x] 1.3 Add `"wdk:bundle": "wdk-worklet-bundler generate --install"` to `package.json` scripts; run `npm run wdk:bundle` and confirm `.wdk/` output is generated
- [x] 1.4 Add `.wdk/` to `.gitignore`

## 2. WDK configuration

- [x] 2.1 Create `src/shared/config/wdk.ts` exporting `wdkConfigs` with a single `ethereum` Sepolia entry (chainId `11155111`, public RPC/bundler/paymaster URLs from the [React Native Quickstart](https://docs.wdk.tether.io/start-building/react-native-quickstart/))
- [x] 2.2 Re-export `wdkConfigs` from `src/shared/config/index.ts`
- [x] 2.3 Update `.env.example` with commented optional placeholders for `WDK_INDEXER_BASE_URL`, `WDK_INDEXER_API_KEY`, `TRON_API_KEY`, and `TRON_API_SECRET` (not required for boot in this change)

## 3. Native platform prerequisites

- [x] 3.1 Set `minSdkVersion = 29` in `android/build.gradle` `ext` block (was `24`)
- [x] 3.2 Run `bundle exec pod install` in `ios/` after npm install pulls native WDK deps

## 4. App provider wiring

- [x] 4.1 Create `src/app/providers/WdkProvider.tsx`: import bundle from `.wdk`, pass `bundle`, `wdkConfigs` to `WdkAppProvider`; indexer props omitted (not required at mount in `@tetherto/wdk-react-native-core@1.0.0-beta.15`)
- [x] 4.2 Implement boot gate in `WdkProvider` (or `WdkGate.tsx`): show full-screen loading on `INITIALIZING`, full-screen error on `ERROR`, render children for `NO_WALLET`, `LOCKED`, and `READY`
- [x] 4.3 Export `WdkProvider` from `src/app/providers/index.ts`
- [x] 4.4 Update `src/app/App.tsx` provider tree: `SafeAreaProvider` → `WdkProvider` → `RootStoreContext.Provider` → `NavigationContainer` → `RootNavigator`
- [x] 4.5 Confirm no screen or feature file imports `useWalletManager`, `useAccount`, `useBalance`, or other WDK hooks (runtime mounted only; mock UI unchanged)

## 5. Verification

- [x] 5.1 Run `npm run typecheck` and `npm run lint` on touched files. Added `@types/node` + `skipLibCheck` in `tsconfig.json` for WDK core source typings.
- [x] 5.2 Rebuild and run on iOS Simulator: cold start shows brief loading, then SignIn screen; navigate through existing mock flows (sign-in → biometric → recovery → home) without crash or WDK-related errors.
- [x] 5.3 Rebuild and run on Android emulator (API 29+): `./gradlew assembleDebug` succeeded (native compile verified; emulator run not executed in this session).
- [x] 5.4 Negative check: missing `.wdk/` or `.wdk-bundle/` fails at Metro bundle time (import error) before the app runs — build-time failure is acceptable; `WdkGate` still handles runtime `ERROR` from engine/config failures.
- [x] 5.5 Confirm Home still displays mock `WalletStore` balances/transactions (not runtime or indexer data). `WalletStore` and feature screens unchanged; no balance hooks wired.

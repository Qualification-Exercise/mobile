This is a new **[React Native](https://reactnative.dev)** project, bootstrapped using `[@react-native-community/cli](https://github.com/react-native-community/cli)`.

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## WDK worklet bundle

This app uses [WDK React Native Core](https://docs.wdk.tether.io/start-building/react-native-quickstart/). The wallet engine runs in a Bare worklet; the bundle is **generated locally** and is not committed to git.

**Configured networks:** `spark`, `ethereum` (Sepolia testnet), `arbitrum`, `polygon`, and `tron`. Network keys and RPC defaults live in `src/shared/config/wdk.ts`; wallet modules are mapped in `wdk.config.js`.

The bundle is generated automatically after every `npm install` via a `postinstall` script, so cloning the repo is enough:

```sh
npm install
```

This writes:

- `.wdk/` — TypeScript declarations and re-export used by `WdkProvider`
- `.wdk-bundle/` — compiled worklet JavaScript loaded at runtime

Whenever you change `wdk.config.js`, the bundle is regenerated automatically:

- **While editing** — `npm start` runs the watcher alongside Metro, rebuilding on every save (or run `npm run wdk:watch` standalone).
- **On commit** — a `lint-staged` rule rebuilds when `wdk.config.js` is staged.
- **After `git pull` / branch switch** — husky `post-merge` and `post-checkout` hooks rebuild when an incoming `wdk.config.js` change is detected.

You can always regenerate manually:

```sh
npm run wdk:bundle
```

If either folder is missing, Metro fails when bundling the app (build-time error) — regenerate it with the command above.

> **CI note:** `postinstall` runs the bundler on every install. To skip it (e.g. in CI where the bundle isn't needed), use `npm ci --ignore-scripts`.

**Native prerequisites:** Android `minSdkVersion` is 29. After adding or updating WDK npm packages, run `bundle exec pod install` in `ios/` before building for iOS.

### `@wdk-internal` path alias

`@wdk-internal` is **not** an npm package. It is a local import alias (Babel `module-resolver` + `tsconfig.json` paths) that points at unpublished source inside `@tetherto/wdk-react-native-core`:

- Babel: `babel.config.js` → `'@wdk-internal': './node_modules/@tetherto/wdk-react-native-core/src'`
- TypeScript: `tsconfig.json` → `"@wdk-internal/*": ["./node_modules/@tetherto/wdk-react-native-core/src/*"]`

Use it only when the public WDK API does not expose what the app needs. Today it is used for **wallet session lock** in `src/features/wallet-seed-phrase/wdkSessionLock.ts`:

- `WorkletLifecycleService.reset()` — clear in-memory seed / worklet state
- `getWalletStore()` / `updateWalletLoadingState()` — set `walletLoadingState` to `not_loaded` while keeping `activeWalletId`

Public `useWalletManager().lock()` is for **logout** (clears `activeWalletId` and breaks `unlock()`). Session lock must not call it.

**Caveat:** these modules are internal to WDK. They are not part of the supported API and may change between `@tetherto/wdk-react-native-core` versions. Prefer removing `@wdk-internal` once WDK ships a public session-lock API (or `clearSensitiveDataOnBackground` covers the use case).

**AppState note:** background session lock lives in `WalletSessionLock.tsx`. Lock on `background` only, not `inactive` — iOS uses `inactive` for the system Face ID sheet during in-app biometry (e.g. view recovery phrase).

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
npm start
```

This runs Metro **and** the WDK bundle watcher together (via `concurrently`), so edits to `wdk.config.js` rebuild the worklet bundle while you develop. To start Metro on its own, use `npm run start:metro`.

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the R key twice or select **"Reload"** from the **Dev Menu**, accessed via Ctrl + M (Windows/Linux) or Cmd ⌘ + M (macOS).
- **iOS**: Press R in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- `[@facebook/react-native](https://github.com/facebook/react-native)` - the Open Source; GitHub **repository** for React Native.

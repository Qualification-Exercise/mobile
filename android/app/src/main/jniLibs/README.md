# jniLibs

## libnativehelper.so (shim)

`react-native-bare-kit`'s prebuilt `libbare-kit.so` (pulled in transitively by
`@tetherto/wdk-react-native-core`, and required by the WDK worklet runtime) has a
hard `DT_NEEDED` dependency on `libnativehelper.so`, which it uses for a single
symbol: `JNI_GetCreatedJavaVMs`.

Starting with **Android 15 (API 35)**, `libnativehelper.so` is no longer exposed to
the application linker namespace. Loading `libbare-kit.so` then fails, which cascades
to `libappmodules.so` and every TurboModule — including the core `PlatformConstants`
module. The app boots to a red box:

> Invariant Violation: TurboModuleRegistry.getEnforcing(...): 'PlatformConstants'
> could not be found.

To fix this we ship a minimal stand-in `libnativehelper.so` that exports only
`JNI_GetCreatedJavaVMs` (plus a `JNI_OnLoad` that captures the `JavaVM`).
`MainApplication.preloadNativeHelperShim()` loads it before React Native starts.

### Rebuilding the shim

The `.so` files in each ABI folder are prebuilt from `stub-src/`. Only re-run this if
`stub-src/nativehelper_shim.c` or `stub-src/nativehelper.map` changes:

```sh
ANDROID_NDK_HOME=$ANDROID_HOME/ndk/<version> \
  bash android/app/src/main/jniLibs/stub-src/build.sh
```

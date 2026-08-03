package com.wdkqualification
import android.content.res.Configuration
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    preloadNativeHelperShim()
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  /**
   * react-native-bare-kit's prebuilt libbare-kit.so hard-links libnativehelper.so
   * for JNI_GetCreatedJavaVMs. Android 15 (API 35) no longer exposes that library to
   * the app linker namespace, so loading libbare-kit.so — and with it libappmodules.so
   * and every TurboModule, including PlatformConstants — fails with a startup red box.
   *
   * We ship a small stand-in libnativehelper.so (see jniLibs/stub-src) that provides
   * only that symbol. Loading it here, before React Native initializes, both captures
   * the JavaVM (via its JNI_OnLoad) and makes the library resident so the dynamic
   * linker resolves libbare-kit.so's dependency.
   */
  private fun preloadNativeHelperShim() {
    try {
      System.loadLibrary("nativehelper")
    } catch (e: UnsatisfiedLinkError) {
      // Fall through: platforms that still provide the real libnativehelper.so
      // (or a future bare-kit that drops the dependency) don't need the shim.
    }
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}

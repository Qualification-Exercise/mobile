/*
 * Minimal stand-in for the platform's libnativehelper.so.
 *
 * react-native-bare-kit's prebuilt libbare-kit.so hard-links libnativehelper.so
 * for a single symbol, JNI_GetCreatedJavaVMs, which it uses to obtain the
 * process JavaVM. Starting with Android 15 (API 35) libnativehelper.so is no
 * longer exposed to the application linker namespace, so loading libbare-kit.so
 * (and therefore libappmodules.so and every TurboModule, including the core
 * PlatformConstants module) fails at startup with a red box.
 *
 * This shim provides just that one symbol. It captures the JavaVM in JNI_OnLoad
 * (invoked when MainApplication preloads this library) and hands it back through
 * JNI_GetCreatedJavaVMs, exactly matching the invocation-API contract Bare relies
 * on. See android/app/src/main/jniLibs/README.md for the build steps.
 */
#include <jni.h>
#include <stddef.h>

static JavaVM *g_vm = NULL;

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *reserved) {
  (void)reserved;
  g_vm = vm;
  return JNI_VERSION_1_6;
}

JNIEXPORT jint JNICALL
JNI_GetCreatedJavaVMs(JavaVM **vmBuf, jsize bufLen, jsize *nVMs) {
  if (g_vm != NULL) {
    if (nVMs != NULL) {
      *nVMs = 1;
    }
    if (vmBuf != NULL && bufLen >= 1) {
      vmBuf[0] = g_vm;
    }
  } else if (nVMs != NULL) {
    *nVMs = 0;
  }
  return JNI_OK;
}

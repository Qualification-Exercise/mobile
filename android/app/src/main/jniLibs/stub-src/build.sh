#!/usr/bin/env bash
#
# Builds the libnativehelper.so shim for every ABI and drops the result into the
# jniLibs ABI folders so Gradle packages it. Re-run if the shim source changes.
#
# Requires an installed Android NDK. Point $ANDROID_NDK_HOME at it, or let the
# script fall back to the newest NDK under $ANDROID_HOME/ndk.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
jnilibs="$(cd "$here/.." && pwd)"

ndk="${ANDROID_NDK_HOME:-}"
if [[ -z "$ndk" ]]; then
  sdk="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
  ndk="$(ls -d "$sdk"/ndk/*/ 2>/dev/null | sort -V | tail -1 || true)"
fi
[[ -n "$ndk" && -d "$ndk" ]] || { echo "NDK not found; set ANDROID_NDK_HOME" >&2; exit 1; }

host="$(uname | tr '[:upper:]' '[:lower:]')-x86_64"
bin="$ndk/toolchains/llvm/prebuilt/$host/bin"
api=29 # matches minSdkVersion

# "<abi>:<clang target triple>" pairs (bash 3.2 on macOS lacks associative arrays)
targets="arm64-v8a:aarch64-linux-android armeabi-v7a:armv7a-linux-androideabi x86:i686-linux-android x86_64:x86_64-linux-android"

for pair in $targets; do
  abi="${pair%%:*}"
  triple="${pair#*:}"
  out="$jnilibs/$abi"
  mkdir -p "$out"
  "$bin/clang" \
    --target="$triple$api" \
    -shared -fPIC -O2 -Wall \
    -Wl,--version-script="$here/nativehelper.map" \
    -Wl,-soname,libnativehelper.so \
    -o "$out/libnativehelper.so" \
    "$here/nativehelper_shim.c"
  echo "built $abi/libnativehelper.so"
done

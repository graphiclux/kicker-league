#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
adb_bin=${AING_ADB:-/private/tmp/aing-android-tools/sdk/platform-tools/adb}
if ! test -x "$adb_bin"; then
  echo 'Set AING_ADB to your Android platform-tools adb executable.' >&2
  exit 1
fi
docker compose -f docker-compose.yml -f infrastructure/compose.usb.yml up -d --no-deps nginx
"$adb_bin" devices -l
if ! "$adb_bin" get-state >/dev/null 2>&1; then
  echo 'Connect one Pixel by USB, enable USB debugging in Developer options, and accept the authorization prompt on the phone. Then run this script again.' >&2
  exit 1
fi
"$adb_bin" reverse tcp:8090 tcp:8090
if [ -f artifacts/and-its-no-good-pixel-usb.apk ]; then
  "$adb_bin" install -r artifacts/and-its-no-good-pixel-usb.apk
fi
"$adb_bin" shell am start -n com.anditsnogood.preview/.MainActivity

#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
repo=$PWD
export JAVA_HOME=${JAVA_HOME:-/private/tmp/aing-android-tools/jdk/Contents/Home}
export ANDROID_HOME=${ANDROID_HOME:-/private/tmp/aing-android-tools/sdk}
export GRADLE_USER_HOME=${GRADLE_USER_HOME:-/private/tmp/aing-android-tools/gradle}
export AING_MOBILE_PROFILE=${AING_MOBILE_PROFILE:-usb}
export NODE_ENV=production
case "$AING_MOBILE_PROFILE" in
  usb) preview_host=127.0.0.1 ;;
  wifi) preview_host=${AING_WIFI_HOST:?Set AING_WIFI_HOST to the Mac LAN IP}; export AING_WIFI_HOST ;;
  *) echo 'AING_MOBILE_PROFILE must be usb or wifi' >&2; exit 1 ;;
esac
export EXPO_PUBLIC_API_URL="http://$preview_host:8090/api"
export EXPO_PUBLIC_SOCKET_URL="http://$preview_host:8090"
apk="artifacts/and-its-no-good-pixel-$AING_MOBILE_PROFILE.apk"
command -v node >/dev/null
command -v pnpm >/dev/null
stage=$(mktemp -d /private/tmp/aing-apk.XXXXXX)
tar --exclude=node_modules --exclude=.next --exclude=dist --exclude=.expo --exclude=android --exclude=ios --exclude=.env -cf - apps packages package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json prisma | tar -xf - -C "$stage"
cd "$stage"
pnpm install --frozen-lockfile --prod=false
pnpm --filter @aing/mobile typecheck
pnpm --filter @aing/mobile exec expo prebuild --platform android --no-install
cd apps/mobile/android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --max-workers=4 --console=plain
cd "$repo"
umask 077
mkdir -p .local-signing artifacts
if [ ! -f .local-signing/preview.keystore ]; then
  openssl rand -hex 32 > .local-signing/preview.password
  "$JAVA_HOME/bin/keytool" -genkeypair -keystore .local-signing/preview.keystore -storepass:file .local-signing/preview.password -keypass:file .local-signing/preview.password -alias aing-preview -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=And Its No Good USB Preview'
fi
export PATH="$JAVA_HOME/bin:$PATH"
signer="$ANDROID_HOME/build-tools/36.0.0/apksigner"
"$signer" sign --ks .local-signing/preview.keystore --ks-pass file:.local-signing/preview.password --ks-key-alias aing-preview --out "$apk" "$stage/apps/mobile/android/app/build/outputs/apk/release/app-release.apk"
"$signer" verify --verbose "$apk"
shasum -a 256 "$apk" > "$apk.sha256"
echo "APK: $repo/$apk"

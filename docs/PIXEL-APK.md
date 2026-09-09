# Pixel local previews

## Current mobile design

The current Wi-Fi APK uses a charcoal/white/gold scoreboard layout. The
Clubhouse leads with weekly points, rank and season total, followed by the
franchise and kick feed. A single league selector includes Create or join a
league. Persistent bottom tabs open Clubhouse, Draft, Standings and Inbox;
Sign out is in Inbox. This supersedes the earlier hamburger-menu experiments.

TypeScript and the Android release build/signature checks passed. Pixel 7 Pro
visual checks covered the pre-draft empty state, a scored demo league with a
long name, populated kick feed, league switching and bottom navigation.
Displayed demo events remain fictional; no live-game status is implied.

## Wi-Fi preview (currently installed)

`artifacts/and-its-no-good-pixel-wifi.apk` connects directly to
`http://192.168.1.30:8090` on this Mac. USB and adb forwarding are not required
after installation. Keep the Mac awake, Docker running, and both devices on
the same local network. The app uses the same preview package and signing key,
so installing the Wi-Fi update preserves login and data.

The Wi-Fi gateway is already enabled. To restore it after changing Compose
configurations, run `bash infrastructure/scripts/pixel-wifi.sh`. The DDEV web
address remains unchanged. This local preview uses HTTP restricted in Android
to the selected Mac host; it is intended for a trusted local network.

The Mac currently uses 192.168.1.30. If DHCP changes that address, reserve it in
your router or rebuild with the new address. Build a Wi-Fi APK with
`AING_MOBILE_PROFILE=wifi AING_WIFI_HOST=192.168.1.30 bash infrastructure/scripts/build-pixel-apk.sh`.
The USB APK remains available but is an earlier version; the current Wi-Fi
APK has Android versionCode 2.

## USB preview

The standalone release APK is `artifacts/and-its-no-good-pixel-usb.apk`.
It includes the JavaScript bundle, uses ARM64 native libraries, and installs as
`com.anditsnogood.preview` with the name “And It's No Good · USB”. Expo Go and
Metro are not required. This preview uses the backend running on this Mac.

## Install and connect

1. On the Pixel, enable Developer options by tapping Build number seven times
   under Settings → About phone. Enable USB debugging in Developer options.
2. Connect the Pixel to this Mac by USB, unlock it, and accept the USB debugging
   authorization prompt.
3. From the project folder run `bash infrastructure/scripts/pixel-usb.sh`.

The script enables a localhost-only Docker gateway on port 8090, forwards that
port through USB with `adb reverse`, installs the APK, and opens the app. The
website remains available at https://anditsnogood.ddev.site/. Keep Docker and
the USB connection running while testing; rerun the script after reconnecting
or rebooting the phone. Set `AING_ADB` if using a different Android SDK location.

Use the existing demo login `admin@anditsnogood.local` with password
`NoGoodDemo2026!`. Demo scores are fictional. Production hosting and production
push notification credentials are separate from this local preview.

## Build verification (September 9, 2026)

The latest Wi-Fi APK includes the paper/green mobile redesign and custom
wide-right goalpost icon. TypeScript, release build and signature verification
passed. Physical Pixel 7 Pro checks covered the clubhouse, app navigation,
three-league selector, league switching and standings; no runtime errors were
reported in the checked Android/React Native logs. One or two leagues remain
directly selectable; more than two use the labeled menu.

The subsequent menu-row update places App navigation and Your leagues beside
each other when the league menu is present. Long selected names use an ellipsis
in the compact trigger and remain fully visible in the selection screen.
TypeScript, Android release build and signing checks passed for this update.

The release build and Android release lint passed. APK signatures v2/v3,
16 KB ZIP alignment, ARM64 libraries, package identity, embedded JavaScript,
and the USB backend address were verified. Mobile TypeScript checks passed.
The USB health endpoint reported database, Redis and worker healthy, and the
DDEV homepage returned HTTP 200. These checks describe the initial USB build;
physical-device verification of the newer Wi-Fi build is recorded above.

## Rebuild

`bash infrastructure/scripts/build-pixel-apk.sh` creates an isolated temporary
source copy, installs locked dependencies, generates Android sources, builds a
release APK, and signs it with the private preview key in `.local-signing/`.
Put Node and pnpm 10.17.1 on PATH first. The script defaults to the temporary
JDK 21 and Android SDK installed for this build; override JAVA_HOME,
ANDROID_HOME and GRADLE_USER_HOME when using a permanent SDK installation.
Required SDK packages: platform-tools, platforms;android-36,
build-tools;36.0.0, ndk;27.1.12297006 and cmake;3.22.1.

Keep `.local-signing/` private and backed up to install future preview updates
without uninstalling. These files and generated native projects/APKs are
ignored by Git and Docker. Production uses a separate application ID and does
not enable the USB preview's loopback HTTP network policy.

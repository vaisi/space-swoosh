<!--
  docs/CODEMAGIC.md
  Changes:
  - Native iOS Firebase: GOOGLE_SERVICE_INFO_PLIST secret (gitignored plist).
  - TestFlight uses .playback so Silent switch no longer mutes SFX.
  - iOS CI stamps CFBundleVersion ≥ 2 (ASC already has 1.0.0 (1)).
  - iOS CI builds ios-native/ (SpriteKit) only; Capacitor iOS is not published.
  - VITE_SUPABASE_* must match vaisi's Project (Away leaderboard).
  - iOS Native workflows inject those vars into Info.plist for SPACE BOARD.
-->

# Codemagic setup

Config file: [`codemagic.yaml`](../codemagic.yaml) at the repo root.

## Workflows

| Workflow | What it builds |
| --- | --- |
| **iOS Native → TestFlight** | [`ios-native/`](../ios-native/) SpriteKit app → TestFlight |
| **iOS Native → App Preview** | Unsigned iPhone **simulator** `.app` for Codemagic’s in-browser simulator |
| **Android → Play internal** | Capacitor Android → Play internal track |

Do **not** run any Capacitor iOS workflow — it was removed. iOS shipping target is native only.

## 1. Connect the repo

1. Sign up at [codemagic.io](https://codemagic.io) with the **vaisi** GitHub account.
2. Add `vaisi/space-swoosh`.
3. Codemagic will detect `codemagic.yaml`.

## 2. Environment group `spaceswoosh`

Click the **gear** on the app → **Environment variables** → group **`spaceswoosh`**.
Mark secrets as Secret.

| Variable | Notes |
| --- | --- |
| `APP_STORE_APPLE_ID` | Numeric App Store Connect app id (required for iOS) |
| `CERTIFICATE_PRIVATE_KEY` | RSA PEM private key for iOS Distribution (Secret). Required — see §3b |
| `VITE_SUPABASE_URL` | vaisi's Project URL (Android / web / **native iOS** SPACE BOARD) |
| `VITE_SUPABASE_ANON_KEY` | vaisi's Project anon / publishable key. iOS Native workflows write these into `Info.plist` `SUPABASE_URL` / `SUPABASE_ANON_KEY` before `xcodebuild`. |
| `GOOGLE_SERVICE_INFO_PLIST` | Full XML of `GoogleService-Info.plist` (Secret). Gitignored; CI writes it to `ios-native/SpaceSwoosh/` before `xcodebuild`. Required for native iOS Firebase Analytics. |
| `VITE_REVENUECAT_IOS_KEY` | `appl_…` public key (later for native IAP) |
| `VITE_REVENUECAT_ANDROID_KEY` | `goog_…` public key |
| `CM_KEYSTORE` | Base64 of the Android upload keystore |
| `CM_KEYSTORE_PASSWORD` | Keystore password |
| `CM_KEY_ALIAS` | Key alias |
| `CM_KEY_PASSWORD` | Key password |
| `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` | Full JSON of the Play Console service account |

## 3. App Store Connect API key (iOS)

1. App Store Connect → Users and Access → Integrations → App Store Connect API.
2. Create a key with **App Manager** access; download the `.p8` once.
3. In Codemagic → Teams → Integrations → Developer Portal → add the key.
4. Name the integration **SpaceSwoosh** (matches `codemagic.yaml`).
5. Create the iOS app record with bundle id `com.orbi.spaceswoosh` if it does not exist yet, then put its numeric Apple ID into `APP_STORE_APPLE_ID`.

## 3b. Code signing — `CERTIFICATE_PRIVATE_KEY` (required)

Apple Distribution certificates fetched from the Developer Portal do **not**
include a private key. CI must own the key, or you get:

`Cannot save Signing Certificates without certificate private key`

### One-time setup (no Mac needed)

1. On your PC (Git Bash / WSL / any openssl):

```bash
openssl genrsa -out ios_distribution_private_key.pem 2048
```

2. Open `ios_distribution_private_key.pem` and copy **everything** including
   `-----BEGIN RSA PRIVATE KEY-----` / `END` lines.
3. Codemagic → gear on the app → **Environment variables** → group **`spaceswoosh`**
   → add **`CERTIFICATE_PRIVATE_KEY`** → paste PEM → mark **Secret**.
4. Keep the `.pem` file in a password manager offline. Losing it means revoking
   that Distribution cert and making a new key.
5. Re-run **iOS Native → TestFlight**. CI will create/match an App Store cert +
   profile for `com.orbi.spaceswoosh` with that key.

### If create fails (max 3 Distribution certs)

developer.apple.com → **Certificates** → revoke an **unused** Apple Distribution
certificate you don’t have the key for → rebuild.

### Optional: profile on Apple’s site

1. **Profiles** → **+** → **Distribution → App Store Connect**
2. App ID `com.orbi.spaceswoosh` → your Distribution cert → Generate  

Not required when `--create` succeeds via API.

## 4. Android upload keystore (generate once, back up forever)

On your machine (JDK already installed):

```bash
keytool -genkeypair -v -keystore space-swoosh-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias spaceswoosh
```

Store the `.jks` offline (password manager / encrypted drive). Losing it means you cannot update the Play listing.

Base64 for Codemagic (PowerShell):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("space-swoosh-upload.jks")) | Set-Clipboard
```

Paste into `CM_KEYSTORE`. Set the three password/alias variables to match.

## 5. Google Play service account

1. Play Console → Setup → API access → create/link a Cloud project.
2. Create a service account with **Release to production, exclude devices, and use Play App Signing** (or at least release to testing tracks).
3. Download JSON → paste entire contents into `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS`.
4. Create the app with package `com.orbi.spaceswoosh` and complete the first store listing draft so the internal track exists.

## 6. First builds

- Push to `main`, or start **iOS Native → TestFlight** manually in Codemagic.
- Native IPA goes to TestFlight (processing can take 5–30 minutes).
- Android AAB goes to Play **internal** track as a draft — promote in the console.

## 6b. App Preview (browser iOS simulator)

The TestFlight IPA is a **device** build. Codemagic App Preview needs an
**unsigned `.app` built with the iPhone simulator SDK**. That is a different
workflow: **iOS Native → App Preview**.

1. In Codemagic, start **iOS Native → App Preview** (Start new build → pick that
   workflow). It does **not** run on every `main` push and does **not** need
   signing secrets or App Store Connect.
2. Wait until the build is green.
3. On the **build page** (not the App Preview sidebar), find the
   `SpaceSwoosh.app` artifact and click **Quick launch**.
4. The in-browser simulator session lasts up to 20 minutes (one at a time on
   the default plan). Use the ⋮ menu to change device or stop the session.

The App Preview sidebar stays empty until you have launched a session in the
last 7 days. **Learn more** / the demo phone on that page are Codemagic’s
sample apps — your game only appears after Quick launch on a simulator build.

**What the browser stream cannot prove**

App Preview is a **video encode** of the simulator, not a local device. Touch
goes browser → Codemagic → sim, so steering can feel laggy even when the DEBUG
HUD is locked at **16.7 ms / 60 Hz**. Audio (`AVAudioEngine` synth +
`AVAudioPlayer` files) often does not reach the browser at all.

- Judge **BOOP fade** and the **Flicker ribbon** in App Preview (those are
  pixels).
- Judge **sound** on a **new** TestFlight IPA after the `.playback` session
  change. The Silent switch no longer mutes gameplay SFX. BGM / NAV voice
  still need MP3s in `ios-native/SpaceSwoosh/Voice/` (repo has `.gitkeep`
  only). Synth boop / turn / collect / crash / shield / portal / swoosh
  play without those files.
- Judge **movement feel** on TestFlight, not App Preview.

## iOS project note

Native app: `ios-native/SpaceSwoosh.xcodeproj`, scheme **SpaceSwoosh**, bundle `com.orbi.spaceswoosh`.

Apple treats **version + build** as unique. Marketing version can stay `1.0.0`;
**CFBundleVersion** (the number in parentheses) must go up every upload.
App Store Connect already has **1.0.0 (1)**. Re-uploading build `1` is rejected
(`ENTITY_ERROR.ATTRIBUTE.INVALID.DUPLICATE`) and no new row appears in TestFlight.

CI writes the next number into `Info.plist` before `xcodebuild` (floor **2**).
Confirm in the Codemagic log: `Info.plist CFBundleVersion=` should be **2 or higher**.
After processing (5–30 min), TestFlight shows **1.0.0 (2)** (or higher).

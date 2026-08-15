<!--
  docs/CODEMAGIC.md
  Changes:
  - iOS CI builds ios-native/ (SpriteKit) only; Capacitor iOS is not published.
  - VITE_SUPABASE_* must match vaisi's Project (Away leaderboard).
-->

# Codemagic setup

Config file: [`codemagic.yaml`](../codemagic.yaml) at the repo root.

## Workflows

| Workflow | What it builds |
| --- | --- |
| **iOS Native → TestFlight** | [`ios-native/`](../ios-native/) SpriteKit app → TestFlight |
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
| `VITE_SUPABASE_URL` | vaisi's Project URL (Android / web builds) |
| `VITE_SUPABASE_ANON_KEY` | vaisi's Project anon / publishable key |
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

## 3b. Code signing identities (required for IPA)

In Codemagic → Team settings → **codemagic.yaml settings → Code signing identities**:

1. **iOS certificates** → **Generate certificate** → type **Apple Distribution** → use the SpaceSwoosh API key.
2. **iOS provisioning profiles** → either:
   - **Fetch profiles** and download the **App Store** profile for `com.orbi.spaceswoosh`, or
   - Create **App Store Connect** profile on developer.apple.com for that App ID, then Fetch/upload it here.

The YAML `ios_signing` block expects an App Store profile + matching Distribution cert for `com.orbi.spaceswoosh`. Without these, archive fails with “requires a provisioning profile”.

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

## iOS project note

Native app: `ios-native/SpaceSwoosh.xcodeproj`, scheme **SpaceSwoosh**, bundle `com.orbi.spaceswoosh`.

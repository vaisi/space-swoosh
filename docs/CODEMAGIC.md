<!--
  docs/CODEMAGIC.md
  Changes: Created — how to connect Codemagic and store signing secrets for
  iOS TestFlight and Play internal builds.
-->

# Codemagic setup

Config file: [`codemagic.yaml`](../codemagic.yaml) at the repo root.

## 1. Connect the repo

1. Sign up at [codemagic.io](https://codemagic.io) with the **vaisi** GitHub account.
2. Add `vaisi/space-swoosh`.
3. Codemagic will detect `codemagic.yaml`.

## 2. Environment group `spaceswoosh`

Team settings → Environment variables → group **spaceswoosh**. Mark secrets as Secret.

| Variable | Notes |
| --- | --- |
| `VITE_SUPABASE_URL` | Same as local `.env` |
| `VITE_SUPABASE_ANON_KEY` | Same as local `.env` |
| `VITE_REVENUECAT_IOS_KEY` | `appl_…` public key |
| `VITE_REVENUECAT_ANDROID_KEY` | `goog_…` public key |
| `NOTIFY_EMAIL` | Where build emails go |
| `APP_STORE_APPLE_ID` | Numeric App Store Connect app id (once the app record exists) |
| `CM_KEYSTORE` | Base64 of the upload keystore (see below) |
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

- Push to `main`, or run a workflow manually in Codemagic.
- iOS IPA goes to TestFlight (processing can take 5–30 minutes).
- Android AAB goes to Play **internal** track as a draft — promote in the console.

## iOS project note

Capacitor 8 uses Swift Package Manager (`CapApp-SPM`). The workflow builds with `--project ios/App/App.xcodeproj` (there is no CocoaPods workspace).

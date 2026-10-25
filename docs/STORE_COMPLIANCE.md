<!--
  docs/STORE_COMPLIANCE.md
  Changes: Analytics collection is forced on at native startup. iOS plist
  IS_ANALYTICS_ENABLED must be true (a false value drops every event).
  Web needs VITE_FIREBASE_APP_ID from a Firebase Web app; otherwise gtag
  sends to G-SMEY63Z40C. DebugView is the immediate check. Realtime on
  Android waits until the app is backgrounded.
  Friends displays Game Center / Play Games photos on-device
  only — Photos stays unchecked. Native Friends board (Game Center /
  Play Games). Web Firebase Analytics (same project as iOS/Android).
  App Privacy ticks match native iOS (Firebase + RevenueCat + call
  signs / Journey replies / Game Center).
-->

# Store compliance checklist

## Links (live after Pages deploy)

| Field | URL |
| --- | --- |
| Privacy policy | https://spaceswoosh.app/privacy.html |
| Support | https://spaceswoosh.app/support.html |
| Support email | heregoesvlad@protonmail.com |

## Supabase

Leaderboard backend: **vaisi's Project** (`ptzaxgslzjefaxdkrvyr`). Schema is in
[`supabase/migrations/20260804200000_create_high_scores_leaderboard.sql`](../supabase/migrations/20260804200000_create_high_scores_leaderboard.sql)
(already applied). Re-check before store launch:

1. Table Editor → `high_scores` exists with RLS on.
2. Authentication → Policies → `high_scores` has SELECT + INSERT only (no UPDATE/DELETE for anon).
3. Optional re-apply: [`supabase/rls.sql`](../supabase/rls.sql).

## App Store Connect

- [ ] Privacy Policy URL: `https://spaceswoosh.app/privacy.html` (redeploy web so the 14 Sep 2026 text is live).
- [ ] App Privacy — **Yes, we collect data from this app**. Tracking = **No** (no ATT, no IDFA).
- [ ] Tick **only** these data types (leave Email, Payment Info, Location, Crash Data, Advertising Data, Photos **unchecked** — Friends shows the Game Center / Play Games photo already on that store profile, on the device only; we do not collect camera-roll photos):

  | Data type | Linked to identity? | Tracking? | Purposes |
  | --- | --- | --- | --- |
  | **User ID** (call sign / handle, plus Game Center player id on iPhone) | Yes | No | App Functionality, Analytics |
  | **Device ID** (Firebase app-instance id — **not** Advertising Identifier) | Yes | No | Analytics |
  | **Purchases** (RevenueCat entitlements; Apple bills) | No | No | App Functionality, Analytics |
  | **Product Interaction** (Firebase events: runs, equip, theme, sound) | Yes | No | Analytics |
  | **Gameplay Content** (ship on a run / board; Friends scores) | No | No | App Functionality, Analytics |
  | **Other User Content** (optional Journey ending text) | No | No | App Functionality |

- [ ] Third-party partners used for those types: Google (Firebase Analytics), RevenueCat, Supabase, Apple (StoreKit + Game Center). Not used for tracking.
- [ ] Enable **Game Center** for `com.orbi.spaceswoosh`. Create four all-time Highest Score leaderboards with ids:
  `com.orbi.spaceswoosh.zigzag.distance`,
  `com.orbi.spaceswoosh.zigzag.obstacles`,
  `com.orbi.spaceswoosh.arc.distance`,
  `com.orbi.spaceswoosh.arc.obstacles`.
- [ ] Age rating questionnaire (no unrestricted web, no chat, cartoon violence against geometric shapes).
- [ ] Paid Apps agreement + tax/banking (required before IAP sandbox works).

## Google Play Console

- [ ] Privacy policy URL on the store listing.
- [ ] Data safety form: Name (optional, leaderboard call sign), User IDs (Play Games player id on Friends), Gameplay content, Purchase history, **App activity / analytics** (Firebase); data encrypted in transit; users can request deletion via support email. Advertising ID is **not** collected (`google_analytics_adid_collection_enabled=false` + `AD_ID` `tools:node="remove"`). Play **App content → Advertising ID** = **No**. Photos / camera remain **unchecked** — Friends only draws the Play Games profile image already on the device.
- [ ] Play Games Services for `com.orbi.spaceswoosh`: create four all-time Highest Score leaderboards (Zigzag/Arc × Distance/Obstacles). `game_services_project_id` is the Firebase project number (`149157024817`). Paste the four `CgkI…` ids into [`android/app/src/main/res/values/games-ids.xml`](../android/app/src/main/res/values/games-ids.xml). Link SHA-1 for debug, upload, and Play App Signing keys or Sign in fails on device. Add the tester Google account under Play Games testers.
- [ ] IARC content rating questionnaire.
- [ ] If the developer account is personal and created after Nov 2023: start a closed test with 12 testers for 14 days before production.

## Firebase (iOS native)

- Same project: `spaceswoosh-faa9c` (bundle `com.orbi.spaceswoosh`).
- Place `GoogleService-Info.plist` at `ios-native/SpaceSwoosh/GoogleService-Info.plist` (gitignored). Codemagic writes it from `GOOGLE_SERVICE_INFO_PLIST`. Re-download the plist after Google Analytics is linked and confirm `IS_ANALYTICS_ENABLED` is `true`, then paste that XML back into the Codemagic secret. A `false` value tells the SDK not to collect. The local plist is set to `true`. `Analytics.swift` also calls `Analytics.setAnalyticsCollectionEnabled(true)` after `FirebaseApp.configure()`, so a stale Codemagic copy of the old plist cannot drop events once that build ships.
- Events flow through `ios-native/SpaceSwoosh/Services/Analytics.swift` (`FirebaseAnalyticsCore`). Same names as Android `Analytics.js`. Every event includes `platform=ios`. Successful IAP also logs GA4 `purchase` (`value` + `currency`).
- Advertising Identifier: not linked (`FirebaseAnalyticsCore`) + `GOOGLE_ANALYTICS_DEFAULT_ALLOW_AD_PERSONALIZATION_SIGNALS=false`.
- Debug: add launch argument `-FIRAnalyticsDebugEnabled`, then play a run and watch `session_start` / `game_over` / `journey_level_end` in Firebase Console → Analytics → DebugView. Realtime can lag a minute after the app backgrounds. Standard reports lag for hours.

## Firebase (Android)

- Project: `spaceswoosh-faa9c` (package `com.orbi.spaceswoosh`, app id `1:149157024817:android:41a728ada0d69ed81bf110`).
- Place `google-services.json` at `android/app/google-services.json` (gitignored; each machine / CI must supply it). The file in the repo is that Android client. It has no analytics-off switch. Re-download it from Project settings after the Firebase CLI is signed in again, and replace the copy if the new file differs.
- Events flow through `src/services/Analytics.js` → `@capacitor-firebase/analytics`. `initAnalytics()` calls `FirebaseAnalytics.setEnabled({ enabled: true })` on native startup. The plugin persists that flag; the following launch is the one that collects if collection had been off.
- The SDK holds events on the device until the app goes to the background, or for about an hour if it stays in front. A five-minute run that never leaves the game shows 0 in Realtime even when the SDK is fine. Press Home, wait a minute, then check Realtime.
- Advertising ID: `android/app/src/main/AndroidManifest.xml` sets
  `google_analytics_adid_collection_enabled=false` and
  `tools:node="remove"` on `com.google.android.gms.permission.AD_ID` so the
  Play Advertising ID declaration can remain **No** (Firebase would otherwise
  merge the permission into the AAB). User counts still use the app instance id.
- Debug: `adb shell setprop debug.firebase.analytics.app com.orbi.spaceswoosh`, open the app, then Firebase Console → Analytics → DebugView. That stream is immediate.
- Most-played ship: break down `game_over` / `journey_level_end` by `ship_id` (also `equip_ship` for menu selection).
- Theme / sound: `set_theme` (`theme`), `set_sound` (master mute on/off), `set_sound_channel` (music/sfx/voice).
- Revenue: GA4 `purchase` after RevenueCat success (skins + Pro). `purchase_skin` remains a non-revenue funnel event.

## Firebase (Web)

- Same project: `spaceswoosh-faa9c`. Register a **Web app** in Firebase Console → Project settings if one is not already there. Copy its `appId` (`1:149157024817:web:…`), `apiKey`, and `measurementId` into `.env` and into GitHub Actions secrets `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_API_KEY`, and `VITE_FIREBASE_MEASUREMENT_ID`, then redeploy Pages. The 23 Oct production bundle was built with all three empty.
- The live web tag checked from Google is `G-SMEY63Z40C` (Google tag `GT-K4VF8CC5`). That is the gtag fallback. It only shows on the Firebase property in the console if that measurement id is a data stream on this property. Confirm it under Google Analytics → Admin → Data streams.
- Events flow through `src/services/Analytics.js`. With `VITE_FIREBASE_APP_ID` set, the page uses `firebase/analytics`. Without it, gtag loads `https://www.googletagmanager.com/gtag/js?id=G-SMEY63Z40C` and the console warns. An ad blocker or Brave shields swallows that request; the Android app does not.
- Check: blocker off, DevTools → Network → `collect`. A hit to `google-analytics.com/g/collect` whose `tid` is this stream should be followed by 1 active user in Realtime within about a minute.
- Advertising Identifier: not used on web.

## PrivacyInfo.xcprivacy

Native iOS: `ios-native/SpaceSwoosh/PrivacyInfo.xcprivacy` (UserDefaults + Firebase gameplay analytics; tracking false). Capacitor iOS tree still has `ios/App/App/PrivacyInfo.xcprivacy` but is not shipped. RevenueCat’s SDK brings its own manifest when linked.

<!--
  docs/STORE_COMPLIANCE.md
  Changes: Web Firebase Analytics (same project as iOS/Android). App Privacy
  ticks match native iOS (Firebase + RevenueCat + call signs / Journey replies).
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

- [ ] Privacy Policy URL: `https://spaceswoosh.app/privacy.html` (redeploy web so the 28 Aug 2026 text is live).
- [ ] App Privacy — **Yes, we collect data from this app**. Tracking = **No** (no ATT, no IDFA).
- [ ] Tick **only** these data types (leave Name, Email, Payment Info, Location, Crash Data, Advertising Data **unchecked**):

  | Data type | Linked to identity? | Tracking? | Purposes |
  | --- | --- | --- | --- |
  | **User ID** (call sign / handle, not a legal name) | Yes | No | App Functionality, Analytics |
  | **Device ID** (Firebase app-instance id — **not** Advertising Identifier) | Yes | No | Analytics |
  | **Purchases** (RevenueCat entitlements; Apple bills) | No | No | App Functionality, Analytics |
  | **Product Interaction** (Firebase events: runs, equip, theme, sound) | Yes | No | Analytics |
  | **Gameplay Content** (ship on a run / board) | No | No | App Functionality, Analytics |
  | **Other User Content** (optional Journey ending text) | No | No | App Functionality |

- [ ] Third-party partners used for those types: Google (Firebase Analytics), RevenueCat, Supabase, Apple (StoreKit). Not used for tracking.
- [ ] Age rating questionnaire (no unrestricted web, no chat, cartoon violence against geometric shapes).
- [ ] Paid Apps agreement + tax/banking (required before IAP sandbox works).

## Google Play Console

- [ ] Privacy policy URL on the store listing.
- [ ] Data safety form: Name (optional, leaderboard), Gameplay content, Purchase history, **App activity / analytics** (Firebase); data encrypted in transit; users can request deletion via support email. Advertising ID is **not** collected (`google_analytics_adid_collection_enabled=false` + `AD_ID` `tools:node="remove"`). Play **App content → Advertising ID** = **No**.
- [ ] IARC content rating questionnaire.
- [ ] If the developer account is personal and created after Nov 2023: start a closed test with 12 testers for 14 days before production.

## Firebase (iOS native)

- Same project: `spaceswoosh-faa9c` (bundle `com.orbi.spaceswoosh`).
- Place `GoogleService-Info.plist` at `ios-native/SpaceSwoosh/GoogleService-Info.plist` (gitignored). Codemagic writes it from `GOOGLE_SERVICE_INFO_PLIST`.
- Events flow through `ios-native/SpaceSwoosh/Services/Analytics.swift` (`FirebaseAnalyticsCore`). Same names as Android `Analytics.js`. Every event includes `platform=ios`. Successful IAP also logs GA4 `purchase` (`value` + `currency`).
- Advertising Identifier: not linked (`FirebaseAnalyticsCore`) + `GOOGLE_ANALYTICS_DEFAULT_ALLOW_AD_PERSONALIZATION_SIGNALS=false`.
- Debug: enable Analytics DebugView for the device, then play a run and watch `game_over` / `journey_level_end` in Firebase Console.

## Firebase (Android)

- Project: `spaceswoosh-faa9c` (package `com.orbi.spaceswoosh`).
- Place `google-services.json` at `android/app/google-services.json` (gitignored; each machine / CI must supply it).
- Events flow through `src/services/Analytics.js` → `@capacitor-firebase/analytics`.
- Advertising ID: `android/app/src/main/AndroidManifest.xml` sets
  `google_analytics_adid_collection_enabled=false` and
  `tools:node="remove"` on `com.google.android.gms.permission.AD_ID` so the
  Play Advertising ID declaration can remain **No** (Firebase would otherwise
  merge the permission into the AAB).
- Debug: enable Analytics DebugView for the device, then play a run and watch `game_over` / `journey_level_end` in Firebase Console.
- Most-played ship: break down `game_over` / `journey_level_end` by `ship_id` (also `equip_ship` for menu selection).
- Theme / sound: `set_theme` (`theme`), `set_sound` (master mute on/off), `set_sound_channel` (music/sfx/voice).
- Revenue: GA4 `purchase` after RevenueCat success (skins + Pro). `purchase_skin` remains a non-revenue funnel event.

## Firebase (Web)

- Same project: `spaceswoosh-faa9c`. Register a **Web app** in Firebase Console if one is not already there, then set `VITE_FIREBASE_APP_ID` (and `VITE_FIREBASE_MEASUREMENT_ID` if it is not `G-SMEY63Z40C`) in GitHub Actions so Pages deploys land in the same Explorations view as iOS/Android (`platform=web`).
- Events flow through `src/services/Analytics.js` → `firebase/analytics`. If the Web app id is missing, gtag is a fallback so the browser is not silent.
- Advertising Identifier: not used on web.

## PrivacyInfo.xcprivacy

Native iOS: `ios-native/SpaceSwoosh/PrivacyInfo.xcprivacy` (UserDefaults + Firebase gameplay analytics; tracking false). Capacitor iOS tree still has `ios/App/App/PrivacyInfo.xcprivacy` but is not shipped. RevenueCat’s SDK brings its own manifest when linked.

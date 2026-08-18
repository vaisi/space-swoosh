<!--
  docs/STORE_COMPLIANCE.md
  Changes: Native iOS Firebase uses FirebaseAnalyticsCore (SDK 12; no IDFA).
  Android: declare gameplay analytics in Data Safety; Ad ID collection disabled.
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

- [ ] Privacy Policy URL set on the app record.
- [ ] App Privacy (nutrition labels): Name (optional, leaderboard), Gameplay content, Product Interaction / analytics (Firebase) — not used for tracking. Advertising Identifier is **not** collected (`FirebaseAnalyticsCore`).
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
- Events flow through `ios-native/SpaceSwoosh/Services/Analytics.swift` (`FirebaseAnalyticsCore`). Same names as Android `Analytics.js`.
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

## PrivacyInfo.xcprivacy

Native iOS: `ios-native/SpaceSwoosh/PrivacyInfo.xcprivacy` (UserDefaults + Firebase gameplay analytics; tracking false). Capacitor iOS tree still has `ios/App/App/PrivacyInfo.xcprivacy` but is not shipped. RevenueCat’s SDK brings its own manifest when linked.

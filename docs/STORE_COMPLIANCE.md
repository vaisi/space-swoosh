<!--
  docs/STORE_COMPLIANCE.md
  Changes: Firebase Analytics on Capacitor Android — declare gameplay analytics
  in Data Safety / App Privacy; Ad ID collection disabled in AndroidManifest.
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
- [ ] App Privacy (nutrition labels): Name (optional, leaderboard), Gameplay content, Purchase history — not used for tracking.
- [ ] Age rating questionnaire (no unrestricted web, no chat, cartoon violence against geometric shapes).
- [ ] Paid Apps agreement + tax/banking (required before IAP sandbox works).

## Google Play Console

- [ ] Privacy policy URL on the store listing.
- [ ] Data safety form: Name (optional, leaderboard), Gameplay content, Purchase history, **App activity / analytics** (Firebase); data encrypted in transit; users can request deletion via support email. Advertising ID is **not** collected (`google_analytics_adid_collection_enabled=false`).
- [ ] IARC content rating questionnaire.
- [ ] If the developer account is personal and created after Nov 2023: start a closed test with 12 testers for 14 days before production.

## Firebase (Android)

- Project: `spaceswoosh-faa9c` (package `com.orbi.spaceswoosh`).
- Place `google-services.json` at `android/app/google-services.json` (gitignored; each machine / CI must supply it).
- Events flow through `src/services/Analytics.js` → `@capacitor-firebase/analytics`.
- Debug: enable Analytics DebugView for the device, then play a run and watch `game_over` / `journey_level_end` in Firebase Console.
- Most-played ship: break down `game_over` / `journey_level_end` by `ship_id` (also `equip_ship` for menu selection).
- Theme / sound: `set_theme` (`theme`), `set_sound` (master mute on/off), `set_sound_channel` (music/sfx/voice).

## PrivacyInfo.xcprivacy

Shipped in the iOS target (`ios/App/App/PrivacyInfo.xcprivacy`). Declares UserDefaults use and collected data types. RevenueCat’s SDK brings its own manifest when linked.

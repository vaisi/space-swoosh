<!--
  docs/STORE_COMPLIANCE.md
  Changes: Created checklist for App Store / Play Console forms that cannot be
  automated from this repo. Complete before first submission.
-->

# Store compliance checklist

## Links (live after Pages deploy)

| Field | URL |
| --- | --- |
| Privacy policy | https://orbi.gg/privacy.html |
| Support | https://orbi.gg/support.html |
| Support email | hello@orbi.gg |

## Supabase

1. Open the SQL editor on the Space Swoosh project.
2. Run [`supabase/rls.sql`](../supabase/rls.sql).
3. Confirm in Authentication → Policies that `high_scores` has SELECT + INSERT only.

## App Store Connect

- [ ] Privacy Policy URL set on the app record.
- [ ] App Privacy (nutrition labels): Name (optional, leaderboard), Gameplay content, Purchase history — not used for tracking.
- [ ] Age rating questionnaire (no unrestricted web, no chat, cartoon violence against geometric shapes).
- [ ] Paid Apps agreement + tax/banking (required before IAP sandbox works).

## Google Play Console

- [ ] Privacy policy URL on the store listing.
- [ ] Data safety form: same categories as above; data encrypted in transit; users can request deletion via support email.
- [ ] IARC content rating questionnaire.
- [ ] If the developer account is personal and created after Nov 2023: start a closed test with 12 testers for 14 days before production.

## PrivacyInfo.xcprivacy

Shipped in the iOS target (`ios/App/App/PrivacyInfo.xcprivacy`). Declares UserDefaults use and collected data types. RevenueCat’s SDK brings its own manifest when linked.

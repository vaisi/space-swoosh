<!--
  docs/STORE_LISTING.md
  Changes: Created — Phase 7 store copy, screenshot checklist, and submission
  order for App Store + Play.
-->

# Store listing (Phase 7)

## Identity

| Field | Value |
| --- | --- |
| Name | Space Swoosh |
| Subtitle / short | One-thumb space dodge on paper |
| Bundle / package | `com.orbi.spaceswoosh` |
| Category | Games → Action (or Arcade) |
| Privacy | https://spaceswoosh.app/privacy.html |
| Support | https://spaceswoosh.app/support.html |

## Short description (Play, ≤80 chars)

```
Steer through ink asteroids. Open World or Journey. One thumb.
```

## Full description

```
Space Swoosh is a one-thumb vertical dodge game in a paper universe.

Your ship climbs on its own. You bank left and right in smooth arcs — swipe or tap — to slip between ink asteroids, grab shields, and thread narrow gaps for style points.

Two ways to play
• Open World — endless distance, online leaderboard
• Journey — 40 levels, three stars each, progress saved on your device

Cosmetic ships (Pulse, Quill) are optional unlocks. They change how you look, not how you fly.

Fascinating.
```

## Keywords (App Store, comma-separated, ≤100 chars)

```
dodge,arcade,space,casual,one thumb,endless,journey,minimal,paper
```

## Screenshots to capture

From a device or simulator, portrait:

1. Main menu (brand + ship)
2. Open World mid-run (HUD visible)
3. Journey map
4. Level clear / outcome with stars
5. Options → Ship picker (show a locked premium tile if possible)

| Platform | Size |
| --- | --- |
| iPhone | 6.9" (e.g. 1320×2868) — required |
| Android phone | at least one 16:9 or taller portrait |
| Play feature graphic | 1024×500 — generate from brand icon + wordmark on paper |

Tip: after `npm run build:native`, run on the Pixel and take system screenshots; for iOS use TestFlight once Codemagic delivers a build.

## Submission order

1. Run `supabase/rls.sql` in the Supabase SQL editor.
2. Finish Codemagic secrets ([CODEMAGIC.md](./CODEMAGIC.md)).
3. Create App Store Connect + Play app records; paste privacy/support URLs.
4. Ship internal / TestFlight builds; smoke-test swipe, pause, restore purchases.
5. Fill Data safety / App Privacy / age ratings ([STORE_COMPLIANCE.md](./STORE_COMPLIANCE.md)).
6. Submit for review.

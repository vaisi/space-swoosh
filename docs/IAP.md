<!--
  docs/IAP.md
  Changes:
  - Created: store / RevenueCat setup checklist for the Pulse and Quill
    premium ship skins. Fill in dashboard products before sandbox testing.
-->

# In-app purchases — Space Swoosh

Cosmetic ship skins only. No gameplay paywall. The four free ships
(Focus / Flicker / Ember / Wisp) stay free forever.

## Products

| Skin | Store product ID | RevenueCat entitlement |
| --- | --- | --- |
| Pulse | `gg.orbi.spaceswoosh.skin.pulse` | `skin_pulse` |
| Quill | `gg.orbi.spaceswoosh.skin.quill` | `skin_quill` |

Type: **non-consumable** on both App Store Connect and Google Play Console.

Suggested price tier: the cheapest meaningful cosmetic tier in your market
(e.g. $0.99 / €0.99) — tune later.

## RevenueCat

1. Create a project, add iOS app (`gg.orbi.spaceswoosh`) and Android app
   (`gg.orbi.spaceswoosh`).
2. Copy the **public** SDK keys into `.env`:

```
VITE_REVENUECAT_IOS_KEY=appl_...
VITE_REVENUECAT_ANDROID_KEY=goog_...
```

3. Create the two products above (linked to App Store / Play product ids).
4. Create entitlements `skin_pulse` and `skin_quill`, attach each product.
5. Create an Offering (e.g. `default`) with both packages attached so
   `Purchases.getOfferings()` can resolve them.

## App Store Connect / Play Console (you must do these in the browser)

- Sign the Apple Paid Applications agreement; complete tax + banking.
  Sandbox purchases will not work until that clears.
- Create the two non-consumable IAPs with the exact product ids above.
- On Play: create the same product ids, activate them, and use a license
  tester account for sideloaded builds (or an internal track build).

## App behaviour

- Locked tiles show a price (when the store returns one) or `LOCKED`.
- Tap a locked tile → purchase sheet.
- **Options → Restore Purchases** re-syncs entitlements (required on iOS).
- Ownership is cached in `localStorage` under `ownedSkinIds` so offline play
  keeps unlocks; a successful store refresh is authoritative.

## Web

IAP is native-only. In the browser, premium tiles stay locked and tapping
them explains that unlocks are in the iOS / Android apps.

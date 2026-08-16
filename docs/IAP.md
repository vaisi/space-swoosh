<!--
  docs/IAP.md
  Changes:
  - Added Darner (dragonfly), Puff (dandelion), Argus (peacock), Chime (temple bells).
  - Added Luna (lunar moth) and Wish (constellation comet).
  - Added Lantern (jellyfish bell + plankton) and Bloom (soap-film + prism motes).
  - Added Fletch (smooth arrow + length-wise dawn ribbon).
  - Added Dusk (Echo crescent + purple Mote cloud).
  - Expanded to all premium ships (everything except Focus / Flicker / Ember / Saber).
  - Created: store / RevenueCat setup checklist for premium ship skins.
  - App / product IDs renamed gg.orbi.spaceswoosh → com.orbi.spaceswoosh.
-->

# In-app purchases — Space Swoosh

Cosmetic ship skins only. No gameplay paywall. The four free ships
(**Focus / Flicker / Ember / Saber**) stay free forever. Every other ship is a
separate non-consumable IAP.

## Products

Type: **non-consumable** on both App Store Connect and Google Play Console.

| Skin | Store product ID | RevenueCat entitlement |
| --- | --- | --- |
| Wisp | `com.orbi.spaceswoosh.skin.wisp` | `skin_wisp` |
| Pulse | `com.orbi.spaceswoosh.skin.pulse` | `skin_pulse` |
| Quill | `com.orbi.spaceswoosh.skin.quill` | `skin_quill` |
| Fletch | `com.orbi.spaceswoosh.skin.fletch` | `skin_fletch` |
| Nyan | `com.orbi.spaceswoosh.skin.nyan` | `skin_nyan` |
| Shard | `com.orbi.spaceswoosh.skin.shard` | `skin_shard` |
| Halo | `com.orbi.spaceswoosh.skin.halo` | `skin_halo` |
| Needle | `com.orbi.spaceswoosh.skin.needle` | `skin_needle` |
| Echo | `com.orbi.spaceswoosh.skin.echo` | `skin_echo` |
| Dusk | `com.orbi.spaceswoosh.skin.dusk` | `skin_dusk` |
| Seal | `com.orbi.spaceswoosh.skin.seal` | `skin_seal` |
| Hatch | `com.orbi.spaceswoosh.skin.hatch` | `skin_hatch` |
| Trace | `com.orbi.spaceswoosh.skin.trace` | `skin_trace` |
| Ring | `com.orbi.spaceswoosh.skin.ring` | `skin_ring` |
| Fold | `com.orbi.spaceswoosh.skin.fold` | `skin_fold` |
| Mote | `com.orbi.spaceswoosh.skin.mote` | `skin_mote` |
| Spine | `com.orbi.spaceswoosh.skin.spine` | `skin_spine` |
| Orbit | `com.orbi.spaceswoosh.skin.orbit` | `skin_orbit` |
| Ink | `com.orbi.spaceswoosh.skin.ink` | `skin_ink` |
| Flux | `com.orbi.spaceswoosh.skin.flux` | `skin_flux` |
| Cinder | `com.orbi.spaceswoosh.skin.cinder` | `skin_cinder` |
| Lantern | `com.orbi.spaceswoosh.skin.lantern` | `skin_lantern` |
| Bloom | `com.orbi.spaceswoosh.skin.bloom` | `skin_bloom` |
| Lyra | `com.orbi.spaceswoosh.skin.lyra` | `skin_lyra` |
| Sprout | `com.orbi.spaceswoosh.skin.sprout` | `skin_sprout` |
| Plume | `com.orbi.spaceswoosh.skin.plume` | `skin_plume` |
| Koi | `com.orbi.spaceswoosh.skin.koi` | `skin_koi` |
| Spore | `com.orbi.spaceswoosh.skin.spore` | `skin_spore` |
| Boreal | `com.orbi.spaceswoosh.skin.boreal` | `skin_boreal` |
| Luna | `com.orbi.spaceswoosh.skin.luna` | `skin_luna` |
| Wish | `com.orbi.spaceswoosh.skin.wish` | `skin_wish` |
| Darner | `com.orbi.spaceswoosh.skin.darner` | `skin_darner` |
| Puff | `com.orbi.spaceswoosh.skin.puff` | `skin_puff` |
| Argus | `com.orbi.spaceswoosh.skin.argus` | `skin_argus` |
| Chime | `com.orbi.spaceswoosh.skin.chime` | `skin_chime` |

Suggested price tier: the cheapest meaningful cosmetic tier in your market
(e.g. $0.99 / €0.99) — tune per SKU later.

Play Console listing icons: `npm run assets:iap` → `assets/iap/<id>.png`
(real in-game hull + wake rendered via `@napi-rs/canvas`).

## RevenueCat

1. Create a project, add iOS app (`com.orbi.spaceswoosh`) and Android app
   (`com.orbi.spaceswoosh`).
2. Copy the **public** SDK keys into `.env`:

```
VITE_REVENUECAT_IOS_KEY=appl_...
VITE_REVENUECAT_ANDROID_KEY=goog_...
```

3. Create each product above (linked to App Store / Play product ids).
4. Create each entitlement (`skin_<id>`), attach the matching product.
5. Create an Offering (e.g. `default`) with **all** packages attached so
   `Purchases.getOfferings()` can resolve them.

## App Store Connect / Play Console (you must do these in the browser)

- Sign the Apple Paid Applications agreement; complete tax + banking.
  Sandbox purchases will not work until that clears.
- Create each non-consumable IAP with the **exact** product ids above
  (App Store Connect **and** Google Play Console).
- On Play: activate products and use a license tester for sideloaded /
  internal-track builds.
- Upload `assets/iap/<id>.png` as each Play product’s icon.

## App behaviour

- Main menu and Options → Ship browse the full roster.
- Locked ships show a price (when the store returns one) or `LOCKED`.
- Tap a locked ship → purchase sheet.
- Owned ships equip on cycle / tap; **Play** always uses the last owned equip.
- **Options → Restore Purchases** re-syncs entitlements (required on iOS).
- Ownership is cached in `localStorage` under `ownedSkinIds` so offline play
  keeps unlocks; a successful store refresh is authoritative.

## Web

IAP is native-only. In the browser, premium tiles stay locked and tapping
them explains that unlocks are in the iOS / Android apps.

<!--
  docs/IAP.md
  Changes:
  - Native iOS uses the same product / entitlement contract via RevenueCat iOS SDK.
  - Added store Display Name + Description for every premium skin (in-game
    blurbs; four shortened to App Store's 45-character Description limit).
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

Paste **Display Name** = the Skin column, **Description** = the Description
column. App Store Connect Description is max **45 characters**; Play Console
allows longer, so the same string works on both. Copy matches the in-game
blurb except four marked `*` (trimmed to fit Apple).

| Skin | Store product ID | RevenueCat entitlement | Description |
| --- | --- | --- | --- |
| Wisp | `com.orbi.spaceswoosh.skin.wisp` | `skin_wisp` | Weightless. Sheds sparks. |
| Pulse | `com.orbi.spaceswoosh.skin.pulse` | `skin_pulse` | Signal wake. Instrumental, lit. |
| Quill | `com.orbi.spaceswoosh.skin.quill` | `skin_quill` | A fine blue line of travel. |
| Fletch | `com.orbi.spaceswoosh.skin.fletch` | `skin_fletch` | A smooth arrow. Dawn on the wake. |
| Nyan | `com.orbi.spaceswoosh.skin.nyan` | `skin_nyan` | A long rainbow line of travel. |
| Shard | `com.orbi.spaceswoosh.skin.shard` | `skin_shard` | Faceted. A hard wake. |
| Halo | `com.orbi.spaceswoosh.skin.halo` | `skin_halo` | Orbital. Rings the path. |
| Needle | `com.orbi.spaceswoosh.skin.needle` | `skin_needle` | Linear. One thin thread. |
| Echo | `com.orbi.spaceswoosh.skin.echo` | `skin_echo` | Paired. Leaves a twin. |
| Dusk | `com.orbi.spaceswoosh.skin.dusk` | `skin_dusk` | Crescent. A violet cloud. |
| Seal | `com.orbi.spaceswoosh.skin.seal` | `skin_seal` | Pressed tiles. Peels at the wall. |
| Hatch | `com.orbi.spaceswoosh.skin.hatch` | `skin_hatch` | Lateral marks. Stretches on impact. |
| Trace | `com.orbi.spaceswoosh.skin.trace` | `skin_trace` | One thin line. Springs on a bounce. |
| Ring | `com.orbi.spaceswoosh.skin.ring` | `skin_ring` | Blooming rings. Squash, no pop. |
| Fold | `com.orbi.spaceswoosh.skin.fold` | `skin_fold` | Origami. A dashed crease. |
| Mote | `com.orbi.spaceswoosh.skin.mote` | `skin_mote` | Soft ink. A drifting cloud. |
| Spine | `com.orbi.spaceswoosh.skin.spine` | `skin_spine` | Upright. A ladder wake. |
| Orbit | `com.orbi.spaceswoosh.skin.orbit` | `skin_orbit` | Planetoid. A lagging orbit wake. |
| Ink | `com.orbi.spaceswoosh.skin.ink` | `skin_ink` | Calligraphic. Tip reverses on boop. |
| Flux | `com.orbi.spaceswoosh.skin.flux` | `skin_flux` | Hex crystal. Ink and signal dashes. |
| Cinder | `com.orbi.spaceswoosh.skin.cinder` | `skin_cinder` | Warm petal. Ember ribbon, cool ash. |
| Lantern * | `com.orbi.spaceswoosh.skin.lantern` | `skin_lantern` | A living bell. Gold heart. Plankton trail. |
| Bloom * | `com.orbi.spaceswoosh.skin.bloom` | `skin_bloom` | Soap-film spheres. Prism motes that pop. |
| Lyra | `com.orbi.spaceswoosh.skin.lyra` | `skin_lyra` | A star-forged craft. Aurora in its wake. |
| Sprout | `com.orbi.spaceswoosh.skin.sprout` | `skin_sprout` | A living seed. Pollen on the wind. |
| Plume | `com.orbi.spaceswoosh.skin.plume` | `skin_plume` | A firebird. Embers rise, then cool. |
| Koi | `com.orbi.spaceswoosh.skin.koi` | `skin_koi` | A river spirit. Scales in the current. |
| Spore * | `com.orbi.spaceswoosh.skin.spore` | `skin_spore` | A living cap. Amber heart. Spores trail. |
| Boreal * | `com.orbi.spaceswoosh.skin.boreal` | `skin_boreal` | A northern-light ribbon. Waves on the wall. |
| Luna | `com.orbi.spaceswoosh.skin.luna` | `skin_luna` | A lunar moth. Moon heart. Dust on the wind. |
| Wish | `com.orbi.spaceswoosh.skin.wish` | `skin_wish` | A bottled comet. Stars fall from its wake. |
| Darner | `com.orbi.spaceswoosh.skin.darner` | `skin_darner` | A needle of light. Mosaic scales in its wake. |
| Puff | `com.orbi.spaceswoosh.skin.puff` | `skin_puff` | A dandelion clock. Seeds drift from its wake. |
| Argus | `com.orbi.spaceswoosh.skin.argus` | `skin_argus` | A peacock fan. Eyespots stamp the path. |
| Chime | `com.orbi.spaceswoosh.skin.chime` | `skin_chime` | Temple bells. Sound rings down the wake. |

In-game blurbs that were trimmed for Apple (`*`):

| Skin | In-game blurb |
| --- | --- |
| Lantern | A living bell. Gold heart. Plankton in the dark. |
| Bloom | Soap-film spheres. Prism motes. They pop on the wall. |
| Spore | A living cap. Amber heart. Spores in the dark. |
| Boreal | A ribbon of northern light. It waves on the wall. |

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
- Ownership is cached under `ownedSkinIds` (`localStorage` on Android / web,
  `UserDefaults` on native iOS) so offline play keeps unlocks; a successful
  store refresh is authoritative.
- Native iOS uses the RevenueCat iOS SDK (`PurchasesService` /
  `EntitlementsStore`) with the same product ids and `skin_<id>` entitlements.
  The public `appl_…` key is injected as Info.plist `REVENUECAT_IOS_KEY`.

## Web

IAP is native-only. In the browser, premium tiles stay locked and tapping
them explains that unlocks are in the iOS / Android apps.

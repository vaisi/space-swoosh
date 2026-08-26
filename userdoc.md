<!-- Changes: iOS PLAY cards are taller and vertically centered; Journey map is
     5 tiles per row and taller (same as Android); shield rings match Android
     size; LEVEL N and wall boop can both be heard. -->
# Space Swoosh — Player Guide

> How to play. No spoilers, just the essentials.
>
> **Privacy (Android + iOS store):** The game may send anonymous gameplay analytics
> (for example which ship you flew). It does **not** use the device Advertising
> ID for ads or tracking. Open Space scores use a public project key with
> server-side row limits (read + submit only; no player accounts). Call signs
> you submit are stored on the online board. If you finish the Journey, the
> words you send (or that you left it unsaid) and the ship you flew are stored
> privately — not on the public board. Journey progress and Open Space
> personal bests stay on your device.
>
> **iPhone / iPad:** The shipping App Store target is the **native** Space Swoosh
> app. TestFlight menus use the same paper/ink framed chrome as Android (Space
> Grotesk + Space Mono). Home is Play, Space Log, Options, and High Scores.
> Options is a hub (Ship, Controls, Sound, Light/Dark Mode). Play offers Journey
> then Open Space on two tall, centered cards; Hazard Lab is the **LAB** tile on the Journey map. High Scores
> is the same online SPACE BOARD as Android (Zigzag/Arc, distance or obstacles).
> A top-10 Open Space run prompts for a call sign; otherwise tap Submit Score.
> Cycle ships on the home screen (◀ / ▶) or pick one under
> Options → Ship; your choice is saved. The
> whimsical ships (Lantern through Chime) show their colors on the hangar tile,
> not a plain ink blob. **Halo**’s ring ticks, **Orbit**’s satellite, and
> **Nyan**’s gray crescent with pink spots match Android in play (hangar cards
> freeze that pose). The other hulls show the same **soft** ink wash and crease as
> Android (a light halo, not a solid white ring). Each hangar card also shows a short sample of that ship’s wake
> under the hull — chevrons, rings, stamps, dashes, and the rest of the
> family, not a column of dots. The
> four always-free ships are **Focus**, **Flicker**, **Ember**, and **Saber**.
> Playtest builds currently open the whole hangar (`UNLOCK_ALL_SKINS`) so every
> ship is free to fly; store builds will gate the rest behind a price or Restore
> Purchases. Journey tiles are still all open
> (`UNLOCK_ALL_LEVELS`) so you can tap any level. Zigzag from the start; Arc
> sits under Options → Controls as out of service until the Journey is finished.
> Wall BOOP (the word
> fades after the bounce), each ship’s own hull and wake,
> flowing wind dashes, a pulsing two-ring shield that matches Android’s size
> (about four seconds on iPhone),
> the same four-point sparkle as Android with a soft blue disc behind it, blue `+FUEL`,
> NAV captions, a Space Log, and the same
> run-start roll / finish
> flyout as Android. Music loops under the run and quiets while NAV talks
> when those clips are in the build. After the navigator line, the compact
> icon HUD eases in (route, then pause, then smash). Voice lines play if the
> build includes them; turn Voice off in Options if you want captions only.
> At the start of a Journey level you hear the day line; a wall BOOP still
> sounds under it, and the spoken first-boop waits until that line is done.
> Wall hits, turns, pickups, and crashes should make sound on the **newest**
> TestFlight even if the Silent switch is on (pause → Sound still
> mutes everything; Options → Sound isolates Music / Sound FX / Voice). The turn cue is the same clip as Android when `turn.mp3` is in the
> build. Music and spoken NAV lines play only when those clips are in the
> build. The **browser App Preview** is a video of the simulator — it often
> has **no sound** and extra tap delay. Store prices and Restore Purchases
> are in this iOS build (sandbox / TestFlight). High Scores / Submit Score use the same online board as Android.
>
> **Journey opening:** The first time you pick Journey, a short Signal brief
> appears (a torn message, pieces along the path, NAV guiding you back). Tap
> **Continue** — that message is saved in your Space Log (Journey → The Call).
> Then the level map opens. Early levels teach one thing at a time: turn, rocks,
> moving rocks, blue lights, then the shield.
>
> **Hazard Lab:** At the top of the Journey map, an always-unlocked **LAB** tile
> lets you practice square blooms, sweeps, push nodes, wind currents, portals,
> and black holes (also in the main Journey). After a hop or well leaves the
> ship low, the camera eases it back to the usual height after a few seconds
> (same on browser, Android, and the Lab).
> It does **not** change your Journey level unlocks or stars.
>
> **Wall Boost:** On very long runs (after **12000 KM**), a thin blue bar
> sometimes lights up on the left or right edge. Bank into it for a fresh shield
> and a strong speed rush — fuel does not drain during the rush. Black side
> barriers are still deadly — only the blue edge is a gift.
>
> Open Space high scores are online per flight style (Zigzag and Arc boards;
> call sign, ship, + distance; top 100 each). Auto call-sign prompt only for
> top 10 on that style’s board; Submit Score stays available anytime.
> Your Open Space personal bests (per style) and Journey progress stay on your device.
> Journey and Open Space play short session voice cues on your first wall BOOP
> and on each Style Swoosh (swoosh is voice-only; music keeps playing under it).
>
> **Look (this build):** Starts in **Light Mode** (cream paper + Signal Blue).
> Options has a **Light Mode / Dark Mode** toggle (saved on your device). Dark is
> night paper — charcoal ground, light ink, shiny ice-blue accents. In Dark Mode
> the whole page stays charcoal; a beige frame marks the edges of the playfield.
> On a desktop browser the game fills the window height, with a quiet
> “Soon on iOS & Android” line in the leftover space on the right.
>
> **Lives:** Not active in this build. Journey and Open Space can be retried
> as often as you like after a crash or empty tank. (A lives pool and Pro
> unlimited-lives offer are in the code, switched off until further notice.)

## The goal

Fly your ship through space. You travel upward automatically — your job is to
**steer around the asteroids**. Crash and the run is over.

There are two ways to play, and you pick one every time you hit Play.

## Two ways to play

Play lists **Journey first** — it's the recommended path. Each visit, the short
line under Journey and Open Space is a fresh Spock-voice blurb (same idea, new
wording). Journey's card shows your current level and star total; Open Space's
card shows your **personal best** distance on this device once you've finished
at least one run. Zigzag and Arc bests are tracked separately — if you've only
flown one style it still just says personal best; if you've flown both, both
distances show. Styles you haven't tried don't appear.

### Journey

Deep space exploration starting from Day 1. **42 numbered days** (119 stars),
each with a distance goal to reach. A calm navigator speaks at the start of each
level (no chatter mid-flight). Words appear **one sentence at a time** so you can read
along. The last day stays quiet until you pass the finish gate.

**Levels 1–5 teach the basics**, in order:

1. Empty sky — practice your turn.
2. Simple asteroids.
3. A rock that drifts sideways.
4. Blue fuel diamonds (sparkles) — take them; they refill your tank.
5. The shield — survive a hit, smash rocks for the third star.

After that the runs stay longer and the field gets busier. Levels get harder a
step at a time and then hold there for a while, so you get room to master what
just arrived before anything new does. From **Day 6** hazards start showing up
in mixed pairs, side walls keep rocks or movers in the middle of the corridor,
and each day has a short spike (a wall weave, moons, a rock storm) with a
breath after it. From **Day 20** the sky does not simply get faster — the mix
gets denser, a third pairing shows up between spikes, and from Day 25 a day
can have two spikes that feel different from each other. The same well or
wall will not stamp itself
row after row. **Open Space** gets busier the farther you fly — by about 5,000 KM
the sky is packed like a late Journey day (not long empty corridors), and past
12,500 KM the odd storm is a real patch of trouble with only a short breath after.
Cruise is a little snappier than it used to be, without turning
into a speed contest. The sparkles star opens when fuel diamonds
do (level 4); the smash star opens with the shield (level 5). Both targets climb
later without turning into a grind.

Flying Journey is also how you **unlock Space Log entries** — observe and interact
with hazards and boosts to fill your field manual. The opening Signal brief is
the first Journey entry. After the last relay, you can write one thing into the
dark — or leave it unsaid. That choice is once per device; later visits still
play the ending, without another prompt. The ship you flew is saved with that
reply. The lights that bloom there are the same
Signal Blue as the fuel sparkles, kept small so the field stays dark.

### Open Space

The endless run. No finish line: fly until you crash or run out of fuel, and see how far you got.
Right at the start, Open Space shows how to steer until you actually do it:
**Zigzag** — phones say TAP (tap anywhere); a desktop browser says
Click or press, then a SPACE bar icon, then the word space. **Arc** — SWIPE LEFT,
then SWIPE RIGHT on phones; a desktop browser says drag left or press, then a
left-arrow key icon, then the word key (and the same for the right-arrow key),
one direction at a time. A bouncing finger or pointer sits on the playfield so it is hard to
miss. Journey does not use these lines.
Asteroids get thicker and stranger the further you go, and new hazards keep
turning up — they do **not** flash a name banner when they first appear.
The field stays readable while types arrive; after about **5,000 KM** the
sky is packed like a late Journey day, and past **12,500 KM** storms come in
harder pairs with only a short breath between them. Cruise is a bit snappier than before; it does not keep climbing.
On browser and Android, if a wormhole or black hole leaves the ship sitting low in the
view, the camera slowly eases it back to the usual height over several seconds.
**This is the mode with the leaderboard** — if your run lands in the
top 10 for the flight style you were using (Zigzag or Arc), after Mission Failed
settles a Submit Signal card lists your distance, asteroids destroyed, and rank —
tap the call-sign field, type a short name, and send it up. On phones the card
keeps that same layout above the keyboard (the end-screen buttons stay hidden).
Outside
the top 10 you can still tap **Submit Score** to send a signal. Scores go to
that style’s board only. The board shows your call sign and the ship you flew
(`Name, Ship` and the score).
**High Scores** on the main menu opens the **Space Board** — tap the Zigzag /
Arc button in the title bar (same idea as Light/Dark Mode) to switch boards,
then browse by distance or obstacles smashed (up to 100 runs each, 10 per
page). Ranks 1–3 show trophy icons. No account required.

Every run — Journey or Open Space — opens with a short **intro**: the ship rolls
up from the bottom into place while a light shower of stars at the top fades
out. Then the navigator’s line (Journey) sits on screen sentence by sentence
with voice and fades; a moment later distance and pause ease in. Once sparkles
can appear, a sparkle icon + blue fuel bar shows in the compact HUD; the smash
row appears when you smash your first asteroid. The ship intro itself can't be skipped.

The levels are grouped into seven story chapters on the Journey map:
**First Light → The Long Way → Fragments → Deep Static → The Senders → The Source → Arrival**.
The first chapter is the teach band; later chapters follow the signal story while
new hazards arrive one step at a time, and the level that introduces a hazard
leans on it heavily so you can learn it. Later arrivals include wind currents
(around Day 15), square blooms (Day 20), push nodes before black holes
(Day 25), and slim sweep lines (Day 31).

Stars unlock with the teach band — early levels only ask for what you’ve learned:

| Levels | Stars | How to earn them |
| --- | --- | --- |
| 1–3 | 1 / 1 | Reach the distance goal. |
| 4 | 2 / 2 | Goal + collect N sparkles. |
| 5+ | 3 / 3 | Goal + sparkles + smash asteroids with the shield. |

Stars add up across attempts, so you can go back for the sparkles or smash star
later without repeating the others in the same go. Clearing a level unlocks the
next one; your progress is saved on your own device and doesn't touch the
leaderboard.

## Main menu

When the game loads you land on the main menu. The tagline under the title
changes each visit — dry science-officer commentary. Crash and level-clear
screens do the same with their own lines.

Under the title, your ship is shown with its name. Tap the triangle arrows
beside it (or press **Left** / **Right** on a keyboard) to browse the full
roster — owned ships equip and save. Playtest builds currently treat every
ship as owned. On store builds, locked ships show a price (tap the ship
to unlock on the apps). Options → Ship has the same roster in a grid.

- **Play** — Journey (recommended) then Open Space. The two cards sit in the middle of the screen and match Android’s taller height. Hazard Lab is the **LAB** tile on the Journey map, not a third Play card.
- **Space Log** — your science journal of things you've seen and touched in Journey.
- **Options** — Ship, Controls, Sound (Music / Sound FX / Voice), Light/Dark Mode, and Restore Purchases.
- **High Scores** — open the Space Board (Zigzag/Arc button in the title; DISTANCE / OBSTACLES). Native iOS and Android share the same online board (call sign + ship). Android pages 10 scores at a time (up to 100).

After a run, **Menu** on the end screen brings you back here.

## The Space Log

The Space Log is a field manual that fills in as you fly **Journey** levels (Open
Space does not write to it). Open it from the main menu any time — even when it's
still blank.

Entries unlock in two steps:

1. **Observe** — you see it on screen. The picture and name light up; the page
   notes that interaction is still needed for a full reading.
2. **Interact** — you touch it (smash with a shield, collect a pickup, get pulled
   by a black hole, cross the finish gate, and so on). Then the definition unlocks.

A few events unlock both at once — Space BOOP on a sidewall, a Style Swoosh
through a tight gap, and a Deflector Smash.

During a Journey run, a short **Space Log updated** notice appears at the top center
when something new is catalogued, with a soft bridge chirp — like a quiet console
ping that a new message arrived.

Categories:

| Tab | What it holds |
| --- | --- |
| Obstacles | Asteroids, barriers, square blooms, sweeps, repulsors, drift currents, wormholes, black holes, Space BOOP, … |
| Boosts | Shield, wall boost, fuel sparkles, style swoosh, finish gate, … |
| Journey | Day 1 onward navigator transmissions (plus The Call). After the last relay you may write one thing into the dark — once. |
| From the Void | Reserved for future transmissions — empty for now |

Entries are tall cards: the real obstacle silhouette on the left, name and notes
on the right. Scroll the list. Locked cards show as **Unknown contact**. Round,
triangular, and square simple asteroids each get their own entry.

## The Journey map

Choosing Journey opens the level map: chapter by chapter, **five** numbered
tiles per row (taller than they are wide) with star pips underneath. It opens
roughly where you left off.

- **Hazard Lab** sits at the top — always unlocked. Tap the centered **LAB**
  tile (same size as a day tile) to practice the
  newer hazards (square blooms, sweeps, push nodes, wind currents, portals,
  black holes) without touching Journey progress. Lab runs are longer (~12,000 KM).
  If a portal or well leaves the ship sitting low, the camera eases it back
  after about five seconds — same as Journey and Open Space in the browser.
- **Scroll** with the mouse wheel, or drag up and down on touch.
- The tile outlined in **blue** is the next level you haven't cleared.
- **Faded** tiles are still locked — you can see what's coming, but not play it yet.
  Playtest builds may show a **TEST** chip and leave every tile open so testers
  can jump around; your real furthest level is still saved.

Tap an unlocked tile to fly it. A filled blue star under a tile is one you've
earned; an outlined one is still open.

## Clearing a level

As you near the end of a Journey level a finish gate fades in ahead of you —
a bright blue energy stream between two wall emitters. Fly through it.

Cross the goal and the game takes over. A shield snaps on, there's a short beat
to take it in, then the ship keeps the lean you had and hyperspeeds off the top
of the screen at that angle, the world fades out behind it, and the level screen
fades in. Rocks you smash and sparkles you grab on the way out still count
toward your sparkle count and destroyed total (and can tip stars) before the
results lock in. Sit tight for the flyout; it isn't skippable.

The level screen lists the three objectives, each with the number it was measured
against: your distance against the goal, your sparkles against the target, and
your smash count against the mission target. A filled star means earned, an
outline means missed, and **NEW** marks one you've just added. **Retry** (or
**Next Level** when you cleared it) is the full-width button; **Level Select** and
**Menu** sit side by side under it. After a clear that isn't the last level,
**Replay** pairs with **Level Select**, and **Menu** sits on its own row.

## Options

Options opens a short list:

| Item | Status |
| --- | --- |
| **Ship** | Browse the full roster; owned ships equip. Playtest builds unlock every ship; store builds show a price on locked tiles (tap to buy). |
| **Controls** | Flight style (Zigzag now; Arc shows as out of service until you finish the Journey). |
| **Sound** | Separate toggles for **Music**, **Sound FX**, and **Voice** (saved automatically). |
| **Light / Dark Mode** | Paper look (saved automatically). |
| **Restore Purchases** | Re-sync ship unlocks after reinstall (iOS / Android). |

Back from a sub-screen returns to the Options list; Back again returns to the
main menu.

Under **Options → Sound** you can isolate each channel:

| Channel | What it controls |
| --- | --- |
| **Music** | Background music loop. |
| **Sound FX** | Crashes, boops, shields, points, turns, portals, empty-tank sputter, and other game sounds. |
| **Voice** | Navigator lines (Journey intros), session cues (first BOOP, Style Swoosh), and a low-fuel warning. On-screen captions still appear when Voice is off. |

Pause → **Sound** mutes everything at once without changing these three toggles.

## Ships

Every ship flies the same — same speed, same turns. They only look different
(and their collision shape follows the drawn hull), so pick the wake you like:

| Ship | Look |
| --- | --- |
| **Focus** | Solid circle with a dotted ink trail — clean and instrumental. Wall hits send a pulse down the dots; each older dot pops a bit smaller, so the wave dies at the far end. |
| **Flicker** | Teardrop trailing one smooth, flowing ribbon that reads as one piece with the hull and springs and wiggles on a wall hit. |
| **Ember** | Swept dart with two parallel dotted traces (like Echo’s twins, but smaller, denser dots). Same dying pulse as Focus on a wall boop. |
| **Saber** | Needle’s thin lance with a long, slim bright-purple blade wake that crackles; wall hits whip the tip and spray more sparks. |
| **Wisp** | Teardrop again, with a thin thread that sheds drifting sparks — they flare on impact. |
| **Pulse** | Focus's hull with a Signal-Blue dotted wake (same dense pile on boop). |
| **Quill** | Flicker's tear with a fine Signal-Blue ribbon. |
| **Fletch** | A smooth ink arrow with a tiny nock. The wake is a Quill-like ribbon, but the colour is stacked along the path — persimmon at the hull, cooling through gold and celadon to indigo at the tip. |
| **Nyan** | Echo’s sparrow-wing crescent in dark gray with two pink spots, plus a longer stacked rainbow wake that starts under the hull. |
| **Shard** | Faceted crystal diamond; chevrons shatter into a fan against the wall, then restack. |
| **Halo** | Small orbital core with crawling ring-ticks; young rings inflate like soap bubbles on a wall hit, then pop — the core wobbles in a tiny orbit. |
| **Needle** | Ultra-thin lance with a single hairline thread. Wall hits flex the tip and ripple the old end of the wake. |
| **Echo** | Open crescent; twin lines desync briefly on a boop (one sticks, one springs late), then snap back in phase. |
| **Dusk** | Echo’s crescent with a denser, more scattered violet cloud (not ringed puffs). Wall hits send a milder dying ripple through the specks. |
| **Seal** | Square hull; stamps little tiles — denser blot at the wall, then peels like a rubber seal. |
| **Hatch** | Square hull; short lateral hatch marks that stretch toward the wall on impact. |
| **Trace** | Square hull; one thin hairline that springs on a bounce. |
| **Ring** | Square hull; blooming rings (squash only — not Halo’s bubble pop). |
| **Fold** | Solid origami kite; a long dashed crease that leaves from the hull and zigzags harder when you bank. |
| **Mote** | Soft ink disc; a messy organic cloud of micro-dots. Wall hits send a pulse down the cloud — each older cluster pops a bit smaller. |
| **Spine** | Tall thin bar; ladder rungs compress toward the wall on a boop. |
| **Orbit** | Small planetoid with a tilted ring and one satellite; a continuous orbital path lags behind with dense ellipse ticks. |
| **Ink** | Quill’s dark twin — a fine ink ribbon that flourishes hard on a wall boop (tip reverses, mid swells, a few flecks spray) while staying attached to the hull. |
| **Flux** | Hex crystal; wake is alternating ink and Signal-Blue dashes that stretch on a wall hit. |
| **Cinder** | Soft petal; a calm warm ember ribbon that cools into soft ash dots (blue glints mainly on a wall hit). |
| **Lantern** | A jellyfish bell with a pulsing gold heart and waving tentacles. The wake is teal-and-gold filaments plus a cloud of plankton specks that puff out on a wall hit. Tentacles are looks only. |
| **Bloom** | Overlapping soap-film spheres with tiny orbiting bubbles. The wake is iridescent rings and prism sparkles that inflate and pop on a wall hit. The little bubbles are looks only. |
| **Lyra** | A four-point star with twinkling motes. The wake is aurora colour stacked along the path, plus tiny star sparkles. |
| **Sprout** | A living seed with two breathing leaves. Green-and-gold filaments and pollen puff out on a wall hit. Leaves are looks only. |
| **Plume** | A firebird with a gold flame heart. Twin flame ribbons and rising embers cool toward the old wake. |
| **Koi** | A river-spirit fish with a waving tail. Vermillion water ribbon and scale stamps; the tail flicks on a wall hit. Tail is looks only. |
| **Spore** | Lantern’s mushroom cousin — a wide cap, glowing gills, amber heart. A denser cloud of amber and violet spores puffs on a wall hit. |
| **Boreal** | A flowing ribbon of northern light. Side-by-side aurora curtains wave, and the hull shears on a wall hit. |
| **Luna** | A lunar moth with a moon heart and waving antennae. The wake is glittering wing-dust that puffs on a wall hit. Antennae and dust motes are looks only. |
| **Wish** | A crystal comet with a gold wish-heart and three orbiting stars. The wake is a gold blade that sheds 4-point stars; a wall hit bursts the constellation. Orbiting stars are looks only. |
| **Darner** | A slim dragonfly with iridescent wings and a gold thorax. Twin mosaic ribbons and diamond specks (teal, gold, violet); wings flash on a wall hit. Wings are looks only. |
| **Puff** | A dandelion clock with a short stem and breathing seed ticks. An ink path sheds gold and teal parachute umbrellas that puff on a wall hit. Stem and ticks are looks only. |
| **Argus** | A peacock teardrop with a rear fan of pulsing eyespots. Peacock-rim, gold-pupil rings stamp the path; the fan flares on a wall hit. Thin feather tips are looks only. |
| **Chime** | A temple bell with two smaller side bells and swaying clappers. Dense sound arcs and gold/ink notes ring down the wake. Side bells are looks only. |

Quill, Fletch, Shard, Seal, Hatch, Trace, Fold, Spine, Mote, Pulse, Echo, Dusk, Ink,
Cinder, Lantern, Bloom, Lyra, Sprout, Plume, Koi, Spore, Boreal, Luna, Wish, Darner, Puff, Argus, and Chime leave a longer wake in play so the far end runs off the screen. The
home-screen ship picture stays short so it does not cover the title.

Seal, Hatch, Trace, and Ring collide as the box you see. **Orbit** collides on its solid
planetoid body (the ring and satellite are looks only). **Lantern** collides on the
bell (tentacles are looks only). **Bloom** collides on the central soap disc (orbiting
bubbles are looks only). **Sprout** collides on the seed (leaves are looks only). **Koi**
collides on the body (the tail is looks only). **Luna** collides on the inner moth
(the dust motes are looks only). **Wish** collides on the crystal (orbiting stars
are looks only). **Darner** collides on the needle body (wings are looks only).
**Puff** collides on the seed head (stem and ticks are looks only). **Argus**
collides on the body and inner fan (thin feather tips are looks only). **Chime**
collides on the central bell (side bells and clappers are looks only). On a side-wall bounce,
**every** ship reacts —
animation only; the hitbox does not squash. Each vessel has its own feel: some
squash like jelly, Needle flexes, Halo wobbles in a tiny orbit, Shard cracks,
Seal plants like rubber.

Every ship’s wake also reacts to a wall hit. Same bounce clock, different
signature per vessel — pile, spring, whip, scatter, shatter, bubble, blot, and
more.

Any ship that kisses a side wall gets a little ink **BOOP** under the hull (next
to the wall, not on it). The word fades away after the bounce. You also get a
soft space-boop sound and a light phone buzz on devices that support haptics
(not in the browser App Preview). The first wall touch of a session (after any level
opening voice finishes) also plays a short navigator line on screen (“The walls
forgive…”). Threading a tight gap for a Style Swoosh plays a short voice cue with
no extra caption (you still see the usual style points). Background music keeps
playing under it.

Focus, Flicker, Ember, and Saber are free forever. Every other ship is a store
unlock on the apps (IAP). On the main menu you can scroll the whole roster —
owned ships equip; locked ones show a price (tap the ship to buy). Options →
Ship works the same way. Use **Options → Restore Purchases** after reinstalling.

**Pro (yearly)** also includes a one-time pick of any **3** premium ships — those
stay unlocked even if the subscription ends. You can still buy other ships
individually anytime.

The shaped ships lean into their turns, and the trail curls out from behind them
along the path you actually flew. You only crash where the hull actually is —
Needle's thin spine and Echo's open middle slip through gaps a full circle would
catch. Sparkles and shields stay generous.

Pick one under **Options → Ship**. Your choice is remembered. After you tap a
ship, **Play now** appears so you can jump straight into Open Space without
backing out to the menu.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Steer (Zigzag) | Space or Left / Right arrows (any flips). On desktop web, a mouse click also flips. | Press/tap anywhere to flip (on touch-down). Swipe does nothing. |
| Steer (Arc) | Left / Right arrow keys. On desktop web, click-drag left or right also banks. | Swipe left or right. A short tap on either half of the screen also banks that way. |
| Pause | Escape or the pause button (top-right). In Arc, Space also pauses. | Pause button (top-right) |

In Zigzag the path flips as soon as you tap; the hull leans over instead of
popping upright for a frame (that used to look like a 1–2px camera hop on
iPhone). In Arc, each bank is a smooth swoosh that curves out and back to the
same lane you started from, then you fly straight again. Press mid-turn and a
full new arc starts from where you are — left and right feel the same. Turn
taps play a short cue without hitching the flight. You also bounce off the side walls (with a
**BOOP**), so plan your turns a little ahead.

## Pausing and quitting

Pausing freezes the run and opens a menu showing how far you've got:

- **Resume** — back to the run (Spacebar or Escape does the same).
- **Sound** — master mute for everything (music, effects, and voice). Remembered
  between sessions. For individual channels, use **Options → Sound**.
- **Exit Run** — leave mid-flight. In Open Space that takes you to the main menu;
  in Journey it drops you back on the level map. Either way the run ends there and
  **nothing is saved** — no distance submitted, no stars — so play a level out if
  you want it to count.

## The HUD

Top-left is a compact icon stack (no captions):

- **Route + bar** — Journey: ink bar filling toward the level goal. Open Space:
  route icon beside your KM figure.
- **Sparkle + blue bar** — fuel (once sparkles unlock). Drains as you fly;
  diamonds refill it. Empty means engines die and the run fails.
- **Target** — after your first smash: Journey shows black dots for the smash
  mission; Open Space shows a small black smash count.

Pause and end screens still show full KM / sparkles / destroyed numbers.

On a computer, the dark charcoal playfield sits centered on a light bone page so
you can see its edges. On phones the charcoal stage fills the safe area (bone
ink may show in the notch / home-indicator strips). Turn arcs and cruise speed
are meant to feel the same on computer, Android, and native iPhone — if a build
ever feels half-speed with KM racing ahead, that build is wrong; report the menu stamp
(e.g. `BUILD 29 · WEB`). That number goes up every time a new native/web
bundle is built — if it did not change after an Android Studio install, the
phone is still running the previous version.

**iPhone / iPad (Safari or Chrome):** the game targets a steadier ~60 frames per
second and a slightly lighter retina resolution so motion stays cool and playable
on Apple browsers (not identical to Android butter). Zigzag flips as soon as you
press; wall **BOOP** should be heard as well as seen. Android phones and computers
keep the full high-refresh path — travel speed stays matched either way.

## Fuel and sparkles

Once sparkles are in play (Journey from level 4; Open Space after the opening
stretch), your ship burns **fuel** as it flies. The HUD sparkle icon + blue bar
shows how much is left. A full tank lasts about the same distance on a phone
or a tall desktop window — screen size does not empty the tank sooner.

- **Collect a diamond → refill fuel.** A glowing **Signal-Blue four-point
  sparkle** drifts down the corridor. Fly close and it gently slides toward your
  ship; you still need to touch it to collect — you'll hear a short chime and
  see **+FUEL**. The tank does not overfill. When the bar gets low (below a
  fifth), NAV may say one line (Journey and Open Space; follows **Voice**,
  not Sound FX). Background music keeps playing under it. Miss several
  diamonds in a row and the bar bottoms out: you'll hear the engine sputter
  three times, each a bit lower, then engines coast. If you still touch a
  sparkle before the ship fully stops, it refills and you keep flying. Once
  you have stopped with an empty tank, the run fails (**Out of fuel**). The
  sputter follows **Sound FX** (and the pause Sound mute).
- Diamonds are always safe to touch — blue means "good" here (same family as
  the shield).

Journey's second star asks you to **collect N sparkles** on that level (count,
not style points). The target is intentionally one under a full clear so a
diamond that spawns past the finish line does not block the star. Pause and end
screens show your sparkle total.

## Style points

Optional flair — not fuel, not the sparkles star:

- **Destroy an asteroid → +1.** Only while your **shield** is active.
- **Thread a narrow gap → +15.** A **SWOOSH** flashes when you slip between two
  obstacles with almost no room. Risky, stylish, worth it.

## Shields

Blue shield pickups (the pulsing **plus**) give you a temporary shield. While
it's up you can plow through asteroids (destroying them for points) instead of
crashing. Each smash also gives a quieter version of the wall **BOOP** phone
tick on devices that support haptics (not in the browser App Preview). On a big asteroid
with orbiting debris moons — or a star that fires shots — you only smash what you
hit: clip a moon or a shot and the main rock stays; ram the body and the whole
thing goes. The shield pulses faster right before it runs out — pick your moment.

A rare **wall boost** appears only after **12000 KM**: a thin blue slab on a
random left or right edge. Fly into it and it presses into the wall like a
button (with a **BOOP**), giving you the same shield plus a strong speed burst.
While that speed rush is on, your fuel bar does not drain. Grabbing another plus
or wall boost while you're already powered up refreshes the timers. Don't confuse
it with the thick **black** side barriers — those still end the run.

Blue **portal** rings are a boost, not a threat: they look like a hollow spinning
dashed circle (accent blue, no fill or glow — same on iPhone and Android). Fly
into one and you hear a deep echoing warp suck you in, then a second warp as
space briefly wobbles on the way out and you emerge ahead with a fresh shield.
In Open Space they show up as occasional gifts (and a named storm when they
first unlock), not as empty portal-only weather. The rocks around a portal can
still crash you if you miss the ring itself — aim for the blue.

## Flight style

Under **Options → Controls** you can pick how the ship steers. **Zigzag** is
available from the start. **Arc** is listed there the whole time but stays out
of service until you finish the Journey; the first time you do, you land on that
Controls screen with Arc already on. Open Space high
scores and your on-device personal best are tracked **separately** for each style.

- **Zigzag** (default) — the ship always flies straight at a flatter fixed
  angle, a bit faster than Arc; **press/tap** (flips on finger-down) or **Space**
  (or an arrow key) flips the other way. Swipe is off in this mode. Pause with
  Escape or the pause button. Walls bounce you too (ink **BOOP** + soft blip).
  No arcs — just a clean zig-zag.
- **Arc** — the classic swoosh: a tall curve that finishes in the same lane it
  started.

## Phones (especially iPhone)

The game is tuned for phones: on iPhone/iPad it uses lighter drawing tricks
(fewer retina pixels, simpler trails and glows) so the device stays cooler while
steering stays smooth — same frame pacing as Android. You don’t need to change
any settings — just play. If a build ever feels off, the usual fix is to update
the app or refresh the site.

## Tips

- Chain shield time: destroy several asteroids in one shielded run for quick
  points.
- Don't chase every diamond into a wall of asteroids — fuel isn't worth a crash,
  but don't ignore diamonds either or the tank will empty.
- Look for tight corridors between two rocks — threading them pays style points,
  but clipping either side still ends the run.
- Steady, early turns beat frantic last-second ones.
- New to the game? Start with Journey. Level 1 teaches the turn, then the field
  gets real quickly — each level still introduces one idea at a time.
- Going for the smash star: grab shields and ram rocks on purpose. Points can
  wait for another run if you're hunting asteroids.

Live long and prosper.

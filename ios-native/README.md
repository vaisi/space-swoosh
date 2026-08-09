<!--
  ios-native/README.md
  Changes: Phase A — how to open, build, and gate the butter-core native iOS app.
-->

# Space Swoosh — Native iOS (`ios-native/`)

True-native iOS client (**SpriteKit + SwiftUI**). Bundle ID `com.orbi.spaceswoosh`.
The Capacitor `ios/` tree is **not** the shipping iOS app (retired before launch).

## Phase A scope (current)

- SwiftUI menu → play shell
- SpriteKit scene at display rate (`preferredFramesPerSecond = 120`)
- `CADisableMinimumFrameDurationOnPhone` in Info.plist
- Fixed-step sim (1/60) + render interpolation
- One Focus-style baked hull + pooled textured ribbon trail (no hot-path `SKShapeNode`)
- DEBUG frame-pacing HUD (p50 / p95 / p99, display max Hz, Low Power, thermal)

### Gate (on a real ProMotion device)

Sustained 5-minute run with p99 frame time ≤ **8.3 ms** at 120 Hz
(or ≤ 16.6 ms on 60 Hz hardware). HUD must show `displayMax 120Hz` on ProMotion
phones — if it shows 60, the plist key or view FPS preference is wrong.

## Open on Mac

```bash
cd ios-native
# Optional if you prefer XcodeGen over the checked-in project:
# brew install xcodegen && xcodegen
open SpaceSwoosh.xcodeproj
```

Set your Development Team in Xcode, plug in a ProMotion iPhone, Run.

Regenerate the Xcode project after adding Swift files (from Windows or Mac):

```bash
node scripts/generate-pbxproj.mjs
```

## Windows note

Sources and the `.xcodeproj` can be edited here; **feel gates require a Mac +
device**. Simulator is UI-only — never use it for pacing sign-off.

## Layout

```
ios-native/
  SpaceSwoosh/
    App/           SwiftUI shell
    Core/          config, fixed-step clock, pacing monitor
    Sim/           world + ship + trail ring buffer
    Render/        PlayScene, ribbon trail, baked textures
    Input/         tap → zigzag flip
  project.yml      XcodeGen alternative
  scripts/         pbxproj generator
```

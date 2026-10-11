// HangarScene.swift
// One live hull for the Hangar and the menu idle, drawn by SkinRenderer.
// Changes:
// - Steps with ShipSimulator, the same zigzag / arc step a run uses.
//   The lane is inset so the hull and wake stay inside the stage.
//   The camera only seats the hull. Trail samples stay in world space.
// - Prefers 60 fps. A short warm-up lays the wake down before the first paint.

import SpriteKit

final class HangarScene: SKScene {
    private let sim = ShipSimulator()
    private var renderer: SkinRenderer?
    private var world: WorldState?
    private var skinId: SkinId = .flicker
    private var lastTime: TimeInterval = 0
    private var live = true
    private var command: SteerCommand = .none
    /// Hull seat inside the stage. The mockup parks it 168px down a 372px stage.
    private let seatFromTop: CGFloat = 168.0 / 372.0

    func show(skinId: SkinId, live: Bool) {
        let changed = renderer == nil || self.skinId != skinId || size.width < 2
        self.skinId = skinId
        self.live = live
        isPaused = false
        if changed { rebuild() }
    }

    func flip() {
        command = .flip
    }

    override func didMove(to view: SKView) {
        view.preferredFramesPerSecond = 60
        isPaused = false
    }

    private func playfieldHeight() -> CGFloat {
        max(size.height, UIScreen.main.bounds.height)
    }

    /// Same inset as JS hangarStageLane: bounce inside the stage, not on its edge.
    private func laneLayout() -> (inset: CGFloat, lane: CGFloat) {
        let full = size.width
        let unit = GameConfig.Playfield.baseUnit(width: full, height: playfieldHeight())
        let margin = max(full * 0.2, unit * 5.5)
        let lane = max(unit * 8, full - margin * 2)
        return ((full - lane) / 2, lane)
    }

    private func rebuild() {
        guard size.width > 2, size.height > 2 else { return }
        removeAllChildren()
        backgroundColor = .clear
        let layout = laneLayout()
        var next = WorldState.initial(width: layout.lane, height: playfieldHeight(), skinId: skinId)
        next.baseUnit = GameConfig.Playfield.baseUnit(width: size.width, height: playfieldHeight())
        next.ship.x = layout.lane * 0.5
        next.ship.zigzagSign = 1
        next.trail.reset()
        world = next
        for _ in 0..<120 {
            guard let current = world else { break }
            world = step(current, dt: 1.0 / 60.0)
        }
        let node = SkinRenderer(skin: SkinCatalog.def(skinId), bake: BakePipeline.current())
        addChild(node.node)
        renderer = node
        lastTime = 0
    }

    override func didChangeSize(_ oldSize: CGSize) {
        if renderer == nil || abs(oldSize.width - size.width) > 8 || abs(oldSize.height - size.height) > 8 {
            rebuild()
        }
    }

    override func update(_ currentTime: TimeInterval) {
        if renderer == nil { rebuild() }
        guard live, var world = self.world else { return }
        let dt = lastTime == 0 ? 1.0 / 60.0 : min(0.05, max(0, currentTime - lastTime))
        lastTime = currentTime
        world = step(world, dt: CGFloat(dt))
        self.world = world
        present(world)
    }

    private func step(_ world: WorldState, dt: CGFloat) -> WorldState {
        var world = world
        let issued = command
        command = .none
        sim.step(
            world: &world,
            dt: dt,
            command: issued,
            speedScale: 1,
            style: SettingsStore.shared.flightStyle
        )
        return world
    }

    private func present(_ world: WorldState) {
        let screenY = size.height * (1 - seatFromTop)
        let camera = world.ship.y - (screenY - size.height * CinematicFlight.cruiseSeat)
        let radius = world.baseUnit * GameConfig.Spacecraft.radiusUnits
        let speed = max(radius * 0.02, abs(world.ship.verticalVel) * GameConfig.simDt)
        var shown = world
        let inset = laneLayout().inset
        shown.ship.x += inset
        shown.trail.offsetX(inset)
        renderer?.present(
            ship: shown.ship,
            world: shown,
            screenY: screenY,
            radius: radius,
            cameraY: camera,
            sceneHeight: size.height,
            hullAlpha: 1,
            trailAlpha: 1,
            shipSpeed: speed
        )
    }
}

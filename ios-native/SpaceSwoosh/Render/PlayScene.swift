// PlayScene.swift
// Changes: Slice D — Flicker hull/jelly/trail, popups, blast, dying/crash present.

import SpriteKit
import QuartzCore

final class PlayScene: SKScene {
    weak var pacingMonitor: FramePacingMonitor?
    weak var session: GameSession?

    private let input = InputService()
    private var clock = FixedStepSimulator()
    private var previousWorld: WorldState?
    private var currentWorld: WorldState?
    private var run = RunState()

    private var hullNode: SKSpriteNode?
    private var shieldHalo: SKSpriteNode?
    private var trailNode: RibbonTrailNode?
    private var pooledField: PooledSpriteField?
    private var popupField: PopupField?
    private var blastField: BlastField?
    private var running = false
    private var lastFrameTime: TimeInterval?

    func startRun() {
        removeAllChildren()
        clock.reset()
        input.reset()
        lastFrameTime = nil
        run = RunState()
        session?.reset()
        SfxPlayer.shared.start()
        HapticsService.prepare()

        let world = WorldState.initial(width: size.width, height: size.height)
        previousWorld = world
        currentWorld = world

        let bake = BakePipeline.shared
        backgroundColor = BrandColors.UI.paper

        let radius = world.baseUnit * GameConfig.Spacecraft.radiusUnits
        let ribbon = RibbonTrailNode(
            texture: bake.trail,
            maxSegments: GameConfig.Spacecraft.trailMaxPoints - 1,
            maxWidth: radius * GameConfig.Flicker.trailWidthScale
        )
        ribbon.zPosition = 5
        addChild(ribbon)
        trailNode = ribbon

        let pool = PooledSpriteField(bake: bake)
        pool.zPosition = 4
        addChild(pool)
        pooledField = pool

        let popups = PopupField()
        popups.zPosition = 20
        addChild(popups)
        popupField = popups

        let blast = BlastField(texture: bake.part(for: .circle))
        blast.zPosition = 18
        addChild(blast)
        blastField = blast

        let halo = SKSpriteNode(texture: bake.glowSignal)
        halo.blendMode = .add
        halo.isHidden = true
        halo.zPosition = 9
        addChild(halo)
        shieldHalo = halo

        let hull = SKSpriteNode(texture: bake.hull)
        let pad = radius * GameConfig.Flicker.hullDrawPad
        hull.size = CGSize(width: pad, height: pad)
        hull.zPosition = 10
        addChild(hull)
        hullNode = hull

        isPaused = false
        running = true
    }

    func stopRun() {
        running = false
        isPaused = true
    }

    override func didMove(to view: SKView) {
        view.preferredFramesPerSecond = 120
        view.ignoresSiblingOrder = true
    }

    override func didChangeSize(_ oldSize: CGSize) {
        guard running, var world = currentWorld else { return }
        let scaleX = size.width / max(world.width, 1)
        let scaleY = size.height / max(world.height, 1)
        world.width = size.width
        world.height = size.height
        world.baseUnit = size.width / 40
        world.ship.x *= scaleX
        world.ship.y *= scaleY
        currentWorld = world
        previousWorld = world
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first, !run.isOver else { return }
        input.handleTap(at: touch.location(in: self), sceneWidth: size.width)
    }

    override func update(_ currentTime: TimeInterval) {
        guard running else { return }
        pacingMonitor?.recordFrame(at: currentTime)

        let frameDelta: CGFloat
        if let last = lastFrameTime {
            frameDelta = CGFloat(currentTime - last)
        } else {
            frameDelta = GameConfig.simDt
        }
        lastFrameTime = currentTime

        guard var world = currentWorld else { return }
        previousWorld = world

        let result = clock.tick(frameDelta: frameDelta) {
            let command = self.input.consumeSteerCommand()
            CombatSimulator.step(
                world: &world,
                run: &self.run,
                dt: GameConfig.simDt,
                command: command
            )
        }
        currentWorld = world
        consumeSfx()
        session?.apply(run: run)

        let ship = WorldInterpolator.ship(previousWorld?.ship ?? world.ship, world.ship, alpha: result.alpha)
        present(ship: ship, world: world)

        var obs = 0
        for o in world.obstacles where o.active { obs += 1 }
        var pk = 0
        for p in world.pickups where p.active { pk += 1 }
        pacingMonitor?.setLoadLine(
            obstacles: obs,
            sparkles: pk,
            trail: GameConfig.Spacecraft.trailMaxPoints
        )
    }

    private func consumeSfx() {
        if run.sfxBoop {
            run.sfxBoop = false
            SfxPlayer.shared.playBoop()
            HapticsService.wallBoop()
        }
        if run.sfxCollect {
            run.sfxCollect = false
            SfxPlayer.shared.playCollect()
        }
        if run.sfxCrash {
            run.sfxCrash = false
        }
    }

    private func present(ship: ShipState, world: WorldState) {
        let cameraY = ship.y
        let screenY = size.height * 0.22
        let radius = world.baseUnit * GameConfig.Spacecraft.radiusUnits
        let nowMs = CGFloat(CACurrentMediaTime() * 1000)
        let breath = 0.9 + 0.06 * sin(nowMs * 0.0056) + 0.04 * sin(nowMs * 0.0088)
        let scale = 0.97 + 0.03 * sin(nowMs * 0.0044)
        let r = radius * 0.95 * scale
        let turn = min(1, abs(ship.bank) / GameConfig.Spacecraft.maxBank)
        let stretch = 1 + 0.2 * turn
        let jelly = WallJelly.hullScale(elapsedMs: world.jellyElapsedMs, side: world.jellySide)
        let pad = r * GameConfig.Flicker.hullDrawPad

        hullNode?.position = CGPoint(x: ship.x, y: screenY)
        hullNode?.zRotation = -ship.bank
        hullNode?.xScale = jelly.sx
        hullNode?.yScale = jelly.sy * stretch
        hullNode?.size = CGSize(width: pad, height: pad)
        if run.hullHidden || run.teleportT > 0 {
            hullNode?.alpha = 0
        } else if run.fuelDying {
            let dur = GameConfig.Fuel.dyingDurationMs / 1000
            let t = min(1, run.fuelDyingT / dur)
            hullNode?.alpha = (1 - t * 0.15) * breath * run.worldAlpha
        } else {
            hullNode?.alpha = breath * run.worldAlpha
        }

        if run.shieldActive, !run.hullHidden {
            shieldHalo?.isHidden = false
            shieldHalo?.position = CGPoint(x: ship.x, y: screenY)
            let hr = world.baseUnit * 4.2
            shieldHalo?.size = CGSize(width: hr, height: hr)
            shieldHalo?.alpha = run.worldAlpha
        } else {
            shieldHalo?.isHidden = true
        }

        trailNode?.alpha = run.worldAlpha
        trailNode?.sync(
            trail: world.trail,
            cameraY: cameraY,
            sceneHeight: size.height,
            jellyElapsedMs: world.jellyElapsedMs,
            jellySide: world.jellySide,
            shipRadius: radius
        )
        pooledField?.alpha = run.worldAlpha
        pooledField?.sync(world: world, cameraY: cameraY, sceneHeight: size.height)
        popupField?.alpha = run.worldAlpha
        popupField?.sync(
            popups: run.popups,
            cameraY: cameraY,
            sceneHeight: size.height,
            baseUnit: world.baseUnit
        )
        blastField?.sync(
            particles: run.blast,
            cameraY: cameraY,
            sceneHeight: size.height
        )
    }
}

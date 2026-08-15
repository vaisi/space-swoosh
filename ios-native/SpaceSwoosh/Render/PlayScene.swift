// PlayScene.swift
// Changes: C.5 — hide hull during wormhole hop so the fade matches JS transit.

import SpriteKit

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
    private var running = false
    private var lastFrameTime: TimeInterval?

    func startRun() {
        removeAllChildren()
        clock.reset()
        input.reset()
        lastFrameTime = nil
        run = RunState()
        session?.reset()

        let world = WorldState.initial(width: size.width, height: size.height)
        previousWorld = world
        currentWorld = world

        let bake = BakePipeline.shared
        backgroundColor = BrandColors.UI.paper

        let ribbon = RibbonTrailNode(
            texture: bake.trail,
            maxSegments: GameConfig.Spacecraft.trailMaxPoints - 1,
            baseWidth: world.baseUnit * 0.55
        )
        ribbon.zPosition = 5
        addChild(ribbon)
        trailNode = ribbon

        let pool = PooledSpriteField(bake: bake)
        pool.zPosition = 4
        addChild(pool)
        pooledField = pool

        let halo = SKSpriteNode(texture: bake.glowSignal)
        halo.blendMode = .add
        halo.isHidden = true
        halo.zPosition = 9
        addChild(halo)
        shieldHalo = halo

        let hull = SKSpriteNode(texture: bake.hull)
        hull.size = CGSize(width: world.baseUnit * 2.2, height: world.baseUnit * 2.2)
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
        guard running, !run.isOver else { return }
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

    private func present(ship: ShipState, world: WorldState) {
        let cameraY = ship.y
        let screenY = size.height * 0.22
        hullNode?.position = CGPoint(x: ship.x, y: screenY)
        hullNode?.zRotation = -ship.tangent
        hullNode?.alpha = run.teleportT > 0 ? 0 : (run.fuelDying ? 0.45 : 1)

        if run.shieldActive {
            shieldHalo?.isHidden = false
            shieldHalo?.position = CGPoint(x: ship.x, y: screenY)
            let r = world.baseUnit * 4.2
            shieldHalo?.size = CGSize(width: r, height: r)
        } else {
            shieldHalo?.isHidden = true
        }

        trailNode?.sync(
            trail: world.trail,
            cameraY: cameraY,
            sceneHeight: size.height,
            maxAge: 1.15
        )
        pooledField?.sync(world: world, cameraY: cameraY, sceneHeight: size.height)
    }
}

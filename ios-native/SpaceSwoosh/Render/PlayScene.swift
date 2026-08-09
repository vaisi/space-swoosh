// PlayScene.swift
// Changes: Phase A — display-rate SpriteKit scene, fixed-step sim, ribbon trail, pacing hook.

import SpriteKit

final class PlayScene: SKScene {
    weak var pacingMonitor: FramePacingMonitor?

    private let input = InputService()
    private let simulator = ShipSimulator()
    private var clock = FixedStepSimulator()

    private var previousWorld: WorldState?
    private var currentWorld: WorldState?

    private var hullNode: SKSpriteNode?
    private var trailNode: RibbonTrailNode?
    private var distanceLabel: SKLabelNode?
    private var running = false
    private var lastFrameTime: TimeInterval?

    func startRun() {
        removeAllChildren()
        clock.reset()
        input.reset()
        lastFrameTime = nil

        let world = WorldState.initial(width: size.width, height: size.height)
        previousWorld = world
        currentWorld = world

        backgroundColor = BrandColors.UI.paper

        // Soft paper panels (static shapes — allowed; not on the mutating hot path).
        let band = SKSpriteNode(color: BrandColors.UI.paperDeep, size: CGSize(width: size.width, height: 2))
        band.position = CGPoint(x: size.width / 2, y: size.height * 0.08)
        band.alpha = 0.35
        band.zPosition = 0
        addChild(band)

        let trailTexture = TrailRibbonTexture.make()
        let ribbon = RibbonTrailNode(
            texture: trailTexture,
            maxSegments: GameConfig.Spacecraft.trailMaxPoints - 1,
            baseWidth: world.baseUnit * 0.55
        )
        ribbon.zPosition = 5
        addChild(ribbon)
        trailNode = ribbon

        let hullTexture = FocusHullTexture.make(logicalRadius: world.baseUnit)
        let hull = SKSpriteNode(texture: hullTexture)
        let hullSize = world.baseUnit * 2.2
        hull.size = CGSize(width: hullSize, height: hullSize)
        hull.zPosition = 10
        addChild(hull)
        hullNode = hull

        let label = SKLabelNode(fontNamed: "Menlo-Bold")
        label.fontSize = 14
        label.fontColor = BrandColors.UI.ink
        label.horizontalAlignmentMode = .left
        label.verticalAlignmentMode = .top
        label.position = CGPoint(x: 16, y: size.height - 16)
        label.zPosition = 100
        addChild(label)
        distanceLabel = label

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
        #if DEBUG
        view.showsFPS = false
        view.showsNodeCount = false
        #endif
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
        guard let touch = touches.first else { return }
        let location = touch.location(in: self)
        input.handleTap(at: location, sceneWidth: size.width)
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
            self.simulator.step(world: &world, dt: GameConfig.simDt, command: command)
        }
        currentWorld = world

        let alpha = result.alpha
        let prev = previousWorld ?? world
        let ship = WorldInterpolator.ship(prev.ship, world.ship, alpha: alpha)
        present(ship: ship, trail: world.trail, world: world)
    }

    private func present(ship: ShipState, trail: TrailRingBuffer, world: WorldState) {
        // Camera: keep ship near lower third; world Y is climb distance.
        let cameraY = ship.y
        let screenY = size.height * 0.22

        hullNode?.position = CGPoint(x: ship.x, y: screenY)
        hullNode?.zRotation = -ship.tangent

        trailNode?.sync(
            trail: trail,
            cameraY: cameraY,
            sceneHeight: size.height,
            maxAge: 1.15
        )

        let km = Int(ship.distance / max(world.baseUnit, 1))
        distanceLabel?.text = "\(km) KM"
        distanceLabel?.position = CGPoint(x: 16, y: size.height - 16)
    }
}

// PlayScene.swift
// Changes: Present interpolates play cameraY; baseUnit matches Android mobile.
// L42 skips intro voice; smash haptic.
// L42 written epilogue keeps MusicPlayer running (do not stop on completed).

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

    private var shieldRingInner: SKSpriteNode?
    private var shieldRingOuter: SKSpriteNode?
    private var skinRenderer: SkinRenderer?
    private var pooledField: PooledSpriteField?
    private var popupField: PopupField?
    private var blastField: BlastField?
    private var running = false
    private var lastFrameTime: TimeInterval?
    private var leftGate: SKSpriteNode?
    private var rightGate: SKSpriteNode?
    private var streakField: StreakField?
    private var launch: PlayLaunch = .openSpace
    private var lastPresentX: CGFloat?
    private var lastPresentY: CGFloat?
    private var previousCameraY: CGFloat?

    func startRun(_ launch: PlayLaunch = .openSpace) {
        self.launch = launch
        removeAllChildren()
        clock.reset()
        input.reset()
        lastFrameTime = nil
        lastPresentX = nil
        lastPresentY = nil
        previousCameraY = nil
        run = RunState()
        session?.reset()
        VoicePlayer.shared.reset()
        SfxPlayer.shared.start()
        MusicPlayer.shared.start()
        HapticsService.prepare()

        let skinId = SettingsStore.shared.shipSkinId
        var world = WorldState.initial(width: size.width, height: size.height, skinId: skinId)
        run.flightStyle = SettingsStore.resolved(SettingsStore.shared.flightStyle)
        if run.flightStyle != SettingsStore.shared.flightStyle {
            SettingsStore.shared.setFlightStyle(run.flightStyle)
        }
        run.profile = launch.profile
        CinemaSimulator.beginLevelRun(world: &world, run: &run)
        previousWorld = world
        currentWorld = world
        let bake = BakePipeline.current()
        backgroundColor = BrandColors.UI.paper

        let renderer = SkinRenderer(skin: SkinCatalog.def(world.skinId), bake: bake)
        addChild(renderer.node)
        skinRenderer = renderer

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

        let inner = SKSpriteNode(texture: bake.shieldRingInner)
        inner.isHidden = true
        inner.zPosition = 9
        addChild(inner)
        shieldRingInner = inner
        let outer = SKSpriteNode(texture: bake.shieldRingOuter)
        outer.isHidden = true
        outer.zPosition = 8.9
        addChild(outer)
        shieldRingOuter = outer

        let left = SKSpriteNode(texture: bake.glowSignal)
        left.blendMode = .add
        left.isHidden = true
        left.zPosition = 8
        addChild(left)
        leftGate = left
        let right = SKSpriteNode(texture: bake.glowSignal)
        right.blendMode = .add
        right.isHidden = true
        right.zPosition = 8
        addChild(right)
        rightGate = right

        let streaks = StreakField(texture: bake.part(for: .drift))
        streaks.zPosition = 3
        streaks.reset(width: world.width, height: world.height)
        addChild(streaks)
        streakField = streaks

        isPaused = false
        running = true
    }

    func stopRun() {
        running = false
        isPaused = true
        VoicePlayer.shared.stop()
        MusicPlayer.shared.stop()
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
        world.baseUnit = GameConfig.Playfield.baseUnit(width: size.width, height: size.height)
        world.ship.x *= scaleX
        world.ship.y *= scaleY
        run.cameraY *= scaleY
        run.cameraVelocity *= scaleY
        previousCameraY = run.cameraY
        currentWorld = world
        previousWorld = world
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first, !run.isOver, !run.inputLocked else { return }
        let loc = touch.location(in: self)
        input.handleTap(at: loc, sceneWidth: size.width, style: run.flightStyle)
        input.handleDragBegin(at: loc)
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first, !run.isOver, !run.inputLocked else { return }
        input.handleDrag(at: touch.location(in: self), style: run.flightStyle)
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
        let prevCam = previousCameraY ?? run.cameraY

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
        if !run.logbookMarks.isEmpty {
            run.logbookMarks.removeAll()
        }

        let ship = WorldInterpolator.ship(previousWorld?.ship ?? world.ship, world.ship, alpha: result.alpha)
        let cameraY: CGFloat
        if run.cinema == .play || run.isOver {
            cameraY = prevCam + (run.cameraY - prevCam) * result.alpha
        } else {
            cameraY = CinematicFlight.presentCameraY(
                shipY: ship.y,
                seatY: run.seatY,
                cameraLead: run.cameraLead,
                height: size.height
            )
        }
        previousCameraY = run.cameraY
        present(ship: ship, world: world, cameraY: cameraY, frameDelta: frameDelta)

        var obs = 0
        for o in world.obstacles where o.active { obs += 1 }
        var pk = 0
        for p in world.pickups where p.active { pk += 1 }
        pacingMonitor?.setLoadLine(
            obstacles: obs,
            sparkles: pk,
            trail: SkinCatalog.def(world.skinId).trailMaxPoints
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
            SfxPlayer.shared.playCrash()
            MusicPlayer.shared.stop()
        }
        if run.sfxTurn {
            run.sfxTurn = false
            SfxPlayer.shared.playTurn()
        }
        if run.sfxShield {
            run.sfxShield = false
            SfxPlayer.shared.playShield()
        }
        if run.sfxShieldCrash {
            run.sfxShieldCrash = false
            SfxPlayer.shared.playShieldCrash()
            HapticsService.shieldSmash()
        }
        if run.sfxPortalIn {
            run.sfxPortalIn = false
            SfxPlayer.shared.playPortalEntry()
        }
        if run.sfxPortalOut {
            run.sfxPortalOut = false
            SfxPlayer.shared.playPortalExit()
        }
        if run.sfxSwoosh {
            run.sfxSwoosh = false
            SfxPlayer.shared.playSwoosh()
        }
        if run.sfxFuelOut {
            run.sfxFuelOut = false
            SfxPlayer.shared.playFuelOut()
        }
        if run.sfxFirstBoop {
            run.sfxFirstBoop = false
            VoicePlayer.shared.playFirstBoop()
            CinemaSimulator.enqueueBeats(GeneratedJourneyData.firstBoopBeats, run: &run)
        }
        if run.sfxSwooshVoice {
            run.sfxSwooshVoice = false
            VoicePlayer.shared.playSwoosh()
        }
        if run.sfxFuelLow {
            if run.fuelDying || run.isOver {
                run.sfxFuelLow = false
            } else if VoicePlayer.shared.playFuelLow() {
                run.sfxFuelLow = false
                run.fuelLowVoiceLatched = true
            }
        }
        if run.isOver, run.completed, !run.playEpilogue {
            MusicPlayer.shared.stop()
        }
        if run.cinema == .introTitle, !run.introVoiceStarted {
            run.introVoiceStarted = true
            if run.profile.mode == .journey {
                if run.profile.level >= JourneyConfig.totalLevels {
                    run.introVoiceDone = true
                } else {
                    VoicePlayer.shared.playLevel(run.profile.level) { [weak self] in
                        self?.run.introVoiceDone = true
                    }
                }
            } else {
                run.introVoiceDone = true
            }
        }
    }

    private func present(ship: ShipState, world: WorldState, cameraY: CGFloat, frameDelta: CGFloat) {
        let screenY = CinematicFlight.screenY(worldY: ship.y, cameraY: cameraY, sceneHeight: size.height)
        let radius = world.baseUnit * GameConfig.Spacecraft.radiusUnits
        let nowMs = CGFloat(CACurrentMediaTime() * 1000)
        let breath = 0.9 + 0.06 * sin(nowMs * 0.0056) + 0.04 * sin(nowMs * 0.0088)
        let hullAlpha: CGFloat
        if run.hullHidden || run.teleportT > 0 {
            hullAlpha = 0
        } else if run.fuelDying {
            let dur = GameConfig.Fuel.dyingDurationMs / 1000
            let t = min(1, run.fuelDyingT / dur)
            hullAlpha = (1 - t * 0.15) * breath * run.worldAlpha
        } else {
            hullAlpha = breath * run.worldAlpha
        }
        let shipSpeed: CGFloat
        if let lx = lastPresentX, let ly = lastPresentY {
            shipSpeed = hypot(ship.x - lx, ship.y - ly)
        } else {
            shipSpeed = abs(ship.verticalVel) * GameConfig.simDt
        }
        skinRenderer?.present(
            ship: ship,
            world: world,
            screenY: screenY,
            radius: radius,
            cameraY: cameraY,
            sceneHeight: size.height,
            hullAlpha: hullAlpha,
            trailAlpha: run.worldAlpha,
            shipSpeed: shipSpeed
        )

        if run.shieldActive, !run.hullHidden {
            let warning = run.shieldWarningStarted
            let wave = warning ? sin(run.shieldPulse * 2) : sin(run.shieldPulse)
            let pulseScale = 1 + wave * (warning ? 0.3 : 0.2)
            let opacity = (warning ? 0.7 : 0.5) + wave * (warning ? 0.3 : 0.2)
            let innerR = radius * 1.5 * pulseScale
            let outerR = innerR * 1.1
            let pos = CGPoint(x: ship.x, y: screenY)
            shieldRingInner?.isHidden = false
            shieldRingOuter?.isHidden = false
            shieldRingInner?.position = pos
            shieldRingOuter?.position = pos
            shieldRingInner?.size = CGSize(width: innerR * 2, height: innerR * 2)
            shieldRingOuter?.size = CGSize(width: outerR * 2, height: outerR * 2)
            shieldRingInner?.alpha = opacity * run.worldAlpha
            shieldRingOuter?.alpha = opacity * 0.5 * run.worldAlpha
        } else {
            shieldRingInner?.isHidden = true
            shieldRingOuter?.isHidden = true
        }

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
        lastPresentX = ship.x
        lastPresentY = ship.y
        presentGate(shipY: ship.y, cameraY: cameraY, screenY: screenY, world: world)
        let showerSpeed = 0.45 + run.streakAlpha * 0.55
        streakField?.alpha = run.worldAlpha
        streakField?.sync(
            alpha: run.streakAlpha,
            width: world.width,
            height: size.height,
            dt: frameDelta,
            speedFactor: showerSpeed
        )
    }

    private func presentGate(shipY: CGFloat, cameraY: CGFloat, screenY: CGFloat, world: WorldState) {
        guard !run.profile.isEndless else {
            leftGate?.isHidden = true
            rightGate?.isHidden = true
            return
        }
        let remaining = max(0, run.profile.goalKm - run.scoreKm)
        let scale = GameConfig.kmReferenceHeight / max(world.height, 1)
        let remainingWorld = remaining / max(scale * GameConfig.kmPerPixel, 0.0001)
        let worldY = run.finishLineY > 0 ? run.finishLineY : shipY + remainingWorld
        let y = screenY + (worldY - cameraY)
        let visible = remaining < 900 || run.finishLineY > 0
        let w = world.baseUnit * 2.4
        let h = world.baseUnit * 14
        leftGate?.isHidden = !visible
        rightGate?.isHidden = !visible
        leftGate?.position = CGPoint(x: w * 0.6, y: y)
        rightGate?.position = CGPoint(x: world.width - w * 0.6, y: y)
        leftGate?.size = CGSize(width: w, height: h)
        rightGate?.size = CGSize(width: w, height: h)
        leftGate?.alpha = run.worldAlpha * 0.85
        rightGate?.alpha = run.worldAlpha * 0.85
    }
}

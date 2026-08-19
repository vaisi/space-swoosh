// CinemaSimulator.swift
// Changes: L42 fade hands off to the written epilogue overlay (no ENDING_BEATS).

import Foundation
import CoreGraphics

enum CinemaPhase {
    case introArrive
    case introSettle
    case introTitle
    case introWait
    case play
    case clearHold
    case clearBoost
    case clearFade
    case endingCaptions
}

enum CinemaSimulator {
    static let arrive: CGFloat = 0.72
    static let settle: CGFloat = 0.28
    static let beatFade: CGFloat = 0.35

    static func beginLevelRun(world: inout WorldState, run: inout RunState) {
        run.cinema = .introArrive
        run.cinemaT = 0
        run.introElapsed = 0
        run.worldAlpha = 0
        run.pauseSpawning = true
        run.hudLive = false
        run.hudRevealT = 0
        run.hudDistance = 0
        run.hudPause = 0
        run.hudSmash = 0
        run.hudPoints = 0
        run.hudSmashT = -1
        run.hudPointsT = -1
        run.inputLocked = true
        run.introBeatIndex = 0
        run.introVoiceDone = run.profile.mode != .journey
        run.introVoiceStarted = false
        run.captionText = ""
        run.captionOpacity = 0
        run.seatY = CinematicFlight.startSeat
        run.cameraLead = 0
        run.cinemaBoost = CinematicFlight.startBoost
        run.streakAlpha = 1
        world.ship.x = world.width * 0.5
        world.ship.bank = 0
        world.ship.tangent = 0
        world.ship.arcActive = false
        if run.profile.mode == .journey, run.profile.level >= 1 {
            run.logbookMarks.append(.interact(LogbookCatalog.levelEntryId(run.profile.level)))
        }
    }

    static func beginClear(world: WorldState, run: inout RunState) {
        guard run.cinema == .play else { return }
        run.cinema = .clearHold
        run.cinemaT = 0
        run.pauseSpawning = true
        run.inputLocked = true
        run.grantShield()
        run.finishLineY = world.ship.y
        run.cameraLead = 0
        run.seatY = CinematicFlight.cruiseSeat
        run.cinemaBoost = 1
        run.cinemaHeading = CinematicFlight.captureArcHeading(world.ship)
        run.cameraSpeed = max(abs(world.ship.verticalVel), GameConfig.Spacecraft.speed * world.height)
        run.logbookMarks.append(.interact("finishGate"))
        run.sfxShield = true
        run.sfxSwoosh = true
    }

    static func tick(
        world: inout WorldState,
        run: inout RunState,
        dt: CGFloat,
        command _: SteerCommand
    ) -> Bool {
        switch run.cinema {
        case .introArrive, .introSettle, .introTitle, .introWait:
            tickIntro(world: &world, run: &run, dt: dt)
            FloatPopupBuffer.tick(&run.popups, dt: dt)
            return true
        case .clearHold, .clearBoost, .clearFade:
            tickHudReveal(run: &run, dt: dt)
            tickClear(world: &world, run: &run, dt: dt)
            return true
        case .endingCaptions:
            tickCaption(run: &run, dt: dt)
            if run.captionText.isEmpty, run.pendingBeats.isEmpty {
                finishClear(run: &run)
            }
            return true
        case .play:
            tickHudReveal(run: &run, dt: dt)
            tickCaption(run: &run, dt: dt)
            return false
        }
    }

    private static func tickIntro(world: inout WorldState, run: inout RunState, dt: CGFloat) {
        run.cinemaT += dt
        run.introElapsed += dt
        run.streakAlpha = showerFade(run.introElapsed)
        switch run.cinema {
        case .introArrive:
            let t = CinematicFlight.easeOut(run.cinemaT / arrive)
            run.worldAlpha = min(1, t * 1.2)
            run.cinemaBoost = CinematicFlight.lerp(CinematicFlight.startBoost, 1.08, t)
            run.seatY = CinematicFlight.lerp(CinematicFlight.startSeat, CinematicFlight.cruiseSeat, t)
            CinematicFlight.streamCenter(world: &world, dt: dt, boost: run.cinemaBoost)
            if run.cinemaT >= arrive {
                run.cinema = .introSettle
                run.cinemaT = 0
                run.worldAlpha = 1
            }
        case .introSettle:
            let t = CinematicFlight.easeInOut(run.cinemaT / settle)
            run.worldAlpha = 1
            run.cinemaBoost = CinematicFlight.lerp(1.08, 1, t)
            run.seatY = CinematicFlight.cruiseSeat
            CinematicFlight.streamCenter(world: &world, dt: dt, boost: run.cinemaBoost)
            if run.cinemaT >= settle {
                handoffAfterSettle(run: &run)
            }
        case .introTitle:
            run.seatY = CinematicFlight.cruiseSeat
            run.streakAlpha = 0
            tickCaption(run: &run, dt: dt)
            if run.captionText.isEmpty,
               run.introBeatIndex >= run.profile.introBeats.count,
               run.introVoiceDone {
                enterPlay(run: &run)
            }
        case .introWait:
            run.seatY = CinematicFlight.cruiseSeat
            run.streakAlpha = 0
            if run.cinemaT >= CinematicFlight.openWait {
                enterPlay(run: &run)
            }
        default:
            break
        }
    }

    private static func handoffAfterSettle(run: inout RunState) {
        run.cinemaT = 0
        run.cinemaBoost = 1
        run.seatY = CinematicFlight.cruiseSeat
        run.streakAlpha = 0
        if run.profile.introBeats.isEmpty {
            run.cinema = .introWait
        } else {
            run.cinema = .introTitle
            showNextBeat(run: &run)
        }
    }

    private static func enterPlay(run: inout RunState) {
        run.cinema = .play
        run.cinemaT = 0
        run.pauseSpawning = false
        run.hudLive = true
        run.hudRevealT = 0
        run.inputLocked = false
        run.worldAlpha = 1
        run.seatY = CinematicFlight.cruiseSeat
        run.streakAlpha = 0
        run.cinemaBoost = 1
    }

    /// Android hudRevealAlpha: KM at 2s, pause at 3s, smash/PTS after first event.
    private static func tickHudReveal(run: inout RunState, dt: CGFloat) {
        guard run.hudLive else { return }
        run.hudRevealT += dt
        run.hudDistance = chipEase(run.hudRevealT - 2)
        run.hudPause = chipEase(run.hudRevealT - 3)
        if run.obstaclesDestroyed > 0 {
            if run.hudSmashT < 0 { run.hudSmashT = 0 }
            run.hudSmashT += dt
            run.hudSmash = chipEase(run.hudSmashT)
        }
        if run.points > 0 {
            if run.hudPointsT < 0 { run.hudPointsT = 0 }
            run.hudPointsT += dt
            run.hudPoints = chipEase(run.hudPointsT)
        }
    }

    private static func chipEase(_ t: CGFloat) -> CGFloat {
        if t <= 0 { return 0 }
        if t >= 1 { return 1 }
        return 1 - (1 - t) * (1 - t)
    }

    private static func showerFade(_ elapsed: CGFloat) -> CGFloat {
        let total = arrive + settle
        let t = max(0, min(1, elapsed / total))
        let hold: CGFloat = 0.22
        if t <= hold { return 1 }
        return 1 - CinematicFlight.easeOut((t - hold) / (1 - hold))
    }

    private static func tickClear(world: inout WorldState, run: inout RunState, dt: CGFloat) {
        run.cinemaT += dt
        run.extendShield(minimum: 2)
        run.seatY = CinematicFlight.cruiseSeat
        let prevY = world.ship.y
        var boost: CGFloat = 1
        var camFactor: CGFloat = 1
        switch run.cinema {
        case .clearHold:
            boost = 1
            camFactor = 1
            if run.cinemaT >= CinematicFlight.clearHold {
                run.cinema = .clearBoost
                run.cinemaT = 0
            }
        case .clearBoost:
            let rampT = CinematicFlight.easeOut(run.cinemaT / CinematicFlight.clearRamp)
            boost = CinematicFlight.lerp(1, CinematicFlight.boostTarget, rampT)
            camFactor = CinematicFlight.lerp(1, CinematicFlight.cameraBoost, min(1, run.cinemaT / CinematicFlight.clearRamp))
            let radius = world.baseUnit * GameConfig.Spacecraft.radiusUnits
            let screenY = world.height * run.seatY + run.cameraLead
            let gone = screenY > world.height + radius * CinematicFlight.exitMargin
            if (gone && run.cinemaT >= CinematicFlight.clearBoostMin)
                || run.cinemaT >= CinematicFlight.clearBoostCap {
                run.cinema = .clearFade
                run.cinemaT = 0
            }
        case .clearFade:
            boost = CinematicFlight.boostTarget
            camFactor = CinematicFlight.cameraBoost
            let fade: CGFloat = run.profile.mode == .journey
                && run.profile.level >= JourneyConfig.totalLevels
                ? CinematicFlight.clearFadeFinale
                : CinematicFlight.clearFade
            run.worldAlpha = max(0, 1 - run.cinemaT / fade)
            if run.cinemaT >= fade {
                beginAfterFade(run: &run)
            }
        default:
            break
        }

        var heading = run.cinemaHeading
        CinematicFlight.stream(
            world: &world,
            dt: dt,
            boost: boost * run.profile.speedMultiplier,
            style: run.flightStyle,
            heading: &heading
        )
        run.cinemaHeading = heading
        let shipDy = world.ship.y - prevY
        run.cameraLead += shipDy - run.cameraSpeed * camFactor * dt
        run.cameraLead = max(0, run.cameraLead)

        CombatSimulator.moveHazards(world: &world, run: &run, dt: dt)
        HazardCollision.applyFields(world: &world, run: run, dt: dt)
        CombatSimulator.collectPickups(world: &world, run: &run)
        CombatSimulator.collide(world: &world, run: &run)
        FloatPopupBuffer.tick(&run.popups, dt: dt)
        BlastBuffer.tick(&run.blast, dt: dt)
    }

    private static func beginAfterFade(run: inout RunState) {
        run.worldAlpha = 0
        if run.profile.mode == .journey, run.profile.level >= JourneyConfig.totalLevels {
            run.playEpilogue = true
        }
        finishClear(run: &run)
    }

    private static func finishClear(run: inout RunState) {
        run.isOver = true
        run.completed = true
        run.failReason = nil
        run.cinema = .play
        run.endingT = 0
        run.captionText = ""
        run.captionOpacity = 0
    }

    static func enqueueBeats(_ beats: [IntroBeat], run: inout RunState) {
        run.pendingBeats.append(contentsOf: beats)
        if run.captionText.isEmpty {
            showQueuedBeat(run: &run)
        }
    }

    private static func showNextBeat(run: inout RunState) {
        guard run.introBeatIndex < run.profile.introBeats.count else { return }
        let beat = run.profile.introBeats[run.introBeatIndex]
        run.introBeatIndex += 1
        present(beat, run: &run)
    }

    private static func showQueuedBeat(run: inout RunState) {
        guard !run.pendingBeats.isEmpty else { return }
        let beat = run.pendingBeats.removeFirst()
        present(beat, run: &run)
    }

    private static func present(_ beat: IntroBeat, run: inout RunState) {
        run.captionText = beat.text
        run.captionT = 0
        run.captionOpacity = 0
        let hold = holdMs(beat.text) / 1000
        run.captionHold = beatFade + hold + beatFade
        run.captionGap = CGFloat(beat.gapAfterMs) / 1000
    }

    private static func tickCaption(run: inout RunState, dt: CGFloat) {
        guard !run.captionText.isEmpty else {
            if run.cinema == .introTitle {
                run.introGapT += dt
                if run.introGapT >= run.captionGap {
                    run.introGapT = 0
                    showNextBeat(run: &run)
                }
            } else if !run.pendingBeats.isEmpty {
                run.introGapT += dt
                if run.introGapT >= run.captionGap {
                    run.introGapT = 0
                    showQueuedBeat(run: &run)
                }
            }
            return
        }
        run.captionT += dt
        if run.captionT < beatFade {
            run.captionOpacity = run.captionT / beatFade
        } else if run.captionT < run.captionHold - beatFade {
            run.captionOpacity = 1
        } else if run.captionT < run.captionHold {
            run.captionOpacity = 1 - (run.captionT - (run.captionHold - beatFade)) / beatFade
        } else {
            run.captionText = ""
            run.captionOpacity = 0
            run.introGapT = 0
        }
    }

    private static func holdMs(_ text: String) -> CGFloat {
        let n = CGFloat(text.count)
        return min(2800, max(900, n * 55))
    }
}

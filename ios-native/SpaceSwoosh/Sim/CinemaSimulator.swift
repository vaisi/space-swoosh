// CinemaSimulator.swift
// Changes: Slice E — Journey/Lab intro beats + finish flyout (baked, no SKShapeNode).

import Foundation
import CoreGraphics

enum CinemaPhase {
    case introArrive
    case introSettle
    case introTitle
    case play
    case clearHold
    case clearBoost
    case clearFade
}

enum CinemaSimulator {
    static let arrive: CGFloat = 0.72
    static let settle: CGFloat = 0.28
    static let clearHold: CGFloat = 0.315
    static let clearBoost: CGFloat = 1.26
    static let clearFade: CGFloat = 0.385
    static let beatFade: CGFloat = 0.35

    static func beginLevelRun(run: inout RunState) {
        run.cinema = .introArrive
        run.cinemaT = 0
        run.worldAlpha = 0
        run.pauseSpawning = true
        run.hudLive = false
        run.inputLocked = true
        run.introBeatIndex = 0
        run.introVoiceDone = run.profile.mode != .journey
        run.captionText = ""
        run.captionOpacity = 0
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
        run.shieldTimer = 5
        run.finishLineY = world.ship.y
        run.exitLift = 0
        run.logbookMarks.append(.interact("finishGate"))
    }

    static func tick(
        world: inout WorldState,
        run: inout RunState,
        dt: CGFloat,
        command _: SteerCommand
    ) -> Bool {
        switch run.cinema {
        case .introArrive, .introSettle, .introTitle:
            tickIntro(world: &world, run: &run, dt: dt)
            FloatPopupBuffer.tick(&run.popups, dt: dt)
            return true
        case .clearHold, .clearBoost, .clearFade:
            tickClear(world: &world, run: &run, dt: dt)
            return true
        case .play:
            tickCaption(run: &run, dt: dt)
            return false
        }
    }

    private static func tickIntro(world: inout WorldState, run: inout RunState, dt: CGFloat) {
        run.cinemaT += dt
        switch run.cinema {
        case .introArrive:
            let t = min(1, run.cinemaT / arrive)
            run.worldAlpha = min(1, t * 1.2)
            if run.cinemaT >= arrive {
                run.cinema = .introSettle
                run.cinemaT = 0
                run.worldAlpha = 1
            }
        case .introSettle:
            run.worldAlpha = 1
            if run.cinemaT >= settle {
                run.cinema = .introTitle
                run.cinemaT = 0
                showNextBeat(run: &run)
            }
        case .introTitle:
            tickCaption(run: &run, dt: dt)
            if run.captionText.isEmpty, run.introBeatIndex >= run.profile.introBeats.count, run.introVoiceDone {
                run.cinema = .play
                run.cinemaT = 0
                run.pauseSpawning = false
                run.hudLive = true
                run.inputLocked = false
                run.worldAlpha = 1
            }
        default:
            break
        }
        _ = world
    }

    private static func tickClear(world: inout WorldState, run: inout RunState, dt: CGFloat) {
        run.cinemaT += dt
        run.shieldTimer = max(run.shieldTimer, 0.2)
        let boost: CGFloat
        switch run.cinema {
        case .clearHold:
            boost = 1
            if run.cinemaT >= clearHold {
                run.cinema = .clearBoost
                run.cinemaT = 0
                run.logbookMarks.append(.instant("spaceTravelBoost"))
            }
        case .clearBoost:
            let t = min(1, run.cinemaT / 0.77)
            boost = 1 + 6.2 * (1 - (1 - t) * (1 - t))
            run.exitLift += world.height * 0.55 * dt
            if run.cinemaT >= clearBoost {
                run.cinema = .clearFade
                run.cinemaT = 0
            }
        case .clearFade:
            boost = 7.2
            run.exitLift += world.height * 0.55 * dt
            run.worldAlpha = max(0, 1 - run.cinemaT / clearFade)
            if run.cinemaT >= clearFade {
                run.isOver = true
                run.completed = true
                run.failReason = nil
                run.cinema = .play
            }
        default:
            boost = 1
        }

        var ship = ShipSimulator()
        ship.step(
            world: &world,
            dt: dt,
            command: .none,
            speedScale: boost * run.profile.speedMultiplier,
            style: run.flightStyle
        )
        CombatSimulator.moveHazards(world: &world, run: &run, dt: dt)
        HazardCollision.applyFields(world: &world, run: run, dt: dt)
        CombatSimulator.collectPickups(world: &world, run: &run)
        CombatSimulator.collide(world: &world, run: &run)
        FloatPopupBuffer.tick(&run.popups, dt: dt)
        BlastBuffer.tick(&run.blast, dt: dt)
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

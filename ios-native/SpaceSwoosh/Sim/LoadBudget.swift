// LoadBudget.swift
// Journey and Hazard Lab trim a planned row so the live field stays inside
// the same caps as the JavaScript budget. Open Space does not use it.
// Changes:
// - Created file: JOURNEY_CAPS and lab CAPS, set-piece room, rocks plus one
//   light beside a live set piece.

import Foundation
import CoreGraphics

enum PlaytestDemand {
    static let setPieces: Set<String> = ["tunnelField", "shoal", "satDebris"]
    static let lights: Set<String> = ["spinner", "pulsating"]

    struct Rating {
        var space: CGFloat
        var timing: CGFloat
        var tracking: CGFloat
        var mover: Bool
        var setPiece: Bool
        var light: Bool
    }

    static func of(_ type: String) -> Rating {
        switch type {
        case "simple": return Rating(space: 1, timing: 0, tracking: 0, mover: false, setPiece: false, light: false)
        case "moving": return Rating(space: 1, timing: 0, tracking: 2, mover: true, setPiece: false, light: false)
        case "shooting": return Rating(space: 1, timing: 1, tracking: 2, mover: true, setPiece: false, light: false)
        case "complex": return Rating(space: 2, timing: 0, tracking: 1, mover: false, setPiece: false, light: false)
        case "pulsating": return Rating(space: 1, timing: 2, tracking: 0, mover: false, setPiece: false, light: true)
        case "phase": return Rating(space: 2, timing: 2, tracking: 0, mover: false, setPiece: false, light: false)
        case "sweepGate": return Rating(space: 3, timing: 2, tracking: 0, mover: false, setPiece: false, light: false)
        case "repulsor": return Rating(space: 2, timing: 0, tracking: 1, mover: false, setPiece: false, light: false)
        case "driftCurrent": return Rating(space: 2, timing: 0, tracking: 1, mover: false, setPiece: false, light: false)
        case "wormhole": return Rating(space: 0, timing: 0, tracking: 0, mover: false, setPiece: false, light: false)
        case "blackhole": return Rating(space: 2, timing: 0, tracking: 1, mover: false, setPiece: false, light: false)
        case "sideBarrier": return Rating(space: 2, timing: 0, tracking: 0, mover: false, setPiece: false, light: false)
        case "spinner": return Rating(space: 1, timing: 2, tracking: 0, mover: false, setPiece: false, light: true)
        case "hollowOrbit": return Rating(space: 2, timing: 2, tracking: 0, mover: false, setPiece: false, light: false)
        case "ricochet": return Rating(space: 1, timing: 0, tracking: 2, mover: true, setPiece: false, light: false)
        case "blinkRow": return Rating(space: 3, timing: 2, tracking: 0, mover: false, setPiece: false, light: false)
        case "tunnelField": return Rating(space: 3, timing: 3, tracking: 0, mover: false, setPiece: true, light: false)
        case "shoal": return Rating(space: 2, timing: 0, tracking: 2, mover: true, setPiece: true, light: false)
        case "satDebris": return Rating(space: 2, timing: 0, tracking: 3, mover: true, setPiece: true, light: false)
        case "lightning": return Rating(space: 2, timing: 2, tracking: 0, mover: false, setPiece: false, light: false)
        case "meteorShower": return Rating(space: 2, timing: 1, tracking: 2, mover: false, setPiece: false, light: false)
        default: return Rating(space: 0, timing: 0, tracking: 0, mover: false, setPiece: false, light: false)
        }
    }
}

enum LoadBudget {
    private struct Caps {
        var space: CGFloat
        var timing: CGFloat
        var tracking: CGFloat
        var movers: Int
    }

    private struct Load {
        var space: CGFloat = 0
        var timing: CGFloat = 0
        var tracking: CGFloat = 0
        var movers: Int = 0
        var setPieces: Int = 0
        var lights: Int = 0
        var rockSpace: CGFloat = 0
    }

    private static let labSpace: (CGFloat, CGFloat) = (5, 9)
    private static let labTiming: (CGFloat, CGFloat) = (2, 5)
    private static let labTracking: (CGFloat, CGFloat) = (3, 6)
    private static let labMovers: (Int, Int) = (1, 3)
    private static let journeySpace: (CGFloat, CGFloat) = (16, 22)
    private static let journeyTiming: (CGFloat, CGFloat) = (6, 12)
    private static let journeyTracking: (CGFloat, CGFloat) = (10, 17)
    private static let journeyMovers: (Int, Int) = (4, 8)

    static func enabled(_ run: RunState) -> Bool {
        run.profile.mode == .journey || run.profile.mode == .hazardLab
    }

    static func fit(_ slots: [EncounterSlot], world: WorldState, run: RunState) -> [EncounterSlot] {
        guard enabled(run), !slots.isEmpty else { return slots }
        let caps = caps(run)
        var load = live(world: world, run: run)
        var kept: [EncounterSlot] = []
        let ordered = slots.sorted {
            (PlaytestDemand.setPieces.contains($0.type) ? 1 : 0)
                > (PlaytestDemand.setPieces.contains($1.type) ? 1 : 0)
        }
        for slot in ordered {
            guard let next = fitSlot(slot, load: load, caps: caps) else { continue }
            add(&load, next.type)
            kept.append(next)
        }
        return kept
    }

    static func blocksSetPiece(_ recipe: EncounterRecipe, world: WorldState, run: RunState) -> Bool {
        guard enabled(run) else { return false }
        guard recipe.requires.contains(where: { PlaytestDemand.setPieces.contains($0) }) else { return false }
        let caps = caps(run)
        let load = live(world: world, run: run)
        if load.setPieces > 0 || load.movers > 0 { return true }
        return load.space > caps.space * 0.5
            || load.timing > caps.timing * 0.5
            || load.tracking > caps.tracking * 0.5
    }

    private static func caps(_ run: RunState) -> Caps {
        let d = min(1, max(0, run.profile.difficulty))
        if run.profile.mode == .journey {
            return Caps(
                space: lerp(journeySpace.0, journeySpace.1, d),
                timing: lerp(journeyTiming.0, journeyTiming.1, d),
                tracking: lerp(journeyTracking.0, journeyTracking.1, d),
                movers: lerpInt(journeyMovers.0, journeyMovers.1, d)
            )
        }
        return Caps(
            space: lerp(labSpace.0, labSpace.1, d),
            timing: lerp(labTiming.0, labTiming.1, d),
            tracking: lerp(labTracking.0, labTracking.1, d),
            movers: lerpInt(labMovers.0, labMovers.1, d)
        )
    }

    private static func live(world: WorldState, run: RunState) -> Load {
        let top = PlaytestMath.viewTop(world: world, cameraY: run.cameraY) + world.height * 0.6
        let bottom = PlaytestMath.viewBottom(world: world, cameraY: run.cameraY)
        var load = Load()
        for o in world.obstacles where o.active && o.y >= bottom && o.y <= top {
            if let type = PlaytestHazards.typeName(o.kind) {
                add(&load, type)
            } else if o.kind == .circle || o.kind == .triangle || o.kind == .square {
                load.space += 0.5
                load.rockSpace += 0.5
            } else if let type = kindType(o.kind) {
                add(&load, type)
            }
        }
        return load
    }

    private static func kindType(_ kind: ObstacleKind) -> String? {
        switch kind {
        case .slab: return "sideBarrier"
        case .complex: return "complex"
        case .pentagon: return "moving"
        case .star: return "shooting"
        case .pulsating: return "pulsating"
        case .phase: return "phase"
        case .sweep: return "sweepGate"
        case .repulsor: return "repulsor"
        case .drift: return "driftCurrent"
        case .wormhole: return "wormhole"
        case .blackhole: return "blackhole"
        default: return nil
        }
    }

    private static func add(_ load: inout Load, _ type: String) {
        let demand = PlaytestDemand.of(type)
        if type == "simple" {
            load.space += demand.space
            load.rockSpace += demand.space
            return
        }
        load.space += demand.space
        load.timing += demand.timing
        load.tracking += demand.tracking
        if demand.mover { load.movers += 1 }
        if demand.setPiece { load.setPieces += 1 }
        if demand.light { load.lights += 1 }
    }

    private static func fits(_ load: Load, _ caps: Caps) -> Bool {
        load.space <= caps.space && load.timing <= caps.timing
            && load.tracking <= caps.tracking && load.movers <= caps.movers
    }

    private static func withType(_ load: Load, _ type: String) -> Load {
        var next = load
        add(&next, type)
        return next
    }

    private static func fitSlot(_ slot: EncounterSlot, load: Load, caps: Caps) -> EncounterSlot? {
        let type = slot.type
        if type != "simple" {
            if PlaytestDemand.setPieces.contains(type) {
                if load.setPieces == 0 && load.movers == 0
                    && load.space <= caps.space * 0.5
                    && load.timing <= caps.timing * 0.5
                    && load.tracking <= caps.tracking * 0.5 {
                    return slot
                }
            } else if load.setPieces > 0 {
                if PlaytestDemand.lights.contains(type) && load.lights == 0 { return slot }
            } else if fits(withType(load, type), caps) {
                return slot
            }
        }
        if load.setPieces > 0 {
            if load.rockSpace >= 1 { return nil }
            let withRock = withType(load, "simple")
            return withRock.space <= caps.space ? EncounterSlot(type: "simple", lane: slot.lane) : nil
        }
        return fits(withType(load, "simple"), caps) ? EncounterSlot(type: "simple", lane: slot.lane) : nil
    }

    private static func lerp(_ a: CGFloat, _ b: CGFloat, _ t: CGFloat) -> CGFloat { a + (b - a) * t }

    private static func lerpInt(_ a: Int, _ b: Int, _ t: CGFloat) -> Int {
        Int((CGFloat(a) + (CGFloat(b - a) * t)).rounded())
    }
}

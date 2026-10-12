// HazardParts.swift
// Part pool for the nine obstacles that do not fit in one ObstacleState.
// A tunnel or a meteor burst hangs its pebbles here, keyed by parent slot.
// Changes:
// - Created file: 384-slot pool, hit maths, and release when the parent retires.

import Foundation
import CoreGraphics

enum HazardTag {
    static let pebble = 1
    static let fish = 2
    static let sat = 3
    static let meteor = 4
    static let ghost = 5
    static let path = 6
    static let bolt = 7
    static let branch = 8
}

struct HazardPart {
    var active: Bool
    var parent: Int
    var tag: Int
    var lethal: Bool
    var x: CGFloat
    var y: CGFloat
    var vx: CGFloat
    var vy: CGFloat
    var rot: CGFloat
    var spin: CGFloat
    var a: CGFloat
    var b: CGFloat
    var c: CGFloat
    var d: CGFloat
    var e: CGFloat

    static func inactive() -> HazardPart {
        HazardPart(
            active: false, parent: -1, tag: 0, lethal: false,
            x: 0, y: 0, vx: 0, vy: 0, rot: 0, spin: 0,
            a: 0, b: 0, c: 0, d: 0, e: 0
        )
    }
}

enum PlaytestMath {
    static func clamp(_ value: CGFloat, _ lo: CGFloat, _ hi: CGFloat) -> CGFloat {
        min(hi, max(lo, value))
    }

    static func circle(_ ax: CGFloat, _ ay: CGFloat, _ ar: CGFloat, _ bx: CGFloat, _ by: CGFloat, _ br: CGFloat) -> Bool {
        let dx = ax - bx
        let dy = ay - by
        let r = ar + br
        return dx * dx + dy * dy <= r * r
    }

    static func distToSegment(_ px: CGFloat, _ py: CGFloat, _ x1: CGFloat, _ y1: CGFloat, _ x2: CGFloat, _ y2: CGFloat) -> CGFloat {
        let dx = x2 - x1
        let dy = y2 - y1
        let lenSq = dx * dx + dy * dy
        var t: CGFloat = 0
        if lenSq > 0 {
            t = ((px - x1) * dx + (py - y1) * dy) / lenSq
            t = min(1, max(0, t))
        }
        let ex = px - (x1 + t * dx)
        let ey = py - (y1 + t * dy)
        return hypot(ex, ey)
    }

    static func hitsSegment(_ px: CGFloat, _ py: CGFloat, _ r: CGFloat, _ x1: CGFloat, _ y1: CGFloat, _ x2: CGFloat, _ y2: CGFloat) -> Bool {
        distToSegment(px, py, x1, y1, x2, y2) <= r
    }

    static func hitsHand(_ px: CGFloat, _ py: CGFloat, _ r: CGFloat, _ ox: CGFloat, _ oy: CGFloat, _ rotation: CGFloat, _ length: CGFloat, _ halfW: CGFloat) -> Bool {
        let dx = px - ox
        let dy = py - oy
        let c = cos(-rotation)
        let s = sin(-rotation)
        let lx = dx * c - dy * s
        let ly = dx * s + dy * c
        let cx = min(length, max(0, lx))
        let cy = min(halfW, max(-halfW, ly))
        let ex = lx - cx
        let ey = ly - cy
        return ex * ex + ey * ey <= r * r
    }

    static func hitsRect(_ px: CGFloat, _ py: CGFloat, _ r: CGFloat, _ cx: CGFloat, _ cy: CGFloat, _ rotation: CGFloat, _ hw: CGFloat, _ hh: CGFloat) -> Bool {
        let dx = px - cx
        let dy = py - cy
        let c = cos(-rotation)
        let s = sin(-rotation)
        let lx = dx * c - dy * s
        let ly = dx * s + dy * c
        let ex = lx - min(hw, max(-hw, lx))
        let ey = ly - min(hh, max(-hh, ly))
        return ex * ex + ey * ey <= r * r
    }

    static func hitsTriangle(_ px: CGFloat, _ py: CGFloat, _ r: CGFloat, _ verts: [(CGFloat, CGFloat)]) -> Bool {
        if pointInTriangle(px, py, verts) { return true }
        for i in 0..<3 {
            let j = (i + 1) % 3
            if hitsSegment(px, py, r, verts[i].0, verts[i].1, verts[j].0, verts[j].1) { return true }
        }
        return false
    }

    private static func pointInTriangle(_ px: CGFloat, _ py: CGFloat, _ verts: [(CGFloat, CGFloat)]) -> Bool {
        func sign(_ ax: CGFloat, _ ay: CGFloat, _ bx: CGFloat, _ by: CGFloat, _ cx: CGFloat, _ cy: CGFloat) -> CGFloat {
            (ax - cx) * (by - cy) - (bx - cx) * (ay - cy)
        }
        let d1 = sign(px, py, verts[0].0, verts[0].1, verts[1].0, verts[1].1)
        let d2 = sign(px, py, verts[1].0, verts[1].1, verts[2].0, verts[2].1)
        let d3 = sign(px, py, verts[2].0, verts[2].1, verts[0].0, verts[0].1)
        let hasNeg = d1 < 0 || d2 < 0 || d3 < 0
        let hasPos = d1 > 0 || d2 > 0 || d3 > 0
        return !(hasNeg && hasPos)
    }

    static func rockRadius(world: WorldState, rng: inout UInt64) -> CGFloat {
        let minS = GameConfig.Obstacles.minSizeUnits
        let maxS = GameConfig.Obstacles.maxSizeUnits
        return (minS + CombatSimulator.rand01(&rng) * (maxS - minS)) * world.baseUnit * 0.62
    }

    /// World Y at the top edge. Ahead of the ship is larger Y.
    static func viewTop(world: WorldState, cameraY: CGFloat) -> CGFloat {
        cameraY + world.height * (1 - CinematicFlight.cruiseSeat)
    }

    static func viewBottom(world: WorldState, cameraY: CGFloat) -> CGFloat {
        cameraY - world.height * CinematicFlight.cruiseSeat
    }

    static func onScreen(_ y: CGFloat, world: WorldState, cameraY: CGFloat, pad: CGFloat = 0) -> Bool {
        y >= viewBottom(world: world, cameraY: cameraY) - pad
            && y <= viewTop(world: world, cameraY: cameraY) + pad
    }
}

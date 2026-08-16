// HazardCollision.swift
// Changes: Portal hop grants shield via RunState.grantShield.

import Foundation
import CoreGraphics

enum ShieldSmash {
    case none
    case destroy
    case moon(Int)
}

enum HazardCollision {
    static func hits(o: ObstacleState, shipX: CGFloat, shipY: CGFloat, shipR: CGFloat) -> Bool {
        switch o.kind {
        case .drift, .wormhole:
            return false
        case .circle, .pulsating, .repulsor, .blackhole, .projectile:
            return circle(o.x, o.y, o.radius, shipX, shipY, shipR)
        case .triangle:
            return triangle(o: o, shipX: shipX, shipY: shipY, shipR: shipR)
        case .square:
            return aabb(cx: o.x, cy: o.y, half: o.radius * 0.7, rot: o.rotation, shipX: shipX, shipY: shipY, shipR: shipR)
        case .pentagon:
            return polygon(o: o, sides: 5, outer: o.radius, inner: o.radius, shipX: shipX, shipY: shipY, shipR: shipR)
        case .star:
            return star(o: o, shipX: shipX, shipY: shipY, shipR: shipR)
        case .complex:
            if circle(o.x, o.y, o.radius, shipX, shipY, shipR) { return true }
            return anyMoon(o: o, shipX: shipX, shipY: shipY, shipR: shipR) != nil
        case .phase:
            return phase(o: o, shipX: shipX, shipY: shipY, shipR: shipR)
        case .sweep:
            return obb(cx: o.x, cy: o.y, halfW: o.halfW, halfH: o.halfH, rot: o.rotation, shipX: shipX, shipY: shipY, shipR: shipR)
        case .slab:
            return shipX - shipR < o.x + o.halfW
                && shipX + shipR > o.x - o.halfW
                && shipY - shipR < o.y + o.halfH
                && shipY + shipR > o.y - o.halfH
        }
    }

    static func hitsCore(o: ObstacleState, shipX: CGFloat, shipY: CGFloat, shipR: CGFloat) -> Bool {
        switch o.kind {
        case .complex:
            return circle(o.x, o.y, o.radius, shipX, shipY, shipR)
        case .star:
            return star(o: o, shipX: shipX, shipY: shipY, shipR: shipR)
        default:
            return hits(o: o, shipX: shipX, shipY: shipY, shipR: shipR)
        }
    }

    static func anyMoon(o: ObstacleState, shipX: CGFloat, shipY: CGFloat, shipR: CGFloat) -> Int? {
        guard o.kind == .complex else { return nil }
        for i in 0..<o.moonCount where o.moonAlive(i) {
            let p = moonWorld(o: o, index: i)
            if circle(p.x, p.y, o.moonSize, shipX, shipY, shipR) { return i }
        }
        return nil
    }

    static func moonWorld(o: ObstacleState, index: Int) -> (x: CGFloat, y: CGFloat) {
        let a = o.moonAngle + CGFloat(index) * (.pi * 2 / CGFloat(max(o.moonCount, 1)))
        let lx = cos(a) * o.moonDist
        let ly = sin(a) * o.moonDist
        let c = cos(o.rotation)
        let s = sin(o.rotation)
        return (o.x + lx * c - ly * s, o.y + lx * s + ly * c)
    }

    static func shieldSmash(o: ObstacleState, shipX: CGFloat, shipY: CGFloat, shipR: CGFloat) -> ShieldSmash {
        guard hits(o: o, shipX: shipX, shipY: shipY, shipR: shipR) else { return .none }
        if o.kind == .complex {
            if hitsCore(o: o, shipX: shipX, shipY: shipY, shipR: shipR) { return .destroy }
            if let i = anyMoon(o: o, shipX: shipX, shipY: shipY, shipR: shipR) { return .moon(i) }
            return .none
        }
        return .destroy
    }

    static func inWormholeSafeZone(world: WorldState, shipX: CGFloat, shipY: CGFloat) -> Bool {
        for o in world.obstacles where o.active && o.kind == .wormhole {
            let safe = o.radius * 1.2 + world.baseUnit
            if hypot(o.x - shipX, o.y - shipY) < safe { return true }
        }
        return false
    }

    static func applyFields(world: inout WorldState, run: RunState, dt: CGFloat) {
        guard run.teleportT <= 0 else { return }
        let tick = dt * 60
        for o in world.obstacles where o.active {
            switch o.kind {
            case .drift:
                let halfH = o.halfH
                let dy = abs(world.ship.y - o.y)
                guard dy <= halfH else { continue }
                let ny = 1 - dy / max(halfH, 1)
                let edge = max(0, ny * ny)
                world.ship.x += o.driftDir * world.baseUnit * 0.1 * (0.55 + 0.45 * edge) * tick
            case .repulsor:
                shove(world: &world, ox: o.x, oy: o.y, radius: o.radius * 10, strength: 1.55, tick: tick, inward: false, pullY: false)
            case .blackhole:
                shove(
                    world: &world,
                    ox: o.x,
                    oy: o.y,
                    radius: o.radius * 11,
                    strength: 1.1,
                    tick: tick,
                    inward: true,
                    pullY: run.profile.advancedBlackHoles(scoreKm: run.scoreKm)
                )
            case .phase:
                let open = displayOpen(o)
                guard open >= 0.25 else { continue }
                let fieldR = o.radius * 3.8 * (0.55 + 0.45 * min(1, open))
                let strength = ((min(1, open) - 0.25) / 0.75) * 0.95
                shove(world: &world, ox: o.x, oy: o.y, radius: fieldR, strength: strength, tick: tick, inward: false, pullY: false)
            default:
                break
            }
        }
        let margin = world.baseUnit * GameConfig.Spacecraft.radiusUnits * 1.2
        world.ship.x = min(world.width - margin, max(margin, world.ship.x))
    }

    static func tryTeleport(world: inout WorldState, run: inout RunState) {
        guard run.teleportT <= 0 else { return }
        for i in 0..<world.obstacles.count {
            let o = world.obstacles[i]
            guard o.active, o.kind == .wormhole, !o.isExit, !o.paired else { continue }
            let d = hypot(o.x - world.ship.x, o.y - world.ship.y)
            guard d < o.radius else { continue }
            let p = o.partner
            guard p >= 0, p < world.obstacles.count, world.obstacles[p].active else { continue }
            world.obstacles[i].paired = true
            world.obstacles[p].paired = true
            run.teleportT = 0.3
            run.teleportPartner = p
            run.sfxPortalIn = true
            return
        }
    }

    static func finishTeleport(world: inout WorldState, run: inout RunState) {
        let p = run.teleportPartner
        guard p >= 0, p < world.obstacles.count else { return }
        world.ship.x = world.obstacles[p].x
        world.ship.y = world.obstacles[p].y
        run.grantShield()
        run.teleportPartner = -1
        run.invulnT = 0.12
        run.sfxPortalOut = true
        run.sfxShield = true
    }

    static func displayOpen(_ o: ObstacleState) -> CGFloat {
        max(0, o.displaySpread / max(o.radius * 2.45, 1))
    }

    static func mergeFactor(_ o: ObstacleState) -> CGFloat {
        let open = displayOpen(o)
        if open <= 0.06 { return 1 }
        if open >= 0.38 { return 0 }
        let u = 1 - (open - 0.06) / (0.38 - 0.06)
        return u * u * (3 - 2 * u)
    }

    static func pieceLocal(_ o: ObstacleState, index: Int) -> (x: CGFloat, y: CGFloat) {
        let angle = (CGFloat(index) / 4) * .pi * 2 - .pi / 2
        let r = max(0, o.displaySpread)
        return (cos(angle) * r, sin(angle) * r)
    }

    static func pieceSpin(_ o: ObstacleState, index: Int) -> CGFloat {
        let angle = (CGFloat(index) / 4) * .pi * 2 - .pi / 2
        let open = min(1.15, displayOpen(o))
        return angle + open * (.pi * 0.55) + o.phase * 0.35
    }

    private static func shove(
        world: inout WorldState,
        ox: CGFloat,
        oy: CGFloat,
        radius: CGFloat,
        strength: CGFloat,
        tick: CGFloat,
        inward: Bool,
        pullY: Bool
    ) {
        let dx = inward ? (ox - world.ship.x) : (world.ship.x - ox)
        let dy = inward ? (oy - world.ship.y) : (world.ship.y - oy)
        let dist = hypot(dx, dy)
        guard dist > 0, dist < radius else { return }
        let force = (1 - dist / radius) * strength * tick
        world.ship.x += (dx / dist) * force
        if pullY {
            world.ship.y += (dy / dist) * force
        }
    }

    private static func circle(
        _ ox: CGFloat, _ oy: CGFloat, _ orad: CGFloat,
        _ sx: CGFloat, _ sy: CGFloat, _ sr: CGFloat
    ) -> Bool {
        hypot(ox - sx, oy - sy) < orad + sr
    }

    private static func aabb(
        cx: CGFloat, cy: CGFloat, half: CGFloat, rot: CGFloat,
        shipX: CGFloat, shipY: CGFloat, shipR: CGFloat
    ) -> Bool {
        let dx = shipX - cx
        let dy = shipY - cy
        let c = cos(-rot)
        let s = sin(-rot)
        let rx = dx * c - dy * s
        let ry = dx * s + dy * c
        let closestX = min(half, max(-half, rx))
        let closestY = min(half, max(-half, ry))
        let cxd = rx - closestX
        let cyd = ry - closestY
        return cxd * cxd + cyd * cyd <= shipR * shipR
    }

    private static func obb(
        cx: CGFloat, cy: CGFloat, halfW: CGFloat, halfH: CGFloat, rot: CGFloat,
        shipX: CGFloat, shipY: CGFloat, shipR: CGFloat
    ) -> Bool {
        let dx = shipX - cx
        let dy = shipY - cy
        if dx * dx + dy * dy > (halfW + shipR) * (halfW + shipR) { return false }
        let c = cos(-rot)
        let s = sin(-rot)
        let lx = dx * c - dy * s
        let ly = dx * s + dy * c
        let closestX = min(halfW, max(-halfW, lx))
        let closestY = min(halfH, max(-halfH, ly))
        let cxd = lx - closestX
        let cyd = ly - closestY
        return cxd * cxd + cyd * cyd <= shipR * shipR
    }

    private static func triangle(o: ObstacleState, shipX: CGFloat, shipY: CGFloat, shipR: CGFloat) -> Bool {
        let dx = shipX - o.x
        let dy = shipY - o.y
        if hypot(dx, dy) > o.radius + shipR { return false }
        let c = cos(-o.rotation)
        let s = sin(-o.rotation)
        let rx = dx * c - dy * s
        let ry = dx * s + dy * c
        let verts: [(CGFloat, CGFloat)] = [
            (0, -o.radius),
            (o.radius * cos(.pi / 6), o.radius * sin(.pi / 6)),
            (-o.radius * cos(.pi / 6), o.radius * sin(.pi / 6))
        ]
        return pointInPolygonOrNearEdge(px: rx, py: ry, verts: verts, radius: shipR)
    }

    private static func polygon(
        o: ObstacleState,
        sides: Int,
        outer: CGFloat,
        inner: CGFloat,
        shipX: CGFloat,
        shipY: CGFloat,
        shipR: CGFloat
    ) -> Bool {
        let dx = shipX - o.x
        let dy = shipY - o.y
        if hypot(dx, dy) > outer * 1.5 + shipR { return false }
        var verts: [(CGFloat, CGFloat)] = []
        verts.reserveCapacity(sides)
        for i in 0..<sides {
            let a = (CGFloat(i) * 2 * .pi / CGFloat(sides)) - .pi / 2 + o.rotation
            verts.append((o.x + outer * cos(a), o.y + outer * sin(a)))
        }
        return pointInPolygonOrNearEdge(px: shipX, py: shipY, verts: verts, radius: shipR)
    }

    private static func star(o: ObstacleState, shipX: CGFloat, shipY: CGFloat, shipR: CGFloat) -> Bool {
        var verts: [(CGFloat, CGFloat)] = []
        verts.reserveCapacity(8)
        for i in 0..<8 {
            let r = i % 2 == 0 ? o.radius : o.radius * 0.5
            let a = CGFloat(i) * .pi / 4 + o.rotation
            verts.append((o.x + r * cos(a), o.y + r * sin(a)))
        }
        return pointInPolygonOrNearEdge(px: shipX, py: shipY, verts: verts, radius: shipR)
    }

    private static func phase(o: ObstacleState, shipX: CGFloat, shipY: CGFloat, shipR: CGFloat) -> Bool {
        let dx = shipX - o.x
        let dy = shipY - o.y
        let extent = o.radius * 2.45 + o.radius * 0.36 * 1.6 + shipR
        if dx * dx + dy * dy > extent * extent { return false }
        let c = cos(-o.rotation)
        let s = sin(-o.rotation)
        let rotX = dx * c - dy * s
        let rotY = dx * s + dy * c
        if mergeFactor(o) > 0.55 {
            return aabbLocal(rotX, rotY, half: o.radius * 0.72, shipR: shipR)
        }
        for i in 0..<4 {
            let pos = pieceLocal(o, index: i)
            let spin = pieceSpin(o, index: i)
            let cp = cos(-spin)
            let sp = sin(-spin)
            let lx = (rotX - pos.x) * cp - (rotY - pos.y) * sp
            let ly = (rotX - pos.x) * sp + (rotY - pos.y) * cp
            if aabbLocal(lx, ly, half: o.radius * 0.36, shipR: shipR) { return true }
        }
        return false
    }

    private static func aabbLocal(_ x: CGFloat, _ y: CGFloat, half: CGFloat, shipR: CGFloat) -> Bool {
        let cx = min(half, max(-half, x))
        let cy = min(half, max(-half, y))
        let dx = x - cx
        let dy = y - cy
        return dx * dx + dy * dy <= shipR * shipR
    }

    private static func pointInPolygonOrNearEdge(
        px: CGFloat,
        py: CGFloat,
        verts: [(CGFloat, CGFloat)],
        radius: CGFloat
    ) -> Bool {
        let n = verts.count
        guard n >= 3 else { return false }
        for i in 0..<n {
            let j = (i + 1) % n
            if distanceToLine(px, py, verts[i].0, verts[i].1, verts[j].0, verts[j].1) <= radius {
                return true
            }
        }
        var inside = false
        var j = n - 1
        for i in 0..<n {
            let yi = verts[i].1, yj = verts[j].1
            let xi = verts[i].0, xj = verts[j].0
            let intersect = ((yi > py) != (yj > py))
                && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)
            if intersect { inside.toggle() }
            j = i
        }
        return inside
    }

    private static func distanceToLine(
        _ px: CGFloat, _ py: CGFloat,
        _ x1: CGFloat, _ y1: CGFloat,
        _ x2: CGFloat, _ y2: CGFloat
    ) -> CGFloat {
        let a = px - x1
        let b = py - y1
        let c = x2 - x1
        let d = y2 - y1
        let lenSq = c * c + d * d
        var param: CGFloat = 0
        if lenSq != 0 { param = (a * c + b * d) / lenSq }
        let xx: CGFloat
        let yy: CGFloat
        if param < 0 {
            xx = x1; yy = y1
        } else if param > 1 {
            xx = x2; yy = y2
        } else {
            xx = x1 + param * c
            yy = y1 + param * d
        }
        return hypot(px - xx, py - yy)
    }
}

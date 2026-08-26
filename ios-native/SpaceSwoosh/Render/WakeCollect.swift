// WakeCollect.swift
// Changes: Spring mode uses full WallJelly.deform (seed×2π, sx/sy) like Android.

import CoreGraphics
import SpriteKit

struct WakeSample {
    var x: CGFloat
    var y: CGFloat
    var opacity: CGFloat
    var seed: CGFloat
    var angle: CGFloat
    var sx: CGFloat
    var sy: CGFloat
    var along: CGFloat
    var scale: CGFloat
}

enum WakeCollect {
    static func fract(_ v: CGFloat) -> CGFloat { v - floor(v) }

    static func screenY(_ ctx: TrailSyncContext) -> (CGFloat) -> CGFloat {
        { ctx.sceneHeight * CinematicFlight.cruiseSeat + ($0 - ctx.cameraY) }
    }

    static func tailWorld(ship: ShipState, radius: CGFloat, offset: CGFloat) -> (x: CGFloat, y: CGFloat) {
        (
            ship.x - sin(ship.bank) * radius * offset,
            ship.y - cos(ship.bank) * radius * offset
        )
    }

    @discardableResult
    static func points(_ ctx: TrailSyncContext, into buf: inout [WakeSample], capacity: Int) -> Int {
        let toY = screenY(ctx)
        let live = WallJelly.isLive(elapsedMs: ctx.jellyElapsedMs, mode: ctx.skin.wallTrailMode)
        let recorded = min(ctx.trail.count, capacity - 1)
        let denom = CGFloat(max(recorded - 1, 1))
        for i in 0..<recorded {
            let src = ctx.trail[i]
            let along = recorded <= 1 ? 1 : CGFloat(i) / denom
            let d = live ? deform(ctx, along: along, seed: src.seed) : TrailDeform.zero
            write(
                &buf, i,
                x: src.x + d.dx,
                y: toY(src.y + d.dy),
                opacity: src.opacity,
                seed: src.seed,
                angle: src.tangent,
                sx: d.sx,
                sy: d.sy,
                along: along,
                scale: 1
            )
        }
        var count = recorded
        let tail = tailWorld(ship: ctx.ship, radius: ctx.shipRadius, offset: ctx.skin.trailTailOffset)
        let d = live ? deform(ctx, along: 1, seed: 0.5) : TrailDeform.zero
        let sx = tail.x + d.dx
        let sy = toY(tail.y + d.dy)
        let ahead: CGFloat
        if count > 0 {
            let last = buf[count - 1]
            ahead = (sx - last.x) * sin(ctx.ship.tangent) + (sy - last.y) * cos(ctx.ship.tangent)
        } else {
            ahead = 1
        }
        if ahead > 0.5, count < capacity {
            write(
                &buf, count,
                x: sx, y: sy, opacity: 1, seed: 0.5,
                angle: ctx.ship.tangent, sx: d.sx, sy: d.sy, along: 1, scale: 1
            )
            count += 1
        }
        return count
    }

    @discardableResult
    static func dense(_ ctx: TrailSyncContext, into buf: inout [WakeSample], capacity: Int, subdiv: Int = 0) -> Int {
        let toY = screenY(ctx)
        let live = WallJelly.isLive(elapsedMs: ctx.jellyElapsedMs, mode: ctx.skin.wallTrailMode)
        let len = ctx.trail.count
        let denom = CGFloat(max(len - 1, 1))
        var count = 0
        for i in 0..<len {
            guard count < capacity else { return count }
            let p = ctx.trail[i]
            let along = len <= 1 ? 1 : CGFloat(i) / denom
            let d = live ? deform(ctx, along: along, seed: p.seed) : TrailDeform.zero
            write(
                &buf, count,
                x: p.x + d.dx, y: toY(p.y + d.dy), opacity: p.opacity, seed: p.seed,
                angle: p.tangent, sx: d.sx, sy: d.sy, along: along, scale: 1
            )
            count += 1
            if subdiv > 0, i < len - 1, count < capacity {
                let nxt = ctx.trail[i + 1]
                let nxtAlong = CGFloat(i + 1) / denom
                for s in 1...subdiv {
                    guard count < capacity else { return count }
                    let t = CGFloat(s) / CGFloat(subdiv + 1)
                    let u = 1 - t
                    let subSeed = p.seed * u + nxt.seed * t
                    let subAlong = along * u + nxtAlong * t
                    let md = live ? deform(ctx, along: subAlong, seed: subSeed) : TrailDeform.zero
                    write(
                        &buf, count,
                        x: p.x * u + nxt.x * t + md.dx,
                        y: toY(p.y * u + nxt.y * t + md.dy),
                        opacity: p.opacity * u + nxt.opacity * t,
                        seed: subSeed,
                        angle: p.tangent * u + nxt.tangent * t,
                        sx: md.sx,
                        sy: md.sy,
                        along: subAlong,
                        scale: 0.82
                    )
                    count += 1
                }
            }
        }
        return count
    }

    static func filament(
        from pts: [WakeSample],
        count: Int,
        r: CGFloat,
        offsetScale: CGFloat,
        energy: CGFloat,
        into out: inout [WakeSample]
    ) {
        let denom = CGFloat(max(count - 1, 1))
        for i in 0..<count {
            let src = pts[i]
            let prev = pts[max(0, i - 1)]
            let next = pts[min(count - 1, i + 1)]
            let dx = next.x - prev.x
            let dy = next.y - prev.y
            let len = hypot(dx, dy)
            let inv = len > 0.0001 ? 1 / len : 1
            let nx = -dy * inv
            let ny = dx * inv
            let leave = 1 - CGFloat(i) / denom
            let off = r * offsetScale * (0.25 + 0.75 * leave) * (1 + energy * 0.55)
            var p = src
            p.x = src.x + nx * off
            p.y = src.y + ny * off
            if i < out.count {
                out[i] = p
            }
        }
    }

    static func ribbonPath(
        pts: [WakeSample],
        count: Int,
        widthAt: (Int) -> CGFloat,
        left: inout [CGPoint],
        right: inout [CGPoint],
        i0: Int = 0,
        i1: Int? = nil
    ) -> CGPath {
        let path = CGMutablePath()
        let end = i1 ?? (count - 1)
        let n = end - i0 + 1
        guard n >= 2, count >= 2 else { return path }
        for k in 0..<n {
            let i = i0 + k
            let prev = pts[max(i0, i - 1)]
            let next = pts[min(end, i + 1)]
            let dx = next.x - prev.x
            let dy = next.y - prev.y
            let len = hypot(dx, dy)
            let inv = len > 0.0001 ? 1 / len : 1
            let nx = -dy * inv
            let ny = dx * inv
            let w = widthAt(i)
            let p = pts[i]
            left[k] = CGPoint(x: p.x + nx * w, y: p.y + ny * w)
            right[k] = CGPoint(x: p.x - nx * w, y: p.y - ny * w)
        }
        path.move(to: left[0])
        if n == 2 {
            path.addLine(to: left[1])
        } else {
            for i in 1..<(n - 1) {
                let mx = (left[i].x + left[i + 1].x) * 0.5
                let my = (left[i].y + left[i + 1].y) * 0.5
                path.addQuadCurve(to: CGPoint(x: mx, y: my), control: left[i])
            }
            path.addLine(to: left[n - 1])
        }
        path.addLine(to: right[n - 1])
        if n > 2 {
            for i in stride(from: n - 2, through: 1, by: -1) {
                let mx = (right[i].x + right[i - 1].x) * 0.5
                let my = (right[i].y + right[i - 1].y) * 0.5
                path.addQuadCurve(to: CGPoint(x: mx, y: my), control: right[i])
            }
        }
        path.addLine(to: right[0])
        path.closeSubpath()
        return path
    }

    static func shapeNode(z: CGFloat) -> SKShapeNode {
        let n = SKShapeNode()
        n.lineWidth = 0
        n.strokeColor = .clear
        n.isAntialiased = true
        n.zPosition = z
        n.isHidden = true
        return n
    }

    static func sprite(_ texture: SKTexture, z: CGFloat) -> SKSpriteNode {
        let n = SKSpriteNode(texture: texture)
        n.anchorPoint = CGPoint(x: 0.5, y: 0.5)
        n.colorBlendFactor = 1
        n.zPosition = z
        n.isHidden = true
        return n
    }

    private static func deform(_ ctx: TrailSyncContext, along: CGFloat, seed: CGFloat) -> TrailDeform {
        WallJelly.deform(
            mode: ctx.skin.wallTrailMode,
            elapsedMs: ctx.jellyElapsedMs,
            along: along,
            side: ctx.jellySide,
            radius: ctx.shipRadius,
            seed: seed
        )
    }

    private static func write(
        _ buf: inout [WakeSample],
        _ i: Int,
        x: CGFloat,
        y: CGFloat,
        opacity: CGFloat,
        seed: CGFloat,
        angle: CGFloat,
        sx: CGFloat,
        sy: CGFloat,
        along: CGFloat,
        scale: CGFloat
    ) {
        let sample = WakeSample(
            x: x, y: y, opacity: opacity, seed: seed, angle: angle,
            sx: sx, sy: sy, along: along, scale: scale
        )
        if i < buf.count {
            buf[i] = sample
        } else {
            buf.append(sample)
        }
    }
}

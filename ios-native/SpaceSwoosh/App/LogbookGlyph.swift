// LogbookGlyph.swift
// Space Log picture-well specimens matching Android LogbookGlyphs.js.
// Changes: Nine playtest specimens (spinner through meteor shower).
// - Space BOOP: zigzag bounce (52° from vertical) with even Signal-Blue dots
//   kissing the left wall then reflecting — matches the in-run wake, not a
//   droop off the hull.
// - Created file: playfield-scale corridor crop (20 baseUnits). Finish gate
//   spans the well; compact contacts use in-game sizes (sparkle, wormhole,
//   asteroid, shield plus + rings, wall-boost edge slab).

import SwiftUI

enum LogbookGlyph {
    static let corridorU: CGFloat = 20

    private enum Size {
        static let asteroid: CGFloat = 3.6
        static let sparkle: CGFloat = 1.15
        static let shield: CGFloat = 2
        static let wormhole: CGFloat = 2
        static let blackhole: CGFloat = 3
        static let wallW: CGFloat = 0.9
        static let wallH: CGFloat = 10
        static let barrierW: CGFloat = 2
        static let barrierH: CGFloat = 14
        static let sweep: CGFloat = 1.22
        static let repulsor: CGFloat = 1.25
        static let phase: CGFloat = 1.65
        static let driftH: CGFloat = 5
    }

    static func draw(_ icon: String, in context: GraphicsContext, canvas: CGSize, dimmed: Bool = false) {
        var ctx = context
        let rect = CGRect(origin: .zero, size: canvas)
        ctx.clip(to: Path(rect))
        let ink = dimmed ? BrandColors.ink.opacity(0.30) : BrandColors.ink
        let signal = dimmed ? BrandColors.signal.opacity(0.35) : BrandColors.signal
        let u = min(canvas.width, canvas.height) / corridorU
        let cx = canvas.width / 2
        let cy = canvas.height / 2

        switch icon {
        case "asteroidCircle":
            fillCircle(&ctx, cx: cx, cy: cy, r: Size.asteroid * u, color: ink)
        case "asteroidTriangle":
            fillTriangle(&ctx, cx: cx, cy: cy, r: Size.asteroid * u, color: ink)
        case "asteroidSquare":
            let half = Size.asteroid * 0.7 * u
            ctx.fill(
                Path(CGRect(x: cx - half, y: cy - half, width: half * 2, height: half * 2)),
                with: .color(ink)
            )
        case "sideBarrier":
            let bw = Size.barrierW * u
            let bh = min(canvas.height * 0.92, Size.barrierH * u)
            ctx.fill(Path(CGRect(x: 0, y: cy - bh / 2, width: bw, height: bh)), with: .color(ink))
            ctx.fill(
                Path(CGRect(x: canvas.width - bw, y: cy - bh / 2, width: bw, height: bh)),
                with: .color(ink)
            )
        case "complex":
            let core = Size.asteroid * 0.8 * u
            fillCircle(&ctx, cx: cx, cy: cy, r: core, color: ink)
            let dist = Size.asteroid * 1.5 * u
            let moon = Size.asteroid * 0.25 * u
            for i in 0..<3 {
                let a = (CGFloat.pi * 2 * CGFloat(i)) / 3 - 0.4
                fillCircle(&ctx, cx: cx + cos(a) * dist, cy: cy + sin(a) * dist, r: moon, color: ink)
            }
        case "moving":
            fillPolygon(&ctx, cx: cx, cy: cy, r: Size.asteroid * 0.8 * u, n: 5, color: ink)
        case "shooting":
            fillStar(&ctx, cx: cx, cy: cy, r: Size.asteroid * u, color: ink)
            let shot = Size.asteroid * 0.2 * u
            fillCircle(&ctx, cx: cx + Size.asteroid * 1.55 * u, cy: cy - Size.asteroid * 0.15 * u, r: shot, color: ink)
            fillCircle(&ctx, cx: cx + Size.asteroid * 2.15 * u, cy: cy - Size.asteroid * 0.35 * u, r: shot, color: ink)
        case "pulsating":
            fillCircle(&ctx, cx: cx, cy: cy, r: Size.asteroid * 1.45 * u, color: ink)
            strokeCircle(
                &ctx, cx: cx, cy: cy, r: Size.asteroid * 2 * u,
                color: BrandColors.ink30, width: max(1.2, u * 0.08)
            )
        case "phase":
            let size = Size.phase * u
            let piece = size * 0.36
            let spread = size * 2.05
            for i in 0..<4 {
                let a = (CGFloat(i) / 4) * .pi * 2 - .pi / 2
                var local = ctx
                local.translateBy(x: cx + cos(a) * spread, y: cy + sin(a) * spread)
                local.rotate(by: .radians(a + 0.4))
                local.fill(
                    Path(CGRect(x: -piece, y: -piece, width: piece * 2, height: piece * 2)),
                    with: .color(ink)
                )
            }
        case "sweepGate":
            let size = Size.sweep * u
            let halfLen = size * 2.8
            let halfW = max(0.85, size * 0.045)
            var local = ctx
            local.translateBy(x: cx, y: cy)
            local.rotate(by: .radians(-0.42))
            local.fill(
                Path(CGRect(x: -halfLen, y: -halfW, width: halfLen * 2, height: halfW * 2)),
                with: .color(ink)
            )
        case "repulsor":
            let size = Size.repulsor * u
            strokeCircle(
                &ctx, cx: cx, cy: cy, r: size * 2.4, color: BrandColors.ink30,
                width: max(1, u * 0.06), dash: [size * 0.35, size * 0.22]
            )
            for i in 0..<8 {
                let a = (CGFloat(i) / 8) * .pi * 2
                var path = Path()
                path.move(to: CGPoint(x: cx + cos(a) * size * 1.35, y: cy + sin(a) * size * 1.35))
                path.addLine(to: CGPoint(x: cx + cos(a) * size * 1.9, y: cy + sin(a) * size * 1.9))
                ctx.stroke(path, with: .color(BrandColors.ink30), style: StrokeStyle(lineWidth: max(1.25, u * 0.07)))
            }
            fillCircle(&ctx, cx: cx, cy: cy, r: size, color: ink)
        case "driftCurrent":
            let halfH = Size.driftH * u / 2
            let dash = u * 0.55
            for i in 0..<7 {
                let yy = cy - halfH * 0.72 + (CGFloat(i) / 6) * halfH * 1.44
                var path = Path()
                path.move(to: CGPoint(x: 0, y: yy))
                path.addLine(to: CGPoint(x: canvas.width, y: yy))
                ctx.stroke(
                    path,
                    with: .color(BrandColors.ink30),
                    style: StrokeStyle(lineWidth: max(1.1, u * 0.06), lineCap: .round, dash: [dash, dash * 0.85])
                )
            }
        case "wormhole":
            let size = Size.wormhole * u
            strokeCircle(
                &ctx, cx: cx, cy: cy, r: size, color: signal,
                width: size * 0.1, dash: [size * 0.28, size * 0.28]
            )
        case "blackhole":
            let size = Size.blackhole * u
            ctx.fill(
                Path(ellipseIn: CGRect(x: cx - size * 4, y: cy - size * 4, width: size * 8, height: size * 8)),
                with: .radialGradient(
                    Gradient(stops: [
                        .init(color: BrandColors.ink.opacity(0.4), location: 0),
                        .init(color: BrandColors.ink.opacity(0), location: 1)
                    ]),
                    center: CGPoint(x: cx, y: cy),
                    startRadius: size,
                    endRadius: size * 4
                )
            )
            fillCircle(&ctx, cx: cx, cy: cy, r: size, color: ink)
            strokeCircle(&ctx, cx: cx, cy: cy, r: size * 1.2, color: ink, width: max(1.5, u * 0.1))
        case "spinner":
            drawSpinnerGlyph(&ctx, cx: cx, cy: cy, u: u, ink: ink, dimmed: dimmed)
        case "hollowOrbit":
            fillCircle(&ctx, cx: cx - u * 3.4, cy: cy, r: u * 1.15, color: ink)
            fillCircle(&ctx, cx: cx + u * 3.4, cy: cy, r: u * 1.15, color: ink)
        case "blinkRow":
            let br = u * 1.55
            let bxs = [cx - br * 2.5, cx, cx + br * 2.5]
            for (i, px) in bxs.enumerated() {
                if i == 1 {
                    strokeCircle(
                        &ctx, cx: px, cy: cy, r: br,
                        color: BrandColors.ink30, width: max(1.25, u * 0.08),
                        dash: [br * 0.38, br * 0.24]
                    )
                } else {
                    fillCircle(&ctx, cx: px, cy: cy, r: br, color: ink)
                }
            }
        case "tunnelField":
            drawTunnelGlyph(&ctx, canvas: canvas, cx: cx, cy: cy, u: u, ink: ink)
        case "shoal":
            let fish: [(CGFloat, CGFloat)] = [
                (-2.6, 0.4), (-1.2, -0.9), (0.2, 0.2), (1.5, -0.6), (2.8, 0.7),
                (-0.6, 1.3), (1.0, 1.4), (-2.0, -1.6), (2.2, -1.8),
            ]
            for (fx, fy) in fish {
                fillCircle(&ctx, cx: cx + fx * u * 1.6, cy: cy + fy * u * 1.6, r: u * 0.6, color: ink)
            }
        case "ricochet":
            var spun = ctx
            spun.translateBy(x: cx, y: cy)
            spun.rotate(by: .radians(0.55))
            fillTriangle(&spun, cx: 0, cy: 0, r: Size.asteroid * 0.75 * u, color: ink)
        case "satDebris":
            drawSatGlyph(&ctx, cx: cx, cy: cy, u: u, ink: ink)
        case "lightning":
            drawLightningGlyph(&ctx, canvas: canvas, cy: cy, u: u, ink: ink, dimmed: dimmed)
        case "meteorShower":
            drawMeteorGlyph(&ctx, cx: cx, cy: cy, u: u, ink: ink)
        case "spaceBoop":
            let wall = u * 1.15
            ctx.fill(Path(CGRect(x: 0, y: 0, width: wall, height: canvas.height)), with: .color(ink))
            let k = tan(52 * CGFloat.pi / 180)
            let step = u * 0.92
            let dotR = u * 0.22
            let contactX = wall + u * 0.12
            let contactY = cy + u * 1.35
            let legs = 5
            let dotColor = dimmed ? BrandColors.signal.opacity(0.35) : BrandColors.signal
            fillCircle(&ctx, cx: contactX, cy: contactY, r: dotR, color: dotColor)
            for i in 1...legs {
                let t = CGFloat(i)
                fillCircle(&ctx, cx: contactX + t * step * k, cy: contactY + t * step, r: dotR, color: dotColor)
                fillCircle(&ctx, cx: contactX + t * step * k, cy: contactY - t * step, r: dotR, color: dotColor)
            }
            fillCircle(
                &ctx,
                cx: contactX + CGFloat(legs) * step * k,
                cy: contactY - CGFloat(legs) * step,
                r: u * 1.05,
                color: ink
            )
        case "shield":
            let size = Size.shield * u
            for i in 0..<2 {
                let tt = 0.22 + CGFloat(i) * 0.38
                let radius = size * (0.5 + tt * 0.8)
                let opacity = pow(1 - tt, 1.8) * 0.9
                strokeCircle(
                    &ctx, cx: cx, cy: cy, r: radius,
                    color: BrandColors.signal.opacity(dimmed ? opacity * 0.4 : opacity),
                    width: u * 0.16
                )
            }
            let arm = size * 0.45
            var plus = Path()
            plus.move(to: CGPoint(x: cx - arm, y: cy))
            plus.addLine(to: CGPoint(x: cx + arm, y: cy))
            plus.move(to: CGPoint(x: cx, y: cy - arm))
            plus.addLine(to: CGPoint(x: cx, y: cy + arm))
            ctx.stroke(plus, with: .color(ink), style: StrokeStyle(lineWidth: u * 0.28, lineCap: .round))
        case "wallBoost":
            let bw = Size.wallW * u
            let bh = min(canvas.height * 0.86, Size.wallH * u)
            ctx.opacity = 0.82
            ctx.fill(Path(CGRect(x: 0, y: cy - bh / 2, width: bw, height: bh)), with: .color(signal))
            ctx.opacity = 1
        case "pointsSparkle":
            let r = Size.sparkle * u
            ctx.fill(
                Path(ellipseIn: CGRect(x: cx - r * 1.9, y: cy - r * 1.9, width: r * 3.8, height: r * 3.8)),
                with: .color(BrandColors.signal.opacity(BrandColors.UI.signalSoftAlpha))
            )
            fillSparkle(&ctx, cx: cx, cy: cy, r: r, color: signal)
        case "styleSwoosh":
            let rock = u * 2.4
            let gap = u * 1.55
            fillCircle(&ctx, cx: cx - rock - gap / 2, cy: cy, r: rock, color: ink)
            fillCircle(&ctx, cx: cx + rock + gap / 2, cy: cy, r: rock, color: ink)
            strokeCircle(
                &ctx, cx: cx, cy: cy, r: u * 2.1,
                color: BrandColors.signal.opacity(dimmed ? 0.28 : 0.7),
                width: max(1.5, u * 0.18)
            )
            var streak = Path()
            streak.move(to: CGPoint(x: cx, y: cy + u * 2.4))
            streak.addLine(to: CGPoint(x: cx, y: cy - u * 2.4))
            ctx.stroke(streak, with: .color(signal), style: StrokeStyle(lineWidth: max(1.2, u * 0.12)))
        case "deflectorSmash":
            let rock = Size.asteroid * 0.85 * u
            fillCircle(&ctx, cx: cx, cy: cy, r: rock, color: ink)
            strokeCircle(&ctx, cx: cx, cy: cy, r: rock * 1.55, color: signal, width: max(1.5, u * 0.18))
            ctx.opacity = 0.45
            strokeCircle(&ctx, cx: cx, cy: cy, r: rock * 2.05, color: signal, width: max(1.5, u * 0.18))
            ctx.opacity = 1
        case "finishGate":
            drawFinishGate(&ctx, canvas: canvas, u: u, ink: ink, signal: signal)
        default:
            strokeCircle(&ctx, cx: cx, cy: cy, r: u * 2.2, color: BrandColors.ink30, width: 2)
        }
    }

    private static func fillCircle(_ ctx: inout GraphicsContext, cx: CGFloat, cy: CGFloat, r: CGFloat, color: Color) {
        ctx.fill(
            Path(ellipseIn: CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2)),
            with: .color(color)
        )
    }

    private static func strokeCircle(
        _ ctx: inout GraphicsContext,
        cx: CGFloat,
        cy: CGFloat,
        r: CGFloat,
        color: Color,
        width: CGFloat,
        dash: [CGFloat] = []
    ) {
        let path = Path(ellipseIn: CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2))
        var style = StrokeStyle(lineWidth: width)
        if !dash.isEmpty { style.dash = dash }
        ctx.stroke(path, with: .color(color), style: style)
    }

    private static func fillTriangle(_ ctx: inout GraphicsContext, cx: CGFloat, cy: CGFloat, r: CGFloat, color: Color) {
        var path = Path()
        path.move(to: CGPoint(x: cx, y: cy - r))
        path.addLine(to: CGPoint(x: cx + r * cos(.pi / 6), y: cy + r * sin(.pi / 6)))
        path.addLine(to: CGPoint(x: cx - r * cos(.pi / 6), y: cy + r * sin(.pi / 6)))
        path.closeSubpath()
        ctx.fill(path, with: .color(color))
    }

    private static func fillPolygon(
        _ ctx: inout GraphicsContext,
        cx: CGFloat,
        cy: CGFloat,
        r: CGFloat,
        n: Int,
        color: Color
    ) {
        var path = Path()
        for i in 0..<n {
            let a = -CGFloat.pi / 2 + CGFloat(i) * (.pi * 2 / CGFloat(n))
            let p = CGPoint(x: cx + cos(a) * r, y: cy + sin(a) * r)
            if i == 0 { path.move(to: p) } else { path.addLine(to: p) }
        }
        path.closeSubpath()
        ctx.fill(path, with: .color(color))
    }

    private static func fillStar(_ ctx: inout GraphicsContext, cx: CGFloat, cy: CGFloat, r: CGFloat, color: Color) {
        var path = Path()
        for i in 0..<8 {
            let rad = i % 2 == 0 ? r : r * 0.5
            let a = CGFloat(i) * .pi / 4
            let p = CGPoint(x: cx + cos(a) * rad, y: cy + sin(a) * rad)
            if i == 0 { path.move(to: p) } else { path.addLine(to: p) }
        }
        path.closeSubpath()
        ctx.fill(path, with: .color(color))
    }

    /// Android `drawSparkle`: 8-vertex 4-point star, N/E/S/W, innerRatio 0.4.
    private static func fillSparkle(_ ctx: inout GraphicsContext, cx: CGFloat, cy: CGFloat, r: CGFloat, color: Color) {
        var path = Path()
        for i in 0..<8 {
            let angle = (CGFloat(i) * .pi / 4) - .pi / 2
            let rad = i % 2 == 0 ? r : r * 0.4
            let p = CGPoint(x: cx + cos(angle) * rad, y: cy + sin(angle) * rad)
            if i == 0 { path.move(to: p) } else { path.addLine(to: p) }
        }
        path.closeSubpath()
        ctx.fill(path, with: .color(color))
    }

    private static func drawFinishGate(
        _ ctx: inout GraphicsContext,
        canvas: CGSize,
        u: CGFloat,
        ink: Color,
        signal: Color
    ) {
        let cy = canvas.height / 2
        let handleLen = max(u * 1.35, canvas.width * 0.16)
        let handleH = max(u * 0.72, canvas.height * 0.2)
        let tipW = max(u * 0.38, canvas.width * 0.045)
        let inset = u * 0.18
        let leftOuter = inset
        let rightOuter = canvas.width - inset
        let leftTip = leftOuter + handleLen
        let rightTip = rightOuter - handleLen

        var stream = Path()
        stream.move(to: CGPoint(x: leftTip, y: cy))
        stream.addLine(to: CGPoint(x: rightTip, y: cy))
        ctx.stroke(
            stream,
            with: .color(BrandColors.signal.opacity(0.3)),
            style: StrokeStyle(lineWidth: u * 0.22, dash: [u * 0.42, u * 0.32])
        )
        ctx.stroke(
            stream,
            with: .color(signal),
            style: StrokeStyle(lineWidth: max(1.5, u * 0.11), dash: [u * 0.42, u * 0.32])
        )

        emitter(&ctx, outerX: leftOuter, facingRight: true, cy: cy, handleLen: handleLen, handleH: handleH, tipW: tipW, u: u, ink: ink, signal: signal)
        emitter(&ctx, outerX: rightOuter, facingRight: false, cy: cy, handleLen: handleLen, handleH: handleH, tipW: tipW, u: u, ink: ink, signal: signal)
    }

    private static func emitter(
        _ ctx: inout GraphicsContext,
        outerX: CGFloat,
        facingRight: Bool,
        cy: CGFloat,
        handleLen: CGFloat,
        handleH: CGFloat,
        tipW: CGFloat,
        u: CGFloat,
        ink: Color,
        signal: Color
    ) {
        let tipX = facingRight ? outerX + handleLen : outerX - handleLen
        let bodyLeft = facingRight ? outerX : tipX + tipW
        let bodyW = handleLen - tipW
        let top = cy - handleH / 2
        ctx.fill(
            Path(roundedRect: CGRect(x: bodyLeft, y: top, width: bodyW, height: handleH), cornerRadius: handleH * 0.22),
            with: .color(ink)
        )
        let tipLeft = facingRight ? tipX - tipW : tipX
        ctx.fill(
            Path(CGRect(x: tipLeft, y: cy - handleH * 0.42, width: tipW, height: handleH * 0.84)),
            with: .color(signal)
        )
        let coreX = facingRight ? tipX - tipW * 0.15 : tipX + tipW * 0.15
        fillCircle(&ctx, cx: coreX, cy: cy, r: u * 0.14, color: signal)
    }

    private static func drawSpinnerGlyph(
        _ ctx: inout GraphicsContext, cx: CGFloat, cy: CGFloat, u: CGFloat, ink: Color, dimmed: Bool
    ) {
        var local = ctx
        local.translateBy(x: cx, y: cy)
        local.rotate(by: .radians(-0.6))
        let len = u * 4.2
        let tell = dimmed ? BrandColors.ink30.opacity(0.45) : BrandColors.ink30
        let sweep: CGFloat = 0.95
        let slices = 7
        let rings = 4
        let step = sweep / CGFloat(slices)
        for s in 0..<slices {
            let from = CGFloat(s) * step
            let to = CGFloat(s + 1) * step
            var arcs = Path()
            for k in 1...rings {
                let r = len * (0.4 + (0.6 * CGFloat(k)) / CGFloat(rings))
                arcs.move(to: CGPoint(x: cos(from) * r, y: sin(from) * r))
                arcs.addArc(center: .zero, radius: r, startAngle: .radians(from), endAngle: .radians(to), clockwise: false)
            }
            local.opacity = 1 - CGFloat(s) / CGFloat(slices)
            local.stroke(arcs, with: .color(tell), style: StrokeStyle(lineWidth: max(1.25, u * 0.14), lineCap: .butt))
        }
        local.opacity = 1
        local.fill(Path(CGRect(x: 0, y: -u * 0.16, width: len, height: u * 0.32)), with: .color(ink))
        fillCircle(&local, cx: 0, cy: 0, r: u * 0.7, color: ink)
    }

    private static func drawTunnelGlyph(
        _ ctx: inout GraphicsContext, canvas: CGSize, cx: CGFloat, cy: CGFloat, u: CGFloat, ink: Color
    ) {
        let k = tan(52 * CGFloat.pi / 180)
        let leg = canvas.height * 0.32
        let pts = [
            CGPoint(x: cx - leg * k * 0.5, y: cy + leg * 1.5),
            CGPoint(x: cx + leg * k * 0.5, y: cy + leg * 0.5),
            CGPoint(x: cx - leg * k * 0.5, y: cy - leg * 0.5),
            CGPoint(x: cx + leg * k * 0.5, y: cy - leg * 1.5),
        ]
        let step = u * 1.6
        let r = u * 0.6
        var py = step * 0.5
        var row = 0
        while py < canvas.height {
            var px = row % 2 == 1 ? step * 0.5 : 0
            while px < canvas.width {
                let d = distToPolyline(px, py, pts)
                if d >= u * 2.2 {
                    if d < u * 3.4 {
                        strokeCircle(
                            &ctx, cx: px, cy: py, r: r, color: BrandColors.ink30,
                            width: max(1, u * 0.07), dash: [r * 0.6, r * 0.4]
                        )
                    } else {
                        fillCircle(&ctx, cx: px, cy: py, r: r, color: ink)
                    }
                }
                px += step
            }
            py += step * 0.87
            row += 1
        }
    }

    private static func distToPolyline(_ px: CGFloat, _ py: CGFloat, _ pts: [CGPoint]) -> CGFloat {
        var best = CGFloat.greatestFiniteMagnitude
        for i in 0..<(pts.count - 1) {
            let a = pts[i]
            let b = pts[i + 1]
            let dx = b.x - a.x
            let dy = b.y - a.y
            let len = dx * dx + dy * dy
            var t: CGFloat = 0
            if len > 0 { t = max(0, min(1, ((px - a.x) * dx + (py - a.y) * dy) / len)) }
            let ex = px - (a.x + t * dx)
            let ey = py - (a.y + t * dy)
            best = min(best, hypot(ex, ey))
        }
        return best
    }

    private static func drawSatGlyph(_ ctx: inout GraphicsContext, cx: CGFloat, cy: CGFloat, u: CGFloat, ink: Color) {
        var local = ctx
        local.translateBy(x: cx, y: cy)
        local.rotate(by: .radians(-0.35))
        var arm = Path()
        arm.move(to: CGPoint(x: -u * 2.4, y: 0))
        arm.addLine(to: CGPoint(x: u * 2.4, y: 0))
        local.stroke(arm, with: .color(ink), style: StrokeStyle(lineWidth: max(1.2, u * 0.18), lineCap: .butt))
        local.fill(Path(CGRect(x: -u, y: -u, width: u * 2, height: u * 2)), with: .color(ink))
        local.fill(Path(CGRect(x: -u * 3.55, y: -u * 0.62, width: u * 2.3, height: u * 1.24)), with: .color(ink))
        local.fill(Path(CGRect(x: u * 1.25, y: -u * 0.62, width: u * 2.3, height: u * 1.24)), with: .color(ink))
        local.fill(Path(CGRect(x: -u * 0.14, y: -u * 2.3, width: u * 0.28, height: u * 1.3)), with: .color(ink))
    }

    private static func drawLightningGlyph(
        _ ctx: inout GraphicsContext, canvas: CGSize, cy: CGFloat, u: CGFloat, ink: Color, dimmed: Bool
    ) {
        let reach = canvas.width * 0.7
        let jags: [CGFloat] = [0, -0.9, 0.7, -1.2, 0.4, 1.1, -0.6, 0.9, -1.0, 0.3]
        func bolt() -> Path {
            var path = Path()
            for (i, j) in jags.enumerated() {
                let p = CGPoint(x: (reach * CGFloat(i)) / CGFloat(jags.count - 1), y: cy + j * u)
                if i == 0 { path.move(to: p) } else { path.addLine(to: p) }
            }
            return path
        }
        let line = bolt()
        let wide = dimmed ? BrandColors.ink30.opacity(0.45) : BrandColors.ink30
        ctx.stroke(line, with: .color(wide), style: StrokeStyle(lineWidth: u * 0.6, lineCap: .round, lineJoin: .round))
        ctx.stroke(line, with: .color(ink), style: StrokeStyle(lineWidth: u * 0.36, lineCap: .round, lineJoin: .round))
        let forks: [[CGPoint]] = [
            [
                CGPoint(x: reach * 3 / 9, y: cy - 1.2 * u),
                CGPoint(x: reach * 4.0 / 9, y: cy - 2.4 * u),
                CGPoint(x: reach * 4.6 / 9, y: cy - 3.3 * u),
            ],
            [
                CGPoint(x: reach * 6 / 9, y: cy - 0.6 * u),
                CGPoint(x: reach * 7.1 / 9, y: cy + 0.8 * u),
                CGPoint(x: reach * 7.6 / 9, y: cy + 2.0 * u),
            ],
        ]
        for fork in forks {
            var path = Path()
            for (i, p) in fork.enumerated() {
                if i == 0 { path.move(to: p) } else { path.addLine(to: p) }
            }
            ctx.stroke(path, with: .color(ink), style: StrokeStyle(lineWidth: u * 0.24, lineCap: .round, lineJoin: .round))
        }
    }

    private static func drawMeteorGlyph(_ ctx: inout GraphicsContext, cx: CGFloat, cy: CGFloat, u: CGFloat, ink: Color) {
        let a = 28 * CGFloat.pi / 180
        let sx = sin(a) * u * 3.5
        let sy = cos(a) * u * 3.5
        let ghosts: [(CGFloat, CGFloat)] = [(-7, -9), (-1, -11), (5, -8), (8, -12)]
        var ghost = Path()
        for (dx, dy) in ghosts {
            let mx = cx + dx * u
            let my = cy + dy * u
            ghost.move(to: CGPoint(x: mx, y: my))
            ghost.addLine(to: CGPoint(x: mx - sx * 1.15, y: my - sy * 1.15))
        }
        ctx.stroke(
            ghost, with: .color(BrandColors.ink30),
            style: StrokeStyle(lineWidth: max(1, u * 0.28), lineCap: .butt, dash: [u * 0.45, u * 0.5])
        )
        let drops: [(CGFloat, CGFloat)] = [
            (-5, -4), (-1, -6), (3, -3), (6, -7), (-6, 2), (-2, 1), (2, 4), (5, 1), (-3, 6), (1, 8),
        ]
        for (dx, dy) in drops {
            let mx = cx + dx * u
            let my = cy + dy * u
            var streak = Path()
            streak.move(to: CGPoint(x: mx, y: my))
            streak.addLine(to: CGPoint(x: mx - sx, y: my - sy))
            ctx.stroke(streak, with: .color(BrandColors.ink30), style: StrokeStyle(lineWidth: u * 0.46, lineCap: .round))
            fillCircle(&ctx, cx: mx, cy: my, r: u * 0.42, color: ink)
        }
    }
}

struct LogbookSpecimenView: View {
    var icon: String

    var body: some View {
        Canvas { context, size in
            LogbookGlyph.draw(icon, in: context, canvas: size)
        }
        .accessibilityHidden(true)
    }
}

// LogbookGlyph.swift
// Space Log picture-well specimens matching Android LogbookGlyphs.js.
// Changes:
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
        case "spaceBoop":
            let wall = u * 1.15
            ctx.fill(Path(CGRect(x: 0, y: 0, width: wall, height: canvas.height)), with: .color(ink))
            var local = ctx
            local.translateBy(x: wall + u * 1.6, y: cy)
            local.scaleBy(x: 0.42, y: 1.15)
            fillCircle(&local, cx: 0, cy: 0, r: u * 1.35, color: ink)
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

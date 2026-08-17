// PreviewWakePaint.swift
// Changes: Dusk hangar cloud uses saber violet; family stills match play drawers.

import CoreGraphics
import UIKit

/// Menu-card wake: Android `previewWake` (12 pts, span 3.4r) then the skin's
/// family drawer. Always the short sample so the tail never covers the title.
enum PreviewWakePaint {
    static let bank: CGFloat = min(GameConfig.Spacecraft.maxBank, CGFloat(atan2(1.6 * 0.75, 4.2)))
    static var turn: CGFloat { min(1, abs(bank) / GameConfig.Spacecraft.maxBank) }

    static func draw(_ skin: SkinDef, onto cg: CGContext, cx: CGFloat, cy: CGFloat, radius: CGFloat) {
        let pts = samples(cx: cx, cy: cy, radius: radius, skin: skin)
        guard pts.count >= 2 else { return }
        var left = Array(repeating: CGPoint.zero, count: pts.count)
        var right = Array(repeating: CGPoint.zero, count: pts.count)
        var fil = pts
        switch skin.trailKind {
        case .dots:
            dots(cg, pts, radius, color: skin.trailSignal ? BrandColors.UI.signal : BrandColors.UI.ink)
        case .twinDots:
            twins(cg, pts, radius, sep: 0.5, size: 0.62)
        case .twin:
            twins(cg, pts, radius, sep: 0.72, size: 0.5)
        case .ribbon:
            ribbon(cg, pts, &left, &right, radius, skin: skin)
        case .hairline:
            fillRibbon(cg, pts, &left, &right, widthAt: { i in
                let t = CGFloat(i) / CGFloat(max(pts.count - 1, 1))
                return radius * 0.045 * pow(t, 0.45) * (0.4 + 0.6 * pts[i].opacity)
            }, color: skin.trailSignal ? BrandColors.UI.signal : BrandColors.UI.ink, alpha: 0.88)
        case .rainbow:
            rainbow(cg, pts, &left, &right, radius, bands: BrandColors.UI.nyanBands, widthScale: skin.trailWidthScale)
        case .horizon:
            horizon(cg, pts, &left, &right, radius, bands: BrandColors.UI.fletchBands, widthScale: skin.trailWidthScale, alpha: skin.trailAlpha)
        case .saber:
            saber(cg, pts, &left, &right, radius)
        case .wisp:
            fillRibbon(cg, pts, &left, &right, widthAt: taper(pts, radius * 0.24), color: BrandColors.UI.ink, alpha: 0.7)
            sparks(cg, pts, radius, colors: [BrandColors.UI.ink], chance: 1, step: 2)
        case .chevron:
            chevrons(cg, pts, radius)
        case .rings:
            rings(cg, pts, radius, colors: [BrandColors.UI.ink], fill: false)
        case .stamp:
            stamps(cg, pts, radius)
        case .tick:
            ticks(cg, pts, radius)
        case .crease:
            crease(cg, pts, radius)
        case .cloud:
            if skin.id == .dusk {
                cloud(cg, pts, radius, colors: [BrandColors.UI.saber], density: 5)
            } else {
                cloud(cg, pts, radius, colors: [BrandColors.UI.ink], density: 3)
            }
        case .ladder:
            ladder(cg, pts, radius)
        case .lag:
            lag(cg, pts, &left, &right, radius)
        case .dash:
            dashes(cg, pts, radius)
        case .cinder:
            fillRibbon(cg, pts, &left, &right, widthAt: taper(pts, radius * 0.28), color: BrandColors.UI.ember, alpha: 0.55)
            fillRibbon(cg, pts, &left, &right, widthAt: taper(pts, radius * 0.1), color: BrandColors.UI.ink, alpha: 0.45)
            sparks(cg, pts, radius, colors: [BrandColors.UI.ember, BrandColors.UI.ink55], chance: 0.7, step: 1)
        case .lantern:
            filaments(cg, pts, &fil, &left, &right, radius, palette: filamentPalette(skin.id))
        case .luna:
            filaments(cg, pts, &fil, &left, &right, radius, palette: .luna())
            stars(cg, pts, radius, colors: BrandColors.UI.lunaDust, chance: 0.48)
        case .bloom:
            rings(cg, pts, radius, colors: BrandColors.UI.bloomBands, fill: false)
            sparks(cg, pts, radius, colors: BrandColors.UI.bloomBands, chance: 0.48, step: 1)
        case .lyra:
            horizon(cg, pts, &left, &right, radius, bands: BrandColors.UI.auroraBands, widthScale: 0.72, alpha: 0.9)
            stars(cg, pts, radius, colors: BrandColors.UI.auroraBands, chance: 0.42)
        case .plume:
            horizon(cg, pts, &left, &right, radius, bands: BrandColors.UI.plumeBands, widthScale: 0.7, alpha: 0.78)
            filamentPair(cg, pts, &fil, &left, &right, radius, offsets: [-0.42, 0.42], colors: [BrandColors.UI.lanternGold, BrandColors.UI.ember])
            sparks(cg, pts, radius, colors: [BrandColors.UI.lanternGold, BrandColors.UI.ember], chance: 1, step: 1)
        case .koi:
            koi(cg, pts, &left, &right, radius)
        case .boreal:
            boreal(cg, pts, &fil, &left, &right, radius)
        case .wish:
            wish(cg, pts, &left, &right, radius)
        case .darner:
            filamentPair(cg, pts, &fil, &left, &right, radius, offsets: [-0.46, 0.46], colors: BrandColors.UI.darnerBands)
            diamonds(cg, pts, radius, colors: BrandColors.UI.darnerBands)
        case .puff:
            fillRibbon(cg, pts, &left, &right, widthAt: taper(pts, radius * 0.22), color: BrandColors.UI.ink, alpha: 0.35)
            puffSeeds(cg, pts, radius)
        case .argus:
            argus(cg, pts, radius)
        case .chime:
            chime(cg, pts, radius)
        }
    }

    static func samples(cx: CGFloat, cy: CGFloat, radius: CGFloat, skin: SkinDef) -> [WakeSample] {
        let count = 12
        let span = radius * 3.4
        let amp = radius * 0.75
        let bend: CGFloat = 1.6
        var trail: [WakeSample] = []
        trail.reserveCapacity(count + 1)
        for i in stride(from: count, through: 1, by: -1) {
            let t = CGFloat(i) / CGFloat(count)
            let vx = cos(t * bend) * bend * amp
            let vy = -span
            let along = CGFloat(count - i) / CGFloat(max(count - 1, 1))
            trail.append(WakeSample(
                x: cx - sin(t * bend) * amp,
                y: cy + t * span,
                opacity: max(0.08, 1 - t * 0.85),
                seed: (CGFloat(i) * 0.618).truncatingRemainder(dividingBy: 1),
                angle: atan2(vx, -vy),
                sx: 1, sy: 1, along: along, scale: 1
            ))
        }
        let offset = radius * skin.trailTailOffset
        let tx = cx - sin(bank) * offset
        let ty = cy + cos(bank) * offset
        if let last = trail.last {
            let ahead = (tx - last.x) * sin(bank) - (ty - last.y) * cos(bank)
            if ahead > 0.5 {
                trail.append(WakeSample(
                    x: tx, y: ty, opacity: 1, seed: 0.5, angle: bank,
                    sx: 1, sy: 1, along: 1, scale: 1
                ))
            }
        }
        return trail
    }

    private static func filamentPalette(_ id: SkinId) -> FilamentWake.Palette {
        switch id {
        case .sprout: return .sprout()
        case .spore: return .spore()
        default: return .lantern()
        }
    }

    private static func taper(_ pts: [WakeSample], _ maxWidth: CGFloat) -> (Int) -> CGFloat {
        let last = CGFloat(max(pts.count - 1, 1))
        return { i in
            let t = CGFloat(i) / last
            return maxWidth * pow(t, 0.6) * (0.45 + 0.55 * pts[i].opacity)
        }
    }

    private static func fillRibbon(
        _ cg: CGContext,
        _ pts: [WakeSample],
        _ left: inout [CGPoint],
        _ right: inout [CGPoint],
        widthAt: (Int) -> CGFloat,
        color: UIColor,
        alpha: CGFloat,
        i0: Int = 0,
        i1: Int? = nil
    ) {
        let path = WakeCollect.ribbonPath(
            pts: pts, count: pts.count, widthAt: widthAt,
            left: &left, right: &right, i0: i0, i1: i1
        )
        cg.setFillColor(color.withAlphaComponent(alpha).cgColor)
        cg.addPath(path)
        cg.fillPath()
    }

    private static func disc(_ cg: CGContext, x: CGFloat, y: CGFloat, r: CGFloat, color: UIColor, alpha: CGFloat) {
        guard r > 0.2, alpha > 0.02 else { return }
        cg.setFillColor(color.withAlphaComponent(alpha).cgColor)
        cg.fillEllipse(in: CGRect(x: x - r, y: y - r, width: r * 2, height: r * 2))
    }

    private static func strokeStar(_ cg: CGContext, x: CGFloat, y: CGFloat, arm: CGFloat, color: UIColor, alpha: CGFloat, width: CGFloat) {
        cg.setStrokeColor(color.withAlphaComponent(alpha).cgColor)
        cg.setLineWidth(width)
        cg.setLineCap(.round)
        cg.move(to: CGPoint(x: x - arm, y: y))
        cg.addLine(to: CGPoint(x: x + arm, y: y))
        cg.move(to: CGPoint(x: x, y: y - arm))
        cg.addLine(to: CGPoint(x: x, y: y + arm))
        cg.strokePath()
    }

    private static func normal(pts: [WakeSample], i: Int) -> (CGFloat, CGFloat) {
        let prev = pts[max(0, i - 1)]
        let next = pts[min(pts.count - 1, i + 1)]
        let dx = next.x - prev.x
        let dy = next.y - prev.y
        let len = hypot(dx, dy)
        let inv = len > 0.0001 ? 1 / len : 1
        return (-dy * inv, dx * inv)
    }

    private static func dots(_ cg: CGContext, _ pts: [WakeSample], _ r: CGFloat, color: UIColor) {
        let base = r * GameConfig.Spacecraft.trailDotSize
        for p in pts {
            disc(cg, x: p.x, y: p.y, r: base, color: color, alpha: p.opacity)
        }
    }

    private static func twins(_ cg: CGContext, _ pts: [WakeSample], _ r: CGFloat, sep: CGFloat, size: CGFloat) {
        let base = r * GameConfig.Spacecraft.trailDotSize * size
        let gap = r * sep
        for p in pts {
            let fade = 0.4 + 0.6 * p.opacity
            let ox = cos(p.angle) * gap * fade
            let oy = sin(p.angle) * gap * fade
            disc(cg, x: p.x - ox, y: p.y - oy, r: base, color: BrandColors.UI.ink, alpha: p.opacity)
            disc(cg, x: p.x + ox, y: p.y + oy, r: base, color: BrandColors.UI.ink, alpha: p.opacity)
        }
    }

    private static func ribbon(
        _ cg: CGContext,
        _ pts: [WakeSample],
        _ left: inout [CGPoint],
        _ right: inout [CGPoint],
        _ r: CGFloat,
        skin: SkinDef
    ) {
        let maxWidth = r * 0.6 * skin.trailWidthScale
        let last = CGFloat(max(pts.count - 1, 1))
        let widthAt: (Int) -> CGFloat = { i in
            let t = CGFloat(i) / last
            return maxWidth * pow(t, 0.6) * (0.45 + 0.55 * pts[i].opacity)
        }
        let color = skin.trailSignal ? BrandColors.UI.signal : BrandColors.UI.ink
        if skin.trailSmudge {
            fillRibbon(cg, pts, &left, &right, widthAt: { widthAt($0) * 1.55 }, color: color, alpha: skin.trailAlpha * 0.22)
        }
        fillRibbon(cg, pts, &left, &right, widthAt: widthAt, color: color, alpha: skin.trailAlpha)
    }

    private static func rainbow(
        _ cg: CGContext,
        _ pts: [WakeSample],
        _ left: inout [CGPoint],
        _ right: inout [CGPoint],
        _ r: CGFloat,
        bands: [UIColor],
        widthScale: CGFloat
    ) {
        let bandCount = bands.count
        guard bandCount > 0, pts.count >= 3 else { return }
        let halfTotal = r * 0.58 * widthScale
        let bandHalf = halfTotal / CGFloat(bandCount)
        let last = CGFloat(max(pts.count - 1, 1))
        var lane = pts
        for b in 0..<bandCount {
            let centerOffset = (CGFloat(b) - CGFloat(bandCount - 1) / 2) * (bandHalf * 2)
            for i in 0..<pts.count {
                let n = normal(pts: pts, i: i)
                lane[i] = pts[i]
                lane[i].x = pts[i].x + n.0 * centerOffset
                lane[i].y = pts[i].y + n.1 * centerOffset
            }
            fillRibbon(cg, lane, &left, &right, widthAt: { i in
                let t = CGFloat(i) / last
                return bandHalf * pow(t, 0.55) * (0.5 + 0.5 * lane[i].opacity)
            }, color: bands[b], alpha: 0.82)
        }
    }

    private static func horizon(
        _ cg: CGContext,
        _ pts: [WakeSample],
        _ left: inout [CGPoint],
        _ right: inout [CGPoint],
        _ r: CGFloat,
        bands: [UIColor],
        widthScale: CGFloat,
        alpha: CGFloat
    ) {
        let last = pts.count - 1
        guard last >= 2, !bands.isEmpty else { return }
        let widthAt = taper(pts, r * 0.6 * widthScale)
        let bandCount = bands.count
        for b in 0..<bandCount {
            let i0 = max(0, Int(floor((CGFloat(b) / CGFloat(bandCount)) * CGFloat(last))) - 1)
            let i1 = min(last, Int(ceil((CGFloat(b + 1) / CGFloat(bandCount)) * CGFloat(last))) + 1)
            if i1 - i0 < 2 { continue }
            fillRibbon(cg, pts, &left, &right, widthAt: widthAt, color: bands[b], alpha: alpha, i0: i0, i1: i1)
        }
    }

    private static func saber(
        _ cg: CGContext,
        _ pts: [WakeSample],
        _ left: inout [CGPoint],
        _ right: inout [CGPoint],
        _ r: CGFloat
    ) {
        let last = CGFloat(max(pts.count - 1, 1))
        fillRibbon(cg, pts, &left, &right, widthAt: { i in
            let t = CGFloat(i) / last
            return r * (0.1 + 0.22 * t) * 0.4 * (0.55 + 0.45 * pts[i].opacity)
        }, color: BrandColors.UI.saber, alpha: 0.28)
        fillRibbon(cg, pts, &left, &right, widthAt: { i in
            let t = CGFloat(i) / last
            return r * (0.04 + 0.11 * t) * 0.4 * pts[i].opacity
        }, color: BrandColors.UI.saber, alpha: 0.78)
        fillRibbon(cg, pts, &left, &right, widthAt: { i in
            let t = CGFloat(i) / last
            return r * (0.015 + 0.04 * t) * 0.4 * pts[i].opacity
        }, color: BrandColors.UI.saberCore, alpha: 0.9)
        sparks(cg, pts, r, colors: [BrandColors.UI.saber, BrandColors.UI.saberCore], chance: 0.38, step: 2)
    }

    private static func chevrons(_ cg: CGContext, _ pts: [WakeSample], _ r: CGFloat) {
        cg.setStrokeColor(BrandColors.UI.ink.cgColor)
        cg.setLineCap(.round)
        cg.setLineJoin(.round)
        for p in pts {
            let armX = r * (0.22 + 0.38 * p.opacity)
            let armY = r * (0.22 + 0.38 * p.opacity)
            cg.setLineWidth(r * (0.05 + 0.08 * p.opacity))
            cg.setStrokeColor(BrandColors.UI.ink.withAlphaComponent(p.opacity * 0.88).cgColor)
            cg.saveGState()
            cg.translateBy(x: p.x, y: p.y)
            cg.rotate(by: p.angle)
            cg.move(to: CGPoint(x: -armX * 0.7, y: armY * 0.55))
            cg.addLine(to: CGPoint(x: 0, y: -armY * 0.15))
            cg.addLine(to: CGPoint(x: armX * 0.7, y: armY * 0.55))
            cg.strokePath()
            cg.restoreGState()
        }
    }

    private static func rings(_ cg: CGContext, _ pts: [WakeSample], _ r: CGFloat, colors: [UIColor], fill: Bool) {
        for (i, p) in pts.enumerated() {
            let age = 1 - p.opacity
            let ringR = r * (0.14 + age * 1.05)
            let color = colors[i % colors.count]
            if fill {
                disc(cg, x: p.x, y: p.y, r: ringR, color: color, alpha: p.opacity * 0.18)
            }
            cg.setStrokeColor(color.withAlphaComponent(p.opacity * 0.72).cgColor)
            cg.setLineWidth(r * (0.05 + 0.04 * p.opacity))
            cg.strokeEllipse(in: CGRect(x: p.x - ringR, y: p.y - ringR, width: ringR * 2, height: ringR * 2))
        }
    }

    private static func stamps(_ cg: CGContext, _ pts: [WakeSample], _ r: CGFloat) {
        for p in pts {
            let half = r * (0.14 + 0.22 * p.opacity)
            cg.saveGState()
            cg.translateBy(x: p.x, y: p.y)
            cg.rotate(by: p.angle)
            cg.setFillColor(BrandColors.UI.ink.withAlphaComponent(p.opacity * 0.82).cgColor)
            cg.fill(CGRect(x: -half, y: -half, width: half * 2, height: half * 2))
            cg.restoreGState()
        }
    }

    private static func ticks(_ cg: CGContext, _ pts: [WakeSample], _ r: CGFloat) {
        cg.setStrokeColor(BrandColors.UI.ink.cgColor)
        cg.setLineCap(.round)
        for p in pts {
            let half = r * (0.22 + 0.4 * p.opacity)
            cg.setLineWidth(r * (0.055 + 0.07 * p.opacity))
            cg.setStrokeColor(BrandColors.UI.ink.withAlphaComponent(p.opacity * 0.85).cgColor)
            cg.saveGState()
            cg.translateBy(x: p.x, y: p.y)
            cg.rotate(by: p.angle)
            cg.move(to: CGPoint(x: -half, y: 0))
            cg.addLine(to: CGPoint(x: half, y: 0))
            cg.strokePath()
            cg.restoreGState()
        }
    }

    private static func crease(_ cg: CGContext, _ pts: [WakeSample], _ r: CGFloat) {
        let bankAmt = min(1, abs(bank) / GameConfig.Spacecraft.maxBank)
        var zig: [CGPoint] = []
        zig.reserveCapacity(pts.count)
        let denom = CGFloat(max(pts.count - 1, 1))
        for (i, p) in pts.enumerated() {
            let leave = pow(1 - CGFloat(i) / denom, 1.15)
            let amp = r * (0.12 + 0.62 * bankAmt) * (0.35 + 0.65 * pow(p.opacity, 0.55)) * leave
            let sign: CGFloat = i.isMultiple(of: 2) ? 1 : -1
            zig.append(CGPoint(x: p.x + cos(p.angle) * amp * sign, y: p.y + sin(p.angle) * amp * sign * 0.4))
        }
        strokePoly(cg, zig, width: max(1, r * 0.07), color: BrandColors.UI.ink, alpha: 0.28)
        cg.setLineDash(phase: 0, lengths: [r * 0.55, r * 0.22])
        strokePoly(cg, zig, width: max(1.2, r * 0.11), color: BrandColors.UI.ink, alpha: 0.88)
        cg.setLineDash(phase: 0, lengths: [])
    }

    private static func strokePoly(_ cg: CGContext, _ pts: [CGPoint], width: CGFloat, color: UIColor, alpha: CGFloat) {
        guard pts.count >= 2 else { return }
        cg.setStrokeColor(color.withAlphaComponent(alpha).cgColor)
        cg.setLineWidth(width)
        cg.setLineCap(.round)
        cg.setLineJoin(.round)
        cg.move(to: pts[0])
        if pts.count == 2 {
            cg.addLine(to: pts[1])
        } else {
            for i in 1..<(pts.count - 1) {
                let mx = (pts[i].x + pts[i + 1].x) * 0.5
                let my = (pts[i].y + pts[i + 1].y) * 0.5
                cg.addQuadCurve(to: CGPoint(x: mx, y: my), control: pts[i])
            }
            cg.addLine(to: pts[pts.count - 1])
        }
        cg.strokePath()
    }

    private static func cloud(_ cg: CGContext, _ pts: [WakeSample], _ r: CGFloat, colors: [UIColor], density: Int) {
        for (i, p) in pts.enumerated() {
            let leave = 1 - p.along
            let n = normal(pts: pts, i: i)
            for k in 0..<density {
                let u = WakeCollect.fract(p.seed * 12.9898 + CGFloat(k) * 0.618 + CGFloat(i) * 0.07)
                let v = WakeCollect.fract(p.seed * 78.233 + CGFloat(k) * 0.37)
                let w = WakeCollect.fract(p.seed * 4.1414 + CGFloat(k) * 0.11)
                let side = (u * 2 - 1) * r * (0.2 + 0.95 * leave)
                let alongJit = (v * 2 - 1) * r * 0.18 * leave
                let size = r * (0.03 + 0.07 * leave) * (0.5 + w * 0.7)
                disc(cg, x: p.x + n.0 * side + n.1 * alongJit, y: p.y + n.1 * side - n.0 * alongJit,
                     r: size, color: colors[k % colors.count], alpha: p.opacity * (0.28 + 0.45 * leave))
            }
        }
    }

    private static func ladder(_ cg: CGContext, _ pts: [WakeSample], _ r: CGFloat) {
        strokePoly(cg, pts.map { CGPoint(x: $0.x, y: $0.y) }, width: max(1, r * 0.06), color: BrandColors.UI.ink, alpha: 0.45)
        ticks(cg, pts, r)
    }

    private static func lag(
        _ cg: CGContext,
        _ pts: [WakeSample],
        _ left: inout [CGPoint],
        _ right: inout [CGPoint],
        _ r: CGFloat
    ) {
        fillRibbon(cg, pts, &left, &right, widthAt: taper(pts, r * 0.32), color: BrandColors.UI.ink, alpha: 0.22)
        strokePoly(cg, pts.map { CGPoint(x: $0.x, y: $0.y) }, width: max(1, r * 0.06), color: BrandColors.UI.ink, alpha: 0.55)
        for (i, p) in pts.enumerated() where i.isMultiple(of: 2) {
            let leave = pow(1 - p.along, 0.85)
            let rx = r * (0.22 + (1 - p.opacity) * 0.55) * (0.35 + 0.65 * leave)
            let ry = rx * (0.55 + 0.2 * sin(p.along * .pi * 3))
            cg.setStrokeColor(BrandColors.UI.ink.withAlphaComponent(p.opacity * 0.55).cgColor)
            cg.setLineWidth(max(0.9, r * 0.04))
            cg.strokeEllipse(in: CGRect(x: p.x - rx, y: p.y - ry, width: rx * 2, height: ry * 2))
        }
    }

    private static func dashes(_ cg: CGContext, _ pts: [WakeSample], _ r: CGFloat) {
        cg.setLineCap(.round)
        var i = 0
        while i < pts.count - 1 {
            if i & 1 == 1 { i += 1; continue }
            let a = pts[i]
            let b = pts[i + 1]
            let useSignal = ((i >> 1) % 2) == 0
            let color = useSignal ? BrandColors.UI.signal : BrandColors.UI.ink
            let mx = (a.x + b.x) * 0.5
            let my = (a.y + b.y) * 0.5
            let dx = (b.x - a.x) * 0.5
            let dy = (b.y - a.y) * 0.5
            cg.setStrokeColor(color.withAlphaComponent(min(a.opacity, b.opacity) * (useSignal ? 0.95 : 0.85)).cgColor)
            cg.setLineWidth(max(1.2, r * (0.1 + 0.08 * a.opacity)))
            cg.move(to: CGPoint(x: mx - dx, y: my - dy))
            cg.addLine(to: CGPoint(x: mx + dx, y: my + dy))
            cg.strokePath()
            i += 1
        }
    }

    private static func filaments(
        _ cg: CGContext,
        _ pts: [WakeSample],
        _ fil: inout [WakeSample],
        _ left: inout [CGPoint],
        _ right: inout [CGPoint],
        _ r: CGFloat,
        palette: FilamentWake.Palette
    ) {
        let offsets: [CGFloat] = [-0.48, 0, 0.48]
        let last = CGFloat(max(pts.count - 1, 1))
        for f in 0..<offsets.count {
            WakeCollect.filament(from: pts, count: pts.count, r: r, offsetScale: offsets[f], energy: 0, into: &fil)
            fillRibbon(cg, fil, &left, &right, widthAt: { i in
                let t = CGFloat(i) / last
                return r * (0.035 + 0.09 * t) * (0.5 + 0.5 * fil[i].opacity) * (f == 1 ? 0.7 : 1)
            }, color: palette.filaments[f % palette.filaments.count], alpha: palette.alpha * 0.42)
        }
        cloud(cg, pts, r, colors: palette.plankton, density: max(1, Int((5 * palette.density).rounded())))
    }

    private static func filamentPair(
        _ cg: CGContext,
        _ pts: [WakeSample],
        _ fil: inout [WakeSample],
        _ left: inout [CGPoint],
        _ right: inout [CGPoint],
        _ r: CGFloat,
        offsets: [CGFloat],
        colors: [UIColor]
    ) {
        let last = CGFloat(max(pts.count - 1, 1))
        for f in 0..<offsets.count {
            WakeCollect.filament(from: pts, count: pts.count, r: r, offsetScale: offsets[f], energy: 0, into: &fil)
            fillRibbon(cg, fil, &left, &right, widthAt: { i in
                let t = CGFloat(i) / last
                return r * (0.04 + 0.11 * t) * fil[i].opacity
            }, color: colors[f % colors.count], alpha: 0.4)
        }
    }

    private static func sparks(_ cg: CGContext, _ pts: [WakeSample], _ r: CGFloat, colors: [UIColor], chance: CGFloat, step: Int) {
        guard !colors.isEmpty else { return }
        var i = 0
        while i < pts.count {
            let p = pts[i]
            let u = WakeCollect.fract(p.seed * 12.9898 + CGFloat(i) * 0.37)
            if p.opacity >= 0.14, u <= chance {
                let v = WakeCollect.fract(p.seed * 78.233 + CGFloat(i) * 0.19)
                let w = WakeCollect.fract(p.seed * 4.1414 + CGFloat(i) * 0.11)
                let leave = 1 - p.along
                let n = normal(pts: pts, i: i)
                let side = (u * 2 - 1) * r * (0.15 + 0.8 * leave)
                let size = r * (0.028 + 0.05 * leave) * (0.5 + v * 0.6)
                disc(cg, x: p.x + n.0 * side, y: p.y + n.1 * side, r: size,
                     color: colors[(i + Int(w * CGFloat(colors.count))) % colors.count],
                     alpha: p.opacity * (0.3 + 0.45 * leave))
            }
            i += max(step, 1)
        }
    }

    private static func stars(_ cg: CGContext, _ pts: [WakeSample], _ r: CGFloat, colors: [UIColor], chance: CGFloat) {
        guard !colors.isEmpty else { return }
        for (i, p) in pts.enumerated() {
            let u = WakeCollect.fract(p.seed * 12.9898 + CGFloat(i) * 0.41)
            if p.opacity < 0.16 || u > chance { continue }
            let v = WakeCollect.fract(p.seed * 78.233 + CGFloat(i) * 0.17)
            let leave = 1 - p.along
            let n = normal(pts: pts, i: i)
            let side = (u * 2 - 1) * r * (0.18 + 0.7 * leave)
            let size = r * (0.03 + 0.05 * leave) * (0.5 + v * 0.7)
            let color = colors[i % colors.count]
            let sx = p.x + n.0 * side
            let sy = p.y + n.1 * side
            disc(cg, x: sx, y: sy, r: size * 0.45, color: color, alpha: p.opacity * (0.4 + 0.4 * leave))
            if v > 0.5 {
                strokeStar(cg, x: sx, y: sy, arm: size * 2.1, color: color, alpha: p.opacity * 0.7, width: max(0.6, r * 0.028))
            }
        }
    }

    private static func koi(
        _ cg: CGContext,
        _ pts: [WakeSample],
        _ left: inout [CGPoint],
        _ right: inout [CGPoint],
        _ r: CGFloat
    ) {
        let last = CGFloat(max(pts.count - 1, 1))
        fillRibbon(cg, pts, &left, &right, widthAt: { i in
            let t = CGFloat(i) / last
            return r * (0.12 + 0.22 * t) * (0.5 + 0.5 * pts[i].opacity)
        }, color: BrandColors.UI.koiBands[0], alpha: 0.42)
        fillRibbon(cg, pts, &left, &right, widthAt: { i in
            r * (0.04 + 0.1 * (CGFloat(i) / last)) * pts[i].opacity
        }, color: BrandColors.UI.koiBands[1], alpha: 0.55)
        for (i, p) in pts.enumerated() {
            let rx = r * (0.08 + 0.1 * p.opacity)
            let ry = rx * 0.62
            cg.setStrokeColor(BrandColors.UI.koiBands[i % BrandColors.UI.koiBands.count].withAlphaComponent(p.opacity * 0.7).cgColor)
            cg.setLineWidth(max(0.8, r * 0.045))
            cg.strokeEllipse(in: CGRect(x: p.x - rx, y: p.y - ry, width: rx * 2, height: ry * 2))
        }
    }

    private static func boreal(
        _ cg: CGContext,
        _ pts: [WakeSample],
        _ fil: inout [WakeSample],
        _ left: inout [CGPoint],
        _ right: inout [CGPoint],
        _ r: CGFloat
    ) {
        let bands = BrandColors.UI.auroraBands
        let last = CGFloat(max(pts.count - 1, 1))
        for b in 0..<bands.count {
            let offset = (CGFloat(b) / CGFloat(max(bands.count - 1, 1)) * 2 - 1) * 0.42
            WakeCollect.filament(from: pts, count: pts.count, r: r, offsetScale: offset, energy: 0, into: &fil)
            fillRibbon(cg, fil, &left, &right, widthAt: { i in
                let t = CGFloat(i) / last
                return r * (0.04 + 0.11 * t) * fil[i].opacity
            }, color: bands[b], alpha: 0.4)
        }
        sparks(cg, pts, r, colors: bands, chance: 0.45, step: 1)
    }

    private static func wish(
        _ cg: CGContext,
        _ pts: [WakeSample],
        _ left: inout [CGPoint],
        _ right: inout [CGPoint],
        _ r: CGFloat
    ) {
        let last = CGFloat(max(pts.count - 1, 1))
        fillRibbon(cg, pts, &left, &right, widthAt: { i in
            let t = CGFloat(i) / last
            return r * (0.1 + 0.22 * t) * (0.5 + 0.5 * pts[i].opacity)
        }, color: BrandColors.UI.lanternGold, alpha: 0.28)
        fillRibbon(cg, pts, &left, &right, widthAt: { i in
            let t = CGFloat(i) / last
            return r * (0.045 + 0.12 * t) * pts[i].opacity
        }, color: BrandColors.UI.lanternGold, alpha: 0.78)
        fillRibbon(cg, pts, &left, &right, widthAt: { i in
            let t = CGFloat(i) / last
            return r * (0.016 + 0.045 * t) * pts[i].opacity
        }, color: BrandColors.UI.wishCore, alpha: 0.92)
        stars(cg, pts, r, colors: BrandColors.UI.wishBands, chance: 0.52)
    }

    private static func diamonds(_ cg: CGContext, _ pts: [WakeSample], _ r: CGFloat, colors: [UIColor]) {
        for (i, p) in pts.enumerated() {
            let u = WakeCollect.fract(p.seed * 12.99 + CGFloat(i) * 0.31)
            if p.opacity < 0.14 || u > 0.55 { continue }
            let leave = 1 - p.along
            let n = normal(pts: pts, i: i)
            let side = (u * 2 - 1) * r * (0.16 + 0.7 * leave)
            let size = r * (0.035 + 0.05 * leave)
            let x = p.x + n.0 * side
            let y = p.y + n.1 * side
            let path = CGMutablePath()
            path.move(to: CGPoint(x: x, y: y - size))
            path.addLine(to: CGPoint(x: x + size * 0.62, y: y))
            path.addLine(to: CGPoint(x: x, y: y + size))
            path.addLine(to: CGPoint(x: x - size * 0.62, y: y))
            path.closeSubpath()
            cg.setFillColor(colors[i % colors.count].withAlphaComponent(p.opacity * 0.75).cgColor)
            cg.addPath(path)
            cg.fillPath()
        }
    }

    private static func puffSeeds(_ cg: CGContext, _ pts: [WakeSample], _ r: CGFloat) {
        for (i, p) in pts.enumerated() {
            let leave = 1 - p.along
            let n = normal(pts: pts, i: i)
            let u = WakeCollect.fract(p.seed * 12.99 + CGFloat(i) * 0.27)
            let side = (u * 2 - 1) * r * (0.2 + 0.7 * leave)
            let x = p.x + n.0 * side
            let y = p.y + n.1 * side
            let head = r * (0.05 + 0.06 * leave)
            disc(cg, x: x, y: y, r: head, color: BrandColors.UI.ink, alpha: p.opacity * 0.35)
            cg.setStrokeColor(BrandColors.UI.ink.withAlphaComponent(p.opacity * 0.55).cgColor)
            cg.setLineWidth(max(0.7, r * 0.03))
            cg.setLineCap(.round)
            cg.move(to: CGPoint(x: x, y: y + head * 0.2))
            cg.addLine(to: CGPoint(x: x, y: y + head * 1.8))
            cg.strokePath()
        }
    }

    private static func argus(_ cg: CGContext, _ pts: [WakeSample], _ r: CGFloat) {
        for p in pts {
            let leave = 1 - p.along
            let ringR = r * (0.1 + 0.22 * leave)
            let ry = ringR * 0.78
            let fade = p.opacity * (0.62 + 0.32 * leave)
            cg.setFillColor(BrandColors.UI.argusTeal.withAlphaComponent(fade * 0.22).cgColor)
            cg.fillEllipse(in: CGRect(x: p.x - ringR, y: p.y - ry, width: ringR * 2, height: ry * 2))
            cg.setStrokeColor(BrandColors.UI.argusTeal.withAlphaComponent(fade).cgColor)
            cg.setLineWidth(max(1.1, r * (0.06 + 0.04 * p.opacity)))
            cg.strokeEllipse(in: CGRect(x: p.x - ringR, y: p.y - ry, width: ringR * 2, height: ry * 2))
            disc(cg, x: p.x, y: p.y, r: ringR * 0.32, color: BrandColors.UI.lanternGold, alpha: fade * 0.85)
            disc(cg, x: p.x, y: p.y, r: ringR * 0.12, color: BrandColors.UI.ink, alpha: fade * 0.55)
        }
    }

    private static func chime(_ cg: CGContext, _ pts: [WakeSample], _ r: CGFloat) {
        for (i, p) in pts.enumerated() {
            let leave = 1 - p.along
            let age = 1 - p.opacity
            let arcR = r * (0.16 + age * 0.95)
            let color = i.isMultiple(of: 2) ? BrandColors.UI.lanternGold : BrandColors.UI.ink
            cg.saveGState()
            cg.translateBy(x: p.x, y: p.y)
            cg.rotate(by: p.angle)
            cg.scaleBy(x: 1, y: 0.55)
            cg.setStrokeColor(color.withAlphaComponent(p.opacity * (0.5 + 0.4 * leave)).cgColor)
            cg.setLineWidth(max(0.9, r * (0.05 + 0.03 * leave)))
            cg.addArc(center: .zero, radius: arcR, startAngle: .pi * 0.15, endAngle: .pi * 0.85, clockwise: false)
            cg.strokePath()
            cg.restoreGState()
            let n = normal(pts: pts, i: i)
            let note = r * (0.032 + 0.05 * leave)
            disc(cg, x: p.x + n.0 * r * 0.35 * leave, y: p.y + n.1 * r * 0.35 * leave,
                 r: note * 0.55, color: color, alpha: p.opacity * 0.7)
        }
    }
}

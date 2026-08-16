// LiveHullPaint.swift
// Changes: Android drawLanternHull…drawChimeHull — same numbers, two canvases.

import CoreGraphics
import UIKit

enum LiveHullPaint {
    static let previewTimeMs: CGFloat = 1400

    static func draw(_ id: SkinId, onto canvas: LiveHullCanvas, radius: CGFloat, turn: CGFloat, nowMs: CGFloat, jellyLive: Bool, shake: CGFloat, alpha: CGFloat) {
        switch id {
        case .lantern: lantern(canvas, radius, turn, nowMs, jellyLive, alpha)
        case .bloom: bloom(canvas, radius, turn, nowMs, jellyLive, shake, alpha)
        case .lyra: lyra(canvas, radius, turn, nowMs, jellyLive, alpha)
        case .sprout: sprout(canvas, radius, turn, nowMs, jellyLive, alpha)
        case .plume: plume(canvas, radius, turn, nowMs, jellyLive, alpha)
        case .koi: koi(canvas, radius, turn, nowMs, jellyLive, alpha)
        case .spore: spore(canvas, radius, turn, nowMs, jellyLive, alpha)
        case .boreal: boreal(canvas, radius, turn, nowMs, jellyLive, alpha)
        case .luna: luna(canvas, radius, turn, nowMs, jellyLive, alpha)
        case .wish: wish(canvas, radius, turn, nowMs, jellyLive, alpha)
        case .darner: darner(canvas, radius, turn, nowMs, jellyLive, alpha)
        case .puff: puff(canvas, radius, turn, nowMs, jellyLive, alpha)
        case .argus: argus(canvas, radius, turn, nowMs, jellyLive, alpha)
        case .chime: chime(canvas, radius, turn, nowMs, jellyLive, alpha)
        default: break
        }
    }

    static func previewImage(_ id: SkinId, logicalRadius: CGFloat = 22, scale: CGFloat = 2) -> UIImage {
        let r = logicalRadius * scale
        let size = ceil(r * 4.2)
        let bounds = CGSize(width: size, height: size)
        let renderer = UIGraphicsImageRenderer(size: bounds)
        return renderer.image { ctx in
            let cg = ctx.cgContext
            cg.setFillColor(UIColor.clear.cgColor)
            cg.fill(CGRect(origin: .zero, size: bounds))
            cg.translateBy(x: size / 2, y: size / 2)
            let canvas = CGLiveCanvas(cg)
            draw(id, onto: canvas, radius: r, turn: 0.15, nowMs: previewTimeMs, jellyLive: false, shake: 0, alpha: 1)
        }
    }

    private static func lantern(_ c: LiveHullCanvas, _ radius: CGFloat, _ turn: CGFloat, _ t: CGFloat, _ jelly: Bool, _ a: CGFloat) {
        let breath = 0.92 + 0.05 * sin(t * 0.0048)
        let scale = 0.97 + 0.03 * sin(t * 0.0044)
        let r = radius * 0.95 * scale
        let stretch = 1 + 0.16 * turn
        let pulse = 0.82 + 0.18 * sin(t * 0.0062)
        let ba = a
        c.fillEllipse(x: 0, y: r * 0.08, rx: r * 1.28, ry: r * 1.28, color: BrandColors.UI.lanternTeal, alpha: ba * 0.16)
        c.fillHull(.bell, cx: 0, cy: 0, r: r, stretch: stretch, color: BrandColors.UI.ink, alpha: jelly ? ba : ba * breath)
        c.fillHull(.bell, cx: 0, cy: r * 0.04, r: r * 0.78, stretch: stretch, color: BrandColors.UI.lanternTeal, alpha: ba * (jelly ? 0.22 : breath * 0.28))
        let core = r * (0.22 + 0.06 * pulse)
        let heartA = jelly ? ba * 0.7 : ba * breath * pulse
        c.fillEllipse(x: 0, y: r * 0.02, rx: core * 1.55, ry: core * 1.55, color: BrandColors.UI.lanternGold, alpha: heartA * 0.28)
        c.fillEllipse(x: 0, y: r * 0.02, rx: core, ry: core, color: BrandColors.UI.lanternGold, alpha: heartA)
        c.fillEllipse(x: 0, y: r * 0.01, rx: core * 0.42, ry: core * 0.42, color: BrandColors.UI.ink55, alpha: heartA)
        let spots: [(CGFloat, CGFloat, CGFloat)] = [(0.32, -0.18, 0.08), (-0.28, -0.08, 0.07), (0.08, 0.06, 0.055)]
        for i in 0..<spots.count {
            let s = spots[i]
            c.fillEllipse(x: s.0 * r, y: s.1 * r * stretch, rx: s.2 * r, ry: s.2 * r,
                          color: i == 1 ? BrandColors.UI.lanternGold : BrandColors.UI.lanternTeal,
                          alpha: jelly ? ba : ba * breath)
        }
        let tents: [(CGFloat, CGFloat, CGFloat)] = [
            (-0.72, 0.28, 0), (-0.36, 0.34, 1.1), (0, 0.36, 2.2),
            (0.36, 0.34, 3.3), (0.72, 0.28, 4.4), (0, 0.42, 5.0)
        ]
        for i in 0..<tents.count {
            let tent = tents[i]
            let sway = sin(t * 0.0042 + tent.2) * r * 0.22
            let len = r * (0.52 + 0.14 * sin(t * 0.0031 + tent.2 * 0.7))
            let x0 = tent.0 * r
            let y0 = tent.1 * r * stretch
            c.strokeQuad(
                from: CGPoint(x: x0, y: y0),
                control: CGPoint(x: x0 + sway, y: y0 + len * 0.55),
                to: CGPoint(x: x0 + sway * 0.35, y: y0 + len),
                color: i % 2 == 0 ? BrandColors.UI.lanternTeal : BrandColors.UI.lanternGold,
                width: max(1, r * (0.055 + 0.02 * sin(t * 0.005 + tent.2))),
                alpha: ba * (jelly ? 0.55 : breath * 0.7)
            )
        }
    }

    private static func bloomRgb(_ time: CGFloat, _ index: Int) -> UIColor {
        let n = BrandColors.UI.bloomBands.count
        let u = (time * 0.00035 + CGFloat(index) * 0.17)
        let frac = u - floor(u)
        return BrandColors.UI.bloomBands[Int(frac * CGFloat(n)) % n]
    }

    private static func bloomFilm(_ c: LiveHullCanvas, x: CGFloat, y: CGFloat, rx: CGFloat, ry: CGFloat, color: UIColor, alpha: CGFloat, fill: Bool, width: CGFloat) {
        if fill {
            c.fillEllipse(x: x, y: y, rx: rx, ry: ry, color: color, alpha: alpha * 0.16)
        }
        c.strokeEllipse(x: x, y: y, rx: rx, ry: ry, color: color, alpha: alpha, width: width)
    }

    private static func bloom(_ c: LiveHullCanvas, _ radius: CGFloat, _ turn: CGFloat, _ t: CGFloat, _ jelly: Bool, _ shake: CGFloat, _ a: CGFloat) {
        let breath = 0.92 + 0.05 * sin(t * 0.0046)
        let scale = 0.97 + 0.03 * sin(t * 0.004)
        let r = radius * 0.95 * scale
        let stretch = 1 + 0.12 * turn
        let ba = a
        let wobble = jelly ? shake * 2.2 : 0
        bloomFilm(c, x: -r * 0.28, y: -r * 0.1 * stretch, rx: r * 0.48, ry: r * 0.48 * stretch,
                  color: bloomRgb(t, 1), alpha: ba * (jelly ? 0.55 : breath * 0.7), fill: true, width: max(1.2, r * 0.08))
        bloomFilm(c, x: r * 0.3, y: r * 0.16 * stretch, rx: r * 0.42, ry: r * 0.42 * stretch,
                  color: bloomRgb(t, 2), alpha: ba * (jelly ? 0.5 : breath * 0.65), fill: true, width: max(1.2, r * 0.08))
        c.fillHull(.bloom, cx: 0, cy: 0, r: r, stretch: stretch, color: bloomRgb(t, 0), alpha: ba * (jelly ? 0.22 : breath * 0.2))
        c.strokeHull(.bloom, cx: 0, cy: 0, r: r, stretch: stretch, color: bloomRgb(t, 0), alpha: jelly ? ba : ba * breath, width: max(1.4, r * 0.09))
        c.fillEllipse(x: 0, y: -r * 0.18 * stretch, rx: r * 0.22, ry: r * 0.14 * stretch, color: BrandColors.UI.ink55, alpha: ba * (jelly ? 0.28 : breath * 0.35))
        let sats: [(CGFloat, CGFloat, CGFloat)] = [(1.12, 0.16, 0.0022), (1.36, 0.11, -0.0016), (1.52, 0.09, 0.0028)]
        let phases: [CGFloat] = [0, 2.1, 4.0]
        for i in 0..<sats.count {
            let sat = sats[i]
            let phase = t * sat.2 + phases[i] + wobble
            bloomFilm(c, x: cos(phase) * r * sat.0, y: sin(phase) * r * sat.0 * 0.55 * stretch,
                      rx: r * sat.1, ry: r * sat.1, color: bloomRgb(t, i + 1),
                      alpha: ba * (jelly ? 0.6 : breath * 0.8), fill: false, width: max(0.9, r * 0.055))
        }
    }

    private static func lyra(_ c: LiveHullCanvas, _ radius: CGFloat, _ turn: CGFloat, _ t: CGFloat, _ jelly: Bool, _ a: CGFloat) {
        let breath = 0.92 + 0.05 * sin(t * 0.0048)
        let scale = 0.97 + 0.03 * sin(t * 0.0042)
        let r = radius * 0.95 * scale
        let stretch = 1 + 0.14 * turn
        let ba = a
        c.fillEllipse(x: 0, y: 0, rx: r * 1.2, ry: r * 1.2, color: BrandColors.UI.auroraHull[0], alpha: ba * 0.14)
        c.fillHull(.star, cx: 0, cy: 0, r: r, stretch: stretch, color: BrandColors.UI.ink, alpha: jelly ? ba : ba * breath)
        let core = r * 0.22 * (0.9 + 0.1 * sin(t * 0.007))
        c.fillEllipse(x: 0, y: 0, rx: core, ry: core, color: BrandColors.UI.auroraHull[1], alpha: ba * (jelly ? 0.35 : breath * 0.42))
        let twinkles: [(CGFloat, CGFloat, CGFloat)] = [(0, -0.08, 0.1), (0.22, 0.06, 0.055), (-0.2, 0.1, 0.05)]
        for i in 0..<twinkles.count {
            let tw = 0.55 + 0.45 * sin(t * 0.008 + CGFloat(i) * 1.7)
            let s = twinkles[i]
            c.fillEllipse(x: s.0 * r, y: s.1 * r * stretch, rx: s.2 * r, ry: s.2 * r,
                          color: BrandColors.UI.auroraHull[i % BrandColors.UI.auroraHull.count],
                          alpha: ba * tw * (jelly ? 0.7 : breath))
        }
    }

    private static func sprout(_ c: LiveHullCanvas, _ radius: CGFloat, _ turn: CGFloat, _ t: CGFloat, _ jelly: Bool, _ a: CGFloat) {
        let breath = 0.92 + 0.05 * sin(t * 0.0046)
        let scale = 0.97 + 0.03 * sin(t * 0.004)
        let r = radius * 0.95 * scale
        let stretch = 1 + 0.14 * turn
        let unfurl = 0.78 + 0.22 * (0.5 + 0.5 * sin(t * 0.0038))
        let ba = a
        c.fillRotatedEllipse(x: -r * 0.42, y: r * 0.08, rx: r * 0.38 * unfurl, ry: r * 0.22 * stretch, rotation: -0.7, color: BrandColors.UI.sproutGreen, alpha: ba * 0.7)
        c.fillRotatedEllipse(x: r * 0.42, y: r * 0.08, rx: r * 0.38 * unfurl, ry: r * 0.22 * stretch, rotation: 0.7, color: BrandColors.UI.sproutGreen, alpha: ba * 0.7)
        c.fillHull(.seed, cx: 0, cy: 0, r: r, stretch: stretch, color: BrandColors.UI.ink, alpha: jelly ? ba : ba * breath)
        c.fillEllipse(x: 0, y: -r * 0.12 * stretch, rx: r * 0.18, ry: r * 0.18, color: BrandColors.UI.lanternGold, alpha: ba * (jelly ? 0.4 : breath * 0.45))
    }

    private static func plume(_ c: LiveHullCanvas, _ radius: CGFloat, _ turn: CGFloat, _ t: CGFloat, _ jelly: Bool, _ a: CGFloat) {
        let breath = 0.9 + 0.06 * sin(t * 0.0052)
        let scale = 0.97 + 0.03 * sin(t * 0.0044)
        let r = radius * 0.95 * scale
        let stretch = 1 + 0.18 * turn
        let flicker = 0.85 + 0.15 * sin(t * 0.011)
        let ba = a
        c.fillEllipse(x: 0, y: r * 0.1, rx: r * 1.25, ry: r * 1.25, color: BrandColors.UI.ember, alpha: ba * 0.16)
        c.fillHull(.wing, cx: 0, cy: 0, r: r, stretch: stretch, color: BrandColors.UI.ink, alpha: jelly ? ba : ba * breath)
        c.fillEllipse(x: 0, y: r * 0.04, rx: r * 0.2 * flicker, ry: r * 0.2 * flicker, color: BrandColors.UI.lanternGold, alpha: ba * (jelly ? 0.55 : breath * flicker))
        c.fillEllipse(x: 0, y: r * 0.04, rx: r * 0.1, ry: r * 0.1, color: BrandColors.UI.ember, alpha: ba * (jelly ? 0.55 : breath * flicker))
    }

    private static func koi(_ c: LiveHullCanvas, _ radius: CGFloat, _ turn: CGFloat, _ t: CGFloat, _ jelly: Bool, _ a: CGFloat) {
        let breath = 0.92 + 0.05 * sin(t * 0.0048)
        let scale = 0.97 + 0.03 * sin(t * 0.004)
        let r = radius * 0.95 * scale
        let stretch = 1 + 0.16 * turn
        let sway = sin(t * 0.0055) * 0.22
        let ba = a
        c.fillHull(.koi, cx: 0, cy: 0, r: r, stretch: stretch, color: BrandColors.UI.ink, alpha: jelly ? ba : ba * breath)
        c.fillEllipse(x: -r * 0.16, y: -r * 0.28 * stretch, rx: r * 0.09, ry: r * 0.09, color: BrandColors.UI.koiVermillion, alpha: jelly ? ba : ba * breath)
        c.fillEllipse(x: r * 0.18, y: r * 0.06 * stretch, rx: r * 0.07, ry: r * 0.07, color: BrandColors.UI.koiVermillion, alpha: jelly ? ba : ba * breath)
        let tailA = ba * (jelly ? 0.6 : breath * 0.75)
        c.strokeQuad(from: CGPoint(x: -r * 0.12, y: r * 0.52 * stretch),
                     control: CGPoint(x: -r * (0.38 + sway), y: r * 0.82 * stretch),
                     to: CGPoint(x: -r * 0.08, y: r * 1.05 * stretch),
                     color: BrandColors.UI.koiVermillion, width: max(1.1, r * 0.08), alpha: tailA)
        c.strokeQuad(from: CGPoint(x: r * 0.12, y: r * 0.52 * stretch),
                     control: CGPoint(x: r * (0.38 - sway), y: r * 0.82 * stretch),
                     to: CGPoint(x: r * 0.08, y: r * 1.05 * stretch),
                     color: BrandColors.UI.koiVermillion, width: max(1.1, r * 0.08), alpha: tailA)
    }

    private static func spore(_ c: LiveHullCanvas, _ radius: CGFloat, _ turn: CGFloat, _ t: CGFloat, _ jelly: Bool, _ a: CGFloat) {
        let breath = 0.92 + 0.05 * sin(t * 0.0048)
        let scale = 0.97 + 0.03 * sin(t * 0.0044)
        let r = radius * 0.95 * scale
        let stretch = 1 + 0.12 * turn
        let pulse = 0.82 + 0.18 * sin(t * 0.006)
        let ba = a
        c.fillEllipse(x: 0, y: 0, rx: r * 1.22, ry: r * 1.22, color: BrandColors.UI.sporeAmber, alpha: ba * 0.16)
        c.fillHull(.cap, cx: 0, cy: 0, r: r, stretch: stretch, color: BrandColors.UI.ink, alpha: jelly ? ba : ba * breath)
        for i in 0..<5 {
            let u = CGFloat(i + 1) / 6
            let x0 = (u * 2 - 1) * r * 0.72
            c.strokeQuad(from: CGPoint(x: x0 * 0.35, y: r * 0.02 * stretch),
                         control: CGPoint(x: x0, y: r * 0.08 * stretch),
                         to: CGPoint(x: x0 * 0.85, y: r * 0.16 * stretch),
                         color: BrandColors.UI.sporeAmber, width: max(1, r * 0.045),
                         alpha: ba * (jelly ? 0.35 : breath * 0.4))
        }
        let heartA = jelly ? ba * 0.7 : ba * breath * pulse
        c.fillEllipse(x: 0, y: -r * 0.12 * stretch, rx: r * 0.2 * pulse, ry: r * 0.2 * pulse, color: BrandColors.UI.sporeAmber, alpha: heartA)
        c.fillEllipse(x: 0, y: -r * 0.12 * stretch, rx: r * 0.09, ry: r * 0.09, color: BrandColors.UI.sporeViolet, alpha: heartA)
        c.fillEllipse(x: 0, y: r * 0.28 * stretch, rx: r * 0.11, ry: r * 0.2 * stretch, color: BrandColors.UI.ink, alpha: jelly ? ba : ba * breath)
    }

    private static func boreal(_ c: LiveHullCanvas, _ radius: CGFloat, _ turn: CGFloat, _ t: CGFloat, _ jelly: Bool, _ a: CGFloat) {
        let breath = 0.92 + 0.05 * sin(t * 0.0046)
        let scale = 0.97 + 0.03 * sin(t * 0.004)
        let r = radius * 0.95 * scale
        let stretch = 1 + 0.16 * turn
        let phase = t * 0.0004
        let ba = a
        c.fillHull(.curtain, cx: 0, cy: 0, r: r, stretch: stretch, color: BrandColors.UI.ink, alpha: jelly ? ba : ba * breath)
        for i in 0..<3 {
            let xOff = CGFloat(i - 1) * r * 0.1
            c.strokeCubic(
                from: CGPoint(x: xOff - r * 0.08, y: -r * 0.7 * stretch),
                c1: CGPoint(x: xOff + r * 0.35, y: -r * 0.15 * stretch),
                c2: CGPoint(x: xOff - r * 0.32, y: r * 0.28 * stretch),
                to: CGPoint(x: xOff + r * 0.12, y: r * 0.78 * stretch),
                color: BrandColors.UI.auroraHull[i % 3],
                width: max(1, r * 0.07),
                alpha: ba * (jelly ? 0.45 : breath * 0.55)
            )
        }
        c.fillEllipse(x: 0, y: -r * 0.15 * stretch, rx: r * 0.12, ry: r * 0.12,
                      color: BrandColors.UI.auroraHull[Int(floor(phase * 3)) % 3],
                      alpha: ba * (0.5 + 0.5 * sin(phase * 20)))
    }

    private static func luna(_ c: LiveHullCanvas, _ radius: CGFloat, _ turn: CGFloat, _ t: CGFloat, _ jelly: Bool, _ a: CGFloat) {
        let breath = 0.92 + 0.05 * sin(t * 0.0048)
        let scale = 0.97 + 0.03 * sin(t * 0.0042)
        let r = radius * 0.95 * scale
        let stretch = 1 + 0.16 * turn
        let flutter = 0.92 + 0.08 * sin(t * 0.0064)
        let ba = a
        c.fillEllipse(x: 0, y: r * 0.06, rx: r * 1.35, ry: r * 1.35, color: BrandColors.UI.mothLavender, alpha: ba * 0.16)
        c.fillHull(.moth, cx: 0, cy: 0, r: r, stretch: stretch, color: BrandColors.UI.ink, alpha: jelly ? ba : ba * breath)
        let antA = ba * (jelly ? 0.5 : breath * 0.6)
        c.strokeQuad(from: CGPoint(x: -r * 0.08, y: -r * 0.72 * stretch),
                     control: CGPoint(x: -r * 0.22, y: -r * 1.05 * stretch),
                     to: CGPoint(x: -r * 0.12, y: -r * 1.18 * stretch),
                     color: BrandColors.UI.mothLavender, width: max(0.9, r * 0.045), alpha: antA)
        c.strokeQuad(from: CGPoint(x: r * 0.08, y: -r * 0.72 * stretch),
                     control: CGPoint(x: r * 0.22, y: -r * 1.05 * stretch),
                     to: CGPoint(x: r * 0.12, y: -r * 1.18 * stretch),
                     color: BrandColors.UI.mothLavender, width: max(0.9, r * 0.045), alpha: antA)
        let moon = r * (0.2 + 0.05 * flutter)
        let moonA = jelly ? ba * 0.75 : ba * breath * flutter
        c.fillEllipse(x: 0, y: -r * 0.08 * stretch, rx: moon * 1.45, ry: moon * 1.45, color: BrandColors.UI.lanternGold, alpha: moonA * 0.28)
        c.fillEllipse(x: 0, y: -r * 0.08 * stretch, rx: moon, ry: moon, color: BrandColors.UI.lanternGold, alpha: moonA)
        c.fillEllipse(x: r * 0.04, y: -r * 0.12 * stretch, rx: moon * 0.38, ry: moon * 0.38, color: BrandColors.UI.ink55, alpha: moonA)
        let dust: [(CGFloat, CGFloat, CGFloat)] = [(0.42, 0.02, 0.07), (-0.38, 0.08, 0.06), (0.22, -0.18, 0.045), (-0.18, -0.22, 0.04)]
        for i in 0..<dust.count {
            let tw = 0.5 + 0.5 * sin(t * 0.008 + CGFloat(i) * 1.6)
            let s = dust[i]
            c.fillEllipse(x: s.0 * r, y: s.1 * r * stretch, rx: s.2 * r, ry: s.2 * r,
                          color: i % 2 == 0 ? BrandColors.UI.mothLavender : BrandColors.UI.lanternGold,
                          alpha: ba * tw * (jelly ? 0.65 : breath))
        }
    }

    private static func wish(_ c: LiveHullCanvas, _ radius: CGFloat, _ turn: CGFloat, _ t: CGFloat, _ jelly: Bool, _ a: CGFloat) {
        let breath = 0.92 + 0.05 * sin(t * 0.005)
        let scale = 0.97 + 0.03 * sin(t * 0.0044)
        let r = radius * 0.95 * scale
        let stretch = 1 + 0.14 * turn
        let pulse = 0.82 + 0.18 * sin(t * 0.0072)
        let ba = a
        c.fillEllipse(x: 0, y: 0, rx: r * 1.25, ry: r * 1.25, color: BrandColors.UI.lanternGold, alpha: ba * 0.16)
        c.fillHull(.wish, cx: 0, cy: 0, r: r, stretch: stretch, color: BrandColors.UI.ink, alpha: jelly ? ba : ba * breath)
        c.strokeLine(from: CGPoint(x: 0, y: -r * 0.85 * stretch), to: CGPoint(x: 0, y: r * 0.35 * stretch),
                     color: BrandColors.UI.lanternGold, width: max(1, r * 0.06), alpha: ba * (jelly ? 0.4 : breath * 0.5))
        let heartA = jelly ? ba * 0.8 : ba * breath * pulse
        c.fillEllipse(x: 0, y: -r * 0.05 * stretch, rx: r * 0.22 * pulse, ry: r * 0.22 * pulse, color: BrandColors.UI.lanternGold, alpha: heartA * 0.35)
        c.fillEllipse(x: 0, y: -r * 0.05 * stretch, rx: r * 0.14 * pulse, ry: r * 0.14 * pulse, color: BrandColors.UI.lanternGold, alpha: heartA)
        c.fillEllipse(x: 0, y: -r * 0.05 * stretch, rx: r * 0.06, ry: r * 0.06, color: BrandColors.UI.wishCore, alpha: heartA)
        for i in 0..<3 {
            let ang = t * 0.0024 + CGFloat(i) * (.pi * 2 / 3)
            let orbit = r * (0.95 + 0.12 * CGFloat(i))
            let sx = cos(ang) * orbit * 0.55
            let sy = sin(ang) * orbit * 0.38 * stretch
            let tw = 0.55 + 0.45 * sin(t * 0.009 + CGFloat(i))
            let starA = ba * tw * (jelly ? 0.7 : breath)
            c.fillEllipse(x: sx, y: sy, rx: r * 0.07, ry: r * 0.07, color: BrandColors.UI.lanternGold, alpha: starA)
            let arm = r * 0.11
            c.strokeLine(from: CGPoint(x: sx - arm, y: sy), to: CGPoint(x: sx + arm, y: sy), color: BrandColors.UI.lanternGold, width: max(0.6, r * 0.03), alpha: starA)
            c.strokeLine(from: CGPoint(x: sx, y: sy - arm), to: CGPoint(x: sx, y: sy + arm), color: BrandColors.UI.lanternGold, width: max(0.6, r * 0.03), alpha: starA)
        }
    }

    private static func darnerWing(_ c: LiveHullCanvas, x: CGFloat, y: CGFloat, span: CGFloat, chord: CGFloat, flip: CGFloat, color: UIColor, alpha: CGFloat) {
        let path: [CGPoint] = [
            CGPoint(x: x, y: y),
            CGPoint(x: x + flip * span * 0.38, y: y - chord),
            CGPoint(x: x + flip * span * 0.92, y: y - chord * 0.22),
            CGPoint(x: x + flip * span, y: y + chord * 0.12),
            CGPoint(x: x + flip * span * 0.42, y: y + chord * 0.38)
        ]
        c.fillClosed([path[0], path[3], path[4]], color: color, alpha: alpha * 0.22)
        c.strokeCubic(from: path[0], c1: path[1], c2: path[2], to: path[3], color: color, width: max(0.7, span * 0.035), alpha: alpha)
        c.strokeQuad(from: path[3], control: path[4], to: path[0], color: color, width: max(0.7, span * 0.035), alpha: alpha)
        c.strokeQuad(from: path[0], control: CGPoint(x: x + flip * span * 0.45, y: y - chord * 0.15),
                     to: CGPoint(x: x + flip * span * 0.82, y: y + chord * 0.02),
                     color: color, width: max(0.7, span * 0.035), alpha: alpha)
    }

    private static func darner(_ c: LiveHullCanvas, _ radius: CGFloat, _ turn: CGFloat, _ t: CGFloat, _ jelly: Bool, _ a: CGFloat) {
        let breath = 0.92 + 0.05 * sin(t * 0.0048)
        let scale = 0.97 + 0.03 * sin(t * 0.0042)
        let r = radius * 0.95 * scale
        let stretch = 1 + 0.14 * turn
        let shimmer = 0.55 + 0.45 * sin(t * 0.008)
        let ba = a
        let wingSpan = r * (1.05 + 0.08 * shimmer)
        let pairs: [(CGFloat, CGFloat, CGFloat)] = [
            (-r * 0.12 * stretch, r * 0.28, wingSpan),
            (r * 0.18 * stretch, r * 0.24, wingSpan * 0.88)
        ]
        for i in 0..<pairs.count {
            let w = pairs[i]
            let rgb = BrandColors.UI.darnerBands[i % 3]
            let wa = ba * (jelly ? 0.7 : breath * shimmer)
            darnerWing(c, x: 0, y: w.0, span: w.2, chord: w.1, flip: 1, color: rgb, alpha: wa)
            darnerWing(c, x: 0, y: w.0, span: w.2, chord: w.1, flip: -1, color: rgb, alpha: wa)
        }
        c.fillHull(.darner, cx: 0, cy: 0, r: r, stretch: stretch, color: BrandColors.UI.ink, alpha: jelly ? ba : ba * breath)
        let heartA = jelly ? ba * 0.8 : ba * breath * shimmer
        c.fillEllipse(x: 0, y: -r * 0.08 * stretch, rx: r * 0.16, ry: r * 0.16, color: BrandColors.UI.lanternGold, alpha: heartA * 0.32)
        c.fillEllipse(x: 0, y: -r * 0.08 * stretch, rx: r * 0.1, ry: r * 0.1, color: BrandColors.UI.lanternGold, alpha: heartA)
    }

    private static func puff(_ c: LiveHullCanvas, _ radius: CGFloat, _ turn: CGFloat, _ t: CGFloat, _ jelly: Bool, _ a: CGFloat) {
        let breath = 0.92 + 0.05 * sin(t * 0.0046)
        let scale = 0.97 + 0.03 * sin(t * 0.004)
        let r = radius * 0.95 * scale
        let stretch = 1 + 0.1 * turn
        let tickBreath = 0.88 + 0.12 * sin(t * 0.0052)
        let ba = a
        c.fillEllipse(x: 0, y: -r * 0.08 * stretch, rx: r * 1.15, ry: r * 1.15, color: BrandColors.UI.lanternGold, alpha: ba * 0.14)
        c.fillHull(.puff, cx: 0, cy: 0, r: r, stretch: stretch, color: BrandColors.UI.ink, alpha: jelly ? ba : ba * breath)
        let cy = -r * 0.08 * stretch
        for i in 0..<14 {
            let ang = (CGFloat(i) / 14) * .pi * 2 + t * 0.00035
            let len = r * (0.62 + 0.1 * tickBreath) * (0.9 + 0.1 * sin(t * 0.006 + CGFloat(i)))
            c.strokeLine(
                from: CGPoint(x: cos(ang) * r * 0.14, y: cy + sin(ang) * r * 0.14),
                to: CGPoint(x: cos(ang) * len, y: cy + sin(ang) * len * stretch),
                color: BrandColors.UI.lanternGold,
                width: max(0.7, r * 0.035),
                alpha: ba * (jelly ? 0.45 : breath * tickBreath * 0.55)
            )
        }
        c.strokeLine(from: CGPoint(x: 0, y: r * 0.62 * stretch), to: CGPoint(x: 0, y: r * 1.02 * stretch),
                     color: BrandColors.UI.ink, width: max(1.2, r * 0.08), alpha: jelly ? ba : ba * breath)
    }

    private static func argus(_ c: LiveHullCanvas, _ radius: CGFloat, _ turn: CGFloat, _ t: CGFloat, _ jelly: Bool, _ a: CGFloat) {
        let breath = 0.92 + 0.05 * sin(t * 0.0048)
        let scale = 0.97 + 0.03 * sin(t * 0.0042)
        let r = radius * 0.95 * scale
        let stretch = 1 + 0.14 * turn
        let pulse = 0.72 + 0.28 * sin(t * 0.0064)
        let ba = a
        let teal = UIColor(red: 42 / 255, green: 168 / 255, blue: 158 / 255, alpha: 1)
        for i in 0..<7 {
            let u = (CGFloat(i) / 6) * 2 - 1
            let tipX = u * r * 1.12
            let tipY = r * (0.92 + 0.2 * (1 - abs(u))) * stretch
            let baseY = r * 0.28 * stretch
            let pts = [
                CGPoint(x: u * r * 0.1, y: baseY),
                CGPoint(x: tipX * 0.28, y: r * 0.5 * stretch),
                CGPoint(x: tipX, y: tipY),
                CGPoint(x: tipX * 0.62, y: r * 0.58 * stretch),
                CGPoint(x: u * r * 0.22, y: baseY + r * 0.06)
            ]
            c.fillClosed(pts, color: teal, alpha: ba * (jelly ? 0.45 : breath * 0.5) * 0.28)
            c.strokeClosed(pts, color: teal, alpha: ba * (jelly ? 0.45 : breath * 0.5), width: max(0.9, r * 0.04))
        }
        c.fillHull(.argus, cx: 0, cy: 0, r: r, stretch: stretch, color: BrandColors.UI.ink, alpha: jelly ? ba : ba * breath)
        let spots: [(CGFloat, CGFloat, CGFloat)] = [(0, 0.78, 0.18), (-0.42, 0.64, 0.15), (0.42, 0.64, 0.15), (-0.24, 0.94, 0.12), (0.24, 0.94, 0.12)]
        for i in 0..<spots.count {
            let s = spots[i]
            let tw = 0.55 + 0.45 * sin(t * 0.007 + CGFloat(i) * 1.3)
            let mix = 0.5 + 0.5 * sin(t * 0.0055 + CGFloat(i))
            let sa = ba * tw * (jelly ? 0.75 : breath * pulse)
            c.fillEllipse(x: s.0 * r, y: s.1 * r * stretch, rx: s.2 * r * (0.85 + 0.15 * pulse), ry: s.2 * r * (0.85 + 0.15 * pulse),
                          color: mix > 0.5 ? teal : BrandColors.UI.lanternGold, alpha: sa)
            c.fillEllipse(x: s.0 * r, y: s.1 * r * stretch, rx: s.2 * r * 0.38, ry: s.2 * r * 0.38,
                          color: mix > 0.5 ? BrandColors.UI.lanternGold : UIColor(red: 18 / 255, green: 22 / 255, blue: 28 / 255, alpha: 1), alpha: sa)
        }
    }

    private static func chime(_ c: LiveHullCanvas, _ radius: CGFloat, _ turn: CGFloat, _ t: CGFloat, _ jelly: Bool, _ a: CGFloat) {
        let breath = 0.92 + 0.05 * sin(t * 0.0048)
        let scale = 0.97 + 0.03 * sin(t * 0.0044)
        let r = radius * 0.95 * scale
        let stretch = 1 + 0.12 * turn
        let sway = sin(t * 0.0062) * 0.16
        let ba = a
        c.fillHull(.chime, cx: -r * 0.88, cy: r * 0.12 * stretch, r: r * 0.42, stretch: stretch, color: BrandColors.UI.ink, alpha: jelly ? ba * 0.85 : ba * breath * 0.72)
        c.fillHull(.chime, cx: r * 0.88, cy: r * 0.12 * stretch, r: r * 0.42, stretch: stretch, color: BrandColors.UI.ink, alpha: jelly ? ba * 0.85 : ba * breath * 0.72)
        c.fillHull(.chime, cx: 0, cy: 0, r: r, stretch: stretch, color: BrandColors.UI.ink, alpha: jelly ? ba : ba * breath)
        c.fillEllipse(x: 0, y: -r * 0.18 * stretch, rx: r * 1.05, ry: r * 1.05, color: BrandColors.UI.lanternGold, alpha: ba * 0.14)
        let clappers: [(CGFloat, CGFloat, CGFloat, CGFloat)] = [
            (0, 0, 1, sway),
            (-0.88, 0.12, 0.42, sway * -0.7),
            (0.88, 0.12, 0.42, sway * 0.7)
        ]
        for cl in clappers {
            let bx = cl.0 * r
            let by = cl.1 * r * stretch
            let br = r * cl.2
            c.strokeLine(from: CGPoint(x: bx, y: by + br * 0.12 * stretch),
                         to: CGPoint(x: bx + cl.3 * br, y: by + br * 0.42 * stretch),
                         color: BrandColors.UI.lanternGold, width: max(0.8, r * 0.045),
                         alpha: ba * (jelly ? 0.55 : breath * 0.65))
            c.fillEllipse(x: bx + cl.3 * br, y: by + br * 0.48 * stretch, rx: br * 0.09, ry: br * 0.09,
                          color: BrandColors.UI.lanternGold, alpha: ba * (jelly ? 0.55 : breath * 0.65))
        }
    }
}

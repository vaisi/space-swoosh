// ClassicHullPaint.swift
// Changes: Seal almond + Orbit Spine bar match Android live drawers.

import CoreGraphics
import SpriteKit
import UIKit

/// Focus–Cinder hulls: wash + highlight stills, plus live Halo / Orbit / Nyan.
enum ClassicHullPaint {
    static let previewTimeMs: CGFloat = 1400

    static func draw(
        _ id: SkinId,
        onto canvas: LiveHullCanvas,
        radius: CGFloat,
        turn: CGFloat,
        nowMs: CGFloat,
        jellyLive: Bool,
        shake: CGFloat,
        alpha: CGFloat
    ) {
        switch id {
        case .nyan: nyan(canvas, radius, turn, nowMs, jellyLive, alpha)
        case .halo: halo(canvas, radius, nowMs, jellyLive, shake, alpha)
        case .orbit: orbit(canvas, radius, turn, nowMs, jellyLive, shake, alpha)
        default: drawKind(SkinCatalog.def(id).hullKind, onto: canvas, radius: radius, turn: turn, nowMs: nowMs, jellyLive: jellyLive, alpha: alpha)
        }
    }

    static func drawKind(
        _ kind: HullKind,
        onto canvas: LiveHullCanvas,
        radius: CGFloat,
        turn: CGFloat,
        nowMs: CGFloat,
        jellyLive: Bool,
        alpha: CGFloat
    ) {
        switch kind {
        case .circle:
            circle(canvas, radius, alpha)
        case .tear, .dart, .shard, .crescent, .petal:
            factory(canvas, kind, radius, turn, nowMs, jellyLive, alpha)
        case .fletch:
            fletch(canvas, radius, turn, nowMs, jellyLive, alpha)
        case .fold:
            fold(canvas, radius, turn, nowMs, jellyLive, alpha)
        case .hex:
            flux(canvas, radius, turn, nowMs, jellyLive, alpha)
        case .mote:
            mote(canvas, radius, nowMs, jellyLive, alpha)
        case .needle:
            needle(canvas, radius, turn, nowMs, jellyLive, alpha)
        case .spine:
            spine(canvas, radius, turn, nowMs, jellyLive, alpha)
        case .square, .stamp:
            square(canvas, radius, turn, nowMs, jellyLive, alpha)
        case .seal:
            seal(canvas, radius, turn, nowMs, jellyLive, alpha)
        case .nyan:
            nyan(canvas, radius, turn, nowMs, jellyLive, alpha)
        case .halo:
            halo(canvas, radius, nowMs, jellyLive, 0, alpha)
        case .orbit:
            orbit(canvas, radius, turn, nowMs, jellyLive, 0, alpha)
        default:
            factory(canvas, kind, radius, turn, nowMs, jellyLive, alpha)
        }
    }

    static func makeImage(kind: HullKind, logicalRadius: CGFloat = 28, scale: CGFloat = 3) -> UIImage {
        let r = max(logicalRadius * scale, 8)
        let size = ceil(r * 4.4)
        let bounds = CGSize(width: size, height: size)
        let renderer = UIGraphicsImageRenderer(size: bounds)
        return renderer.image { ctx in
            let cg = ctx.cgContext
            cg.setFillColor(UIColor.clear.cgColor)
            cg.fill(CGRect(origin: .zero, size: bounds))
            cg.translateBy(x: size / 2, y: size / 2)
            drawKind(
                kind, onto: CGLiveCanvas(cg), radius: r, turn: 0.15,
                nowMs: previewTimeMs, jellyLive: false, alpha: 1
            )
        }
    }

    static func make(kind: HullKind) -> SKTexture {
        let tex = SKTexture(image: makeImage(kind: kind))
        tex.filteringMode = .linear
        return tex
    }

    private static func breath(_ t: CGFloat) -> CGFloat {
        0.9 + 0.06 * sin(t * 0.0056) + 0.04 * sin(t * 0.0088)
    }

    private static func scale(_ t: CGFloat) -> CGFloat {
        0.97 + 0.03 * sin(t * 0.0044)
    }

    private static func circle(_ c: LiveHullCanvas, _ radius: CGFloat, _ a: CGFloat) {
        c.fillEllipse(x: 0, y: 0, rx: radius, ry: radius, color: BrandColors.UI.ink, alpha: a)
    }

    private static func factory(
        _ c: LiveHullCanvas,
        _ kind: HullKind,
        _ radius: CGFloat,
        _ turn: CGFloat,
        _ t: CGFloat,
        _ jelly: Bool,
        _ a: CGFloat
    ) {
        let b = breath(t)
        let r = radius * 0.95 * scale(t)
        let stretch = 1 + 0.2 * turn
        let body = jelly ? a : a * b
        c.fillEllipse(x: 0, y: r * 0.12, rx: r * 1.35, ry: r * 1.35, color: BrandColors.UI.ink12, alpha: body)
        c.fillHull(kind, cx: 0, cy: 0, r: r, stretch: stretch, color: BrandColors.UI.ink, alpha: body)
        c.fillHull(kind, cx: 0, cy: r * 0.08, r: r * 0.42, stretch: stretch, color: BrandColors.UI.ink55, alpha: a * (jelly ? 0.28 : b * 0.35))
    }

    private static func fletch(_ c: LiveHullCanvas, _ radius: CGFloat, _ turn: CGFloat, _ t: CGFloat, _ jelly: Bool, _ a: CGFloat) {
        let b = breath(t)
        let r = radius * 0.95 * scale(t)
        let stretch = 1 + 0.2 * turn
        let ry = r * stretch
        let body = jelly ? a : a * b
        c.fillHull(.fletch, cx: 0, cy: 0, r: r, stretch: stretch, color: BrandColors.UI.ink, alpha: body)
        c.strokeLine(
            from: CGPoint(x: 0, y: -ry * 0.92),
            to: CGPoint(x: 0, y: ry * 0.28),
            color: BrandColors.UI.ink55,
            width: max(1, r * 0.07),
            alpha: a * (jelly ? 0.35 : b * 0.42)
        )
    }

    private static func fold(_ c: LiveHullCanvas, _ radius: CGFloat, _ turn: CGFloat, _ t: CGFloat, _ jelly: Bool, _ a: CGFloat) {
        let b = breath(t)
        let r = radius * 0.95 * scale(t)
        let stretch = 1 + 0.2 * turn
        let ry = r * stretch
        let body = jelly ? a : a * b
        c.fillEllipse(x: 0, y: r * 0.12, rx: r * 1.35, ry: r * 1.35, color: BrandColors.UI.ink12, alpha: body)
        c.fillHull(.fold, cx: 0, cy: 0, r: r, stretch: stretch, color: BrandColors.UI.ink, alpha: body)
        c.strokeLine(
            from: CGPoint(x: 0, y: -ry * 0.85),
            to: CGPoint(x: 0, y: ry * 0.75),
            color: BrandColors.UI.ink55,
            width: max(1, r * 0.07),
            alpha: a * (jelly ? 0.35 : b * 0.45)
        )
    }

    private static func flux(_ c: LiveHullCanvas, _ radius: CGFloat, _ turn: CGFloat, _ t: CGFloat, _ jelly: Bool, _ a: CGFloat) {
        let b = breath(t)
        let r = radius * 0.82 * scale(t)
        let stretch = 1 + 0.14 * turn
        let body = jelly ? a : a * b
        c.fillEllipse(x: 0, y: r * 0.1, rx: r * 1.2, ry: r * 1.2, color: BrandColors.UI.ink12, alpha: body)
        c.fillHull(.hex, cx: 0, cy: 0, r: r, stretch: stretch, color: BrandColors.UI.ink, alpha: body)
        c.fillHull(.hex, cx: 0, cy: r * 0.06, r: r * 0.4, stretch: stretch, color: BrandColors.UI.ink55, alpha: a * (jelly ? 0.28 : b * 0.35))
    }

    private static func mote(_ c: LiveHullCanvas, _ radius: CGFloat, _ t: CGFloat, _ jelly: Bool, _ a: CGFloat) {
        let b = 0.92 + 0.05 * sin(t * 0.005)
        let r = radius
        let body = jelly ? a : a * b
        c.fillEllipse(x: 0, y: 0, rx: r * 1.15, ry: r * 1.15, color: BrandColors.UI.ink12, alpha: body)
        c.fillEllipse(x: 0, y: 0, rx: r * 0.95, ry: r * 0.95, color: BrandColors.UI.ink, alpha: body)
        c.fillEllipse(x: 0, y: r * 0.08, rx: r * 0.4, ry: r * 0.4, color: BrandColors.UI.ink55, alpha: a * (jelly ? 0.3 : b * 0.4))
    }

    private static func needle(_ c: LiveHullCanvas, _ radius: CGFloat, _ turn: CGFloat, _ t: CGFloat, _ jelly: Bool, _ a: CGFloat) {
        let b = breath(t)
        let r = radius * 0.95 * scale(t)
        let stretch = 1 + 0.2 * turn
        let body = jelly ? a : a * b
        c.fillEllipse(x: 0, y: r * 0.12, rx: r * 1.15, ry: r * 1.15, color: BrandColors.UI.ink12, alpha: body)
        c.fillHull(.needle, cx: 0, cy: 0, r: r, stretch: stretch, color: BrandColors.UI.ink, alpha: body)
        c.fillHull(.needle, cx: 0, cy: -r * 0.15, r: r * 0.38, stretch: stretch * 1.05, color: BrandColors.UI.ink55, alpha: a * (jelly ? 0.4 : b * 0.35))
    }

    private static func spine(_ c: LiveHullCanvas, _ radius: CGFloat, _ turn: CGFloat, _ t: CGFloat, _ jelly: Bool, _ a: CGFloat) {
        let b = 0.9 + 0.05 * sin(t * 0.0052)
        let r = radius * 0.95 * (0.98 + 0.02 * sin(t * 0.004))
        let stretch = 1 + 0.15 * turn
        let body = jelly ? a : a * b
        c.fillHull(.spine, cx: 0, cy: 0, r: r, stretch: stretch, color: BrandColors.UI.ink, alpha: body)
        c.fillHull(.spine, cx: 0, cy: r * 0.05, r: r * 0.45, stretch: stretch, color: BrandColors.UI.ink55, alpha: a * (jelly ? 0.28 : b * 0.35))
    }

    private static func square(_ c: LiveHullCanvas, _ radius: CGFloat, _ turn: CGFloat, _ t: CGFloat, _ jelly: Bool, _ a: CGFloat) {
        let b = breath(t)
        let r = radius * 0.95 * scale(t)
        let stretch = 1 + 0.2 * turn
        let body = jelly ? a : a * b
        let inset: CGFloat = jelly ? 0.38 : 0.42
        c.fillHull(.square, cx: 0, cy: 0, r: r, stretch: stretch, color: BrandColors.UI.ink, alpha: body)
        c.fillHull(.square, cx: 0, cy: r * 0.06, r: r * inset, stretch: stretch, color: BrandColors.UI.ink55, alpha: a * (jelly ? 0.28 : b * 0.35))
    }

    private static func seal(_ c: LiveHullCanvas, _ radius: CGFloat, _ turn: CGFloat, _ t: CGFloat, _ jelly: Bool, _ a: CGFloat) {
        let b = breath(t)
        let r = radius * 0.95 * scale(t)
        let stretch = 1 + 0.2 * turn
        let ry = r * stretch
        let body = jelly ? a : a * b
        c.fillHull(.seal, cx: 0, cy: 0, r: r, stretch: stretch, color: BrandColors.UI.ink, alpha: body)
        c.fillHull(.seal, cx: 0, cy: r * 0.04, r: r * 0.52, stretch: stretch, color: BrandColors.UI.ink55, alpha: a * (jelly ? 0.28 : b * 0.35))
        c.strokeLine(
            from: CGPoint(x: 0, y: -ry * 0.92),
            to: CGPoint(x: 0, y: ry * 0.72),
            color: BrandColors.UI.ink55,
            width: max(0.7, r * 0.045),
            alpha: a * (jelly ? 0.4 : b * 0.45)
        )
        let markY = -ry * 0.52
        let markR = r * 0.11
        c.strokeEllipse(x: 0, y: markY, rx: markR, ry: markR, color: BrandColors.UI.ink, alpha: body, width: max(1, r * 0.055))
        c.fillEllipse(x: 0, y: markY, rx: markR * 0.38, ry: markR * 0.38, color: BrandColors.UI.ink55, alpha: a * (jelly ? 0.55 : b * 0.7))
    }

    private static func nyan(_ c: LiveHullCanvas, _ radius: CGFloat, _ turn: CGFloat, _ t: CGFloat, _ jelly: Bool, _ a: CGFloat) {
        let b = breath(t)
        let r = radius * 0.95 * scale(t)
        let stretch = 1 + 0.2 * turn
        let ry = r * stretch
        let body = jelly ? a : a * b
        c.fillHull(.nyan, cx: 0, cy: 0, r: r, stretch: stretch, color: BrandColors.UI.nyanGray, alpha: body)
        c.fillHull(.nyan, cx: 0, cy: r * 0.04, r: r * 0.42, stretch: stretch, color: BrandColors.UI.nyanGray, alpha: a * (jelly ? 0.22 : b * 0.28))
        let spots: [(CGFloat, CGFloat, CGFloat)] = [(0.48, 0.12, 0.085), (-0.48, 0.12, 0.085)]
        for s in spots {
            c.fillEllipse(x: s.0 * r, y: s.1 * ry, rx: max(1.2, s.2 * r), ry: max(1.2, s.2 * r),
                          color: BrandColors.UI.nyanPink, alpha: a * (jelly ? 0.95 : b))
        }
    }

    private static func halo(_ c: LiveHullCanvas, _ radius: CGFloat, _ t: CGFloat, _ jelly: Bool, _ shake: CGFloat, _ a: CGFloat) {
        let b = 0.92 + 0.05 * sin(t * 0.0048)
        let r = radius
        let core = r * 0.72
        let orbitR = r * 1.22
        let phase = t * 0.0028
        let body = jelly ? a : a * b
        let wobble = jelly ? shake * 2.5 : 0
        c.strokeEllipse(x: 0, y: 0, rx: orbitR, ry: orbitR, color: BrandColors.UI.ink30, alpha: body, width: r * 0.07)
        for i in 0..<2 {
            let ang = phase + CGFloat(i) * .pi + wobble
            c.fillEllipse(x: cos(ang) * orbitR, y: sin(ang) * orbitR, rx: r * 0.13, ry: r * 0.13, color: BrandColors.UI.ink, alpha: body)
        }
        c.fillEllipse(x: 0, y: 0, rx: core, ry: core, color: BrandColors.UI.ink, alpha: body)
        c.fillEllipse(x: 0, y: r * 0.06, rx: core * 0.42, ry: core * 0.42, color: BrandColors.UI.ink55, alpha: a * (jelly ? 0.28 : b * 0.35))
    }

    private static func orbit(_ c: LiveHullCanvas, _ radius: CGFloat, _ turn: CGFloat, _ t: CGFloat, _ jelly: Bool, _ shake: CGFloat, _ a: CGFloat) {
        spine(c, radius, turn, t, jelly, a)
    }
}

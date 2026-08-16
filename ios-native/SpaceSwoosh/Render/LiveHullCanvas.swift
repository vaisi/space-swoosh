// LiveHullCanvas.swift
// Changes: CG + SpriteKit canvases so live hulls share one Android painter.

import SpriteKit
import UIKit

protocol LiveHullCanvas: AnyObject {
    func fillEllipse(x: CGFloat, y: CGFloat, rx: CGFloat, ry: CGFloat, color: UIColor, alpha: CGFloat)
    func fillRotatedEllipse(x: CGFloat, y: CGFloat, rx: CGFloat, ry: CGFloat, rotation: CGFloat, color: UIColor, alpha: CGFloat)
    func strokeEllipse(x: CGFloat, y: CGFloat, rx: CGFloat, ry: CGFloat, color: UIColor, alpha: CGFloat, width: CGFloat)
    func fillHull(_ kind: HullKind, cx: CGFloat, cy: CGFloat, r: CGFloat, stretch: CGFloat, color: UIColor, alpha: CGFloat)
    func strokeHull(_ kind: HullKind, cx: CGFloat, cy: CGFloat, r: CGFloat, stretch: CGFloat, color: UIColor, alpha: CGFloat, width: CGFloat)
    func strokeQuad(from: CGPoint, control: CGPoint, to: CGPoint, color: UIColor, width: CGFloat, alpha: CGFloat)
    func strokeCubic(from: CGPoint, c1: CGPoint, c2: CGPoint, to: CGPoint, color: UIColor, width: CGFloat, alpha: CGFloat)
    func strokeLine(from: CGPoint, to: CGPoint, color: UIColor, width: CGFloat, alpha: CGFloat)
    func fillClosed(_ points: [CGPoint], color: UIColor, alpha: CGFloat)
    func strokeClosed(_ points: [CGPoint], color: UIColor, alpha: CGFloat, width: CGFloat)
}

final class CGLiveCanvas: LiveHullCanvas {
    let cg: CGContext
    init(_ cg: CGContext) { self.cg = cg }

    func fillEllipse(x: CGFloat, y: CGFloat, rx: CGFloat, ry: CGFloat, color: UIColor, alpha: CGFloat) {
        cg.setFillColor(color.withAlphaComponent(alpha).cgColor)
        cg.fillEllipse(in: CGRect(x: x - rx, y: y - ry, width: rx * 2, height: ry * 2))
    }

    func fillRotatedEllipse(x: CGFloat, y: CGFloat, rx: CGFloat, ry: CGFloat, rotation: CGFloat, color: UIColor, alpha: CGFloat) {
        cg.saveGState()
        cg.translateBy(x: x, y: y)
        cg.rotate(by: rotation)
        cg.setFillColor(color.withAlphaComponent(alpha).cgColor)
        cg.fillEllipse(in: CGRect(x: -rx, y: -ry, width: rx * 2, height: ry * 2))
        cg.restoreGState()
    }

    func strokeEllipse(x: CGFloat, y: CGFloat, rx: CGFloat, ry: CGFloat, color: UIColor, alpha: CGFloat, width: CGFloat) {
        cg.setStrokeColor(color.withAlphaComponent(alpha).cgColor)
        cg.setLineWidth(width)
        cg.strokeEllipse(in: CGRect(x: x - rx, y: y - ry, width: rx * 2, height: ry * 2))
    }

    func fillHull(_ kind: HullKind, cx: CGFloat, cy: CGFloat, r: CGFloat, stretch: CGFloat, color: UIColor, alpha: CGFloat) {
        let path = CGMutablePath()
        HullPaths.add(kind, to: path, cx: cx, cy: cy, r: r, stretch: stretch)
        cg.setFillColor(color.withAlphaComponent(alpha).cgColor)
        cg.addPath(path)
        cg.fillPath()
    }

    func strokeHull(_ kind: HullKind, cx: CGFloat, cy: CGFloat, r: CGFloat, stretch: CGFloat, color: UIColor, alpha: CGFloat, width: CGFloat) {
        let path = CGMutablePath()
        HullPaths.add(kind, to: path, cx: cx, cy: cy, r: r, stretch: stretch)
        cg.setStrokeColor(color.withAlphaComponent(alpha).cgColor)
        cg.setLineWidth(width)
        cg.addPath(path)
        cg.strokePath()
    }

    func strokeQuad(from: CGPoint, control: CGPoint, to: CGPoint, color: UIColor, width: CGFloat, alpha: CGFloat) {
        cg.setStrokeColor(color.withAlphaComponent(alpha).cgColor)
        cg.setLineWidth(width)
        cg.setLineCap(.round)
        cg.setLineJoin(.round)
        cg.move(to: from)
        cg.addQuadCurve(to: to, control: control)
        cg.strokePath()
    }

    func strokeCubic(from: CGPoint, c1: CGPoint, c2: CGPoint, to: CGPoint, color: UIColor, width: CGFloat, alpha: CGFloat) {
        cg.setStrokeColor(color.withAlphaComponent(alpha).cgColor)
        cg.setLineWidth(width)
        cg.setLineCap(.round)
        cg.move(to: from)
        cg.addCurve(to: to, control1: c1, control2: c2)
        cg.strokePath()
    }

    func strokeLine(from: CGPoint, to: CGPoint, color: UIColor, width: CGFloat, alpha: CGFloat) {
        cg.setStrokeColor(color.withAlphaComponent(alpha).cgColor)
        cg.setLineWidth(width)
        cg.setLineCap(.round)
        cg.move(to: from)
        cg.addLine(to: to)
        cg.strokePath()
    }

    func fillClosed(_ points: [CGPoint], color: UIColor, alpha: CGFloat) {
        guard let first = points.first else { return }
        cg.setFillColor(color.withAlphaComponent(alpha).cgColor)
        cg.move(to: first)
        for p in points.dropFirst() { cg.addLine(to: p) }
        cg.closePath()
        cg.fillPath()
    }

    func strokeClosed(_ points: [CGPoint], color: UIColor, alpha: CGFloat, width: CGFloat) {
        guard let first = points.first else { return }
        cg.setStrokeColor(color.withAlphaComponent(alpha).cgColor)
        cg.setLineWidth(width)
        cg.setLineJoin(.round)
        cg.move(to: first)
        for p in points.dropFirst() { cg.addLine(to: p) }
        cg.closePath()
        cg.strokePath()
    }
}

/// SpriteKit canvas. JS local +Y is down; SpriteKit +Y is up — flip here only.
final class SKLiveCanvas: LiveHullCanvas {
    private let fills: [SKShapeNode]
    private let strokes: [SKShapeNode]
    private let discs: [SKSpriteNode]
    private var fi = 0
    private var si = 0
    private var di = 0

    init(fills: [SKShapeNode], strokes: [SKShapeNode], discs: [SKSpriteNode]) {
        self.fills = fills
        self.strokes = strokes
        self.discs = discs
    }

    func begin() {
        fi = 0
        si = 0
        di = 0
        for n in fills { n.isHidden = true }
        for n in strokes { n.isHidden = true }
        for n in discs { n.isHidden = true }
    }

    private func flip(_ p: CGPoint) -> CGPoint { CGPoint(x: p.x, y: -p.y) }

    func fillEllipse(x: CGFloat, y: CGFloat, rx: CGFloat, ry: CGFloat, color: UIColor, alpha: CGFloat) {
        guard di < discs.count else { return }
        let n = discs[di]
        di += 1
        n.isHidden = false
        n.position = CGPoint(x: x, y: -y)
        n.size = CGSize(width: rx * 2, height: ry * 2)
        n.color = color
        n.colorBlendFactor = 1
        n.alpha = alpha
        n.zRotation = 0
    }

    func fillRotatedEllipse(x: CGFloat, y: CGFloat, rx: CGFloat, ry: CGFloat, rotation: CGFloat, color: UIColor, alpha: CGFloat) {
        guard di < discs.count else { return }
        let n = discs[di]
        di += 1
        n.isHidden = false
        n.position = CGPoint(x: x, y: -y)
        n.size = CGSize(width: rx * 2, height: ry * 2)
        n.color = color
        n.colorBlendFactor = 1
        n.alpha = alpha
        n.zRotation = -rotation
    }

    func strokeEllipse(x: CGFloat, y: CGFloat, rx: CGFloat, ry: CGFloat, color: UIColor, alpha: CGFloat, width: CGFloat) {
        guard si < strokes.count else { return }
        let n = strokes[si]
        si += 1
        n.isHidden = false
        n.position = .zero
        n.path = CGPath(ellipseIn: CGRect(x: x - rx, y: -y - ry, width: rx * 2, height: ry * 2), transform: nil)
        n.strokeColor = color
        n.fillColor = .clear
        n.lineWidth = width
        n.alpha = alpha
    }

    func fillHull(_ kind: HullKind, cx: CGFloat, cy: CGFloat, r: CGFloat, stretch: CGFloat, color: UIColor, alpha: CGFloat) {
        guard fi < fills.count else { return }
        let n = fills[fi]
        fi += 1
        n.isHidden = false
        n.position = .zero
        n.path = flippedHull(kind, cx: cx, cy: cy, r: r, stretch: stretch)
        n.fillColor = color
        n.strokeColor = .clear
        n.lineWidth = 0
        n.alpha = alpha
    }

    func strokeHull(_ kind: HullKind, cx: CGFloat, cy: CGFloat, r: CGFloat, stretch: CGFloat, color: UIColor, alpha: CGFloat, width: CGFloat) {
        guard si < strokes.count else { return }
        let n = strokes[si]
        si += 1
        n.isHidden = false
        n.position = .zero
        n.path = flippedHull(kind, cx: cx, cy: cy, r: r, stretch: stretch)
        n.fillColor = .clear
        n.strokeColor = color
        n.lineWidth = width
        n.alpha = alpha
    }

    private func flippedHull(_ kind: HullKind, cx: CGFloat, cy: CGFloat, r: CGFloat, stretch: CGFloat) -> CGPath {
        let path = CGMutablePath()
        HullPaths.add(kind, to: path, cx: cx, cy: cy, r: r, stretch: stretch)
        var t = CGAffineTransform(scaleX: 1, y: -1)
        return path.copy(using: &t) ?? path
    }

    func strokeQuad(from: CGPoint, control: CGPoint, to: CGPoint, color: UIColor, width: CGFloat, alpha: CGFloat) {
        guard si < strokes.count else { return }
        let n = strokes[si]
        si += 1
        let path = CGMutablePath()
        path.move(to: flip(from))
        path.addQuadCurve(to: flip(to), control: flip(control))
        n.isHidden = false
        n.position = .zero
        n.path = path
        n.fillColor = .clear
        n.strokeColor = color
        n.lineWidth = width
        n.lineCap = .round
        n.alpha = alpha
    }

    func strokeCubic(from: CGPoint, c1: CGPoint, c2: CGPoint, to: CGPoint, color: UIColor, width: CGFloat, alpha: CGFloat) {
        guard si < strokes.count else { return }
        let n = strokes[si]
        si += 1
        let path = CGMutablePath()
        path.move(to: flip(from))
        path.addCurve(to: flip(to), control1: flip(c1), control2: flip(c2))
        n.isHidden = false
        n.position = .zero
        n.path = path
        n.fillColor = .clear
        n.strokeColor = color
        n.lineWidth = width
        n.lineCap = .round
        n.alpha = alpha
    }

    func strokeLine(from: CGPoint, to: CGPoint, color: UIColor, width: CGFloat, alpha: CGFloat) {
        guard si < strokes.count else { return }
        let n = strokes[si]
        si += 1
        let path = CGMutablePath()
        path.move(to: flip(from))
        path.addLine(to: flip(to))
        n.isHidden = false
        n.position = .zero
        n.path = path
        n.fillColor = .clear
        n.strokeColor = color
        n.lineWidth = width
        n.lineCap = .round
        n.alpha = alpha
    }

    func fillClosed(_ points: [CGPoint], color: UIColor, alpha: CGFloat) {
        guard fi < fills.count, let first = points.first else { return }
        let n = fills[fi]
        fi += 1
        let path = CGMutablePath()
        path.move(to: flip(first))
        for p in points.dropFirst() { path.addLine(to: flip(p)) }
        path.closeSubpath()
        n.isHidden = false
        n.position = .zero
        n.path = path
        n.fillColor = color
        n.strokeColor = .clear
        n.alpha = alpha
    }

    func strokeClosed(_ points: [CGPoint], color: UIColor, alpha: CGFloat, width: CGFloat) {
        guard si < strokes.count, let first = points.first else { return }
        let n = strokes[si]
        si += 1
        let path = CGMutablePath()
        path.move(to: flip(first))
        for p in points.dropFirst() { path.addLine(to: flip(p)) }
        path.closeSubpath()
        n.isHidden = false
        n.position = .zero
        n.path = path
        n.fillColor = .clear
        n.strokeColor = color
        n.lineWidth = width
        n.alpha = alpha
    }
}

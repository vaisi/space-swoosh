// PlaytestDraw.swift
// Ink kills. Ink30 dashed is the tell: spinner arcs, blink hollow, meteor
// ghosts, tunnel lining, lightning reach.
// Changes:
// - Dashes are a dashed CGPath. SKShapeNode has no lineDashPattern.
// - Created file: screen-space shapes for the nine new obstacles.

import SpriteKit
import CoreGraphics

enum PlaytestDraw {
    static func render(into layer: SKNode, world: WorldState, cameraY: CGFloat, sceneHeight: CGFloat) {
        layer.removeAllChildren()
        let screenY = sceneHeight * CinematicFlight.cruiseSeat
        func sy(_ y: CGFloat) -> CGFloat { screenY + (y - cameraY) }
        let ink = BrandColors.UI.ink
        let ink30 = BrandColors.UI.ink30
        let u = world.baseUnit

        for (index, o) in world.obstacles.enumerated() where o.active && PlaytestHazards.owns(o.kind) {
            switch o.kind {
            case .spinner:
                drawSpinner(layer, o, sy: sy, ink: ink, ink30: ink30)
            case .hollowOrbit:
                drawHollow(layer, o, sy: sy, ink: ink)
            case .ricochet:
                drawRicochet(layer, o, sy: sy, ink: ink)
            case .blinkRow:
                drawBlink(layer, o, world: world, sy: sy, ink: ink, ink30: ink30, u: u)
            case .tunnelField:
                drawTunnel(layer, world: world, index: index, sy: sy, ink: ink, ink30: ink30, u: u)
            case .shoal:
                drawCircles(layer, world: world, index: index, tag: HazardTag.fish, sy: sy, ink: ink)
            case .satDebris:
                drawSat(layer, world: world, index: index, sy: sy, ink: ink, u: u)
            case .lightning:
                drawLightning(layer, world: world, index: index, o: o, sy: sy, ink: ink, ink30: ink30, u: u)
            case .meteorShower:
                drawMeteor(layer, world: world, index: index, o: o, sy: sy, ink: ink, ink30: ink30, u: u)
            default:
                break
            }
        }
    }

    private static func drawSpinner(_ layer: SKNode, _ o: ObstacleState, sy: (CGFloat) -> CGFloat, ink: UIColor, ink30: UIColor) {
        let node = SKNode()
        node.position = CGPoint(x: o.x, y: sy(o.y))
        node.zRotation = o.rotation
        let length = o.halfH
        let dir: CGFloat = o.spin < 0 ? -1 : 1
        let sweep = SKShapeNode()
        let path = CGMutablePath()
        let slices = 7
        let rings = 4
        let span: CGFloat = 0.95
        let step = span / CGFloat(slices)
        for s in 0..<slices {
            let near = -dir * CGFloat(s) * step
            let far = -dir * CGFloat(s + 1) * step
            let from = min(near, far)
            let to = max(near, far)
            for k in 1...rings {
                let r = length * (0.4 + (0.6 * CGFloat(k)) / CGFloat(rings))
                path.addArc(center: .zero, radius: r, startAngle: from, endAngle: to, clockwise: false)
            }
        }
        sweep.path = path
        sweep.strokeColor = ink30
        sweep.lineWidth = max(1.25, o.halfW * 0.9)
        sweep.fillColor = .clear
        sweep.alpha = 0.7
        node.addChild(sweep)
        let hand = SKShapeNode(rect: CGRect(x: 0, y: -o.halfW, width: length, height: o.halfW * 2))
        hand.fillColor = ink
        hand.strokeColor = .clear
        node.addChild(hand)
        let hub = SKShapeNode(circleOfRadius: o.moonSize)
        hub.fillColor = ink
        hub.strokeColor = .clear
        node.addChild(hub)
        layer.addChild(node)
    }

    private static func drawHollow(_ layer: SKNode, _ o: ObstacleState, sy: (CGFloat) -> CGFloat, ink: UIColor) {
        for i in 0..<2 {
            let a = o.rotation + CGFloat(i) * .pi
            let dot = SKShapeNode(circleOfRadius: o.moonSize)
            dot.position = CGPoint(x: o.x + cos(a) * o.moonDist, y: sy(o.y + sin(a) * o.moonDist))
            dot.fillColor = ink
            dot.strokeColor = .clear
            layer.addChild(dot)
        }
    }

    private static func drawRicochet(_ layer: SKNode, _ o: ObstacleState, sy: (CGFloat) -> CGFloat, ink: UIColor) {
        let heading = atan2(o.driftDir, o.vx)
        let path = CGMutablePath()
        for i in 0..<3 {
            let a = heading + (CGFloat(i) * 2 * .pi) / 3
            let p = CGPoint(x: o.x + cos(a) * o.radius, y: sy(o.y + sin(a) * o.radius))
            if i == 0 { path.move(to: p) } else { path.addLine(to: p) }
        }
        path.closeSubpath()
        let node = SKShapeNode(path: path)
        node.fillColor = ink
        node.strokeColor = .clear
        layer.addChild(node)
    }

    private static func drawBlink(_ layer: SKNode, _ o: ObstacleState, world: WorldState, sy: (CGFloat) -> CGFloat, ink: UIColor, ink30: UIColor, u: CGFloat) {
        let hollow = PlaytestHazards.hollowIndex(o)
        let lanes = PlaytestHazards.blinkLanes(o, width: world.width)
        for (i, x) in lanes.enumerated() {
            if i == hollow {
                let circle = CGPath(
                    ellipseIn: CGRect(x: -o.radius, y: -o.radius, width: o.radius * 2, height: o.radius * 2),
                    transform: nil
                )
                let node = SKShapeNode(path: dashed(circle, dash: o.radius * 0.38, gap: o.radius * 0.24))
                node.position = CGPoint(x: x, y: sy(o.y))
                node.fillColor = .clear
                node.strokeColor = ink30
                node.lineWidth = max(1.25, u * 0.08)
                layer.addChild(node)
            } else {
                let node = SKShapeNode(circleOfRadius: o.radius)
                node.position = CGPoint(x: x, y: sy(o.y))
                node.fillColor = ink
                node.strokeColor = .clear
                layer.addChild(node)
            }
        }
    }

    private static func drawTunnel(_ layer: SKNode, world: WorldState, index: Int, sy: (CGFloat) -> CGFloat, ink: UIColor, ink30: UIColor, u: CGFloat) {
        let solid = CGMutablePath()
        let soft = CGMutablePath()
        for part in world.parts where part.active && part.parent == index && part.tag == HazardTag.pebble {
            let path = part.lethal ? solid : soft
            addBlob(path, x: part.x, y: sy(part.y), r: part.a, square: part.b > 0, rot: part.rot)
        }
        let fill = SKShapeNode(path: solid)
        fill.fillColor = ink
        fill.strokeColor = .clear
        layer.addChild(fill)
        let dash = SKShapeNode(path: dashed(soft, dash: u * 0.32, gap: u * 0.22))
        dash.fillColor = .clear
        dash.strokeColor = ink30
        dash.lineWidth = max(1.1, u * 0.08)
        layer.addChild(dash)
    }

    private static func drawCircles(_ layer: SKNode, world: WorldState, index: Int, tag: Int, sy: (CGFloat) -> CGFloat, ink: UIColor) {
        let path = CGMutablePath()
        for part in world.parts where part.active && part.parent == index && part.tag == tag {
            path.addEllipse(in: CGRect(x: part.x - part.a, y: sy(part.y) - part.a, width: part.a * 2, height: part.a * 2))
        }
        let node = SKShapeNode(path: path)
        node.fillColor = ink
        node.strokeColor = .clear
        layer.addChild(node)
    }

    private static func drawSat(_ layer: SKNode, world: WorldState, index: Int, sy: (CGFloat) -> CGFloat, ink: UIColor, u: CGFloat) {
        let rects = PlaytestHazards.satRects(world: world, index: index)
        let path = CGMutablePath()
        for p in rects {
            addRect(path, cx: p.x, cy: sy(p.y), rot: p.rot, hw: p.hw, hh: p.hh)
        }
        let body = SKShapeNode(path: path)
        body.fillColor = ink
        body.strokeColor = .clear
        layer.addChild(body)
        if world.obstacles[index].moonCount == 0, rects.count >= 3 {
            let arms = CGMutablePath()
            arms.move(to: CGPoint(x: rects[1].x, y: sy(rects[1].y)))
            arms.addLine(to: CGPoint(x: rects[0].x, y: sy(rects[0].y)))
            arms.addLine(to: CGPoint(x: rects[2].x, y: sy(rects[2].y)))
            let line = SKShapeNode(path: arms)
            line.strokeColor = ink
            line.lineWidth = max(1.2, u * 0.18)
            layer.addChild(line)
        }
    }

    private static func drawLightning(_ layer: SKNode, world: WorldState, index: Int, o: ObstacleState, sy: (CGFloat) -> CGFloat, ink: UIColor, ink30: UIColor, u: CGFloat) {
        let phase = PlaytestHazards.lightningPhase(o)
        if phase == "idle" || phase == "rest" { return }
        if phase == "warn" {
            let k = o.bloomDuration > 0 ? o.shotCooldown / o.bloomDuration : 1
            let reach = SKShapeNode()
            let path = CGMutablePath()
            path.move(to: CGPoint(x: o.x, y: sy(o.y)))
            path.addLine(to: CGPoint(x: o.x - o.originX * o.displaySpread, y: sy(o.y)))
            reach.path = dashed(path, dash: u * 0.4, gap: u * 0.6)
            reach.strokeColor = ink30
            reach.lineWidth = max(1, u * 0.08)
            reach.alpha = k
            layer.addChild(reach)
            let glow = SKShapeNode(circleOfRadius: u * (2.5 + k * 3))
            glow.position = CGPoint(x: o.x, y: sy(o.y))
            glow.fillColor = ink30
            glow.strokeColor = .clear
            glow.alpha = 0.35 * k
            layer.addChild(glow)
            return
        }
        let alpha: CGFloat = phase == "strike" ? 1 : max(0, 1 - (o.shotCooldown - o.bloomDuration - 0.22) / 0.18)
        strokeChain(layer, world: world, index: index, tag: HazardTag.bolt, sy: sy, color: ink30, width: u * 0.6, alpha: alpha)
        strokeChain(layer, world: world, index: index, tag: HazardTag.branch, sy: sy, color: ink30, width: u * 0.4, alpha: alpha)
        strokeChain(layer, world: world, index: index, tag: HazardTag.bolt, sy: sy, color: ink, width: u * 0.36, alpha: alpha)
        strokeChain(layer, world: world, index: index, tag: HazardTag.branch, sy: sy, color: ink, width: u * 0.24, alpha: alpha)
    }

    private static func drawMeteor(_ layer: SKNode, world: WorldState, index: Int, o: ObstacleState, sy: (CGFloat) -> CGFloat, ink: UIColor, ink30: UIColor, u: CGFloat) {
        let speed = max(1, hypot(o.vx, o.driftDir))
        let ghosts = CGMutablePath()
        let glen = u * 3.5 * 2.4
        let gx = (o.vx / speed) * glen
        let gy = (o.driftDir / speed) * glen
        for part in world.parts where part.active && part.parent == index && part.tag == HazardTag.ghost {
            let y = sy(part.y)
            ghosts.move(to: CGPoint(x: part.x, y: y))
            ghosts.addLine(to: CGPoint(x: part.x - gx, y: y - gy))
        }
        let ghost = SKShapeNode(path: dashed(ghosts, dash: u * 0.45, gap: u * 0.55))
        ghost.strokeColor = ink30
        ghost.lineWidth = max(1.25, o.baseRadius * 0.65)
        ghost.lineCap = .butt
        layer.addChild(ghost)

        let streaks = CGMutablePath()
        let dots = CGMutablePath()
        let slen = u * 3.5
        let sx = (o.vx / speed) * slen
        let syLen = (o.driftDir / speed) * slen
        for part in world.parts where part.active && part.parent == index && part.tag == HazardTag.meteor {
            let y = sy(part.y)
            streaks.move(to: CGPoint(x: part.x, y: y))
            streaks.addLine(to: CGPoint(x: part.x - sx, y: y - syLen))
            dots.addEllipse(in: CGRect(x: part.x - part.a, y: y - part.a, width: part.a * 2, height: part.a * 2))
        }
        let streak = SKShapeNode(path: streaks)
        streak.strokeColor = ink30
        streak.lineWidth = o.baseRadius * 1.1
        streak.lineCap = .round
        layer.addChild(streak)
        let rock = SKShapeNode(path: dots)
        rock.fillColor = ink
        rock.strokeColor = .clear
        layer.addChild(rock)
    }

    private static func strokeChain(_ layer: SKNode, world: WorldState, index: Int, tag: Int, sy: (CGFloat) -> CGFloat, color: UIColor, width: CGFloat, alpha: CGFloat) {
        let path = CGMutablePath()
        if tag == HazardTag.branch {
            let pts = world.parts.filter { $0.active && $0.parent == index && $0.tag == tag }
            let groups = Dictionary(grouping: pts, by: { Int($0.c) })
            for group in groups.values {
                let ordered = group.sorted { $0.d < $1.d }
                guard let first = ordered.first else { continue }
                path.move(to: CGPoint(x: first.x, y: sy(first.y)))
                for p in ordered.dropFirst() { path.addLine(to: CGPoint(x: p.x, y: sy(p.y))) }
            }
        } else {
            let ordered = world.parts.filter { $0.active && $0.parent == index && $0.tag == tag }.sorted { $0.c < $1.c }
            guard let first = ordered.first else { return }
            path.move(to: CGPoint(x: first.x, y: sy(first.y)))
            for p in ordered.dropFirst() { path.addLine(to: CGPoint(x: p.x, y: sy(p.y))) }
        }
        let node = SKShapeNode(path: path)
        node.strokeColor = color
        node.lineWidth = width
        node.lineCap = .round
        node.lineJoin = .round
        node.alpha = alpha
        layer.addChild(node)
    }

    private static func dashed(_ path: CGPath, dash: CGFloat, gap: CGFloat) -> CGPath {
        path.copy(dashingWithPhase: 0, lengths: [dash, gap])
    }

    private static func addBlob(_ path: CGMutablePath, x: CGFloat, y: CGFloat, r: CGFloat, square: Bool, rot: CGFloat) {
        if !square {
            path.addEllipse(in: CGRect(x: x - r, y: y - r, width: r * 2, height: r * 2))
            return
        }
        let k = r * 0.92
        for n in 0..<4 {
            let a = rot + (CGFloat(n) * .pi) / 2
            let p = CGPoint(x: x + cos(a) * k * 1.4142, y: y + sin(a) * k * 1.4142)
            if n == 0 { path.move(to: p) } else { path.addLine(to: p) }
        }
        path.closeSubpath()
    }

    private static func addRect(_ path: CGMutablePath, cx: CGFloat, cy: CGFloat, rot: CGFloat, hw: CGFloat, hh: CGFloat) {
        let c = cos(rot)
        let s = sin(rot)
        let corners: [(CGFloat, CGFloat)] = [(-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)]
        for (i, corner) in corners.enumerated() {
            let p = CGPoint(x: cx + corner.0 * c - corner.1 * s, y: cy + corner.0 * s + corner.1 * c)
            if i == 0 { path.move(to: p) } else { path.addLine(to: p) }
        }
        path.closeSubpath()
    }
}

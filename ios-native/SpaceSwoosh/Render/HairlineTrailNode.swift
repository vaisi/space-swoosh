// HairlineTrailNode.swift
// Changes: Android drawHairlineTrail — one reused stroke path (Needle / Trace).

import SpriteKit

final class HairlineTrailNode: SKNode, SkinTrail {
    var node: SKNode { self }

    private let stroke: SKShapeNode
    private let maxPoints: Int
    private let skin: SkinDef

    init(maxPoints: Int, skin: SkinDef) {
        self.maxPoints = max(maxPoints, 3)
        self.skin = skin
        stroke = SKShapeNode()
        super.init()
        stroke.lineWidth = 1
        stroke.lineCap = .round
        stroke.lineJoin = .round
        stroke.fillColor = .clear
        stroke.strokeColor = BrandColors.UI.ink
        stroke.isAntialiased = true
        stroke.zPosition = 5
        addChild(stroke)
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let screenY: (CGFloat) -> CGFloat = { ctx.sceneHeight * CinematicFlight.cruiseSeat + ($0 - ctx.cameraY) }
        let live = WallJelly.isLive(elapsedMs: ctx.jellyElapsedMs, mode: skin.wallTrailMode)
        let n = min(ctx.trail.count, maxPoints)
        guard n >= 2 else {
            stroke.path = nil
            stroke.isHidden = true
            return
        }
        let denom = CGFloat(max(n - 1, 1))
        let path = CGMutablePath()
        for i in 0..<n {
            let src = ctx.trail[i]
            let along = n <= 1 ? 1 : CGFloat(i) / denom
            var x = src.x
            var y = src.y
            if live {
                let d = WallJelly.deform(
                    mode: skin.wallTrailMode,
                    elapsedMs: ctx.jellyElapsedMs,
                    along: along,
                    side: ctx.jellySide,
                    radius: ctx.shipRadius,
                    seed: src.seed
                )
                x += d.dx
                y += d.dy
            }
            let p = CGPoint(x: x, y: screenY(y))
            if i == 0 { path.move(to: p) } else { path.addLine(to: p) }
        }
        stroke.path = path
        stroke.lineWidth = max(1, ctx.shipRadius * 0.09 * skin.trailWidthScale)
        stroke.strokeColor = BrandColors.UI.ink
        stroke.alpha = skin.trailAlpha
        stroke.isHidden = false
    }
}

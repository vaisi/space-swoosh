// PopupField.swift
// Changes: Screen origin uses CinematicFlight.cruiseSeat.

import SpriteKit
import UIKit

final class PopupField: SKNode {
    private let nodes: [SKSpriteNode]
    private let fuelTex: SKTexture
    private let boopTex: SKTexture
    private let smashTex: SKTexture
    private let swooshTex: SKTexture

    override init() {
        fuelTex = Self.labelTexture("+FUEL", color: BrandColors.UI.signal, size: 28)
        boopTex = Self.labelTexture("BOOP", color: BrandColors.UI.ink, size: 22)
        smashTex = Self.labelTexture("+1", color: BrandColors.UI.ink, size: 26)
        swooshTex = Self.labelTexture("SWOOSH  +15", color: BrandColors.UI.signal, size: 22)
        var built: [SKSpriteNode] = []
        for _ in 0..<FloatPopupBuffer.capacity {
            let node = SKSpriteNode(texture: fuelTex)
            node.isHidden = true
            node.zPosition = 20
            built.append(node)
        }
        nodes = built
        super.init()
        for node in nodes { addChild(node) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func sync(popups: [FloatPopup], cameraY: CGFloat, sceneHeight: CGFloat, baseUnit: CGFloat) {
        let screenY = sceneHeight * CinematicFlight.cruiseSeat
        for i in 0..<nodes.count {
            let node = nodes[i]
            guard i < popups.count, popups[i].active else {
                node.isHidden = true
                continue
            }
            let p = popups[i]
            switch p.kind {
            case .fuel: node.texture = fuelTex
            case .boop: node.texture = boopTex
            case .smash: node.texture = smashTex
            case .swoosh: node.texture = swooshTex
            }
            let h: CGFloat
            switch p.kind {
            case .fuel: h = baseUnit * 1.4
            case .boop: h = max(11, baseUnit * 1.05)
            case .smash: h = baseUnit * 1.2
            case .swoosh: h = baseUnit * 1.35
            }
            let aspect = (node.texture?.size().width ?? 1) / max(node.texture?.size().height ?? 1, 1)
            node.size = CGSize(width: h * aspect, height: h)
            node.position = CGPoint(x: p.x, y: screenY + (p.y - cameraY))
            node.alpha = max(0, p.opacity)
            node.isHidden = false
        }
    }

    private static func labelTexture(_ text: String, color: UIColor, size: CGFloat) -> SKTexture {
        let font = UIFont.monospacedSystemFont(ofSize: size, weight: .bold)
        let attrs: [NSAttributedString.Key: Any] = [
            .font: font,
            .foregroundColor: color,
            .kern: size * 0.12,
        ]
        let measured = (text as NSString).size(withAttributes: attrs)
        let pad: CGFloat = 8
        let bounds = CGSize(width: ceil(measured.width + pad * 2), height: ceil(measured.height + pad))
        let renderer = UIGraphicsImageRenderer(size: bounds)
        let image = renderer.image { _ in
            (text as NSString).draw(
                at: CGPoint(x: pad, y: pad * 0.4),
                withAttributes: attrs
            )
        }
        let texture = SKTexture(image: image)
        texture.filteringMode = .linear
        return texture
    }
}

final class BlastField: SKNode {
    private let nodes: [SKSpriteNode]

    init(texture: SKTexture) {
        var built: [SKSpriteNode] = []
        for _ in 0..<BlastBuffer.count {
            let node = SKSpriteNode(texture: texture)
            node.isHidden = true
            node.zPosition = 18
            built.append(node)
        }
        nodes = built
        super.init()
        for node in nodes { addChild(node) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func sync(particles: [BlastParticle], cameraY: CGFloat, sceneHeight: CGFloat) {
        let screenY = sceneHeight * CinematicFlight.cruiseSeat
        for i in 0..<nodes.count {
            let node = nodes[i]
            guard i < particles.count, particles[i].active else {
                node.isHidden = true
                continue
            }
            let p = particles[i]
            node.isHidden = false
            node.position = CGPoint(x: p.x, y: screenY + (p.y - cameraY))
            node.size = CGSize(width: p.size * 2, height: p.size * 2)
            node.alpha = max(0, p.opacity)
        }
    }
}

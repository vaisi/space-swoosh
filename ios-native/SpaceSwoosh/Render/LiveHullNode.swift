// LiveHullNode.swift
// Changes: 16 skipHullCache hulls — reused sprites/shapes, path/positions only.

import SpriteKit

final class LiveHullNode: SKNode {
    private let body: SKSpriteNode
    private let glow: SKSpriteNode
    private let core: SKSpriteNode
    private let motes: [SKSpriteNode]
    private let extras: [SKShapeNode]
    private let kind: HullKind
    private let disc: SKTexture
    private let ring: SKTexture

    init(kind: HullKind, bodyTexture: SKTexture, disc: SKTexture, ring: SKTexture, glow: SKTexture) {
        self.kind = kind
        self.disc = disc
        self.ring = ring
        body = SKSpriteNode(texture: bodyTexture)
        body.anchorPoint = CGPoint(x: 0.5, y: 0.5)
        body.zPosition = 10
        self.glow = SKSpriteNode(texture: glow)
        self.glow.anchorPoint = CGPoint(x: 0.5, y: 0.5)
        self.glow.zPosition = 9.4
        self.glow.blendMode = .alpha
        core = SKSpriteNode(texture: disc)
        core.anchorPoint = CGPoint(x: 0.5, y: 0.5)
        core.zPosition = 10.4
        core.colorBlendFactor = 1
        var moteList: [SKSpriteNode] = []
        for _ in 0..<8 {
            let n = SKSpriteNode(texture: disc)
            n.anchorPoint = CGPoint(x: 0.5, y: 0.5)
            n.zPosition = 10.6
            n.colorBlendFactor = 1
            n.isHidden = true
            moteList.append(n)
        }
        motes = moteList
        var extraList: [SKShapeNode] = []
        for i in 0..<6 {
            let n = SKShapeNode()
            n.lineWidth = 1.5
            n.fillColor = .clear
            n.strokeColor = BrandColors.UI.lanternTeal
            n.zPosition = 10.2
            n.isHidden = true
            n.isAntialiased = true
            extraList.append(n)
            _ = i
        }
        extras = extraList
        super.init()
        addChild(self.glow)
        addChild(body)
        addChild(core)
        for n in motes { addChild(n) }
        for n in extras { addChild(n) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func present(radius: CGFloat, pad: CGFloat, stretch: CGFloat, jelly: HullJelly, alpha: CGFloat, nowMs: CGFloat) {
        let r = radius * 0.95
        body.size = CGSize(width: pad, height: pad)
        body.alpha = alpha
        body.yScale = stretch
        let pulse = 0.82 + 0.18 * sin(nowMs * 0.0062)
        glow.isHidden = false
        glow.alpha = alpha * 0.22
        glow.size = CGSize(width: pad * 1.15, height: pad * 1.15 * stretch)
        glow.color = accentA
        glow.colorBlendFactor = 1

        core.isHidden = false
        core.color = accentB
        core.position = CGPoint(x: 0, y: r * 0.02)
        core.size = CGSize(width: r * 0.44 * pulse, height: r * 0.44 * pulse)
        core.alpha = alpha * pulse

        for n in extras { n.isHidden = true }
        for n in motes { n.isHidden = true }

        switch kind {
        case .bell:
            lantern(r: r, stretch: stretch, alpha: alpha, nowMs: nowMs, pulse: pulse)
        case .bloom:
            bloom(r: r, stretch: stretch, alpha: alpha, nowMs: nowMs)
        case .star:
            lyra(r: r, stretch: stretch, alpha: alpha, nowMs: nowMs, pulse: pulse)
        case .seed:
            sprout(r: r, stretch: stretch, alpha: alpha, nowMs: nowMs, pulse: pulse)
        case .wing:
            plume(r: r, stretch: stretch, alpha: alpha, nowMs: nowMs)
        case .koi:
            koi(r: r, stretch: stretch, alpha: alpha, nowMs: nowMs)
        case .cap:
            spore(r: r, stretch: stretch, alpha: alpha, nowMs: nowMs, pulse: pulse)
        case .curtain:
            boreal(r: r, stretch: stretch, alpha: alpha, nowMs: nowMs)
        case .moth:
            luna(r: r, stretch: stretch, alpha: alpha, nowMs: nowMs)
        case .wish:
            wish(r: r, stretch: stretch, alpha: alpha, nowMs: nowMs, pulse: pulse)
        case .darner:
            darner(r: r, stretch: stretch, alpha: alpha, nowMs: nowMs)
        case .puff:
            puff(r: r, stretch: stretch, alpha: alpha, nowMs: nowMs)
        case .argus:
            argus(r: r, stretch: stretch, alpha: alpha, nowMs: nowMs)
        case .chime:
            chime(r: r, stretch: stretch, alpha: alpha, nowMs: nowMs, pulse: pulse)
        default:
            core.isHidden = true
            glow.isHidden = true
        }
        xScale = jelly.sx
        yScale = jelly.sy
        _ = jelly.shear
    }

    private var accentA: UIColor { BrandColors.UI.lanternTeal }
    private var accentB: UIColor { BrandColors.UI.lanternGold }

    private func lantern(r: CGFloat, stretch: CGFloat, alpha: CGFloat, nowMs: CGFloat, pulse: CGFloat) {
        core.color = BrandColors.UI.lanternGold
        let spots: [(CGFloat, CGFloat, CGFloat)] = [(0.32, 0.18, 0.07), (0, 0.28, 0.06), (-0.3, 0.12, 0.07)]
        for i in 0..<spots.count {
            let n = motes[i]
            n.isHidden = false
            n.texture = disc
            n.position = CGPoint(x: spots[i].0 * r, y: spots[i].1 * r * stretch)
            n.size = CGSize(width: spots[i].2 * r * 2, height: spots[i].2 * r * 2)
            n.color = i == 1 ? BrandColors.UI.lanternGold : BrandColors.UI.lanternTeal
            n.alpha = alpha
        }
        for i in 0..<5 {
            let extra = extras[i]
            extra.isHidden = false
            let phase = CGFloat(i) * 1.1
            let sway = sin(nowMs * 0.0042 + phase) * r * 0.22
            let len = r * (0.52 + 0.14 * sin(nowMs * 0.0031 + phase * 0.7))
            let x0 = CGFloat(i - 2) * r * 0.16
            let y0 = r * 0.28 * stretch
            let path = CGMutablePath()
            path.move(to: CGPoint(x: x0, y: y0))
            path.addQuadCurve(to: CGPoint(x: x0 + sway * 0.35, y: y0 + len), control: CGPoint(x: x0 + sway, y: y0 + len * 0.55))
            extra.path = path
            extra.strokeColor = i % 2 == 0 ? BrandColors.UI.lanternTeal : BrandColors.UI.lanternGold
            extra.lineWidth = max(1, r * 0.055)
            extra.alpha = alpha * 0.7
            extra.fillColor = .clear
        }
        _ = pulse
    }

    private func bloom(r: CGFloat, stretch: CGFloat, alpha: CGFloat, nowMs: CGFloat) {
        core.isHidden = true
        let palette = [
            UIColor(red: 1, green: 140 / 255, blue: 180 / 255, alpha: 1),
            UIColor(red: 120 / 255, green: 220 / 255, blue: 190 / 255, alpha: 1),
            UIColor(red: 180 / 255, green: 150 / 255, blue: 1, alpha: 1)
        ]
        for i in 0..<3 {
            let extra = extras[i]
            extra.isHidden = false
            let satR = r * (1.12 + CGFloat(i) * 0.2)
            extra.path = CGPath(ellipseIn: CGRect(x: -satR * 0.16, y: -satR * 0.16, width: satR * 0.32, height: satR * 0.32), transform: nil)
            let a = nowMs * (0.0022 - CGFloat(i) * 0.0004) + CGFloat(i) * 2.1
            extra.position = CGPoint(x: cos(a) * satR * 0.55, y: sin(a) * satR * 0.38 * stretch)
            extra.strokeColor = palette[i]
            extra.lineWidth = max(1, r * 0.04)
            extra.alpha = alpha * 0.85
        }
    }

    private func lyra(r: CGFloat, stretch: CGFloat, alpha: CGFloat, nowMs: CGFloat, pulse: CGFloat) {
        core.color = BrandColors.UI.signal
        core.size = CGSize(width: r * 0.28 * pulse, height: r * 0.28 * pulse)
        for i in 0..<4 {
            let n = motes[i]
            n.isHidden = false
            let a = nowMs * 0.0028 + CGFloat(i) * (.pi / 2)
            n.position = CGPoint(x: cos(a) * r * 0.55, y: sin(a) * r * 0.4 * stretch)
            n.size = CGSize(width: r * 0.1, height: r * 0.1)
            n.color = i % 2 == 0 ? BrandColors.UI.signal : BrandColors.UI.lanternGold
            n.alpha = alpha * (0.55 + 0.45 * sin(nowMs * 0.008 + CGFloat(i)))
        }
    }

    private func sprout(r: CGFloat, stretch: CGFloat, alpha: CGFloat, nowMs: CGFloat, pulse: CGFloat) {
        core.color = UIColor(red: 90 / 255, green: 160 / 255, blue: 70 / 255, alpha: 1)
        core.size = CGSize(width: r * 0.32 * pulse, height: r * 0.32 * pulse)
        for i in 0..<3 {
            let n = motes[i]
            n.isHidden = false
            n.position = CGPoint(x: CGFloat(i - 1) * r * 0.22, y: r * 0.35 * stretch + sin(nowMs * 0.004 + CGFloat(i)) * r * 0.08)
            n.size = CGSize(width: r * 0.08, height: r * 0.08)
            n.color = BrandColors.UI.lanternGold
            n.alpha = alpha * 0.8
        }
    }

    private func plume(r: CGFloat, stretch: CGFloat, alpha: CGFloat, nowMs: CGFloat) {
        core.color = BrandColors.UI.lanternGold
        for i in 0..<4 {
            let extra = extras[i]
            extra.isHidden = false
            let flip: CGFloat = i < 2 ? -1 : 1
            let span = r * (0.7 + 0.08 * sin(nowMs * 0.005 + CGFloat(i)))
            let path = CGMutablePath()
            path.move(to: .zero)
            path.addQuadCurve(to: CGPoint(x: flip * span, y: r * 0.12 * stretch), control: CGPoint(x: flip * span * 0.5, y: -r * 0.35 * stretch))
            extra.path = path
            extra.strokeColor = i % 2 == 0 ? BrandColors.UI.lanternGold : UIColor(red: 1, green: 90 / 255, blue: 40 / 255, alpha: 1)
            extra.lineWidth = max(1, r * 0.05)
            extra.alpha = alpha * 0.7
        }
    }

    private func koi(r: CGFloat, stretch: CGFloat, alpha: CGFloat, nowMs: CGFloat) {
        core.color = UIColor(red: 200 / 255, green: 70 / 255, blue: 70 / 255, alpha: 1)
        core.position = CGPoint(x: 0, y: -r * 0.15 * stretch)
        for i in 0..<3 {
            let n = motes[i]
            n.isHidden = false
            n.position = CGPoint(x: CGFloat(i - 1) * r * 0.16, y: r * 0.1 * stretch)
            n.size = CGSize(width: r * 0.1, height: r * 0.08)
            n.color = i == 1 ? BrandColors.UI.ink : UIColor(red: 200 / 255, green: 70 / 255, blue: 70 / 255, alpha: 1)
            n.alpha = alpha * (0.6 + 0.3 * sin(nowMs * 0.006 + CGFloat(i)))
        }
    }

    private func spore(r: CGFloat, stretch: CGFloat, alpha: CGFloat, nowMs: CGFloat, pulse: CGFloat) {
        core.color = BrandColors.UI.lanternGold
        core.size = CGSize(width: r * 0.36 * pulse, height: r * 0.28 * pulse)
        for i in 0..<4 {
            let n = motes[i]
            n.isHidden = false
            let a = nowMs * 0.0018 + CGFloat(i) * 1.4
            n.position = CGPoint(x: cos(a) * r * 0.7, y: sin(a) * r * 0.25 * stretch)
            n.size = CGSize(width: r * 0.07, height: r * 0.07)
            n.color = BrandColors.UI.lanternGold
            n.alpha = alpha * 0.7
        }
    }

    private func boreal(r: CGFloat, stretch: CGFloat, alpha: CGFloat, nowMs: CGFloat) {
        core.isHidden = true
        for i in 0..<4 {
            let extra = extras[i]
            extra.isHidden = false
            let wave = sin(nowMs * 0.0035 + CGFloat(i) * 0.8) * r * 0.18
            let path = CGMutablePath()
            path.move(to: CGPoint(x: CGFloat(i - 1) * r * 0.08, y: -r * stretch))
            path.addQuadCurve(to: CGPoint(x: wave, y: r * stretch), control: CGPoint(x: wave * 0.5, y: 0))
            extra.path = path
            extra.strokeColor = i % 2 == 0 ? BrandColors.UI.signal : BrandColors.UI.lanternTeal
            extra.lineWidth = max(1.2, r * 0.07)
            extra.alpha = alpha * 0.75
        }
    }

    private func luna(r: CGFloat, stretch: CGFloat, alpha: CGFloat, nowMs: CGFloat) {
        core.color = BrandColors.UI.lanternGold
        for i in 0..<4 {
            let extra = extras[i]
            extra.isHidden = false
            let flip: CGFloat = i % 2 == 0 ? -1 : 1
            let beat = 0.85 + 0.15 * sin(nowMs * 0.006 + CGFloat(i))
            let path = CGMutablePath()
            path.move(to: .zero)
            path.addQuadCurve(
                to: CGPoint(x: flip * r * 0.95 * beat, y: r * 0.15 * stretch),
                control: CGPoint(x: flip * r * 0.55, y: -r * 0.35 * stretch)
            )
            extra.path = path
            extra.strokeColor = BrandColors.UI.ink
            extra.lineWidth = max(1, r * 0.04)
            extra.alpha = alpha * 0.55
        }
    }

    private func wish(r: CGFloat, stretch: CGFloat, alpha: CGFloat, nowMs: CGFloat, pulse: CGFloat) {
        core.color = BrandColors.UI.lanternGold
        core.size = CGSize(width: r * 0.28 * pulse, height: r * 0.28 * pulse)
        for i in 0..<3 {
            let n = motes[i]
            n.isHidden = false
            let a = nowMs * 0.0024 + CGFloat(i) * (.pi * 2 / 3)
            n.position = CGPoint(x: cos(a) * r * 0.55, y: sin(a) * r * 0.38 * stretch)
            n.size = CGSize(width: r * 0.14, height: r * 0.14)
            n.color = BrandColors.UI.lanternGold
            n.alpha = alpha * (0.55 + 0.45 * sin(nowMs * 0.009 + CGFloat(i)))
        }
    }

    private func darner(r: CGFloat, stretch: CGFloat, alpha: CGFloat, nowMs: CGFloat) {
        core.color = BrandColors.UI.lanternTeal
        core.size = CGSize(width: r * 0.12, height: r * 0.12)
        for i in 0..<4 {
            let extra = extras[i]
            extra.isHidden = false
            let flip: CGFloat = i % 2 == 0 ? -1 : 1
            let span = r * (0.85 + 0.08 * sin(nowMs * 0.007 + CGFloat(i)))
            let path = CGMutablePath()
            path.move(to: .zero)
            path.addQuadCurve(to: CGPoint(x: flip * span, y: (i < 2 ? -1 : 1) * r * 0.18 * stretch), control: CGPoint(x: flip * span * 0.45, y: (i < 2 ? -1 : 1) * r * 0.42 * stretch))
            extra.path = path
            extra.strokeColor = i < 2 ? BrandColors.UI.lanternTeal : BrandColors.UI.lanternGold
            extra.lineWidth = max(0.8, r * 0.035)
            extra.alpha = alpha * 0.7
        }
    }

    private func puff(r: CGFloat, stretch: CGFloat, alpha: CGFloat, nowMs: CGFloat) {
        core.color = BrandColors.UI.ink
        core.size = CGSize(width: r * 0.2, height: r * 0.2)
        for i in 0..<6 {
            let n = motes[i]
            n.isHidden = false
            let a = nowMs * 0.0016 + CGFloat(i) * 1.05
            n.position = CGPoint(x: cos(a) * r * 0.55, y: sin(a) * r * 0.45 * stretch)
            n.size = CGSize(width: r * 0.12, height: r * 0.12)
            n.color = BrandColors.UI.ink
            n.alpha = alpha * 0.55
        }
    }

    private func argus(r: CGFloat, stretch: CGFloat, alpha: CGFloat, nowMs: CGFloat) {
        core.color = BrandColors.UI.lanternGold
        for i in 0..<4 {
            let n = motes[i]
            n.isHidden = false
            n.texture = ring
            let a = .pi * 0.25 + CGFloat(i) * 0.4
            n.position = CGPoint(x: cos(a) * r * 0.45 * (i % 2 == 0 ? -1 : 1), y: sin(nowMs * 0.002 + CGFloat(i)) * r * 0.12 + r * 0.15 * stretch)
            n.size = CGSize(width: r * 0.28, height: r * 0.28)
            n.color = BrandColors.UI.lanternTeal
            n.alpha = alpha * 0.8
        }
    }

    private func chime(r: CGFloat, stretch: CGFloat, alpha: CGFloat, nowMs: CGFloat, pulse: CGFloat) {
        core.color = BrandColors.UI.lanternGold
        for i in 0..<3 {
            let extra = extras[i]
            extra.isHidden = false
            let rr = r * (0.35 + CGFloat(i) * 0.22) * pulse
            extra.path = CGPath(ellipseIn: CGRect(x: -rr, y: -rr * stretch * 0.35, width: rr * 2, height: rr * 0.7 * stretch), transform: nil)
            extra.position = .zero
            extra.strokeColor = i == 1 ? BrandColors.UI.lanternGold : BrandColors.UI.ink
            extra.lineWidth = max(1, r * 0.04)
            extra.alpha = alpha * (0.45 + 0.2 * sin(nowMs * 0.006 + CGFloat(i)))
        }
    }
}

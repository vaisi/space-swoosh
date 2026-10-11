// HangarView.swift
// Pre-run ship screen. The center hull is HangarScene stepping ShipSimulator,
// the same flight a run uses. Archive copy is HangarCatalog.
// Changes:
// - Layout matches the 390×844 mock: stage 372, hint inside the stage, a
//   hairline before the copy, copy block 214, ruler 48, Launch inset 16 and
//   as wide as that row. Slack sits above the bar.
// - Ruler ticks match the mock: owned 2×16, locked hollow 4×11, unlisted
//   hollow 4×7, current 3×30 signal, new hull a 5px dot, 12pt gap before
//   the unlisted pair.
// - Locked and unlisted hulls draw in color. The bar still shows the price
//   or Locked, and those hulls still cannot be equipped.

import SwiftUI
import SpriteKit

private let hangarRule = Color(red: 46.0 / 255.0, green: 44.0 / 255.0, blue: 39.0 / 255.0)

struct HangarLiveShip: View {
    let skinId: SkinId
    var allowsTurn: Bool = false
    @State private var scene: HangarScene

    init(skinId: SkinId, allowsTurn: Bool = false) {
        self.skinId = skinId
        self.allowsTurn = allowsTurn
        let scene = HangarScene(size: CGSize(width: 390, height: 372))
        scene.scaleMode = .resizeFill
        scene.backgroundColor = .clear
        _scene = State(initialValue: scene)
    }

    var body: some View {
        SpriteView(scene: scene, options: [.allowsTransparency])
            .onAppear { scene.show(skinId: skinId, live: true) }
            .onChange(of: skinId) { _, id in scene.show(skinId: id, live: true) }
            .onTapGesture { if allowsTurn { scene.flip() } }
    }
}

struct HangarView: View {
    var launch: PlayLaunch
    var onBack: () -> Void
    var onLaunch: (PlayLaunch) -> Void

    @ObservedObject private var settings = SettingsStore.shared
    @ObservedObject private var entitlements = EntitlementsStore.shared
    @State private var index: Int

    init(launch: PlayLaunch, onBack: @escaping () -> Void, onLaunch: @escaping (PlayLaunch) -> Void) {
        self.launch = launch
        self.onBack = onBack
        self.onLaunch = onLaunch
        let start = HangarCatalog.index(of: SettingsStore.shared.shipSkinId)
        _index = State(initialValue: start)
    }

    private var ship: NavShip? {
        guard HangarCatalog.ships.indices.contains(index) else { return nil }
        return HangarCatalog.ships[index]
    }

    private var skinId: SkinId? { ship?.skinId }

    private var owned: Bool {
        guard let skinId, ship?.hidden != true else { return false }
        return entitlements.owns(skinId)
    }

    private var modeLabel: String {
        if case .journey = launch { return "JOURNEY" }
        return "OPEN SPACE"
    }

    var body: some View {
        GeometryReader { geo in
            let k = min(geo.size.width / 390, geo.size.height / 808)
            let colW = 390 * k
            let slack = max(0, geo.size.height - 808 * k)
            VStack(spacing: 0) {
                header(k)
                    .frame(height: 44 * k)
                    .padding(.top, 22 * k)
                stage(k)
                    .frame(width: colW, height: 372 * k)
                    .padding(.top, 6 * k)
                copyBlock(k)
                    .frame(width: colW, height: 214 * k, alignment: .top)
                ruler(k)
                    .frame(width: colW - 32 * k, height: 48 * k)
                Color.clear.frame(height: slack)
                launchButton(k)
                    .padding(.horizontal, 16 * k)
                    .padding(.top, 18 * k)
                    .padding(.bottom, 26 * k)
            }
            .frame(width: colW, height: geo.size.height, alignment: .top)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
        .onAppear {
            HangarCatalog.ensureSeenSeed()
            if let skinId, owned { HangarCatalog.markSeen(skinId) }
        }
        .onChange(of: entitlements.owned) { _, _ in
            if let skinId, owned { HangarCatalog.markSeen(skinId) }
        }
    }

    private func header(_ k: CGFloat) -> some View {
        let file = HangarCatalog.onFile { entitlements.owns($0) }
        return ZStack {
            VStack(spacing: 2 * k) {
                Text(modeLabel)
                    .font(BrandType.mono(10.5 * k, bold: false))
                    .tracking(1.4 * k)
                    .foregroundStyle(BrandColors.ink55)
                Text("The Hangar")
                    .font(BrandType.display(16 * k))
                    .tracking(BrandType.displayTracking(16 * k))
                    .foregroundStyle(BrandColors.ink)
            }
            HStack(alignment: .center) {
                Button(action: onBack) {
                    HangarChevron(direction: -1)
                        .frame(width: 44 * k, height: 44 * k)
                }
                .buttonStyle(.plain)
                Spacer()
                VStack(alignment: .trailing, spacing: 1) {
                    Text("\(file.owned)/\(file.listed)")
                    Text("ON FILE")
                }
                .font(BrandType.mono(10.5 * k, bold: false))
                .foregroundStyle(BrandColors.ink55)
            }
            .padding(.leading, 8 * k)
            .padding(.trailing, 12 * k)
        }
    }

    private func stage(_ k: CGFloat) -> some View {
        ZStack(alignment: .bottom) {
            if let skinId {
                HangarLiveShip(skinId: skinId, allowsTurn: true)
            }
            hint(k)
                .padding(.bottom, 4 * k)
                .padding(.horizontal, 8 * k)
        }
        .contentShape(Rectangle())
        .simultaneousGesture(swipe)
    }

    private func hint(_ k: CGFloat) -> some View {
        HStack(spacing: 8 * k) {
            Button { step(-1) } label: {
                HangarChevron(direction: -1)
                    .frame(width: 36 * k, height: 36 * k)
            }
            .buttonStyle(.plain)
            Spacer(minLength: 4)
            Text("TAP TO TEST  ·  SWIPE TO BROWSE")
                .font(BrandType.mono(10.5 * k, bold: false))
                .tracking(0.8 * k)
                .foregroundStyle(Color(red: 143 / 255, green: 136 / 255, blue: 122 / 255))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Spacer(minLength: 4)
            Button { step(1) } label: {
                HangarChevron(direction: 1)
                    .frame(width: 36 * k, height: 36 * k)
            }
            .buttonStyle(.plain)
        }
    }

    private func copyBlock(_ k: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline) {
                Text((ship.map { HangarCatalog.fileLabel($0) } ?? "Hull ??? / Unlisted").uppercased())
                    .font(BrandType.mono(11 * k, bold: false))
                    .foregroundStyle(BrandColors.ink55)
                Spacer(minLength: 8)
                if let ship, !ship.hidden {
                    Text("FILED AS \(ship.filedAs.uppercased())")
                        .font(BrandType.mono(11 * k, bold: false))
                        .foregroundStyle(BrandColors.signal)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
            }
            Text(ship?.hidden == true ? "Unlisted" : (ship?.name ?? ""))
                .font(BrandType.display(38 * k))
                .tracking(BrandType.displayTracking(38 * k))
                .foregroundStyle(BrandColors.ink)
                .padding(.top, 10 * k)
            if ship?.hidden != true, let note = ship?.archiveNote {
                Text(note)
                    .font(BrandType.body(15 * k))
                    .foregroundStyle(BrandColors.ink55)
                    .lineSpacing(15 * k * 0.5)
                    .multilineTextAlignment(.leading)
                    .lineLimit(4)
                    .padding(.top, 10 * k)
            }
            if let status = entitlements.statusMessage {
                Text(status.uppercased())
                    .font(BrandType.mono(11 * k, bold: false))
                    .foregroundStyle(BrandColors.signal)
                    .padding(.top, 8 * k)
            }
            Spacer(minLength: 0)
        }
        .padding(.top, 14 * k)
        .padding(.horizontal, 26 * k)
        .overlay(alignment: .top) {
            Rectangle()
                .fill(hangarRule)
                .frame(height: 1)
                .padding(.horizontal, 16 * k)
        }
    }

    private func ruler(_ k: CGFloat) -> some View {
        let listed = HangarCatalog.ships.indices.filter { !HangarCatalog.ships[$0].hidden }
        let hidden = HangarCatalog.ships.indices.filter { HangarCatalog.ships[$0].hidden }
        return GeometryReader { geo in
            let width = geo.size.width
            let gap = 12 * k
            let slots = max(1, listed.count + hidden.count)
            let slotW = (width - gap) / CGFloat(slots)
            let dotX = CGFloat(listed.count) * slotW + gap / 2
            ZStack(alignment: .bottom) {
                Canvas { ctx, size in
                    let bottom = size.height
                    func paint(_ rosterIndex: Int, _ x: CGFloat) {
                        guard HangarCatalog.ships.indices.contains(rosterIndex) else { return }
                        let entry = HangarCatalog.ships[rosterIndex]
                        let id = entry.skinId
                        let isOwned = id.map { !entry.hidden && entitlements.owns($0) } ?? false
                        let here = rosterIndex == index
                        var w: CGFloat = 2 * k
                        var h: CGFloat = 16 * k
                        var hollow = false
                        var color = BrandColors.ink.opacity(0.8)
                        if entry.hidden {
                            hollow = true
                            w = 4 * k
                            h = 7 * k
                            color = BrandColors.ink.opacity(0.35)
                        } else if !isOwned {
                            hollow = true
                            w = 4 * k
                            h = 11 * k
                            color = BrandColors.ink.opacity(0.5)
                        }
                        if here {
                            hollow = false
                            w = 3 * k
                            h = 30 * k
                            color = BrandColors.signal
                        }
                        let rect = CGRect(x: x - w / 2, y: bottom - h, width: w, height: h)
                        if hollow {
                            ctx.stroke(Path(rect), with: .color(color), lineWidth: 1)
                        } else {
                            ctx.fill(Path(rect), with: .color(color))
                        }
                        if let id, HangarCatalog.isNew(id) {
                            let dot = 5 * k
                            ctx.fill(
                                Path(ellipseIn: CGRect(x: x - dot / 2, y: 4 * k, width: dot, height: dot)),
                                with: .color(BrandColors.signal)
                            )
                        }
                    }
                    for (slot, rosterIndex) in listed.enumerated() {
                        paint(rosterIndex, CGFloat(slot) * slotW + slotW / 2)
                    }
                    let hiddenOrigin = CGFloat(listed.count) * slotW + gap
                    for (slot, rosterIndex) in hidden.enumerated() {
                        paint(rosterIndex, hiddenOrigin + CGFloat(slot) * slotW + slotW / 2)
                    }
                }
                Rectangle().fill(hangarRule).frame(height: 1)
                Text("·")
                    .font(BrandType.mono(9 * k, bold: false))
                    .foregroundStyle(Color(red: 93 / 255, green: 88 / 255, blue: 79 / 255))
                    .position(x: dotX, y: geo.size.height - 8 * k)
            }
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { value in
                        select(indexFromRuler(value.location.x, width: width, k: k, listed: listed, hidden: hidden))
                    }
            )
        }
    }

    private func indexFromRuler(_ x: CGFloat, width: CGFloat, k: CGFloat, listed: [Int], hidden: [Int]) -> Int {
        let gap = 12 * k
        let slots = max(1, listed.count + hidden.count)
        let slotW = max(1, (width - gap) / CGFloat(slots))
        if x < CGFloat(listed.count) * slotW {
            let slot = min(listed.count - 1, max(0, Int(x / slotW)))
            return listed[slot]
        }
        let local = x - CGFloat(listed.count) * slotW - gap
        if local < 0 || hidden.isEmpty { return index }
        let slot = min(hidden.count - 1, max(0, Int(local / slotW)))
        return hidden[slot]
    }

    private func launchButton(_ k: CGFloat) -> some View {
        let hidden = ship?.hidden == true
        let left: String = {
            if hidden || owned { return "LAUNCH" }
            if let skinId { return (entitlements.priceLabel(for: skinId) ?? "LOCKED").uppercased() }
            return "LOCKED"
        }()
        let right: String = {
            if hidden { return "" }
            return (ship?.name ?? "").uppercased()
        }()
        return Button {
            if let skinId, !hidden, !owned {
                Task { await entitlements.purchase(skinId) }
                return
            }
            if let skinId, owned {
                settings.setShipSkin(skinId)
                HangarCatalog.markSeen(skinId)
            }
            onLaunch(launch)
        } label: {
            HStack {
                Text(left)
                    .font(BrandType.ui(18 * k))
                    .tracking(BrandType.uiTracking(18 * k))
                Spacer()
                if !right.isEmpty {
                    Text(right)
                        .font(BrandType.mono(12 * k, bold: false))
                        .tracking(1.2 * k)
                        .opacity(0.7)
                }
            }
            .foregroundStyle(BrandColors.paper)
            .padding(.horizontal, 20 * k)
            .frame(maxWidth: .infinity)
            .frame(height: 58 * k)
            .background(BrandColors.ink)
            .clipShape(RoundedRectangle(cornerRadius: 6 * k, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private var swipe: some Gesture {
        DragGesture(minimumDistance: 18)
            .onEnded { value in
                let dx = value.translation.width
                guard abs(dx) > 36, abs(dx) > abs(value.translation.height) else { return }
                select(index + (dx < 0 ? 1 : -1))
            }
    }

    private func step(_ delta: Int) {
        select(index + delta)
    }

    private func select(_ next: Int) {
        guard HangarCatalog.ships.indices.contains(next), next != index else { return }
        index = next
        HapticsService.tick()
        if let id = skinId, owned { HangarCatalog.markSeen(id) }
    }
}

private struct HangarChevron: View {
    var direction: CGFloat

    var body: some View {
        Path { path in
            path.move(to: CGPoint(x: direction < 0 ? 18 : 8, y: 8))
            path.addLine(to: CGPoint(x: direction < 0 ? 8 : 18, y: 18))
            path.addLine(to: CGPoint(x: direction < 0 ? 18 : 8, y: 28))
        }
        .stroke(BrandColors.ink55, style: StrokeStyle(lineWidth: 1.7, lineCap: .round, lineJoin: .round))
        .frame(width: 26, height: 36)
    }
}

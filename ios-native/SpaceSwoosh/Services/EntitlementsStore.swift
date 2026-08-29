// EntitlementsStore.swift
// Changes: purchase() refuses hidden roster ships (Merlin, Rook).
// UNLOCK_ALL_SKINS is off; owns() only grants free skins + store entitlements.

import Foundation
import Combine

final class EntitlementsStore: ObservableObject {
    static let shared = EntitlementsStore()

    private static let cacheKey = "ownedSkinIds"

    @Published private(set) var owned: Set<SkinId>
    @Published private(set) var prices: [String: String] = [:]
    @Published var statusMessage: String?
    @Published var busy = false

    private var statusClear: DispatchWorkItem?

    private init() {
        owned = Self.loadCache()
    }

    func owns(_ id: SkinId) -> Bool {
        if SkinCatalog.UNLOCK_ALL_SKINS { return true }
        if SkinCatalog.def(id).productId == nil { return true }
        return owned.contains(id)
    }

    func priceLabel(for id: SkinId) -> String? {
        guard let productId = SkinCatalog.def(id).productId else { return nil }
        return prices[productId]
    }

    func bootstrap() {
        Task { await refreshFromStore() }
    }

    func refreshFromStore() async {
        PurchasesService.configure()
        if let ids = await PurchasesService.entitlementIds() {
            await MainActor.run { apply(entitlementIds: ids) }
        }
        await prefetchPrices()
        await MainActor.run { SettingsStore.shared.ensureEquippedOwned() }
    }

    func purchase(_ id: SkinId) async {
        if SkinCatalog.hidden.contains(id) { return }
        if await MainActor.run(body: { busy }) { return }
        if owns(id) {
            await MainActor.run { SettingsStore.shared.setShipSkin(id) }
            return
        }
        guard let productId = SkinCatalog.def(id).productId else {
            await MainActor.run {
                owned.insert(id)
                persist()
                SettingsStore.shared.setShipSkin(id)
            }
            return
        }

        await MainActor.run {
            busy = true
            setStatus("Contacting store…", persist: true)
        }
        let result = await PurchasesService.purchase(productId: productId)
        await MainActor.run {
            if result.ok {
                if result.entitlementIds.isEmpty {
                    owned.insert(id)
                    persist()
                } else {
                    apply(entitlementIds: result.entitlementIds)
                }
                SettingsStore.shared.setShipSkin(id)
                AnalyticsService.track("purchase_skin", ["skin_id": id.rawValue])
                setStatus("Unlocked.")
            } else if result.cancelled {
                setStatus(nil)
            } else {
                setStatus(result.message ?? "Purchase unavailable.")
            }
            busy = false
        }
    }

    func restore() async {
        if await MainActor.run(body: { busy }) { return }
        await MainActor.run {
            busy = true
            setStatus("Restoring…", persist: true)
        }
        let result = await PurchasesService.restore()
        await MainActor.run {
            if result.ok {
                apply(entitlementIds: result.entitlementIds)
                SettingsStore.shared.ensureEquippedOwned()
                let premium = SkinCatalog.roster.filter { SkinCatalog.def($0).productId != nil && owns($0) }.count
                if premium > 0 {
                    setStatus("Restored \(premium) ship\(premium == 1 ? "" : "s").")
                } else {
                    setStatus("No previous purchases found.")
                }
            } else {
                setStatus(result.message ?? "Restore unavailable.")
            }
            busy = false
        }
    }

    private func apply(entitlementIds: [String]) {
        var next = Set(SkinCatalog.free)
        for id in SkinCatalog.roster {
            let skin = SkinCatalog.def(id)
            if let entitlement = skin.entitlementId, entitlementIds.contains(entitlement) {
                next.insert(id)
            }
        }
        owned = next
        persist()
    }

    private func prefetchPrices() async {
        guard PurchasesService.isAvailable() else { return }
        var next: [String: String] = [:]
        for id in SkinCatalog.roster {
            guard let productId = SkinCatalog.def(id).productId else { continue }
            if let price = await PurchasesService.priceString(productId: productId) {
                next[productId] = price
            }
        }
        let fetched = next
        await MainActor.run { prices = fetched }
    }

    private func persist() {
        let ids = owned.map(\.rawValue)
        UserDefaults.standard.set(ids, forKey: Self.cacheKey)
    }

    private static func loadCache() -> Set<SkinId> {
        var next = Set(SkinCatalog.free)
        let raw = UserDefaults.standard.array(forKey: cacheKey) ?? []
        for value in raw {
            guard let text = value as? String, let id = SkinId(rawValue: text) else { continue }
            next.insert(id)
        }
        return next
    }

    func setStatus(_ message: String?, persist: Bool = false) {
        statusClear?.cancel()
        statusMessage = message
        guard let message, !persist else { return }
        let work = DispatchWorkItem { [weak self] in
            if self?.statusMessage == message {
                self?.statusMessage = nil
            }
        }
        statusClear = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.2, execute: work)
    }
}

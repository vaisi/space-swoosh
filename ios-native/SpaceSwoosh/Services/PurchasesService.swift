// PurchasesService.swift
// Changes: RevenueCat wrapper for cosmetic ship IAPs (Android Purchases.js, skins only).
// Successful buys log GA4 `purchase` (value + currency) for Firebase revenue.

import Foundation
import RevenueCat

struct PurchaseOutcome {
    var ok: Bool
    var cancelled: Bool = false
    var message: String?
    var entitlementIds: [String] = []
}

enum PurchasesService {
    private static var configured = false

    static func apiKey() -> String {
        (Bundle.main.object(forInfoDictionaryKey: "REVENUECAT_IOS_KEY") as? String ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    static func isAvailable() -> Bool {
        configured && !apiKey().isEmpty
    }

    @discardableResult
    static func configure() -> Bool {
        let key = apiKey()
        guard !key.isEmpty else { return false }
        guard !configured else { return true }
        Purchases.configure(withAPIKey: key)
        configured = true
        return true
    }

    static func entitlementIds() async -> [String]? {
        guard isAvailable() else { return nil }
        do {
            let info = try await Purchases.shared.customerInfo()
            return Array(info.entitlements.active.keys)
        } catch {
            print("[purchases] customerInfo failed: \(error.localizedDescription)")
            return nil
        }
    }

    static func purchase(productId: String) async -> PurchaseOutcome {
        guard !apiKey().isEmpty else {
            return PurchaseOutcome(ok: false, message: "Purchases are available in the iOS and Android apps.")
        }
        guard isAvailable() else {
            return PurchaseOutcome(ok: false, message: "Store is not configured yet.")
        }
        guard let package = await findPackage(productId: productId) else {
            return PurchaseOutcome(ok: false, message: "This product is not available in the store yet.")
        }
        do {
            let result = try await Purchases.shared.purchase(package: package)
            if result.userCancelled {
                return PurchaseOutcome(ok: false, cancelled: true)
            }
            logPurchaseRevenue(productId: productId, package: package)
            return PurchaseOutcome(
                ok: true,
                entitlementIds: Array(result.customerInfo.entitlements.active.keys)
            )
        } catch {
            if isCancelled(error) {
                return PurchaseOutcome(ok: false, cancelled: true)
            }
            print("[purchases] purchase failed: \(error.localizedDescription)")
            return PurchaseOutcome(ok: false, message: error.localizedDescription)
        }
    }

    static func restore() async -> PurchaseOutcome {
        guard !apiKey().isEmpty else {
            return PurchaseOutcome(ok: false, message: "Restore is available in the iOS and Android apps.")
        }
        guard isAvailable() else {
            return PurchaseOutcome(ok: false, message: "Store is not configured yet.")
        }
        do {
            let info = try await Purchases.shared.restorePurchases()
            return PurchaseOutcome(
                ok: true,
                entitlementIds: Array(info.entitlements.active.keys)
            )
        } catch {
            print("[purchases] restore failed: \(error.localizedDescription)")
            return PurchaseOutcome(ok: false, message: error.localizedDescription)
        }
    }

    static func priceString(productId: String) async -> String? {
        guard isAvailable() else { return nil }
        return await findPackage(productId: productId)?.storeProduct.localizedPriceString
    }

    private static func findPackage(productId: String) async -> Package? {
        do {
            let offerings = try await Purchases.shared.offerings()
            var pools: [[Package]] = []
            if let current = offerings.current?.availablePackages {
                pools.append(current)
            }
            for offering in offerings.all.values {
                pools.append(offering.availablePackages)
            }
            for packages in pools {
                if let match = packages.first(where: { $0.storeProduct.productIdentifier == productId }) {
                    return match
                }
            }
            return nil
        } catch {
            print("[purchases] offerings failed: \(error.localizedDescription)")
            return nil
        }
    }

    private static func isCancelled(_ error: Error) -> Bool {
        if let code = error as? ErrorCode, code == .purchaseCancelledError {
            return true
        }
        let ns = error as NSError
        return ns.domain == ErrorCode.errorDomain
            && ns.code == ErrorCode.purchaseCancelledError.rawValue
    }

    private static func logPurchaseRevenue(productId: String, package: Package) {
        let product = package.storeProduct
        let catalog = catalog(from: productId)
        let amount = NSDecimalNumber(decimal: product.price).doubleValue
        AnalyticsService.trackPurchase(
            value: amount.isFinite ? amount : 0,
            currency: product.currencyCode ?? "USD",
            itemId: product.productIdentifier,
            itemName: catalog.itemName,
            itemCategory: catalog.itemCategory
        )
    }

    private static func catalog(from productId: String) -> (itemName: String, itemCategory: String) {
        if productId.hasSuffix(".pro.weekly") {
            return ("pro_weekly", "pro")
        }
        if productId.hasSuffix(".pro.yearly") {
            return ("pro_yearly", "pro")
        }
        let prefix = "com.orbi.spaceswoosh.skin."
        if productId.hasPrefix(prefix) {
            return (String(productId.dropFirst(prefix.count)), "skin")
        }
        return (productId, "other")
    }
}

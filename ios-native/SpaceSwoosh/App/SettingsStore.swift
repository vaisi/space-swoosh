// SettingsStore.swift
// Changes: Music/SFX channels + smash PBs; applyAudio gates like Android SoundManager.

import Foundation
import Combine

enum FlightStyle: String {
    case zigzag
    case arc
}

final class SettingsStore: ObservableObject {
    static let shared = SettingsStore()

    @Published var flightStyle: FlightStyle
    @Published var isDark: Bool
    @Published var muted: Bool
    @Published var musicEnabled: Bool
    @Published var sfxEnabled: Bool
    @Published var voiceEnabled: Bool
    @Published var shipSkinId: SkinId

    private init() {
        let style = UserDefaults.standard.string(forKey: "spaceswoosh.flightStyle")
        flightStyle = style == FlightStyle.arc.rawValue ? .arc : .zigzag
        shipSkinId = SkinCatalog.resolve(UserDefaults.standard.string(forKey: "shipSkinId"))
        isDark = UserDefaults.standard.string(forKey: "ssTheme") == "dark"
        muted = UserDefaults.standard.bool(forKey: "soundMuted")
        musicEnabled = Self.flag("soundMusicEnabled", default: true)
        sfxEnabled = Self.flag("soundSfxEnabled", default: true)
        voiceEnabled = Self.flag("soundVoiceEnabled", default: true)
        applyAudio()
    }

    func setFlightStyle(_ style: FlightStyle) {
        flightStyle = style
        UserDefaults.standard.set(style.rawValue, forKey: "spaceswoosh.flightStyle")
    }

    func setShipSkin(_ id: SkinId) {
        guard SkinCatalog.isOwned(id) else { return }
        shipSkinId = id
        UserDefaults.standard.set(id.rawValue, forKey: "shipSkinId")
    }

    func toggleTheme() {
        isDark.toggle()
        UserDefaults.standard.set(isDark ? "dark" : "light", forKey: "ssTheme")
    }

    func toggleMute() {
        muted.toggle()
        UserDefaults.standard.set(muted, forKey: "soundMuted")
        applyAudio()
        if muted {
            VoicePlayer.shared.stop()
        } else {
            SfxPlayer.shared.recover()
        }
    }

    func toggleMusic() {
        musicEnabled.toggle()
        UserDefaults.standard.set(musicEnabled, forKey: "soundMusicEnabled")
        applyAudio()
    }

    func toggleSfx() {
        sfxEnabled.toggle()
        UserDefaults.standard.set(sfxEnabled, forKey: "soundSfxEnabled")
        applyAudio()
    }

    func toggleVoice() {
        voiceEnabled.toggle()
        UserDefaults.standard.set(voiceEnabled, forKey: "soundVoiceEnabled")
        applyAudio()
        if !voiceEnabled { VoicePlayer.shared.stop() }
    }

    func applyAudio() {
        MusicPlayer.shared.muted = muted || !musicEnabled
        SfxPlayer.shared.muted = muted || !sfxEnabled
        VoicePlayer.shared.enabled = voiceEnabled && !muted
    }

    private static func flag(_ key: String, default fallback: Bool) -> Bool {
        if UserDefaults.standard.object(forKey: key) == nil { return fallback }
        return UserDefaults.standard.bool(forKey: key)
    }
}

enum OpenWorldProgress {
    private static let key = "openWorldProgress"

    static func best(for style: FlightStyle) -> Int {
        loadDistance()[style.rawValue] ?? 0
    }

    static func bestDestroyed(for style: FlightStyle) -> Int {
        loadDestroyed()[style.rawValue] ?? 0
    }

    static func record(score: Int, destroyed: Int = 0, style: FlightStyle) -> (best: Int, isNew: Bool) {
        let run = max(0, score)
        var distance = loadDistance()
        var smash = loadDestroyed()
        let previous = distance[style.rawValue] ?? 0
        let best = max(previous, run)
        if best > 0 { distance[style.rawValue] = best }
        let smashBest = max(smash[style.rawValue] ?? 0, max(0, destroyed))
        if smashBest > 0 { smash[style.rawValue] = smashBest }
        UserDefaults.standard.set(
            ["version": 3, "bestByStyle": distance, "bestDestroyedByStyle": smash],
            forKey: key
        )
        return (best, run > previous && run > 0)
    }

    private static func blob() -> [String: Any] {
        UserDefaults.standard.dictionary(forKey: key) ?? [:]
    }

    private static func loadDistance() -> [String: Int] {
        let raw = blob()
        if let nested = raw["bestByStyle"] as? [String: Any] {
            return ints(nested)
        }
        if let v1 = raw["bestScore"] as? Int, v1 > 0 {
            return [FlightStyle.zigzag.rawValue: v1]
        }
        return [:]
    }

    private static func loadDestroyed() -> [String: Int] {
        ints(blob()["bestDestroyedByStyle"] as? [String: Any] ?? [:])
    }

    private static func ints(_ nested: [String: Any]) -> [String: Int] {
        var out: [String: Int] = [:]
        for (k, v) in nested {
            let n: Int?
            if let i = v as? Int { n = i }
            else if let num = v as? NSNumber { n = num.intValue }
            else { n = nil }
            if let n, n > 0 { out[k] = n }
        }
        return out
    }
}

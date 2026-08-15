// SettingsStore.swift
// Changes: Mute also silences looping BGM.

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
    @Published var voiceEnabled: Bool

    private init() {
        let style = UserDefaults.standard.string(forKey: "spaceswoosh.flightStyle")
        flightStyle = style == FlightStyle.arc.rawValue ? .arc : .zigzag
        isDark = UserDefaults.standard.string(forKey: "ssTheme") == "dark"
        muted = UserDefaults.standard.bool(forKey: "soundMuted")
        if UserDefaults.standard.object(forKey: "soundVoiceEnabled") == nil {
            voiceEnabled = true
        } else {
            voiceEnabled = UserDefaults.standard.bool(forKey: "soundVoiceEnabled")
        }
        SfxPlayer.shared.muted = muted
        MusicPlayer.shared.muted = muted
        VoicePlayer.shared.enabled = voiceEnabled && !muted
    }

    func setFlightStyle(_ style: FlightStyle) {
        flightStyle = style
        UserDefaults.standard.set(style.rawValue, forKey: "spaceswoosh.flightStyle")
    }

    func toggleTheme() {
        isDark.toggle()
        UserDefaults.standard.set(isDark ? "dark" : "light", forKey: "ssTheme")
    }

    func toggleMute() {
        muted.toggle()
        SfxPlayer.shared.muted = muted
        MusicPlayer.shared.muted = muted
        VoicePlayer.shared.enabled = voiceEnabled && !muted
        if muted { VoicePlayer.shared.stop() }
        UserDefaults.standard.set(muted, forKey: "soundMuted")
    }

    func toggleVoice() {
        voiceEnabled.toggle()
        VoicePlayer.shared.enabled = voiceEnabled && !muted
        if !voiceEnabled { VoicePlayer.shared.stop() }
        UserDefaults.standard.set(voiceEnabled, forKey: "soundVoiceEnabled")
    }
}

enum OpenWorldProgress {
    private static let key = "openWorldProgress"

    static func best(for style: FlightStyle) -> Int {
        let map = load()
        return max(0, map[style.rawValue] ?? 0)
    }

    static func record(score: Int, style: FlightStyle) -> (best: Int, isNew: Bool) {
        let run = max(0, score)
        var map = load()
        let previous = map[style.rawValue] ?? 0
        let best = max(previous, run)
        if best > 0 {
            map[style.rawValue] = best
            UserDefaults.standard.set(["version": 2, "bestByStyle": map], forKey: key)
        }
        return (best, run > previous && run > 0)
    }

    private static func load() -> [String: Int] {
        guard let raw = UserDefaults.standard.dictionary(forKey: key) else { return [:] }
        if let nested = raw["bestByStyle"] as? [String: Any] {
            var out: [String: Int] = [:]
            for (k, v) in nested {
                if let n = v as? Int, n > 0 { out[k] = n }
            }
            return out
        }
        if let v1 = raw["bestScore"] as? Int, v1 > 0 {
            return [FlightStyle.zigzag.rawValue: v1]
        }
        return [:]
    }
}

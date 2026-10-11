// LaunchVoice.swift
// NAV launch line and subtitle clock for Open Space. Journey story audio wins.
// Changes:
// - First eligible round and a ship change always speak. Crash retries speak
//   about 1 in 4 times. Subtitles use the display cues, never the voice tags.

import Foundation
import QuartzCore
import Combine

final class LaunchVoice: ObservableObject {
    static let shared = LaunchVoice()

    @Published var subtitle = ""
    @Published var opacity: Double = 0

    private var line: NavLine?
    private var armAt: TimeInterval?
    private var clock: TimeInterval?
    private var sessionPlayed = false
    private var lastSkin: SkinId?
    private var retry = false
    private let retryChance = 0.25

    func markRetry() {
        retry = true
    }

    func arm(skinId: SkinId, story: Bool) {
        line = nil
        armAt = nil
        clock = nil
        subtitle = ""
        opacity = 0
        if story {
            retry = false
            lastSkin = skinId
            return
        }
        let sessionFirst = !sessionPlayed
        let shipChanged = lastSkin != nil && lastSkin != skinId
        let isRetry = retry
        retry = false
        sessionPlayed = true
        lastSkin = skinId
        guard let picked = pick(skinId: skinId, sessionFirst: sessionFirst, shipChanged: shipChanged, retry: isRetry) else {
            return
        }
        line = picked
        armAt = CACurrentMediaTime()
    }

    func tick() {
        guard let line else { return }
        let now = CACurrentMediaTime()
        if clock == nil {
            guard let armAt, now >= armAt + 0.6 else { return }
            clock = now
            let name = (line.file as NSString).deletingPathExtension
            VoicePlayer.shared.playCueFile(name)
        }
        guard let clock else { return }
        let elapsed = now - clock
        let holdEnd = line.estSeconds + 1.2
        let fadeEnd = holdEnd + 0.3
        if elapsed >= fadeEnd {
            self.line = nil
            subtitle = ""
            opacity = 0
            return
        }
        var alpha = 1.0
        if elapsed < 0.15 { alpha = elapsed / 0.15 }
        else if elapsed > holdEnd { alpha = 1 - (elapsed - holdEnd) / 0.3 }
        let text = body(line, elapsed: elapsed)
        if subtitle != text { subtitle = text }
        if abs(opacity - alpha) > 0.02 { opacity = alpha }
    }

    private func pick(skinId: SkinId, sessionFirst: Bool, shipChanged: Bool, retry: Bool) -> NavLine? {
        guard let ship = HangarCatalog.entry(for: skinId), !ship.lines.isEmpty else { return nil }
        if ship.hidden && !hiddenLaunched(skinId) {
            markHidden(skinId)
            remember(skinId, ship.lines[0].id)
            return ship.lines[0]
        }
        let always = sessionFirst || shipChanged
        if !always && retry && Double.random(in: 0...1) >= retryChance { return nil }
        if !always && !retry { return nil }
        let last = UserDefaults.standard.string(forKey: "navLastLine.\(skinId.rawValue)")
        let pool = ship.lines.filter { $0.id != last }
        let choice = (pool.isEmpty ? ship.lines : pool).randomElement()
        if let choice { remember(skinId, choice.id) }
        return choice
    }

    private func body(_ line: NavLine, elapsed: TimeInterval) -> String {
        var out = ""
        for cue in line.cues {
            if elapsed >= cue.end {
                out = out.isEmpty ? cue.text : "\(out) \(cue.text)"
                continue
            }
            if elapsed < cue.start { break }
            let span = max(0.05, cue.end - cue.start)
            let count = max(1, Int(ceil(Double(cue.text.count) * min(1, (elapsed - cue.start) / span))))
            let partial = String(cue.text.prefix(count))
            out = out.isEmpty ? partial : "\(out) \(partial)"
            break
        }
        return out
    }

    private func remember(_ id: SkinId, _ lineId: String) {
        UserDefaults.standard.set(lineId, forKey: "navLastLine.\(id.rawValue)")
    }

    private func hiddenLaunched(_ id: SkinId) -> Bool {
        UserDefaults.standard.bool(forKey: "navHiddenLaunched.\(id.rawValue)")
    }

    private func markHidden(_ id: SkinId) {
        UserDefaults.standard.set(true, forKey: "navHiddenLaunched.\(id.rawValue)")
    }
}

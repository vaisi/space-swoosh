// VoicePlayer.swift
// Changes: Slice E — NAV clips + first-boop / swoosh-voice if bundled.

import AVFoundation
import Foundation

final class VoicePlayer: NSObject, AVAudioPlayerDelegate {
    static let shared = VoicePlayer()

    var enabled = true
    private var player: AVAudioPlayer?
    private var ended: (() -> Void)?
    private(set) var playedFirstBoop = false

    var isSpeaking: Bool {
        player?.isPlaying == true
    }

    func playLevel(_ level: Int, onEnded: (() -> Void)? = nil) {
        playNamed("level-\(level)", onEnded: onEnded)
    }

    func playFirstBoop() {
        guard !playedFirstBoop else { return }
        playedFirstBoop = true
        playNamed("first-boop", onEnded: nil)
    }

    func playSwoosh() {
        playNamed("swoosh-voice", onEnded: nil)
    }

    func stop() {
        player?.stop()
        player = nil
        let done = ended
        ended = nil
        done?()
    }

    func reset() {
        player?.stop()
        player = nil
        ended = nil
    }

    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        let done = ended
        ended = nil
        self.player = nil
        done?()
    }

    private func playNamed(_ name: String, onEnded: (() -> Void)?) {
        stopWithoutNotify()
        ended = onEnded
        guard enabled, !SettingsStore.shared.muted else {
            finishImmediately()
            return
        }
        guard let url = Bundle.main.url(forResource: name, withExtension: "mp3")
                ?? Bundle.main.url(forResource: name, withExtension: "m4a")
        else {
            finishImmediately()
            return
        }
        do {
            let next = try AVAudioPlayer(contentsOf: url)
            next.delegate = self
            next.prepareToPlay()
            next.play()
            player = next
        } catch {
            finishImmediately()
        }
    }

    private func stopWithoutNotify() {
        player?.stop()
        player = nil
        ended = nil
    }

    private func finishImmediately() {
        let done = ended
        ended = nil
        done?()
    }
}

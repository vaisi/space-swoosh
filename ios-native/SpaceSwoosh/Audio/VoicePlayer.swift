// VoicePlayer.swift
// Changes: Activate .playback before a clip so Silent switch does not swallow NAV.

import AVFoundation
import Foundation

final class VoicePlayer: NSObject, AVAudioPlayerDelegate {
    static let shared = VoicePlayer()

    var enabled = true
    private var player: AVAudioPlayer?
    private var ended: (() -> Void)?
    private var frozen = false
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
        frozen = false
        MusicPlayer.shared.unduck()
        let done = ended
        ended = nil
        done?()
    }

    func reset() {
        player?.stop()
        player = nil
        ended = nil
        frozen = false
        MusicPlayer.shared.unduck()
    }

    func pause() {
        guard let player, player.isPlaying else { return }
        player.pause()
        frozen = true
    }

    func resume() {
        guard frozen, let player else { return }
        frozen = false
        guard enabled, !SettingsStore.shared.muted else { return }
        MusicPlayer.shared.duck()
        player.play()
    }

    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        let done = ended
        ended = nil
        self.player = nil
        frozen = false
        MusicPlayer.shared.unduck()
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
        GameAudioSession.activate()
        do {
            let next = try AVAudioPlayer(contentsOf: url)
            next.delegate = self
            next.volume = 0.85
            next.prepareToPlay()
            next.play()
            player = next
            MusicPlayer.shared.duck()
        } catch {
            finishImmediately()
        }
    }

    private func stopWithoutNotify() {
        player?.stop()
        player = nil
        ended = nil
        frozen = false
        MusicPlayer.shared.unduck()
    }

    private func finishImmediately() {
        MusicPlayer.shared.unduck()
        let done = ended
        ended = nil
        done?()
    }
}

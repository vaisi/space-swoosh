// VoicePlayer.swift
// Changes: first-boop / swoosh-voice play from pre-decoded engine buffers so
// the first hit no longer freezes the frame or glitches the synth BOOP/swoosh.

import AVFoundation
import Foundation

final class VoicePlayer: NSObject, AVAudioPlayerDelegate {
    static let shared = VoicePlayer()

    var enabled = true
    private var player: AVAudioPlayer?
    private var ended: (() -> Void)?
    private var frozen = false
    private var engineCue = false
    private(set) var playedFirstBoop = false

    var isSpeaking: Bool {
        player?.isPlaying == true || SfxPlayer.shared.voicePlaying
    }

    func playLevel(_ level: Int, onEnded: (() -> Void)? = nil) {
        playNamed("level-\(level)", onEnded: onEnded)
    }

    func playFirstBoop() {
        guard !playedFirstBoop else { return }
        playedFirstBoop = true
        playEngineCue { SfxPlayer.shared.playFirstBoopVoice(onEnded: $0) }
    }

    func playSwoosh() {
        playEngineCue { SfxPlayer.shared.playSwooshVoice(onEnded: $0) }
    }

    func stop() {
        SfxPlayer.shared.stopVoice()
        player?.stop()
        player = nil
        engineCue = false
        frozen = false
        MusicPlayer.shared.unduck()
        let done = ended
        ended = nil
        done?()
    }

    func reset() {
        SfxPlayer.shared.stopVoice()
        player?.stop()
        player = nil
        ended = nil
        engineCue = false
        frozen = false
        MusicPlayer.shared.unduck()
    }

    func pause() {
        if engineCue, SfxPlayer.shared.voicePlaying {
            SfxPlayer.shared.pauseVoice()
            frozen = true
            return
        }
        guard let player, player.isPlaying else { return }
        player.pause()
        frozen = true
    }

    func resume() {
        guard frozen else { return }
        frozen = false
        guard enabled, !SettingsStore.shared.muted else { return }
        MusicPlayer.shared.duck()
        if engineCue {
            SfxPlayer.shared.resumeVoice()
            return
        }
        player?.play()
    }

    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        let done = ended
        ended = nil
        self.player = nil
        frozen = false
        MusicPlayer.shared.unduck()
        done?()
    }

    private func playEngineCue(_ start: (@escaping () -> Void) -> Void) {
        stopWithoutNotify()
        ended = nil
        guard enabled, !SettingsStore.shared.muted else { return }
        GameAudioSession.activate()
        engineCue = true
        MusicPlayer.shared.duck()
        start { [weak self] in
            guard let self, self.engineCue else { return }
            self.engineCue = false
            self.frozen = false
            MusicPlayer.shared.unduck()
        }
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
        SfxPlayer.shared.stopVoice()
        player?.stop()
        player = nil
        ended = nil
        engineCue = false
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

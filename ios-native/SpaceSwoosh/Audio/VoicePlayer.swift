// VoicePlayer.swift
// Changes: playEpilogueOpen / playEpilogueSkip for the written ending; missing
// clips finish immediately so captions can still run. Level clips 1–41 at intro;
// level-42.mp3 plays with its captions after the L42 dark hold.

import AVFoundation
import Foundation

final class VoicePlayer: NSObject, AVAudioPlayerDelegate {
    static let shared = VoicePlayer()

    var enabled = true
    private var player: AVAudioPlayer?
    private var ended: (() -> Void)?
    private var frozen = false
    private var engineCue = false
    private var cueDucks = false
    private(set) var playedFirstBoop = false

    var isSpeaking: Bool {
        player?.isPlaying == true || SfxPlayer.shared.voicePlaying
    }

    func playLevel(_ level: Int, onEnded: (() -> Void)? = nil) {
        playNamed("level-\(level)", onEnded: onEnded)
    }

    func playEpilogueOpen(onEnded: (() -> Void)? = nil) {
        playNamed("epilogue-open", onEnded: onEnded)
    }

    func playEpilogueSkip(onEnded: (() -> Void)? = nil) {
        playNamed("epilogue-skip", onEnded: onEnded)
    }

    func playFirstBoop() {
        guard !playedFirstBoop else { return }
        playedFirstBoop = true
        playEngineCue { SfxPlayer.shared.playFirstBoopVoice(onEnded: $0) }
    }

    func playSwoosh() {
        playEngineCue { SfxPlayer.shared.playSwooshVoice(onEnded: $0) }
    }

    /// Random low-fuel NAV line. False if another clip already owns the slot.
    @discardableResult
    func playFuelLow() -> Bool {
        guard !isSpeaking else { return false }
        playEngineCue(duck: false) { SfxPlayer.shared.playFuelLowVoice(onEnded: $0) }
        return true
    }

    func stop() {
        SfxPlayer.shared.stopVoice()
        player?.stop()
        player = nil
        engineCue = false
        cueDucks = false
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
        cueDucks = false
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
        if cueDucks { MusicPlayer.shared.duck() }
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

    private func playEngineCue(duck: Bool = true, _ start: (@escaping () -> Void) -> Void) {
        stopWithoutNotify()
        ended = nil
        guard enabled, !SettingsStore.shared.muted else { return }
        GameAudioSession.activate()
        engineCue = true
        cueDucks = duck
        if duck { MusicPlayer.shared.duck() }
        start { [weak self] in
            guard let self, self.engineCue else { return }
            self.engineCue = false
            self.frozen = false
            if duck { MusicPlayer.shared.unduck() }
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
            cueDucks = true
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
        cueDucks = false
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

// MusicPlayer.swift
// Changes: Activate .playback session; log when background.mp3 is missing from the bundle.

import AVFoundation
import Foundation

final class MusicPlayer {
    static let shared = MusicPlayer()
    static let volume: Float = 0.40
    static let duckVolume: Float = 0.14

    var muted = false {
        didSet { apply() }
    }

    private var player: AVAudioPlayer?
    private var shouldPlay = false
    private var ducked = false
    private var userPaused = false

    func start() {
        shouldPlay = true
        userPaused = false
        ducked = false
        GameAudioSession.activate()
        if player == nil {
            guard let url = Bundle.main.url(forResource: "background", withExtension: "mp3")
                    ?? Bundle.main.url(forResource: "background", withExtension: "m4a")
            else {
                print("MusicPlayer: background.mp3 / .m4a not in bundle — BGM silent until Voice/ is packed.")
                return
            }
            do {
                let next = try AVAudioPlayer(contentsOf: url)
                next.numberOfLoops = -1
                next.prepareToPlay()
                player = next
            } catch {
                player = nil
            }
        }
        player?.currentTime = 0
        apply()
    }

    func stop() {
        shouldPlay = false
        userPaused = false
        ducked = false
        player?.stop()
        player?.currentTime = 0
    }

    func pause() {
        userPaused = true
        player?.pause()
    }

    func resume() {
        userPaused = false
        apply()
    }

    func duck() {
        ducked = true
        applyVolume()
    }

    func unduck() {
        ducked = false
        applyVolume()
    }

    private func apply() {
        applyVolume()
        guard shouldPlay, let player else { return }
        if muted || userPaused {
            player.pause()
            return
        }
        if !player.isPlaying {
            player.play()
        }
    }

    private func applyVolume() {
        player?.volume = ducked ? Self.duckVolume : Self.volume
    }
}

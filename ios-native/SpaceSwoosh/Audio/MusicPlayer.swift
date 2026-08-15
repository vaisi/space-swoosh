// MusicPlayer.swift
// Changes: Loop background.mp3 at 0.40; duck to 0.14 under NAV voice.

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
        if player == nil {
            guard let url = Bundle.main.url(forResource: "background", withExtension: "mp3")
                    ?? Bundle.main.url(forResource: "background", withExtension: "m4a")
            else { return }
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

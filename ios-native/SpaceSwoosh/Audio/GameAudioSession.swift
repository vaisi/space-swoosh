// GameAudioSession.swift
// Changes: .playback so TestFlight hears SFX with the Silent switch on.

import AVFoundation
import Foundation

/// Shared session for synth SFX, file cues, and BGM.
/// `.ambient` follows the Ring/Silent switch — most iPhones sit on Silent,
/// so TestFlight sounded fully mute. Games use `.playback`.
enum GameAudioSession {
    private static var observing = false

    static func activate() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playback, mode: .default, options: [])
            try session.setActive(true)
        } catch {
            print("GameAudioSession.activate failed: \(error.localizedDescription)")
        }
        guard !observing else { return }
        observing = true
        NotificationCenter.default.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: session,
            queue: .main
        ) { note in
            handleInterruption(note)
        }
        NotificationCenter.default.addObserver(
            forName: .AVAudioEngineConfigurationChange,
            object: nil,
            queue: .main
        ) { _ in
            SfxPlayer.shared.recover()
        }
    }

    private static func handleInterruption(_ note: Notification) {
        guard
            let info = note.userInfo,
            let raw = info[AVAudioSessionInterruptionTypeKey] as? UInt,
            let type = AVAudioSession.InterruptionType(rawValue: raw)
        else { return }
        switch type {
        case .began:
            break
        case .ended:
            let opts = (info[AVAudioSessionInterruptionOptionKey] as? UInt)
                .map { AVAudioSession.InterruptionOptions(rawValue: $0) } ?? []
            if opts.contains(.shouldResume) {
                activate()
                SfxPlayer.shared.recover()
                MusicPlayer.shared.resume()
            }
        @unknown default:
            break
        }
    }
}

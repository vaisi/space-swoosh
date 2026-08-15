// SfxPlayer.swift
// Changes: Slice D — baked boop + collect PCM through a small AVAudioEngine pool.

import AVFoundation
import Foundation

final class SfxPlayer {
    static let shared = SfxPlayer()

    private let engine = AVAudioEngine()
    private var players: [AVAudioPlayerNode] = []
    private var boop: AVAudioPCMBuffer?
    private var collect: AVAudioPCMBuffer?
    private var next = 0
    private var started = false
    var muted = false

    private init() {
        let format = AVAudioFormat(standardFormatWithSampleRate: 44_100, channels: 1)!
        boop = Self.makeBoop(format: format)
        collect = Self.makeCollect(format: format)
        for _ in 0..<6 {
            let node = AVAudioPlayerNode()
            engine.attach(node)
            engine.connect(node, to: engine.mainMixerNode, format: format)
            players.append(node)
        }
        engine.mainMixerNode.outputVolume = 1
    }

    func start() {
        guard !started else { return }
        do {
            try AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default, options: [.mixWithOthers])
            try AVAudioSession.sharedInstance().setActive(true)
            try engine.start()
            started = true
        } catch {
            started = false
        }
    }

    func playBoop() {
        play(boop)
    }

    func playCollect() {
        play(collect)
    }

    private func play(_ buffer: AVAudioPCMBuffer?) {
        guard !muted, started, let buffer else { return }
        let node = players[next % players.count]
        next += 1
        if !node.isPlaying { node.play() }
        node.scheduleBuffer(buffer, at: nil, options: [], completionHandler: nil)
    }

    /// 150 ms sine 320→180 + 520 Hz tick + lowpass-ish noise puff.
    private static func makeBoop(format: AVAudioFormat) -> AVAudioPCMBuffer? {
        let rate = format.sampleRate
        let n = Int(rate * 0.16)
        guard let buf = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(n)) else { return nil }
        buf.frameLength = AVAudioFrameCount(n)
        guard let data = buf.floatChannelData?[0] else { return nil }
        for i in 0..<n {
            let t = Double(i) / rate
            let env = envelope(t, attack: 0.01, peak: 0.34, dur: 0.15)
            let freq = 320 * pow(180.0 / 320.0, min(1, t / 0.11))
            var s = sin(2 * .pi * freq * t) * env
            if t < 0.045 {
                let tickEnv = envelope(t, attack: 0.008, peak: 0.11, dur: 0.04)
                s += sin(2 * .pi * 520 * t) * tickEnv
            }
            if t < 0.08 {
                let noiseEnv = envelope(t, attack: 0.008, peak: 0.1, dur: 0.08)
                let noise = (Double.random(in: -1...1)) * noiseEnv * 0.35
                s += noise
            }
            data[i] = Float(max(-1, min(1, s)))
        }
        return buf
    }

    /// B5 → F#6 ping, 55 ms apart.
    private static func makeCollect(format: AVAudioFormat) -> AVAudioPCMBuffer? {
        let rate = format.sampleRate
        let n = Int(rate * 0.28)
        guard let buf = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(n)) else { return nil }
        buf.frameLength = AVAudioFrameCount(n)
        guard let data = buf.floatChannelData?[0] else { return nil }
        let notes = [988.0, 1480.0]
        for i in 0..<n {
            let t = Double(i) / rate
            var s = 0.0
            for (k, freq) in notes.enumerated() {
                let t0 = Double(k) * 0.055
                let local = t - t0
                if local >= 0, local < 0.16 {
                    s += sin(2 * .pi * freq * local) * envelope(local, attack: 0.012, peak: 0.14, dur: 0.14)
                }
            }
            data[i] = Float(max(-1, min(1, s)))
        }
        return buf
    }

    private static func envelope(_ t: Double, attack: Double, peak: Double, dur: Double) -> Double {
        if t <= 0 { return 0 }
        if t < attack { return peak * (t / attack) }
        if t >= dur { return 0 }
        let u = (t - attack) / max(0.0001, dur - attack)
        return peak * (1 - u) * (1 - u)
    }
}

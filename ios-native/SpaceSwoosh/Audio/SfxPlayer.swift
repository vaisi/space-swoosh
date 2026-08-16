// SfxPlayer.swift
// Changes: playTurn always uses the synth buffer — no AVAudioPlayer hitch on tap.

import AVFoundation
import Foundation

final class SfxPlayer {
    static let shared = SfxPlayer()

    private let engine = AVAudioEngine()
    private var players: [AVAudioPlayerNode] = []
    private var boop: AVAudioPCMBuffer?
    private var collect: AVAudioPCMBuffer?
    private var turnSynth: AVAudioPCMBuffer?
    private var portalIn: AVAudioPCMBuffer?
    private var portalOut: AVAudioPCMBuffer?
    private var swoosh: AVAudioPCMBuffer?
    private var crashSynth: AVAudioPCMBuffer?
    private var shieldSynth: AVAudioPCMBuffer?
    private var next = 0
    private var started = false
    var muted = false

    private let crashCue = FileCue(name: "crash", volume: 0.40)
    private let shieldCrashCue = FileCue(name: "crash_with_shield", volume: 0.40)
    private let shieldCue = FileCue(name: "shield", volume: 0.40)

    private init() {
        let format = AVAudioFormat(standardFormatWithSampleRate: 44_100, channels: 1)!
        boop = Self.makeBoop(format: format)
        collect = Self.makeCollect(format: format)
        turnSynth = Self.makeTurn(format: format)
        portalIn = Self.makePortal(format: format, entering: true)
        portalOut = Self.makePortal(format: format, entering: false)
        swoosh = Self.makeSwoosh(format: format)
        crashSynth = Self.makeCrash(format: format)
        shieldSynth = Self.makeShield(format: format)
        for _ in 0..<6 {
            let node = AVAudioPlayerNode()
            engine.attach(node)
            engine.connect(node, to: engine.mainMixerNode, format: format)
            players.append(node)
        }
        engine.mainMixerNode.outputVolume = 1
    }

    func start() {
        recover()
    }

    /// Session + engine must come back after Silent-route changes and interruptions.
    /// `started` alone is not enough — a stopped engine schedules into silence.
    func recover() {
        GameAudioSession.activate()
        if engine.isRunning {
            started = true
            return
        }
        do {
            engine.prepare()
            try engine.start()
            started = true
        } catch {
            started = false
            print("SfxPlayer.start failed: \(error.localizedDescription)")
        }
    }

    func playBoop() {
        play(boop)
    }

    func playCollect() {
        play(collect)
    }

    func playTurn() {
        play(turnSynth)
    }

    func playCrash() {
        if crashCue.available {
            crashCue.play(muted: muted)
        } else {
            play(crashSynth)
        }
    }

    func playShieldCrash() {
        if shieldCrashCue.available {
            shieldCrashCue.play(muted: muted)
        } else {
            play(crashSynth)
        }
    }

    func playShield() {
        if shieldCue.available {
            shieldCue.play(muted: muted)
        } else {
            play(shieldSynth)
        }
    }

    func playPortalEntry() {
        play(portalIn)
    }

    func playPortalExit() {
        play(portalOut)
    }

    func playSwoosh() {
        play(swoosh)
    }

    private func play(_ buffer: AVAudioPCMBuffer?) {
        guard !muted, let buffer else { return }
        if !engine.isRunning { recover() }
        guard started, engine.isRunning else { return }
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

    private static func makeTurn(format: AVAudioFormat) -> AVAudioPCMBuffer? {
        let rate = format.sampleRate
        let n = Int(rate * 0.08)
        guard let buf = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(n)) else { return nil }
        buf.frameLength = AVAudioFrameCount(n)
        guard let data = buf.floatChannelData?[0] else { return nil }
        for i in 0..<n {
            let t = Double(i) / rate
            data[i] = Float(sin(2 * .pi * 440 * t) * envelope(t, attack: 0.006, peak: 0.12, dur: 0.07))
        }
        return buf
    }

    /// Android playPortalWarp: pitch sweep + baked echo tail (no live delay graph).
    private static func makePortal(format: AVAudioFormat, entering: Bool) -> AVAudioPCMBuffer? {
        let rate = format.sampleRate
        let duration = entering ? 0.42 : 0.38
        let tail = 0.55
        let n = Int(rate * (duration + tail))
        guard let buf = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(n)) else { return nil }
        buf.frameLength = AVAudioFrameCount(n)
        guard let data = buf.floatChannelData?[0] else { return nil }

        var dry = [Double](repeating: 0, count: n)
        for i in 0..<n {
            let t = Double(i) / rate
            guard t < duration else { break }
            let u = min(1, t / duration)
            let bodyF = entering ? lerpExp(420, 55, u) : lerpExp(70, 360, u)
            let subF = entering ? lerpExp(180, 48, min(1, t / (duration * 0.9))) : lerpExp(55, 160, min(1, t / (duration * 0.85)))
            let foldF = entering ? lerpExp(310, 70, u) : lerpExp(90, 280, u)
            let body = sin(2 * .pi * bodyF * t) * envelope(t, attack: 0.03, peak: entering ? 0.22 : 0.18, dur: duration)
            let sub = sin(2 * .pi * subF * t) * envelope(t, attack: 0.04, peak: entering ? 0.14 : 0.1, dur: duration)
            let fold = sin(2 * .pi * foldF * t) * envelope(t, attack: 0.04, peak: 0.06, dur: duration)
            let noiseF = entering ? lerpExp(900, 180, u) : lerpExp(220, 1100, u)
            let noise = (Double.random(in: -1...1)) * envelope(t, attack: 0.04, peak: entering ? 0.12 : 0.1, dur: duration) * 0.45
            let swirl = sin(2 * .pi * noiseF * t * 0.02) * noise
            dry[i] = body + sub + fold + swirl
        }

        let delaySec = entering ? 0.14 : 0.11
        let delay = Int(rate * delaySec)
        let feedback = entering ? 0.42 : 0.34
        var wet = dry
        if delay > 0 {
            for i in delay..<n {
                wet[i] += wet[i - delay] * feedback
            }
        }
        let dryMix = 0.7
        let wetMix = entering ? 0.55 : 0.45
        for i in 0..<n {
            data[i] = Float(max(-1, min(1, dry[i] * dryMix + wet[i] * wetMix)))
        }
        return buf
    }

    /// Android playSwoosh: 220 ms band-passed air + 660→990 tick.
    private static func makeSwoosh(format: AVAudioFormat) -> AVAudioPCMBuffer? {
        let rate = format.sampleRate
        let n = Int(rate * 0.22)
        guard let buf = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(n)) else { return nil }
        buf.frameLength = AVAudioFrameCount(n)
        guard let data = buf.floatChannelData?[0] else { return nil }
        for i in 0..<n {
            let t = Double(i) / rate
            let u = t / 0.22
            let noise = (Double.random(in: -1...1)) * (1 - u) * envelope(t, attack: 0.02, peak: 0.22, dur: 0.22)
            var s = noise
            if t < 0.14 {
                let freq = lerpExp(660, 990, t / 0.12)
                s += sin(2 * .pi * freq * t) * envelope(t, attack: 0.015, peak: 0.07, dur: 0.14)
            }
            data[i] = Float(max(-1, min(1, s)))
        }
        return buf
    }

    /// Soft thud when crash.mp3 is not in the bundle.
    private static func makeCrash(format: AVAudioFormat) -> AVAudioPCMBuffer? {
        let rate = format.sampleRate
        let n = Int(rate * 0.28)
        guard let buf = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(n)) else { return nil }
        buf.frameLength = AVAudioFrameCount(n)
        guard let data = buf.floatChannelData?[0] else { return nil }
        for i in 0..<n {
            let t = Double(i) / rate
            let body = sin(2 * .pi * lerpExp(140, 48, min(1, t / 0.18)) * t)
                * envelope(t, attack: 0.008, peak: 0.28, dur: 0.26)
            let noise = Double.random(in: -1...1) * envelope(t, attack: 0.004, peak: 0.16, dur: 0.12)
            data[i] = Float(max(-1, min(1, body + noise)))
        }
        return buf
    }

    /// Short lift when shield.mp3 is not in the bundle.
    private static func makeShield(format: AVAudioFormat) -> AVAudioPCMBuffer? {
        let rate = format.sampleRate
        let n = Int(rate * 0.22)
        guard let buf = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(n)) else { return nil }
        buf.frameLength = AVAudioFrameCount(n)
        guard let data = buf.floatChannelData?[0] else { return nil }
        for i in 0..<n {
            let t = Double(i) / rate
            let s = sin(2 * .pi * lerpExp(420, 880, min(1, t / 0.16)) * t)
                * envelope(t, attack: 0.012, peak: 0.16, dur: 0.2)
            data[i] = Float(max(-1, min(1, s)))
        }
        return buf
    }

    private static func lerpExp(_ a: Double, _ b: Double, _ t: Double) -> Double {
        let u = max(0, min(1, t))
        return a * pow(b / a, u)
    }

    private static func envelope(_ t: Double, attack: Double, peak: Double, dur: Double) -> Double {
        if t <= 0 { return 0 }
        if t < attack { return peak * (t / attack) }
        if t >= dur { return 0 }
        let u = (t - attack) / max(0.0001, dur - attack)
        return peak * (1 - u) * (1 - u)
    }
}

private final class FileCue {
    private var player: AVAudioPlayer?
    private let volume: Float

    var available: Bool { player != nil }

    init(name: String, volume: Float) {
        self.volume = volume
        guard let url = Bundle.main.url(forResource: name, withExtension: "mp3")
                ?? Bundle.main.url(forResource: name, withExtension: "m4a")
        else { return }
        player = try? AVAudioPlayer(contentsOf: url)
        player?.prepareToPlay()
        player?.volume = volume
    }

    func play(muted: Bool) {
        guard !muted, let player else { return }
        GameAudioSession.activate()
        player.volume = volume
        player.currentTime = 0
        player.play()
    }
}

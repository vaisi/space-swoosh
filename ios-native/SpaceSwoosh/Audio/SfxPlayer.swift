// SfxPlayer.swift
// Changes: Pre-decode level-1…level-42 NAV clips onto the voice node so LEVEL N
// and synth boop share AVAudioEngine (Android Web Audio mix). Turn SFX is
// original turn.mp3 only.

import AVFoundation
import Foundation

final class SfxPlayer {
    static let shared = SfxPlayer()

    private let engine = AVAudioEngine()
    private var players: [AVAudioPlayerNode] = []
    private let voiceNode = AVAudioPlayerNode()
    private var boop: AVAudioPCMBuffer?
    private var collect: AVAudioPCMBuffer?
    private var turnFile: AVAudioPCMBuffer?
    private var turnSynth: AVAudioPCMBuffer?
    private var portalIn: AVAudioPCMBuffer?
    private var portalOut: AVAudioPCMBuffer?
    private var swoosh: AVAudioPCMBuffer?
    private var fuelOut: AVAudioPCMBuffer?
    private var crashFile: AVAudioPCMBuffer?
    private var crashSynth: AVAudioPCMBuffer?
    private var shieldCrashFile: AVAudioPCMBuffer?
    private var shieldFile: AVAudioPCMBuffer?
    private var shieldSynth: AVAudioPCMBuffer?
    private var firstBoopVoice: AVAudioPCMBuffer?
    private var swooshVoice: AVAudioPCMBuffer?
    private var fuelLowVoice: [AVAudioPCMBuffer?] = [nil, nil, nil]
    private var levelVoice: [Int: AVAudioPCMBuffer] = [:]
    private var lastFuelLow = -1
    private var next = 0
    private var started = false
    private var voiceGen: UInt = 0
    private var voiceEnded: (() -> Void)?
    private(set) var voicePlaying = false
    var muted = false

    private init() {
        let format = AVAudioFormat(standardFormatWithSampleRate: 44_100, channels: 1)!
        boop = Self.makeBoop(format: format)
        collect = Self.makeCollect(format: format)
        if let decoded = Self.decodeNamed("turn", into: format) {
            turnFile = Self.scaled(decoded, volume: 0.3)
        }
        turnSynth = Self.makeTurn(format: format)
        portalIn = Self.makePortal(format: format, entering: true)
        portalOut = Self.makePortal(format: format, entering: false)
        swoosh = Self.makeSwoosh(format: format)
        fuelOut = Self.makeFuelOut(format: format)
        if let decoded = Self.decodeNamed("crash", into: format) {
            crashFile = Self.scaled(decoded, volume: 0.40)
        }
        crashSynth = Self.makeCrash(format: format)
        if let decoded = Self.decodeNamed("crash_with_shield", into: format) {
            shieldCrashFile = Self.scaled(decoded, volume: 0.40)
        }
        if let decoded = Self.decodeNamed("shield", into: format) {
            shieldFile = Self.scaled(decoded, volume: 0.40)
        }
        shieldSynth = Self.makeShield(format: format)
        if let decoded = Self.decodeNamed("first-boop", into: format) {
            firstBoopVoice = Self.scaled(decoded, volume: 0.85)
        }
        if let decoded = Self.decodeNamed("swoosh-voice", into: format) {
            swooshVoice = Self.scaled(decoded, volume: 0.85)
        }
        for i in 1...JourneyConfig.totalLevels {
            if let decoded = Self.decodeNamed("level-\(i)", into: format) {
                levelVoice[i] = Self.scaled(decoded, volume: 0.85)
            }
        }
        for i in 1...3 {
            if let decoded = Self.decodeNamed("fuel-low-\(i)", into: format) {
                fuelLowVoice[i - 1] = Self.scaled(decoded, volume: 0.85)
            }
        }
        for _ in 0..<6 {
            let node = AVAudioPlayerNode()
            engine.attach(node)
            engine.connect(node, to: engine.mainMixerNode, format: format)
            players.append(node)
        }
        engine.attach(voiceNode)
        engine.connect(voiceNode, to: engine.mainMixerNode, format: format)
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
        play(turnFile ?? turnSynth)
    }

    func playCrash() {
        play(crashFile ?? crashSynth)
    }

    func playShieldCrash() {
        play(shieldCrashFile ?? crashSynth)
    }

    func playShield() {
        play(shieldFile ?? shieldSynth)
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

    func playFuelOut() {
        play(fuelOut)
    }

    func playLevelVoice(_ level: Int, onEnded: (() -> Void)? = nil) {
        playVoice(levelVoice[level], onEnded: onEnded)
    }

    func playFirstBoopVoice(onEnded: (() -> Void)? = nil) {
        playVoice(firstBoopVoice, onEnded: onEnded)
    }

    func playSwooshVoice(onEnded: (() -> Void)? = nil) {
        playVoice(swooshVoice, onEnded: onEnded)
    }

    func playFuelLowVoice(onEnded: (() -> Void)? = nil) {
        let available = fuelLowVoice.indices.filter { fuelLowVoice[$0] != nil }
        guard !available.isEmpty else {
            onEnded?()
            return
        }
        var pick = available.randomElement() ?? available[0]
        if available.count > 1, pick == lastFuelLow {
            pick = available.first { $0 != lastFuelLow } ?? pick
        }
        lastFuelLow = pick
        playVoice(fuelLowVoice[pick], onEnded: onEnded)
    }

    func stopVoice() {
        voiceGen += 1
        voiceEnded = nil
        voicePlaying = false
        voiceNode.stop()
    }

    func pauseVoice() {
        guard voicePlaying else { return }
        voiceNode.pause()
    }

    func resumeVoice() {
        guard voicePlaying, !muted else { return }
        if !engine.isRunning { recover() }
        guard engine.isRunning else { return }
        voiceNode.play()
    }

    private func playVoice(_ buffer: AVAudioPCMBuffer?, onEnded: (() -> Void)?) {
        stopVoice()
        // Voice channel is gated by VoicePlayer; do not use SFX mute here.
        guard let buffer else {
            onEnded?()
            return
        }
        if !engine.isRunning { recover() }
        guard started, engine.isRunning else {
            onEnded?()
            return
        }
        voiceGen += 1
        let gen = voiceGen
        voiceEnded = onEnded
        voicePlaying = true
        voiceNode.scheduleBuffer(buffer, at: nil, options: []) { [weak self] in
            DispatchQueue.main.async {
                guard let self, self.voiceGen == gen else { return }
                self.voicePlaying = false
                let done = self.voiceEnded
                self.voiceEnded = nil
                done?()
            }
        }
        if !voiceNode.isPlaying { voiceNode.play() }
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
        let rc = 1.0 / (2.0 * .pi * 520)
        let a = (1.0 / rate) / (rc + 1.0 / rate)
        var lp = 0.0
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
                let raw = Double.random(in: -1...1) * noiseEnv * 0.35
                lp += a * (raw - lp)
                s += lp
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

    /// Three descending sputters (~1.09s): 220→70 Hz body, pitched 1.0 / 0.78 / 0.61.
    private static func makeFuelOut(format: AVAudioFormat) -> AVAudioPCMBuffer? {
        let rate = format.sampleRate
        let n = Int(rate * 1.09)
        guard let buf = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(n)) else { return nil }
        buf.frameLength = AVAudioFrameCount(n)
        guard let data = buf.floatChannelData?[0] else { return nil }
        let rc = 1.0 / (2.0 * .pi * 480)
        let a = (1.0 / rate) / (rc + 1.0 / rate)
        var lp = 0.0
        let repeats: [(t0: Double, pitch: Double, amp: Double)] = [
            (0.00, 1.00, 1.00),
            (0.32, 0.78, 0.88),
            (0.64, 0.61, 0.76),
        ]
        let ticks: [(t0: Double, freq: Double, peak: Double, dur: Double)] = [
            (0.05, 380, 0.10, 0.045),
            (0.16, 290, 0.08, 0.055),
            (0.30, 210, 0.06, 0.06),
        ]
        for i in 0..<n {
            let t = Double(i) / rate
            var s = 0.0
            for r in repeats {
                let local = t - r.t0
                guard local >= 0, local < 0.45 else { continue }
                let bodyF = lerpExp(220 * r.pitch, 70 * r.pitch, min(1, local / 0.38))
                s += sin(2 * .pi * bodyF * local) * envelope(local, attack: 0.012, peak: 0.26 * r.amp, dur: 0.42)
                for tick in ticks {
                    let tl = local - tick.t0
                    if tl >= 0, tl < tick.dur {
                        s += sin(2 * .pi * tick.freq * r.pitch * tl)
                            * envelope(tl, attack: 0.008, peak: tick.peak * r.amp, dur: tick.dur)
                    }
                }
                if local < 0.14 {
                    let noiseEnv = envelope(local, attack: 0.01, peak: 0.09 * r.amp, dur: 0.14)
                    let raw = Double.random(in: -1...1) * noiseEnv
                    lp += a * (raw - lp)
                    s += lp
                }
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

    private static func decodeNamed(_ name: String, into format: AVAudioFormat) -> AVAudioPCMBuffer? {
        guard let url = Bundle.main.url(forResource: name, withExtension: "mp3")
            ?? Bundle.main.url(forResource: name, withExtension: "m4a")
        else { return nil }
        guard let file = try? AVAudioFile(forReading: url) else { return nil }
        let srcFormat = file.processingFormat
        let frameCount = AVAudioFrameCount(file.length)
        guard frameCount > 0,
              let src = AVAudioPCMBuffer(pcmFormat: srcFormat, frameCapacity: frameCount)
        else { return nil }
        do {
            try file.read(into: src)
        } catch {
            return nil
        }
        if srcFormat.sampleRate == format.sampleRate, srcFormat.channelCount == format.channelCount {
            return src
        }
        guard let converter = AVAudioConverter(from: srcFormat, to: format) else { return nil }
        let ratio = format.sampleRate / srcFormat.sampleRate
        let outFrames = AVAudioFrameCount(Double(src.frameLength) * ratio) + 32
        guard let dst = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: outFrames) else { return nil }
        var error: NSError?
        var consumed = false
        converter.convert(to: dst, error: &error) { _, status in
            if consumed {
                status.pointee = .endOfStream
                return nil
            }
            consumed = true
            status.pointee = .haveData
            return src
        }
        if error != nil { return nil }
        return dst
    }

    @discardableResult
    private static func scaled(_ buffer: AVAudioPCMBuffer, volume: Float) -> AVAudioPCMBuffer {
        guard let channels = buffer.floatChannelData else { return buffer }
        let n = Int(buffer.frameLength)
        let ch = Int(buffer.format.channelCount)
        for c in 0..<ch {
            for i in 0..<n {
                channels[c][i] *= volume
            }
        }
        return buffer
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

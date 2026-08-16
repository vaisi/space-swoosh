// FramePacingMonitor.swift
// Changes: HUD is device/sim truth — App Preview stream lag is not a pacing bug.

import Foundation
import Combine
import UIKit

final class FramePacingMonitor: ObservableObject {
    @Published private(set) var summaryLine: String = "pacing…"
    @Published private(set) var flagsLine: String = ""
    @Published private(set) var loadLine: String = ""

    private var loadObstacles = 0
    private var loadSparkles = 0
    private var loadTrail = 0

    private var samplesMs: [Double] = []
    private let capacity = 240
    private var writeIndex = 0
    private var sampleCount = 0
    private var lastTimestamp: TimeInterval?
    private var lastPublish: TimeInterval = 0

    init() {
        samplesMs = Array(repeating: 0, count: capacity)
    }

    func setLoadLine(obstacles: Int, sparkles: Int, trail: Int) {
        loadObstacles = obstacles
        loadSparkles = sparkles
        loadTrail = trail
    }

    /// Call from the SpriteKit update thread (main). No heap growth in steady state.
    func recordFrame(at timestamp: TimeInterval) {
        if let last = lastTimestamp {
            let dtMs = (timestamp - last) * 1000
            if dtMs > 0, dtMs < 100 {
                samplesMs[writeIndex] = dtMs
                writeIndex = (writeIndex + 1) % capacity
                if sampleCount < capacity { sampleCount += 1 }
            }
        }
        lastTimestamp = timestamp

        if timestamp - lastPublish >= 0.25 {
            lastPublish = timestamp
            publish()
        }
    }

    private func publish() {
        guard sampleCount >= 30 else { return }
        let live: [Double]
        if sampleCount < capacity {
            live = Array(samplesMs.prefix(sampleCount)).sorted()
        } else {
            live = samplesMs.sorted()
        }
        let p50 = percentile(live, 0.50)
        let p95 = percentile(live, 0.95)
        let p99 = percentile(live, 0.99)
        let hz = p50 > 0 ? 1000.0 / p50 : 0
        summaryLine = String(
            format: "p50 %.1fms  p95 %.1fms  p99 %.1fms  ~%.0fHz",
            p50, p95, p99, hz
        )

        let process = ProcessInfo.processInfo
        let lowPower = process.isLowPowerModeEnabled
        let thermal = process.thermalState
        let thermalLabel: String
        switch thermal {
        case .nominal: thermalLabel = "nominal"
        case .fair: thermalLabel = "fair"
        case .serious: thermalLabel = "serious"
        case .critical: thermalLabel = "critical"
        @unknown default: thermalLabel = "unknown"
        }
        let maxFps = UIScreen.main.maximumFramesPerSecond
        flagsLine = "displayMax \(maxFps)Hz  LPM \(lowPower ? "ON" : "off")  thermal \(thermalLabel)"
        loadLine = "load  obs \(loadObstacles)  spark \(loadSparkles)  trail \(loadTrail)"
    }

    private func percentile(_ sorted: [Double], _ p: Double) -> Double {
        guard !sorted.isEmpty else { return 0 }
        let idx = min(sorted.count - 1, Int(Double(sorted.count - 1) * p))
        return sorted[idx]
    }
}

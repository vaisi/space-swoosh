// TrailRingBuffer.swift
// Changes: Phase A — fixed-capacity trail ring; overwrite oldest; age in place (no realloc).

import Foundation
import CoreGraphics

struct TrailPoint {
    var x: CGFloat
    var y: CGFloat
    var tangent: CGFloat
    var age: CGFloat
}

struct TrailRingBuffer {
    private var points: [TrailPoint]
    private var head: Int = 0
    private(set) var count: Int = 0
    let capacity: Int

    init(capacity: Int) {
        self.capacity = max(capacity, 2)
        self.points = Array(
            repeating: TrailPoint(x: 0, y: 0, tangent: 0, age: 0),
            count: self.capacity
        )
    }

    mutating func reset() {
        head = 0
        count = 0
    }

    mutating func push(x: CGFloat, y: CGFloat, tangent: CGFloat) {
        if count == capacity {
            head = (head + 1) % capacity
            count -= 1
        }
        let index = (head + count) % capacity
        points[index] = TrailPoint(x: x, y: y, tangent: tangent, age: 0)
        count += 1
    }

    mutating func age(by dt: CGFloat) {
        guard count > 0 else { return }
        for i in 0..<count {
            let index = (head + i) % capacity
            points[index].age += dt
        }
    }

    subscript(i: Int) -> TrailPoint {
        points[(head + i) % capacity]
    }
}

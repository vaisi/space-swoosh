// CopyBank.swift
// Changes: Journey complete / mode-select copy no longer says “Forty levels”.

import Foundation

enum CopyPool: String {
    case menu
    case crash
    case fuelOut
    case victory
    case modeJourney
    case modeOpenWorld
    case fail
    case clearPartial
    case clearFlawless
    case journeyComplete
}

enum CopyBank {
    private static var lastPicked: [CopyPool: String] = [:]

    static let menu: [String] = [
        "Clearance is a choice.",
        "The void does not grade on a curve.",
        "Probability of boredom: negligible.",
        "Your trajectory is illogical, yet effective.",
        "Asteroids ahead. Manners optional.",
        "Space is empty. Your excuses need not be.",
        "Logic suggests you press Play.",
        "The ship is ready. Are you.",
        "Distance is a suggestion. Survival is not.",
        "Fascinating place for a mistake.",
        "No life signs. Plenty of rock.",
        "Turn left. Or right. Or become debris.",
        "The leaderboard remembers. So does the void.",
        "Inertia is patient. You are not.",
        "A calm mind. A sharp arc. A short life, otherwise.",
        "Welcome back. The asteroids missed you. Briefly.",
        "Flight is simple. Remaining intact is the thesis.",
        "Sensors detect ambition. Also rocks.",
        "Live long. Or at least past the next belt.",
        "Paper universe. Real consequences.",
    ]

    static let crash: [String] = [
        "Trajectory terminated. Fascinating.",
        "Inertia was consulted. It declined.",
        "The asteroid had the right of way. Regrettably.",
        "Structural integrity: historical.",
        "That was not a gap. Noted.",
        "Survival probability just hit zero. Efficient.",
        "The rock remains unimpressed.",
        "Your arc was elegant. The ending was not.",
        "Debris now. Formally.",
        "Impact confirmed. Ego optional.",
        "Physics filed a complaint. It won.",
        "A learning opportunity. Loudly delivered.",
    ]

    static let fuelOut: [String] = [
        "Out of fuel. The void does not tow.",
        "No sparkles. No fuel.",
        "Tank empty. Sad.",
        "Fuel expended. Ambition remains unpaid.",
        "No thrust. Plenty of scenery.",
        "You ran on sparkles. Then you did not.",
        "Propellant: historical. Trajectory: optimistic.",
        "Blue diamonds refill the tank. Miss enough and this is the result.",
    ]

    static let victory: [String] = [
        "Live long and prosper.",
        "The void yields. Temporarily.",
        "Distance conquered. Humility recommended.",
        "Mission complete. The rocks are disappointed.",
        "You outran probability. Barely.",
        "End of line. Beginning of legend. Perhaps.",
    ]

    static let modeJourney: [String] = [
        "Deep space. Level by level.",
        "Recommended. The Logbook opens here.",
        "Chart the void. Fill the Logbook.",
        "Chapter by chapter. Catalogue as you go.",
        "Ordered exploration. Logbook entries unlock here.",
        "Climb the chapters. Write the field manual.",
        "Deep space, structured. Your Logbook writes here.",
    ]

    static let modeOpenWorld: [String] = [
        "One run, no finish line.",
        "Fly until you crash.",
        "Let your name echo through space.",
        "Endless corridor. The leaderboard is listening.",
        "No goal marker. Only distance, and how far your name travels.",
        "One continuous flight. Crash ends it. Fame is optional, but recorded.",
        "The void has no exit. Your score does.",
    ]

    static let fail: [String] = [
        "Short of the mark. The goal noticed.",
        "Almost. Almost is still debris.",
        "The finish line remains unimpressed.",
        "Insufficient distance. Excess optimism.",
        "Try again. The rocks are waiting.",
        "Trajectory incomplete. Ego intact. For now.",
        "You stopped. The level did not care.",
        "Close enough is a myth. Fascinating.",
        "The goal was ahead. You were not.",
        "Failure: educational. Also final.",
    ]

    static let clearPartial: [String] = [
        "Adequate. The remaining stars disagree.",
        "Cleared. Perfection postponed.",
        "The way ahead is open. The stars are picky.",
        "Forward. The unfinished business remains.",
        "Level secured. Ambition: pending.",
        "You lived. The stars want more.",
        "Progress noted. Brilliance deferred.",
        "Clearance granted. Applause withheld.",
        "Onward. Two truths can wait.",
        "The chapter continues. So do the gaps.",
    ]

    static let clearFlawless: [String] = [
        "Flawless. Fascinating.",
        "Three stars. Zero excuses.",
        "Perfect. Annoyingly so.",
        "Three stars. The rocks remember.",
        "Smashed, scored, finished. Excellent.",
        "All stars. No notes.",
        "Logic and luck, briefly allied.",
        "Immaculate. The void takes notes.",
        "Three of three. Probability sulks.",
        "Flawless ascent. Continue.",
    ]

    static let journeyComplete: [String] = [
        "You are away. Live long and prosper.",
        "Exosphere cleared. Nothing holds you now.",
        "Journey complete. The void applauds quietly.",
        "The last relay is behind you. Stay that way.",
        "Away. As promised.",
        "The atmosphere is behind you. Stay that way.",
    ]

    static func lines(for pool: CopyPool) -> [String] {
        switch pool {
        case .menu: return menu
        case .crash: return crash
        case .fuelOut: return fuelOut
        case .victory: return victory
        case .modeJourney: return modeJourney
        case .modeOpenWorld: return modeOpenWorld
        case .fail: return fail
        case .clearPartial: return clearPartial
        case .clearFlawless: return clearFlawless
        case .journeyComplete: return journeyComplete
        }
    }

    static func journeyFlavor(completed: Bool, level: Int, stars: [Bool], starSlots: Int) -> String {
        if !completed { return pick(.fail) }
        if level >= JourneyConfig.totalLevels { return pick(.journeyComplete) }
        let slots = max(1, starSlots)
        if stars.prefix(slots).allSatisfy({ $0 }) { return pick(.clearFlawless) }
        return pick(.clearPartial)
    }

    static func pick(_ pool: CopyPool) -> String {
        let poolLines = lines(for: pool)
        guard !poolLines.isEmpty else { return "" }
        let banned = lastPicked[pool]
        var choices = poolLines
        if let banned, poolLines.count > 1 {
            let filtered = poolLines.filter { $0 != banned }
            if !filtered.isEmpty { choices = filtered }
        }
        let line = choices[Int.random(in: 0..<choices.count)]
        lastPicked[pool] = line
        return line
    }
}

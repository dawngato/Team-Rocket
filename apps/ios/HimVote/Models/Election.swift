import Foundation

public enum ElectionState: String, Codable, Sendable, CaseIterable {
    case draft = "draft"
    case frozen = "frozen"
    case open = "open"
    case closed = "closed"
    case published = "published"
    case archived = "archived"
    
    public var displayName: String {
        switch self {
        case .draft:
            return "Draft"
        case .frozen:
            return "Frozen"
        case .open:
            return "Voting Open"
        case .closed:
            return "Voting Closed"
        case .published:
            return "Results Published"
        case .archived:
            return "Archived"
        }
    }
    
    public var isVotingActive: Bool {
        return self == .open
    }
}

public struct Election: Codable, Identifiable, Sendable, Equatable {
    public let id: String
    public let title: String
    public let state: ElectionState
    public let manifestDigest: String
    public let opensAtUtc: String
    public let closesAtUtc: String
    public let issuanceCutoffUtc: String
    public let eligibleCount: Int?
    public let candidates: [Candidate]?
    public let contest: String?
    public let selectionRule: String?
    
    public enum CodingKeys: String, CodingKey {
        case id
        case title
        case state
        case manifestDigest = "manifest_digest"
        case opensAtUtc = "opens_at_utc"
        case closesAtUtc = "closes_at_utc"
        case issuanceCutoffUtc = "issuance_cutoff_utc"
        case eligibleCount = "eligible_count"
        case candidates
        case contest
        case selectionRule = "selection_rule"
    }
    
    public init(
        id: String,
        title: String,
        state: ElectionState,
        manifestDigest: String,
        opensAtUtc: String,
        closesAtUtc: String,
        issuanceCutoffUtc: String,
        eligibleCount: Int? = nil,
        candidates: [Candidate]? = nil,
        contest: String? = nil,
        selectionRule: String? = nil
    ) {
        self.id = id
        self.title = title
        self.state = state
        self.manifestDigest = manifestDigest
        self.opensAtUtc = opensAtUtc
        self.closesAtUtc = closesAtUtc
        self.issuanceCutoffUtc = issuanceCutoffUtc
        self.eligibleCount = eligibleCount
        self.candidates = candidates
        self.contest = contest
        self.selectionRule = selectionRule
    }
}

public struct ElectionSummary: Codable, Identifiable, Sendable, Equatable {
    public let id: String
    public let title: String
    public let state: String
    public let opensAtUtc: String
    public let closesAtUtc: String
    
    public enum CodingKeys: String, CodingKey {
        case id
        case title
        case state
        case opensAtUtc = "opens_at_utc"
        case closesAtUtc = "closes_at_utc"
    }
    
    public init(
        id: String,
        title: String,
        state: String,
        opensAtUtc: String,
        closesAtUtc: String
    ) {
        self.id = id
        self.title = title
        self.state = state
        self.opensAtUtc = opensAtUtc
        self.closesAtUtc = closesAtUtc
    }
    
    public var electionState: ElectionState {
        ElectionState(rawValue: state) ?? .draft
    }
}

public struct ElectionList: Codable, Sendable {
    public let elections: [ElectionSummary]
    
    public init(elections: [ElectionSummary]) {
        self.elections = elections
    }
}

public struct PublishedResults: Codable, Sendable, Equatable {
    public let electionId: String
    public let manifestDigest: String
    public let tally: [String: Int]
    public let totalBallots: Int
    public let publishedAtUtc: String
    public let privacyLimited: Bool?
    
    public enum CodingKeys: String, CodingKey {
        case electionId = "election_id"
        case manifestDigest = "manifest_digest"
        case tally
        case totalBallots = "total_ballots"
        case publishedAtUtc = "published_at_utc"
        case privacyLimited = "privacy_limited"
    }
    
    public init(
        electionId: String,
        manifestDigest: String,
        tally: [String: Int],
        totalBallots: Int,
        publishedAtUtc: String,
        privacyLimited: Bool? = nil
    ) {
        self.electionId = electionId
        self.manifestDigest = manifestDigest
        self.tally = tally
        self.totalBallots = totalBallots
        self.publishedAtUtc = publishedAtUtc
        self.privacyLimited = privacyLimited
    }
}

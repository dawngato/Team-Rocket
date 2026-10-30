import Foundation

public struct Candidate: Codable, Identifiable, Sendable, Equatable {
    public let id: String
    public let name: String
    public let contest: String
    
    public init(id: String, name: String, contest: String) {
        self.id = id
        self.name = name
        self.contest = contest
    }
}

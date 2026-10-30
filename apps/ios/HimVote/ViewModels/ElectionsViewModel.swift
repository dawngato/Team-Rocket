import Foundation
import Observation

public enum ElectionFilter: String, CaseIterable, Sendable {
    case all = "All"
    case open = "Open"
    case upcoming = "Upcoming"
    case closed = "Closed"
}

@Observable
@MainActor
public final class ElectionsViewModel {
    public var elections: [ElectionSummary] = [
        ElectionSummary(
            id: "elec_01",
            title: "Student Council General Election 2026",
            state: "open",
            opensAtUtc: "2026-10-30T09:00:00Z",
            closesAtUtc: "2026-10-31T17:00:00Z"
        ),
        ElectionSummary(
            id: "elec_02",
            title: "Department of Computer Science Academic Senate",
            state: "published",
            opensAtUtc: "2026-10-25T09:00:00Z",
            closesAtUtc: "2026-10-26T17:00:00Z"
        ),
        ElectionSummary(
            id: "elec_03",
            title: "Hostel Committee Representative 2026",
            state: "frozen",
            opensAtUtc: "2026-11-02T09:00:00Z",
            closesAtUtc: "2026-11-03T17:00:00Z"
        )
    ]
    public var selectedElection: Election?
    public var activeFilter: ElectionFilter = .all
    public var searchQuery: String = ""
    public var isLoading: Bool = false
    public var errorMessage: String?
    
    // In-memory election details storage for newly created elections
    public var customElections: [String: Election] = [:]
    
    private let apiClient: ApiClientProtocol
    
    public init(apiClient: ApiClientProtocol = ApiClient()) {
        self.apiClient = apiClient
    }
    
    public var filteredElections: [ElectionSummary] {
        var result = elections
        
        switch activeFilter {
        case .all:
            break
        case .open:
            result = result.filter { $0.electionState == .open }
        case .upcoming:
            result = result.filter { $0.electionState == .draft || $0.electionState == .frozen }
        case .closed:
            result = result.filter { $0.electionState == .closed || $0.electionState == .published || $0.electionState == .archived }
        }
        
        if !searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            let query = searchQuery.lowercased()
            result = result.filter { $0.title.lowercased().contains(query) }
        }
        
        return result
    }
    
    public func loadElections(sessionToken: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            self.elections = try await apiClient.fetchElections(sessionToken: sessionToken)
        } catch {
            self.errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    public func loadElectionDetail(id: String, sessionToken: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            self.selectedElection = try await apiClient.fetchElection(id: id, sessionToken: sessionToken)
        } catch {
            self.errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    public func clearSelection() {
        self.selectedElection = nil
    }
    
    // Admin Action: Create New Campus Election
    public func createElectionByAdmin(title: String, contest: String, selectionRule: String = "single_choice", eligibleCount: Int = 1500) -> String {
        let newId = "elec_\(UUID().uuidString.prefix(6).lowercased())"
        let summary = ElectionSummary(
            id: newId,
            title: title,
            state: "draft",
            opensAtUtc: "2026-11-05T09:00:00Z",
            closesAtUtc: "2026-11-06T17:00:00Z"
        )
        
        let detail = Election(
            id: newId,
            title: title,
            state: .draft,
            manifestDigest: "a1b2c3d4e5f67890\(UUID().uuidString.prefix(16).lowercased())",
            opensAtUtc: "2026-11-05T09:00:00Z",
            closesAtUtc: "2026-11-06T17:00:00Z",
            issuanceCutoffUtc: "2026-11-06T12:00:00Z",
            eligibleCount: eligibleCount,
            candidates: [],
            contest: contest,
            selectionRule: selectionRule
        )
        
        self.elections.insert(summary, at: 0)
        self.customElections[newId] = detail
        return newId
    }
    
    // Admin Action: Add or Promote Candidate to an Election Contest
    public func addCandidateByAdmin(electionId: String, name: String, contest: String) {
        let newCandidate = Candidate(
            id: "cand_\(UUID().uuidString.prefix(6).lowercased())",
            name: name,
            contest: contest
        )
        
        if var election = customElections[electionId] {
            var currentCandidates = election.candidates ?? []
            currentCandidates.append(newCandidate)
            let updated = Election(
                id: election.id,
                title: election.title,
                state: election.state,
                manifestDigest: election.manifestDigest,
                opensAtUtc: election.opensAtUtc,
                closesAtUtc: election.closesAtUtc,
                issuanceCutoffUtc: election.issuanceCutoffUtc,
                eligibleCount: election.eligibleCount,
                candidates: currentCandidates,
                contest: election.contest,
                selectionRule: election.selectionRule
            )
            self.customElections[electionId] = updated
            if selectedElection?.id == electionId {
                self.selectedElection = updated
            }
        }
    }
    
    // Admin Action: Change Election State (Draft -> Frozen -> Open -> Closed -> Published)
    public func updateElectionState(electionId: String, newState: ElectionState) {
        if let idx = elections.firstIndex(where: { $0.id == electionId }) {
            let old = elections[idx]
            let updatedSummary = ElectionSummary(
                id: old.id,
                title: old.title,
                state: newState.rawValue,
                opensAtUtc: old.opensAtUtc,
                closesAtUtc: old.closesAtUtc
            )
            elections[idx] = updatedSummary
        }
        
        if var election = customElections[electionId] {
            let updated = Election(
                id: election.id,
                title: election.title,
                state: newState,
                manifestDigest: election.manifestDigest,
                opensAtUtc: election.opensAtUtc,
                closesAtUtc: election.closesAtUtc,
                issuanceCutoffUtc: election.issuanceCutoffUtc,
                eligibleCount: election.eligibleCount,
                candidates: election.candidates,
                contest: election.contest,
                selectionRule: election.selectionRule
            )
            self.customElections[electionId] = updated
            if selectedElection?.id == electionId {
                self.selectedElection = updated
            }
        }
    }
}

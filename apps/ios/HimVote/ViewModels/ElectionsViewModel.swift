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
    public var elections: [ElectionSummary] = []
    public var selectedElection: Election?
    public var activeFilter: ElectionFilter = .all
    public var searchQuery: String = ""
    public var isLoading: Bool = false
    public var errorMessage: String?
    
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
}

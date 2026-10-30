import XCTest
@testable import HimVoteKit

@MainActor
final class ElectionsViewModelTests: XCTestCase {
    var mockApiClient: MockApiClient!
    var viewModel: ElectionsViewModel!
    
    override func setUp() {
        super.setUp()
        mockApiClient = MockApiClient()
        viewModel = ElectionsViewModel(apiClient: mockApiClient)
    }
    
    override func tearDown() {
        viewModel = nil
        mockApiClient = nil
        super.tearDown()
    }
    
    func testLoadElectionsSuccess() async {
        await viewModel.loadElections(sessionToken: "valid_token")
        
        XCTAssertEqual(viewModel.elections.count, 2)
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.isLoading)
    }
    
    func testFilterOpenElections() async {
        await viewModel.loadElections(sessionToken: "valid_token")
        
        viewModel.activeFilter = .open
        let openList = viewModel.filteredElections
        XCTAssertEqual(openList.count, 1)
        XCTAssertEqual(openList.first?.id, "elec_2026_stu_council")
    }
    
    func testFilterClosedElections() async {
        await viewModel.loadElections(sessionToken: "valid_token")
        
        viewModel.activeFilter = .closed
        let closedList = viewModel.filteredElections
        XCTAssertEqual(closedList.count, 1)
        XCTAssertEqual(closedList.first?.id, "elec_2026_senate")
    }
    
    func testSearchQueryFiltersTitles() async {
        await viewModel.loadElections(sessionToken: "valid_token")
        
        viewModel.searchQuery = "senate"
        let searchResults = viewModel.filteredElections
        XCTAssertEqual(searchResults.count, 1)
        XCTAssertEqual(searchResults.first?.id, "elec_2026_senate")
    }
    
    func testLoadElectionDetailSuccess() async {
        await viewModel.loadElectionDetail(id: "elec_2026_stu_council", sessionToken: "valid_token")
        
        XCTAssertNotNil(viewModel.selectedElection)
        XCTAssertEqual(viewModel.selectedElection?.id, "elec_2026_stu_council")
        XCTAssertEqual(viewModel.selectedElection?.candidates?.count, 2)
    }
    
    func testLoadElectionsFailureSetsError() async {
        mockApiClient.shouldThrowError = true
        mockApiClient.errorToThrow = .networkError(message: "Connection failed")
        
        await viewModel.loadElections(sessionToken: "bad_token")
        
        XCTAssertTrue(viewModel.elections.isEmpty)
        XCTAssertNotNil(viewModel.errorMessage)
    }
}

import XCTest
@testable import HimVoteKit

@MainActor
final class ReceiptViewModelTests: XCTestCase {
    var mockApiClient: MockApiClient!
    var mockKeychain: MockKeychainService!
    var viewModel: ReceiptViewModel!
    
    override func setUp() {
        super.setUp()
        mockApiClient = MockApiClient()
        mockKeychain = MockKeychainService()
        viewModel = ReceiptViewModel(apiClient: mockApiClient, keychainService: mockKeychain)
    }
    
    override func tearDown() {
        viewModel = nil
        mockKeychain = nil
        mockApiClient = nil
        super.tearDown()
    }
    
    func testLoadReceiptFromKeychain() throws {
        let receipt = Receipt(
            electionId: "elec_2026_stu_council",
            handle: "rcpt_987654",
            leafIndex: 17,
            status: .witnessed,
            witnessedAtUtc: "2026-10-30T15:00:00Z"
        )
        try mockKeychain.saveReceipt(receipt)
        
        viewModel.loadReceipt(handle: "rcpt_987654", electionId: "elec_2026_stu_council")
        
        XCTAssertNotNil(viewModel.receipt)
        XCTAssertEqual(viewModel.receipt?.handle, "rcpt_987654")
        XCTAssertEqual(viewModel.receipt?.status, .witnessed)
        XCTAssertEqual(viewModel.receipt?.leafIndex, 17)
    }
    
    func testMissingLocalReceiptDoesNotFabricateLeafOrProof() {
        viewModel.loadReceipt(handle: "rcpt_nonexistent", electionId: "elec_test_01")
        
        XCTAssertNil(viewModel.receipt)
        XCTAssertEqual(viewModel.inclusionStatus, .notAvailable)
        XCTAssertTrue(viewModel.errorMessage?.contains("not stored") == true)
    }

    func testWitnessedReceiptIsLocallyVerifiedFromServerProof() async throws {
        mockApiClient.receiptStatusResponse = ReceiptStatusResponse(
            status: "WITNESSED",
            handle: "rcpt_handle_998877",
            leafIndex: 2,
            witnessedAtUtc: "2026-10-30T14:22:00Z",
            treeSize: 3,
            leafHash: "f931962f0917c346d447293c07b687ae1609f7003f8a44a06a75c4145b1e1929",
            merkleRoot: "d4186e3c05a620ce61397e838bfbd76e6f27e6d7daa13c59eb82a8e094608e1c",
            merkleProof: ["fb33dff7b9f27b94d57431d3c72e3268e5dda9c4de3d2b0d34ab34146d6e6806"]
        )

        viewModel.startPollingReceiptStatus(
            electionId: "elec_test_01",
            handle: "rcpt_handle_998877"
        )

        try await Task.sleep(nanoseconds: 50_000_000)

        XCTAssertTrue(viewModel.inclusionStatus.isVerified)
        XCTAssertEqual(viewModel.receipt?.treeSize, 3)
    }
    
    func testFormatReceiptJson() {
        let receipt = Receipt(
            electionId: "elec_test_01",
            handle: "rcpt_test_01",
            leafIndex: 5,
            status: .anchored
        )
        viewModel.receipt = receipt
        
        let json = viewModel.formatReceiptJson()
        XCTAssertNotNil(json)
        XCTAssertTrue(json?.contains("rcpt_test_01") == true)
        XCTAssertTrue(json?.contains("ANCHORED") == true)
    }
    
    func testStopPollingCancelsTask() {
        viewModel.startPollingReceiptStatus(electionId: "elec_test_01", handle: "rcpt_test_01")
        XCTAssertTrue(viewModel.isPolling)
        
        viewModel.stopPolling()
        XCTAssertFalse(viewModel.isPolling)
    }
}

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
        try mockKeychain.saveCodable(receipt, forKey: "himvote_receipt_rcpt_987654")
        
        viewModel.loadReceipt(handle: "rcpt_987654", electionId: "elec_2026_stu_council")
        
        XCTAssertNotNil(viewModel.receipt)
        XCTAssertEqual(viewModel.receipt?.handle, "rcpt_987654")
        XCTAssertEqual(viewModel.receipt?.status, .witnessed)
        XCTAssertEqual(viewModel.receipt?.leafIndex, 17)
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
}

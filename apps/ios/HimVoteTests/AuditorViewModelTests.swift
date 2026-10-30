import XCTest
@testable import HimVoteKit

@MainActor
final class AuditorViewModelTests: XCTestCase {
    var mockApiClient: MockApiClient!
    var viewModel: AuditorViewModel!
    
    override func setUp() {
        super.setUp()
        mockApiClient = MockApiClient()
        viewModel = AuditorViewModel(apiClient: mockApiClient)
    }
    
    override func tearDown() {
        viewModel = nil
        mockApiClient = nil
        super.tearDown()
    }
    
    func testLoadEvidenceAndVerifyAllPass() async {
        await viewModel.loadEvidenceAndVerify(
            electionId: "elec_2026_stu_council",
            sessionToken: "valid_auditor_token"
        )
        
        XCTAssertEqual(viewModel.overallVerdict, .pass)
        XCTAssertEqual(viewModel.auditCheckItems.count, 4)
        for item in viewModel.auditCheckItems {
            XCTAssertEqual(item.verdict, .pass)
        }
    }
    
    func testLoadEvidenceFailureWhenAnchorInvalid() async {
        mockApiClient.evidencePackage = EvidencePackage(
            electionId: "elec_2026_stu_council",
            manifestDigest: "a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef",
            finalCheckpointDigest: "f0e1d2c3b4a567890123456789abcdef0123456789abcdef0123456789abcdef",
            anchorTxHash: "malformed_tx_hash",
            auditorSignature: "mock_signature_valid"
        )
        
        await viewModel.loadEvidenceAndVerify(
            electionId: "elec_2026_stu_council",
            sessionToken: "valid_auditor_token"
        )
        
        XCTAssertEqual(viewModel.overallVerdict, .fail)
        let anchorCheck = viewModel.auditCheckItems.first(where: { $0.id == "anchor_tx" })
        XCTAssertEqual(anchorCheck?.verdict, .fail)
    }
}

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
        XCTAssertEqual(viewModel.auditCheckItems.count, 6)
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
            auditorSignature: "mock_signature_valid_at_least_32_characters_long",
            evidenceUrl: "https://api.himvote.example.in/evidence/bundle.zip"
        )
        
        await viewModel.loadEvidenceAndVerify(
            electionId: "elec_2026_stu_council",
            sessionToken: "valid_auditor_token"
        )
        
        XCTAssertEqual(viewModel.overallVerdict, .fail)
        let anchorCheck = viewModel.auditCheckItems.first(where: { $0.id == "anchor_tx" })
        XCTAssertEqual(anchorCheck?.verdict, .fail)
    }
    
    func testLoadEvidenceFailureWhenManifestInvalid() async {
        mockApiClient.evidencePackage = EvidencePackage(
            electionId: "elec_2026_stu_council",
            manifestDigest: "short_digest",
            finalCheckpointDigest: "f0e1d2c3b4a567890123456789abcdef0123456789abcdef0123456789abcdef",
            anchorTxHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            auditorSignature: "mock_signature_valid_at_least_32_characters_long",
            evidenceUrl: "https://api.himvote.example.in/evidence/bundle.zip"
        )
        
        await viewModel.loadEvidenceAndVerify(
            electionId: "elec_2026_stu_council",
            sessionToken: "valid_auditor_token"
        )
        
        XCTAssertEqual(viewModel.overallVerdict, .fail)
        let manifestCheck = viewModel.auditCheckItems.first(where: { $0.id == "manifest_digest" })
        XCTAssertEqual(manifestCheck?.verdict, .fail)
    }
    
    func testLoadEvidenceFailureWhenElectionIdMismatch() async {
        mockApiClient.evidencePackage = EvidencePackage(
            electionId: "elec_different_id",
            manifestDigest: "a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef",
            finalCheckpointDigest: "f0e1d2c3b4a567890123456789abcdef0123456789abcdef0123456789abcdef",
            anchorTxHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            auditorSignature: "mock_signature_valid_at_least_32_characters_long",
            evidenceUrl: "https://api.himvote.example.in/evidence/bundle.zip"
        )
        
        await viewModel.loadEvidenceAndVerify(
            electionId: "elec_2026_stu_council",
            sessionToken: "valid_auditor_token"
        )
        
        XCTAssertEqual(viewModel.overallVerdict, .fail)
        let idCheck = viewModel.auditCheckItems.first(where: { $0.id == "election_identity" })
        XCTAssertEqual(idCheck?.verdict, .fail)
    }
    
    func testLoadEvidenceWhenApiClientThrows() async {
        mockApiClient.shouldThrowError = true
        mockApiClient.errorToThrow = .notFound
        
        await viewModel.loadEvidenceAndVerify(
            electionId: "elec_not_found",
            sessionToken: "token"
        )
        
        XCTAssertEqual(viewModel.overallVerdict, .fail)
        XCTAssertNotNil(viewModel.errorMessage)
        XCTAssertTrue(viewModel.auditCheckItems.isEmpty)
    }
}

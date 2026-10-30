import XCTest
@testable import HimVoteKit

public final class MockBoothHandler: BoothSessionHandling, @unchecked Sendable {
    public var shouldThrowError: Bool = false
    public var errorToThrow: Error = BoothError.sessionCancelled
    
    public var mockArtifacts = BoothArtifacts(
        electionId: "elec_2026_stu_council",
        credentialProofB64url: "proof_b64url_mock",
        engineBallotB64url: "engine_ballot_ciphertext_mock",
        engineProofsB64url: "engine_zk_proofs_mock",
        stateToken: "state_token_123"
    )
    
    public init() {}
    
    public func launchBoothSession(
        boothBaseUrl: URL,
        electionId: String,
        credentialProof: String
    ) async throws -> BoothArtifacts {
        if shouldThrowError {
            throw errorToThrow
        }
        return mockArtifacts
    }
    
    public func parseReturnUrl(_ url: URL, expectedState: String) throws -> BoothArtifacts {
        if shouldThrowError {
            throw errorToThrow
        }
        return mockArtifacts
    }
}

@MainActor
final class VotingViewModelTests: XCTestCase {
    var mockApiClient: MockApiClient!
    var mockBoothHandler: MockBoothHandler!
    var mockKeychain: MockKeychainService!
    var viewModel: VotingViewModel!
    
    override func setUp() {
        super.setUp()
        mockApiClient = MockApiClient()
        mockBoothHandler = MockBoothHandler()
        mockKeychain = MockKeychainService()
        viewModel = VotingViewModel(
            apiClient: mockApiClient,
            boothHandler: mockBoothHandler,
            keychainService: mockKeychain
        )
    }
    
    override func tearDown() {
        viewModel = nil
        mockKeychain = nil
        mockBoothHandler = nil
        mockApiClient = nil
        super.tearDown()
    }
    
    func testStartVotingFlowSuccess() async {
        let election = Election(
            id: "elec_2026_stu_council",
            title: "Student Council Election",
            state: .open,
            manifestDigest: "digest_123",
            opensAtUtc: "2026-10-30T00:00:00Z",
            closesAtUtc: "2026-10-31T00:00:00Z",
            issuanceCutoffUtc: "2026-10-31T00:00:00Z"
        )
        
        let credential = Credential(
            electionId: "elec_2026_stu_council",
            blindSignatureResponse: "sig_resp_xyz",
            blindedSecret: "secret_xyz",
            unblindedSignature: "sig_resp_xyz",
            status: .delivered
        )
        
        await viewModel.startVotingFlow(
            boothBaseUrl: URL(string: "http://localhost:8080/booth")!,
            election: election,
            credential: credential
        )
        
        XCTAssertFalse(viewModel.isLaunchingBooth)
        XCTAssertFalse(viewModel.isCasting)
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertEqual(viewModel.successReceiptHandle, "rcpt_handle_998877")
        XCTAssertEqual(viewModel.lastCastResponse?.status, "COMMITTED_PENDING_WITNESS")
        
        let storedReceipt = try? mockKeychain.readCodable(Receipt.self, forKey: "himvote_receipt_rcpt_handle_998877")
        XCTAssertNotNil(storedReceipt)
        XCTAssertEqual(storedReceipt?.handle, "rcpt_handle_998877")
    }
    
    func testVotingFlowCancelledByVoter() async {
        mockBoothHandler.shouldThrowError = true
        mockBoothHandler.errorToThrow = BoothError.sessionCancelled
        
        let election = Election(
            id: "elec_2026_stu_council",
            title: "Student Council Election",
            state: .open,
            manifestDigest: "digest_123",
            opensAtUtc: "2026-10-30T00:00:00Z",
            closesAtUtc: "2026-10-31T00:00:00Z",
            issuanceCutoffUtc: "2026-10-31T00:00:00Z"
        )
        
        let credential = Credential(
            electionId: "elec_2026_stu_council",
            blindSignatureResponse: "sig_resp_xyz",
            status: .delivered
        )
        
        await viewModel.startVotingFlow(
            boothBaseUrl: URL(string: "http://localhost:8080/booth")!,
            election: election,
            credential: credential
        )
        
        XCTAssertFalse(viewModel.isLaunchingBooth)
        XCTAssertNil(viewModel.successReceiptHandle)
        XCTAssertNotNil(viewModel.errorMessage)
    }
}

import XCTest
@testable import HimVoteKit

final class ApiClientTests: XCTestCase {
    var mockClient: MockApiClient!
    
    override func setUp() {
        super.setUp()
        mockClient = MockApiClient()
    }
    
    override func tearDown() {
        mockClient = nil
        super.tearDown()
    }
    
    func testLoginSuccess() async throws {
        let req = LoginRequest(email: "student@example.in", password: "Password123")
        let res = try await mockClient.login(request: req)
        
        XCTAssertEqual(res.sessionToken, "mock_session_token_xyz")
        XCTAssertEqual(res.userId, "user_std_001")
        XCTAssertEqual(res.userRole, .student)
        XCTAssertFalse(res.mfaRequired)
    }
    
    func testLoginFailureUnauthorized() async {
        mockClient.shouldThrowError = true
        mockClient.errorToThrow = .unauthorized
        
        let req = LoginRequest(email: "bad@example.in", password: "wrong")
        do {
            _ = try await mockClient.login(request: req)
            XCTFail("Expected unauthorized error")
        } catch {
            XCTAssertEqual(error as? ApiError, ApiError.unauthorized)
        }
    }
    
    func testFetchElectionsSuccess() async throws {
        let elections = try await mockClient.fetchElections(sessionToken: "valid_token")
        XCTAssertEqual(elections.count, 2)
        XCTAssertEqual(elections.first?.id, "elec_2026_stu_council")
        XCTAssertEqual(elections.first?.electionState, .open)
    }
    
    func testCastBallotSuccess() async throws {
        let request = CastBallotRequest(
            electionId: "elec_2026_stu_council",
            credentialProofB64url: "proof_abc",
            engineBallotB64url: "ballot_def",
            engineProofsB64url: "engine_proofs_ghi",
            idempotencyKey: "idem_key_123"
        )
        
        let response = try await mockClient.castBallot(request: request)
        XCTAssertEqual(response.status, "COMMITTED_PENDING_WITNESS")
        XCTAssertEqual(response.handle, "rcpt_handle_998877")
        XCTAssertEqual(response.leafIndex, 42)
    }
    
    func testCertificatePinningDelegateInstantiation() {
        let hashes: Set<String> = ["fake_sha256_hash_value_123"]
        let delegate = CertificatePinningDelegate(pinnedPublicKeyHashes: hashes, allowSelfSignedForTesting: false)
        XCTAssertNotNil(delegate)
    }
}

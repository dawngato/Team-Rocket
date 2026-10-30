import XCTest
@testable import HimVoteKit

@MainActor
final class BoothSessionHandlerTests: XCTestCase {
    var handler: BoothSessionHandler!
    
    override func setUp() {
        super.setUp()
        handler = BoothSessionHandler(callbackScheme: "himvote")
    }
    
    override func tearDown() {
        handler = nil
        super.tearDown()
    }
    
    func testGenerateSecureStateTokenProducesHex() {
        let token = handler.generateSecureStateToken()
        XCTAssertFalse(token.isEmpty)
        XCTAssertEqual(token.count, 64)
        XCTAssertTrue(token.allSatisfy { $0.isHexDigit })
    }
    
    func testBuildBoothUrlExcludesCredentialProofFromUrl() throws {
        let url = try handler.buildBoothUrl(
            electionId: "elec_001",
            credentialProof: "secret_credential_proof_xyz",
            stateToken: "state123"
        )
        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        let queryKeys = components?.queryItems?.map { $0.name } ?? []
        XCTAssertTrue(queryKeys.contains("election_id"))
        XCTAssertTrue(queryKeys.contains("state"))
        XCTAssertTrue(queryKeys.contains("redirect_uri"))
        XCTAssertFalse(queryKeys.contains("credential_proof"))
    }
    
    func testBuildBoothUrlWithEmptyProofThrows() {
        XCTAssertThrowsError(
            try handler.buildBoothUrl(
                electionId: "elec_001",
                credentialProof: "",
                stateToken: "state123"
            )
        )
    }

    func testParseReturnUrlWithSecretArtifactsThrowsSecurityError() {
        let stateToken = "state1234567890abcdef"
        let urlString = "himvote://booth_return?election_id=elec_001&credential_proof_b64url=cred_proof_xyz&engine_ballot_b64url=ballot_data&engine_proofs_b64url=zk_proofs&state=\(stateToken)"
        let returnUrl = URL(string: urlString)!
        
        XCTAssertThrowsError(
            try handler.parseReturnUrl(
                returnUrl,
                expectedElectionId: "elec_001",
                expectedState: stateToken
            )
        ) { error in
            if case .missingArtifacts(let detail) = error as? BoothError {
                XCTAssertTrue(detail.contains("cryptographic artifacts must not be returned in a URL"))
            } else {
                XCTFail("Expected missingArtifacts error with security detail")
            }
        }
    }
    
    func testParseReturnUrlWithoutBackChannelFailsClosed() {
        let stateToken = "state_fragment_secret"
        let urlString = "himvote://booth_return?election_id=elec_001&state=\(stateToken)"
        let returnUrl = URL(string: urlString)!
        
        XCTAssertThrowsError(
            try handler.parseReturnUrl(
                returnUrl,
                expectedElectionId: "elec_001",
                expectedState: stateToken
            )
        ) { error in
            if case .missingArtifacts(let detail) = error as? BoothError {
                XCTAssertTrue(detail.contains("secure back-channel handoff is not configured"))
            } else {
                XCTFail("Expected missingArtifacts error with fail-closed detail")
            }
        }
    }
    
    func testParseReturnUrlStateMismatchThrows() {
        let urlString = "himvote://booth_return?election_id=elec_001&credential_proof_b64url=cred&engine_ballot_b64url=bal&engine_proofs_b64url=proof&state=wrong_state"
        let returnUrl = URL(string: urlString)!
        
        XCTAssertThrowsError(
            try handler.parseReturnUrl(returnUrl, expectedElectionId: "elec_001", expectedState: "expected_state")
        ) { error in
            XCTAssertEqual(error as? BoothError, BoothError.stateMismatch)
        }
    }
    
    func testParseReturnUrlElectionMismatchThrows() {
        let stateToken = "matching_state"
        let urlString = "himvote://booth_return?election_id=elec_tampered&credential_proof_b64url=cred&engine_ballot_b64url=bal&engine_proofs_b64url=proof&state=\(stateToken)"
        let returnUrl = URL(string: urlString)!
        
        XCTAssertThrowsError(
            try handler.parseReturnUrl(returnUrl, expectedElectionId: "elec_original", expectedState: stateToken)
        ) { error in
            XCTAssertEqual(error as? BoothError, BoothError.electionMismatch)
        }
    }
    
    func testParseReturnUrlMissingArtifactsThrows() {
        let stateToken = "valid_state"
        let urlString = "himvote://booth_return?election_id=elec_001&state=\(stateToken)"
        let returnUrl = URL(string: urlString)!
        
        XCTAssertThrowsError(
            try handler.parseReturnUrl(returnUrl, expectedElectionId: "elec_001", expectedState: stateToken)
        )
    }
}

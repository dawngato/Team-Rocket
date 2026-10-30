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
    
    func testParseReturnUrlSuccessWithQuery() throws {
        let stateToken = "state1234567890abcdef"
        let urlString = "himvote://booth_return?election_id=elec_001&credential_proof_b64url=cred_proof_xyz&engine_ballot_b64url=ballot_data&engine_proofs_b64url=zk_proofs&state=\(stateToken)"
        let returnUrl = URL(string: urlString)!
        
        let artifacts = try handler.parseReturnUrl(
            returnUrl,
            expectedElectionId: "elec_001",
            expectedState: stateToken
        )
        
        XCTAssertEqual(artifacts.electionId, "elec_001")
        XCTAssertEqual(artifacts.credentialProofB64url, "cred_proof_xyz")
        XCTAssertEqual(artifacts.engineBallotB64url, "ballot_data")
        XCTAssertEqual(artifacts.engineProofsB64url, "zk_proofs")
        XCTAssertEqual(artifacts.stateToken, stateToken)
    }
    
    func testParseReturnUrlSuccessWithFragment() throws {
        let stateToken = "state_fragment_secret"
        let urlString = "himvote://booth_return#election_id=elec_001&credential_proof_b64url=cred_proof_xyz&engine_ballot_b64url=ballot_data&engine_proofs_b64url=zk_proofs&state=\(stateToken)"
        let returnUrl = URL(string: urlString)!
        
        let artifacts = try handler.parseReturnUrl(
            returnUrl,
            expectedElectionId: "elec_001",
            expectedState: stateToken
        )
        
        XCTAssertEqual(artifacts.electionId, "elec_001")
        XCTAssertEqual(artifacts.stateToken, stateToken)
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

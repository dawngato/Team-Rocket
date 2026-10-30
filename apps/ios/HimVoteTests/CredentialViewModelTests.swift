import XCTest
@testable import HimVoteKit

@MainActor
final class CredentialViewModelTests: XCTestCase {
    var mockApiClient: MockApiClient!
    var mockKeychain: MockKeychainService!
    var viewModel: CredentialViewModel!
    
    override func setUp() {
        super.setUp()
        mockApiClient = MockApiClient()
        mockKeychain = MockKeychainService()
        viewModel = CredentialViewModel(apiClient: mockApiClient, keychainService: mockKeychain)
    }
    
    override func tearDown() {
        viewModel = nil
        mockKeychain = nil
        mockApiClient = nil
        super.tearDown()
    }
    
    func testCheckEligibilityReturnsTrue() async {
        await viewModel.checkEligibility(electionId: "elec_2026_stu_council", sessionToken: "valid_token")
        XCTAssertTrue(viewModel.isEligible)
        XCTAssertNil(viewModel.errorMessage)
    }
    
    func testRequestBlindIssuanceSuccess() async {
        await viewModel.requestBlindIssuance(electionId: "elec_2026_stu_council", sessionToken: "valid_token")
        
        XCTAssertEqual(viewModel.issuanceStatus, .delivered)
        XCTAssertNotNil(viewModel.currentCredential)
        XCTAssertEqual(viewModel.currentCredential?.electionId, "elec_2026_stu_council")
        XCTAssertEqual(viewModel.currentCredential?.blindSignatureResponse, "mock_blind_sig_resp_base64url")
        XCTAssertNotNil(viewModel.successMessage)
        
        let storedKey = viewModel.credentialStorageKey(for: "elec_2026_stu_council")
        let storedCred = try? mockKeychain.readCodable(Credential.self, forKey: storedKey)
        XCTAssertNotNil(storedCred)
        XCTAssertEqual(storedCred?.status, .delivered)
    }
    
    func testLoadStoredCredential() throws {
        let cred = Credential(
            electionId: "elec_stored_01",
            blindSignatureResponse: "sig_abc",
            blindedSecret: "secret_def",
            unblindedSignature: "sig_abc",
            status: .delivered,
            issuedAtUtc: "2026-10-30T10:00:00Z"
        )
        let key = viewModel.credentialStorageKey(for: "elec_stored_01")
        try mockKeychain.saveCodable(cred, forKey: key)
        
        viewModel.loadStoredCredential(electionId: "elec_stored_01")
        
        XCTAssertNotNil(viewModel.currentCredential)
        XCTAssertEqual(viewModel.currentCredential?.electionId, "elec_stored_01")
        XCTAssertEqual(viewModel.issuanceStatus, .delivered)
    }
}

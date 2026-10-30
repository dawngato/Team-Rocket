import XCTest
@testable import HimVoteKit

@MainActor
final class AuthViewModelTests: XCTestCase {
    var mockApiClient: MockApiClient!
    var mockKeychain: MockKeychainService!
    var viewModel: AuthViewModel!
    
    override func setUp() {
        super.setUp()
        mockApiClient = MockApiClient()
        mockKeychain = MockKeychainService()
        viewModel = AuthViewModel(apiClient: mockApiClient, keychainService: mockKeychain)
    }
    
    override func tearDown() {
        viewModel = nil
        mockKeychain = nil
        mockApiClient = nil
        super.tearDown()
    }
    
    func testLoginSuccessStoresSessionInKeychain() async {
        await viewModel.login(email: "student@example.in", password: "SecurePassword123")
        
        XCTAssertTrue(viewModel.isAuthenticated)
        XCTAssertNotNil(viewModel.currentUser)
        XCTAssertEqual(viewModel.currentUser?.userId, "user_std_001")
        XCTAssertEqual(viewModel.currentUser?.role, .student)
        XCTAssertNil(viewModel.errorMessage)
        
        let storedTokenData = try? mockKeychain.read(forKey: "himvote_session_token")
        XCTAssertNotNil(storedTokenData)
        if let storedTokenData = storedTokenData {
            let token = String(data: storedTokenData, encoding: .utf8)
            XCTAssertEqual(token, "mock_session_token_xyz")
        }
    }
    
    func testLoginMfaRequiredFlow() async {
        mockApiClient.loginResponse = LoginResponse(
            sessionToken: "pending_token",
            userId: "user_officer_01",
            role: "election_officer",
            mfaRequired: true
        )
        
        await viewModel.login(email: "officer@example.in", password: "PasswordAdmin123")
        
        XCTAssertFalse(viewModel.isAuthenticated)
        XCTAssertTrue(viewModel.mfaRequired)
        XCTAssertEqual(viewModel.pendingMfaEmail, "officer@example.in")
    }
    
    func testLoginFailureSetsErrorMessage() async {
        mockApiClient.shouldThrowError = true
        mockApiClient.errorToThrow = .unauthorized
        
        await viewModel.login(email: "wrong@example.in", password: "WrongPassword")
        
        XCTAssertFalse(viewModel.isAuthenticated)
        XCTAssertNil(viewModel.currentUser)
        XCTAssertNotNil(viewModel.errorMessage)
    }
    
    func testLogoutClearsSessionAndKeychain() async {
        await viewModel.login(email: "student@example.in", password: "SecurePassword123")
        XCTAssertTrue(viewModel.isAuthenticated)
        
        await viewModel.logout()
        
        XCTAssertFalse(viewModel.isAuthenticated)
        XCTAssertNil(viewModel.currentUser)
        
        XCTAssertThrowsError(try mockKeychain.read(forKey: "himvote_session_token"))
    }
    
    func testRestoreSessionFromExistingKeychain() throws {
        let user = User(
            userId: "restored_user_99",
            email: "student@example.in",
            role: .student,
            sessionToken: "persisted_token_abc"
        )
        let userData = try JSONEncoder().encode(user)
        try mockKeychain.save(data: "persisted_token_abc".data(using: .utf8)!, forKey: "himvote_session_token")
        try mockKeychain.save(data: userData, forKey: "himvote_user_profile")
        
        let restoredVm = AuthViewModel(apiClient: mockApiClient, keychainService: mockKeychain)
        
        XCTAssertTrue(restoredVm.isAuthenticated)
        XCTAssertEqual(restoredVm.currentUser?.userId, "restored_user_99")
    }
}

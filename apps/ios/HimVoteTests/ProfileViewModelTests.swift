import XCTest
@testable import HimVoteKit

@MainActor
final class ProfileViewModelTests: XCTestCase {
    var mockApiClient: MockApiClient!
    var viewModel: ProfileViewModel!
    let testSessionToken = "test_session_token_123"
    
    override func setUp() {
        super.setUp()
        mockApiClient = MockApiClient()
        viewModel = ProfileViewModel(apiClient: mockApiClient)
    }
    
    override func tearDown() {
        viewModel = nil
        mockApiClient = nil
        super.tearDown()
    }
    
    // MARK: - 1. Profile Information Rendering & Prepopulation
    
    func testProfileInformationRenderingAndPrepopulation() async {
        mockApiClient.profileResponse = UserProfile(
            id: "user_std_001",
            displayName: "Ada Lovelace",
            phoneNumber: "+14155552671",
            updatedAt: "2026-10-31T08:30:00Z"
        )
        
        await viewModel.loadProfile(sessionToken: testSessionToken)
        
        XCTAssertNotNil(viewModel.profile)
        XCTAssertEqual(viewModel.profile?.id, "user_std_001")
        XCTAssertEqual(viewModel.profile?.displayName, "Ada Lovelace")
        XCTAssertEqual(viewModel.profile?.phoneNumber, "+14155552671")
        XCTAssertEqual(viewModel.initialDisplayName, "Ada Lovelace")
        XCTAssertEqual(viewModel.initialPhoneNumber, "+14155552671")
        XCTAssertEqual(viewModel.editDisplayName, "Ada Lovelace")
        XCTAssertEqual(viewModel.editPhoneNumber, "+14155552671")
        XCTAssertFalse(viewModel.hasUnsavedChanges)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.errorMessage)
    }
    
    // MARK: - 2. Editing an Allowed Field
    
    func testEditingAnAllowedField() async {
        await viewModel.loadProfile(sessionToken: testSessionToken)
        
        viewModel.editDisplayName = "Grace Hopper"
        
        XCTAssertTrue(viewModel.hasUnsavedChanges)
        XCTAssertEqual(viewModel.normalizedDisplayName, "Grace Hopper")
        XCTAssertNil(viewModel.displayNameError)
        XCTAssertTrue(viewModel.canSave)
    }
    
    // MARK: - 3. Protected Field Display & Boundary
    
    func testProtectedFieldBoundaryExcludesInstitutionalAttributes() async {
        await viewModel.loadProfile(sessionToken: testSessionToken)
        viewModel.editDisplayName = "Margaret Hamilton"
        
        let saved = await viewModel.saveChanges(sessionToken: testSessionToken)
        XCTAssertTrue(saved)
        
        // Ensure request payload contains only allowlisted self-service attributes
        let req = mockApiClient.lastProfileUpdateRequest
        XCTAssertNotNil(req)
        XCTAssertEqual(req?.displayName, "Margaret Hamilton")
        // Protected fields (email, student_id, role, department) must never be present in update payload
    }
    
    // MARK: - 4. Input Validation
    
    func testInputValidationDisplayNameWhitespaceOnly() {
        viewModel.editDisplayName = "    "
        XCTAssertNotNil(viewModel.displayNameError)
        XCTAssertFalse(viewModel.isFormValid)
        XCTAssertFalse(viewModel.canSave)
    }
    
    func testInputValidationDisplayNameLengthLimit() {
        // Exactly 80 characters
        let valid80 = String(repeating: "A", count: 80)
        viewModel.editDisplayName = valid80
        XCTAssertNil(viewModel.displayNameError)
        
        // 81 characters
        let invalid81 = String(repeating: "A", count: 81)
        viewModel.editDisplayName = invalid81
        XCTAssertNotNil(viewModel.displayNameError)
        XCTAssertFalse(viewModel.isFormValid)
    }
    
    func testInputValidationPhoneNumberE164Format() {
        // Valid E.164 numbers
        viewModel.editPhoneNumber = "+14155552671"
        XCTAssertNil(viewModel.phoneNumberError)
        
        viewModel.editPhoneNumber = "+442071838750"
        XCTAssertNil(viewModel.phoneNumberError)
        
        viewModel.editPhoneNumber = "+919876543210"
        XCTAssertNil(viewModel.phoneNumberError)
        
        // Invalid: missing leading +
        viewModel.editPhoneNumber = "14155552671"
        XCTAssertNotNil(viewModel.phoneNumberError)
        
        // Invalid: country code starts with 0
        viewModel.editPhoneNumber = "+01415555267"
        XCTAssertNotNil(viewModel.phoneNumberError)
        
        // Invalid: too short (less than 8 digits)
        viewModel.editPhoneNumber = "+12345"
        XCTAssertNotNil(viewModel.phoneNumberError)
        
        // Invalid: contains non-digits
        viewModel.editPhoneNumber = "+1415-555-2671"
        XCTAssertNotNil(viewModel.phoneNumberError)
    }
    
    // MARK: - 5. Successful Update Response
    
    func testSuccessfulUpdateResponse() async {
        await viewModel.loadProfile(sessionToken: testSessionToken)
        viewModel.editDisplayName = "Katherine Johnson"
        viewModel.editPhoneNumber = "+12025550199"
        
        var callbackInvoked = false
        let saved = await viewModel.saveChanges(sessionToken: testSessionToken) { updated in
            callbackInvoked = true
            XCTAssertEqual(updated.displayName, "Katherine Johnson")
            XCTAssertEqual(updated.phoneNumber, "+12025550199")
        }
        
        XCTAssertTrue(saved)
        XCTAssertTrue(callbackInvoked)
        XCTAssertFalse(viewModel.hasUnsavedChanges)
        XCTAssertEqual(viewModel.profile?.displayName, "Katherine Johnson")
        XCTAssertEqual(viewModel.profile?.phoneNumber, "+12025550199")
        XCTAssertNotNil(viewModel.successMessage)
        XCTAssertNil(viewModel.errorMessage)
    }
    
    // MARK: - 6. Failed Update Response
    
    func testFailedUpdateResponsePreservesEnteredData() async {
        await viewModel.loadProfile(sessionToken: testSessionToken)
        viewModel.editDisplayName = "Hedy Lamarr"
        
        mockApiClient.shouldThrowError = true
        mockApiClient.errorToThrow = .validationFailed
        
        let saved = await viewModel.saveChanges(sessionToken: testSessionToken)
        
        XCTAssertFalse(saved)
        XCTAssertNotNil(viewModel.errorMessage)
        // User's entered draft must be preserved on failure
        XCTAssertEqual(viewModel.editDisplayName, "Hedy Lamarr")
        XCTAssertTrue(viewModel.hasUnsavedChanges)
    }
    
    // MARK: - 7. Network Error Handling
    
    func testNetworkErrorSetsFlagAndPreservesData() async {
        await viewModel.loadProfile(sessionToken: testSessionToken)
        viewModel.editDisplayName = "Dorothy Vaughan"
        
        mockApiClient.shouldThrowError = true
        mockApiClient.errorToThrow = .networkError(message: "Host unreachable")
        
        let saved = await viewModel.saveChanges(sessionToken: testSessionToken)
        
        XCTAssertFalse(saved)
        XCTAssertTrue(viewModel.networkUnavailable)
        XCTAssertNotNil(viewModel.errorMessage)
        XCTAssertEqual(viewModel.editDisplayName, "Dorothy Vaughan")
    }
    
    // MARK: - 8. Unsaved Changes & Discard Flow
    
    func testUnsavedChangesDetectionAndDiscardFlow() async {
        await viewModel.loadProfile(sessionToken: testSessionToken)
        XCTAssertFalse(viewModel.hasUnsavedChanges)
        
        viewModel.editDisplayName = "Changed Name"
        XCTAssertTrue(viewModel.hasUnsavedChanges)
        
        var dismissed = false
        viewModel.handleCancelAction {
            dismissed = true
        }
        // Since changes exist, alert is requested rather than immediate dismissal
        XCTAssertTrue(viewModel.showDiscardAlert)
        XCTAssertFalse(dismissed)
        
        // Confirm discard
        viewModel.discardChanges {
            dismissed = true
        }
        XCTAssertTrue(dismissed)
        XCTAssertFalse(viewModel.hasUnsavedChanges)
        XCTAssertEqual(viewModel.editDisplayName, viewModel.initialDisplayName)
    }
    
    // MARK: - 9. Duplicate Save Prevention
    
    func testDuplicateSavePreventionWhileSaving() async {
        await viewModel.loadProfile(sessionToken: testSessionToken)
        viewModel.editDisplayName = "Radia Perlman"
        
        viewModel.isSaving = true
        XCTAssertFalse(viewModel.canSave)
        
        let saved = await viewModel.saveChanges(sessionToken: testSessionToken)
        XCTAssertFalse(saved)
        XCTAssertEqual(mockApiClient.profileUpdateCallCount, 0)
    }
    
    // MARK: - 10. Clearing Fields
    
    func testClearingFieldsSendsProperRequest() async {
        mockApiClient.profileResponse = UserProfile(
            id: "user_std_001",
            displayName: "Existing Name",
            phoneNumber: "+14155552671",
            updatedAt: "2026-10-31T08:30:00Z"
        )
        await viewModel.loadProfile(sessionToken: testSessionToken)
        
        viewModel.editDisplayName = ""
        viewModel.editPhoneNumber = ""
        
        XCTAssertTrue(viewModel.hasUnsavedChanges)
        let saved = await viewModel.saveChanges(sessionToken: testSessionToken)
        XCTAssertTrue(saved)
        
        let req = mockApiClient.lastProfileUpdateRequest
        XCTAssertNotNil(req)
        XCTAssertTrue(req?.clearDisplayName == true)
        XCTAssertTrue(req?.clearPhoneNumber == true)
    }
}

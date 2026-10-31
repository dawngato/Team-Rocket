import Foundation
import Observation

@Observable
@MainActor
public final class ProfileViewModel {
    // Current Authoritative Profile
    public private(set) var profile: UserProfile?
    
    // Asynchronous States
    public var isLoading: Bool = false
    public var isSaving: Bool = false
    public var errorMessage: String?
    public var successMessage: String?
    public var networkUnavailable: Bool = false
    
    // Form Editing State
    public var editDisplayName: String = "" {
        didSet {
            validateDisplayName()
        }
    }
    public var editPhoneNumber: String = "" {
        didSet {
            validatePhoneNumber()
        }
    }
    
    // Field-specific validation errors
    public var displayNameError: String?
    public var phoneNumberError: String?
    
    // Baseline tracking for dirty state detection
    public private(set) var initialDisplayName: String = ""
    public private(set) var initialPhoneNumber: String = ""
    
    // Dialog and Sheet Presentation States
    public var showDiscardAlert: Bool = false
    public var isEditingPresented: Bool = false
    
    private let apiClient: ApiClientProtocol
    
    public init(apiClient: ApiClientProtocol = ApiClient()) {
        self.apiClient = apiClient
    }
    
    // MARK: - Validation
    
    public var normalizedDisplayName: String {
        editDisplayName
            .components(separatedBy: .whitespacesAndNewlines)
            .filter { !$0.isEmpty }
            .joined(separator: " ")
    }
    
    public var normalizedPhoneNumber: String {
        editPhoneNumber.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    
    public func validateDisplayName() {
        let trimmed = editDisplayName.trimmingCharacters(in: .whitespacesAndNewlines)
        if editDisplayName.isEmpty {
            displayNameError = nil
            return
        }
        
        // Whitespace-only values are invalid
        if trimmed.isEmpty {
            displayNameError = "Display name cannot consist of whitespace only."
            return
        }
        
        let normalized = normalizedDisplayName
        if normalized.count > 80 {
            displayNameError = "Display name must be at most 80 characters (\(normalized.count)/80)."
            return
        }
        
        displayNameError = nil
    }
    
    public func validatePhoneNumber() {
        let phone = normalizedPhoneNumber
        if phone.isEmpty {
            phoneNumberError = nil
            return
        }
        
        guard phone.hasPrefix("+") else {
            phoneNumberError = "Phone number must use E.164 format starting with '+' (e.g. +14155552671)."
            return
        }
        
        let digits = phone.dropFirst()
        guard digits.allSatisfy({ $0.isASCII && $0.isNumber }) else {
            phoneNumberError = "Phone number must contain digits only after '+'."
            return
        }
        
        guard let firstDigit = digits.first, firstDigit != "0" else {
            phoneNumberError = "Country code digit cannot start with 0."
            return
        }
        
        guard digits.count >= 8 && digits.count <= 15 else {
            phoneNumberError = "Phone number must contain between 8 and 15 digits (\(digits.count) entered)."
            return
        }
        
        phoneNumberError = nil
    }
    
    public var isFormValid: Bool {
        displayNameError == nil && phoneNumberError == nil
    }
    
    public var hasUnsavedChanges: Bool {
        normalizedDisplayName != initialDisplayName || normalizedPhoneNumber != initialPhoneNumber
    }
    
    public var canSave: Bool {
        hasUnsavedChanges && !isSaving && isFormValid
    }
    
    // MARK: - Lifecycle & Editing Handlers
    
    public func prepareForEditing() {
        initialDisplayName = profile?.displayName ?? ""
        initialPhoneNumber = profile?.phoneNumber ?? ""
        editDisplayName = initialDisplayName
        editPhoneNumber = initialPhoneNumber
        displayNameError = nil
        phoneNumberError = nil
        errorMessage = nil
        successMessage = nil
        networkUnavailable = false
    }
    
    public func loadProfile(sessionToken: String) async {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil
        networkUnavailable = false
        
        do {
            let fetched = try await apiClient.fetchProfile(sessionToken: sessionToken)
            self.profile = fetched
            self.initialDisplayName = fetched.displayName ?? ""
            self.initialPhoneNumber = fetched.phoneNumber ?? ""
            if !isEditingPresented {
                self.editDisplayName = self.initialDisplayName
                self.editPhoneNumber = self.initialPhoneNumber
            }
        } catch let apiError as ApiError {
            switch apiError {
            case .networkError, .certificatePinningFailed:
                self.networkUnavailable = true
                self.errorMessage = "Unable to connect to identity service. Verify your connection."
            case .unauthorized:
                self.errorMessage = "Your session has expired. Please sign in again."
            case .rateLimited:
                self.errorMessage = "Too many requests. Please wait a few moments."
            default:
                self.errorMessage = apiError.localizedDescription
            }
        } catch {
            self.errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    public func saveChanges(
        sessionToken: String,
        onSuccess: ((UserProfile) -> Void)? = nil
    ) async -> Bool {
        // Enforce validation and prevent duplicate / invalid submissions
        validateDisplayName()
        validatePhoneNumber()
        
        guard canSave else { return false }
        
        isSaving = true
        errorMessage = nil
        successMessage = nil
        networkUnavailable = false
        
        let newName = normalizedDisplayName
        let newPhone = normalizedPhoneNumber
        
        var request = ProfileUpdateRequest()
        var hasAtLeastOneField = false
        
        if newName != initialDisplayName {
            hasAtLeastOneField = true
            if newName.isEmpty {
                request.clearDisplayName = true
            } else {
                request.displayName = newName
            }
        }
        
        if newPhone != initialPhoneNumber {
            hasAtLeastOneField = true
            if newPhone.isEmpty {
                request.clearPhoneNumber = true
            } else {
                request.phoneNumber = newPhone
            }
        }
        
        guard hasAtLeastOneField else {
            isSaving = false
            return false
        }
        
        do {
            let updated = try await apiClient.updateProfile(request: request, sessionToken: sessionToken)
            self.profile = updated
            self.initialDisplayName = updated.displayName ?? ""
            self.initialPhoneNumber = updated.phoneNumber ?? ""
            self.editDisplayName = self.initialDisplayName
            self.editPhoneNumber = self.initialPhoneNumber
            self.successMessage = "Profile updated successfully."
            self.isSaving = false
            onSuccess?(updated)
            return true
        } catch let apiError as ApiError {
            switch apiError {
            case .networkError, .certificatePinningFailed:
                self.networkUnavailable = true
                self.errorMessage = "Network connection failed. Your changes were kept."
            case .rateLimited:
                self.errorMessage = "Too many profile updates (limit: 20 per 5 min). Please try again shortly."
            case .validationFailed:
                self.errorMessage = "Server validation failed. Review the entered fields."
            case .unauthorized:
                self.errorMessage = "Authentication expired. Sign in again to save."
            default:
                self.errorMessage = apiError.localizedDescription
            }
        } catch {
            self.errorMessage = error.localizedDescription
        }
        
        isSaving = false
        return false
    }
    
    public func handleCancelAction(dismiss: () -> Void) {
        if hasUnsavedChanges {
            showDiscardAlert = true
        } else {
            dismiss()
        }
    }
    
    public func discardChanges(dismiss: () -> Void) {
        editDisplayName = initialDisplayName
        editPhoneNumber = initialPhoneNumber
        displayNameError = nil
        phoneNumberError = nil
        showDiscardAlert = false
        dismiss()
    }
}

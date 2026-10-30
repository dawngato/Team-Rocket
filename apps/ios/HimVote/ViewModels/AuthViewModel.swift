import Foundation
import Observation

@Observable
@MainActor
public final class AuthViewModel {
    public var currentUser: User?
    public var isAuthenticated: Bool = false
    public var isLoading: Bool = false
    public var errorMessage: String?
    public var mfaRequired: Bool = false
    public var pendingMfaEmail: String?
    
    private let apiClient: ApiClientProtocol
    private let keychainService: KeychainServiceProtocol
    
    private static let sessionTokenKey = "himvote_session_token"
    private static let userProfileKey = "himvote_user_profile"
    
    public init(
        apiClient: ApiClientProtocol = ApiClient(),
        keychainService: KeychainServiceProtocol = KeychainService.shared
    ) {
        self.apiClient = apiClient
        self.keychainService = keychainService
        self.restoreSession()
    }
    
    public func restoreSession() {
        do {
            let tokenData = try keychainService.read(forKey: Self.sessionTokenKey)
            guard let token = String(data: tokenData, encoding: .utf8), !token.isEmpty else {
                return
            }
            
            let userData = try keychainService.read(forKey: Self.userProfileKey)
            let user = try JSONDecoder().decode(User.self, from: userData)
            
            self.currentUser = user
            self.isAuthenticated = true
        } catch {
            self.currentUser = nil
            self.isAuthenticated = false
        }
    }
    
    public func login(email: String, password: String, mfaToken: String? = nil) async {
        isLoading = true
        errorMessage = nil
        
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedPassword = password.trimmingCharacters(in: .whitespacesAndNewlines)
        
        guard !trimmedEmail.isEmpty, !trimmedPassword.isEmpty else {
            errorMessage = "Email and password cannot be empty."
            isLoading = false
            return
        }
        
        let request = LoginRequest(
            email: trimmedEmail,
            password: trimmedPassword,
            mfaToken: mfaToken
        )
        
        do {
            let response = try await apiClient.login(request: request)
            
            if response.mfaRequired && (mfaToken == nil || mfaToken?.isEmpty == true) {
                self.mfaRequired = true
                self.pendingMfaEmail = trimmedEmail
                self.isLoading = false
                return
            }
            
            let user = User(
                userId: response.userId,
                email: trimmedEmail,
                role: response.userRole,
                sessionToken: response.sessionToken,
                mfaRequired: response.mfaRequired
            )
            
            if let tokenData = response.sessionToken.data(using: .utf8) {
                try keychainService.save(data: tokenData, forKey: Self.sessionTokenKey)
            }
            
            let userProfileData = try JSONEncoder().encode(user)
            try keychainService.save(data: userProfileData, forKey: Self.userProfileKey)
            
            self.currentUser = user
            self.isAuthenticated = true
            self.mfaRequired = false
            self.pendingMfaEmail = nil
        } catch {
            self.errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    public func logout() async {
        isLoading = true
        if let token = currentUser?.sessionToken {
            try? await apiClient.logout(sessionToken: token)
        }
        
        try? keychainService.delete(forKey: Self.sessionTokenKey)
        try? keychainService.delete(forKey: Self.userProfileKey)
        
        self.currentUser = nil
        self.isAuthenticated = false
        self.mfaRequired = false
        self.pendingMfaEmail = nil
        self.errorMessage = nil
        self.isLoading = false
    }
    
    public func clearError() {
        self.errorMessage = nil
    }
}

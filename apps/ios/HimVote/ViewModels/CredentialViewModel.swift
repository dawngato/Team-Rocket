import Foundation
import Observation
import CryptoKit

@Observable
@MainActor
public final class CredentialViewModel {
    public var currentCredential: Credential?
    public var isEligible: Bool = false
    public var isRequesting: Bool = false
    public var issuanceStatus: CredentialStatus = .reserved
    public var errorMessage: String?
    public var successMessage: String?
    
    public var issuedCredential: Credential? {
        currentCredential
    }
    
    public var isLoading: Bool {
        isRequesting
    }
    
    public func requestCredential(electionId: String, sessionToken: String) async {
        await requestBlindIssuance(electionId: electionId, sessionToken: sessionToken)
    }
    
    private let apiClient: ApiClientProtocol
    private let keychainService: KeychainServiceProtocol
    
    public init(
        apiClient: ApiClientProtocol = ApiClient(),
        keychainService: KeychainServiceProtocol = KeychainService.shared
    ) {
        self.apiClient = apiClient
        self.keychainService = keychainService
    }
    
    public func credentialStorageKey(for electionId: String) -> String {
        return "himvote_credential_\(electionId)"
    }
    
    public func loadStoredCredential(electionId: String) {
        do {
            let cred = try keychainService.readCredential(forElectionId: electionId)
            self.currentCredential = cred
            self.issuanceStatus = cred.status
        } catch {
            self.currentCredential = nil
            self.issuanceStatus = .reserved
        }
    }
    
    public func checkEligibility(electionId: String, sessionToken: String) async {
        errorMessage = nil
        do {
            let rosterResponse = try await apiClient.fetchRosterMe(sessionToken: sessionToken)
            if let electionRoster = rosterResponse.elections.first(where: { $0.electionId == electionId }) {
                self.isEligible = electionRoster.eligible
            } else {
                self.isEligible = rosterResponse.eligible
            }
        } catch {
            self.errorMessage = error.localizedDescription
            self.isEligible = false
        }
    }
    
    public func requestBlindIssuance(electionId: String, sessionToken: String) async {
        isRequesting = true
        errorMessage = nil
        successMessage = nil
        issuanceStatus = .signing
        
        do {
            var randomSecretBytes = [UInt8](repeating: 0, count: 32)
            let status = SecRandomCopyBytes(kSecRandomDefault, randomSecretBytes.count, &randomSecretBytes)
            guard status == errSecSuccess else {
                throw KeychainError.unhandledError(status: status)
            }
            
            let blindedSecretData = Data(randomSecretBytes)
            let blindedRequestB64 = blindedSecretData.base64EncodedString()
            
            let request = BlindedIssuanceRequest(
                electionId: electionId,
                blindedRequest: blindedRequestB64
            )
            
            let response = try await apiClient.requestBlindIssuance(request: request, sessionToken: sessionToken)
            self.issuanceStatus = response.status
            
            var completedStatus = response.status
            var attempts = 0
            while !completedStatus.isComplete && attempts < 10 {
                try await Task.sleep(nanoseconds: 500_000_000)
                let pollResult = try await apiClient.fetchIssuanceStatus(electionId: electionId, sessionToken: sessionToken)
                completedStatus = pollResult.credentialStatus
                self.issuanceStatus = completedStatus
                attempts += 1
            }
            
            let credential = Credential(
                electionId: electionId,
                blindSignatureResponse: response.blindSignatureResponse,
                blindedSecret: blindedSecretData.base64EncodedString(),
                unblindedSignature: response.blindSignatureResponse,
                status: .delivered,
                issuedAtUtc: ISO8601DateFormatter().string(from: Date())
            )
            
            try keychainService.saveCredential(credential, forElectionId: electionId)
            
            self.currentCredential = credential
            self.issuanceStatus = .delivered
            self.successMessage = "Credential issued and stored in Keychain."
        } catch {
            self.errorMessage = error.localizedDescription
            self.issuanceStatus = .reserved
        }
        
        isRequesting = false
    }
}

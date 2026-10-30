import Foundation
import AuthenticationServices
import SafariServices
import SwiftUI

public struct BoothArtifacts: Sendable, Equatable {
    public let electionId: String
    public let credentialProofB64url: String
    public let engineBallotB64url: String
    public let engineProofsB64url: String
    public let stateToken: String
    
    public init(
        electionId: String,
        credentialProofB64url: String,
        engineBallotB64url: String,
        engineProofsB64url: String,
        stateToken: String
    ) {
        self.electionId = electionId
        self.credentialProofB64url = credentialProofB64url
        self.engineBallotB64url = engineBallotB64url
        self.engineProofsB64url = engineProofsB64url
        self.stateToken = stateToken
    }
}

public enum BoothError: LocalizedError, Sendable, Equatable {
    case invalidBoothUrl
    case sessionCancelled
    case stateMismatch
    case electionMismatch
    case missingArtifacts(detail: String)
    case presentationFailure
    case invalidReturnUrl
    
    public var errorDescription: String? {
        switch self {
        case .invalidBoothUrl:
            return "Unable to assemble a valid web voting booth URL."
        case .sessionCancelled:
            return "The secure voting booth session was cancelled by the voter."
        case .stateMismatch:
            return "Booth return state token does not match the active session security challenge."
        case .electionMismatch:
            return "Returned election identifier does not match the active election session."
        case .missingArtifacts(let detail):
            return "Voting booth did not return the required cryptographic artifacts: \(detail)"
        case .presentationFailure:
            return "Could not present the secure authentication booth session window."
        case .invalidReturnUrl:
            return "The universal link or redirect returned from the booth was malformed."
        }
    }
}

public protocol BoothSessionHandling: Sendable {
    func launchBoothSession(
        boothBaseUrl: URL,
        electionId: String,
        credentialProof: String
    ) async throws -> BoothArtifacts
    
    func parseReturnUrl(_ url: URL, expectedState: String) throws -> BoothArtifacts
    func parseReturnUrl(_ url: URL, expectedElectionId: String?, expectedState: String) throws -> BoothArtifacts
}

public extension BoothSessionHandling {
    func parseReturnUrl(_ url: URL, expectedElectionId: String?, expectedState: String) throws -> BoothArtifacts {
        try parseReturnUrl(url, expectedState: expectedState)
    }
}

@MainActor
public final class BoothSessionHandler: NSObject, BoothSessionHandling, ASWebAuthenticationPresentationContextProviding {
    public static let shared = BoothSessionHandler()
    
    public let callbackScheme: String
    private var activeAuthSession: ASWebAuthenticationSession?
    private var presentationAnchorWindow: UIWindow?
    
    public init(callbackScheme: String = "himvote") {
        self.callbackScheme = callbackScheme
        super.init()
    }
    
    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        if let window = presentationAnchorWindow {
            return window
        }
        
        let scenes = UIApplication.shared.connectedScenes
        let windowScene = scenes.first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene
        let window = windowScene?.windows.first(where: { $0.isKeyWindow }) ?? UIWindow()
        return window
    }
    
    public func setPresentationWindow(_ window: UIWindow?) {
        self.presentationAnchorWindow = window
    }
    
    public func generateSecureStateToken() -> String {
        var randomBytes = [UInt8](repeating: 0, count: 32)
        let status = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
        if status == errSecSuccess {
            return randomBytes.map { String(format: "%02x", $0) }.joined()
        }
        let fallback = UUID().uuidString
        var sanitized = ""
        for char in fallback {
            if char != "-" {
                sanitized.append(char)
            }
        }
        return sanitized.lowercased()
    }
    
    public func launchBoothSession(
        boothBaseUrl: URL,
        electionId: String,
        credentialProof: String
    ) async throws -> BoothArtifacts {
        let stateToken = generateSecureStateToken()
        
        var components = URLComponents(url: boothBaseUrl, resolvingAgainstBaseURL: false)
        var items = components?.queryItems ?? []
        items.append(URLQueryItem(name: "election_id", value: electionId))
        // Credential proof is intentionally kept out of navigation URLs. The
        // deployed booth must receive it through a same-origin back channel or
        // a short-lived opaque handoff.
        guard !credentialProof.isEmpty else {
            throw BoothError.missingArtifacts(detail: "credential proof is required for a secure back-channel handoff")
        }
        items.append(URLQueryItem(name: "state", value: stateToken))
        items.append(URLQueryItem(name: "redirect_uri", value: "\(callbackScheme)://booth_return"))
        components?.queryItems = items
        
        guard let finalUrl = components?.url else {
            throw BoothError.invalidBoothUrl
        }
        
        return try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(
                url: finalUrl,
                callbackURLScheme: callbackScheme
            ) { [weak self] callbackUrl, error in
                guard let self = self else {
                    continuation.resume(throwing: BoothError.presentationFailure)
                    return
                }
                
                self.activeAuthSession = nil
                
                if let error = error {
                    if let authError = error as? ASWebAuthenticationSessionError,
                       authError.code == .canceledLogin {
                        continuation.resume(throwing: BoothError.sessionCancelled)
                    } else {
                        continuation.resume(throwing: error)
                    }
                    return
                }
                
                guard let callbackUrl = callbackUrl else {
                    continuation.resume(throwing: BoothError.invalidReturnUrl)
                    return
                }
                
                do {
                    let artifacts = try self.parseReturnUrl(
                        callbackUrl,
                        expectedElectionId: electionId,
                        expectedState: stateToken
                    )
                    continuation.resume(returning: artifacts)
                } catch {
                    continuation.resume(throwing: error)
                }
            }
            
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = true
            self.activeAuthSession = session
            
            let started = session.start()
            if !started {
                self.activeAuthSession = nil
                continuation.resume(throwing: BoothError.presentationFailure)
            }
        }
    }
    
    public func parseReturnUrl(_ url: URL, expectedState: String) throws -> BoothArtifacts {
        try parseReturnUrl(url, expectedElectionId: nil, expectedState: expectedState)
    }
    
    public func parseReturnUrl(
        _ url: URL,
        expectedElectionId: String?,
        expectedState: String
    ) throws -> BoothArtifacts {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            throw BoothError.invalidReturnUrl
        }
        
        var queryDict: [String: String] = [:]
        
        if let queryItems = components.queryItems {
            for item in queryItems {
                if let value = item.value {
                    queryDict[item.name] = value
                }
            }
        }
        
        if let fragment = components.fragment, !fragment.isEmpty {
            let dummy = URL(string: "https://local.auth?" + fragment)
            if let fragmentComponents = dummy.flatMap({ URLComponents(url: $0, resolvingAgainstBaseURL: false) }),
               let fragmentItems = fragmentComponents.queryItems {
                for item in fragmentItems {
                    if let value = item.value {
                        queryDict[item.name] = value
                    }
                }
            }
        }
        
        guard let returnedState = queryDict["state"], returnedState == expectedState else {
            throw BoothError.stateMismatch
        }
        
        guard let electionId = queryDict["election_id"] else {
            throw BoothError.missingArtifacts(detail: "missing election_id")
        }
        
        if let expectedElectionId = expectedElectionId, electionId != expectedElectionId {
            throw BoothError.electionMismatch
        }
        
        let secretArtifactKeys = [
            "credential_proof_b64url", "credential_proof",
            "engine_ballot_b64url", "engine_ballot",
            "engine_proofs_b64url", "engine_proofs"
        ]
        if secretArtifactKeys.contains(where: { queryDict[$0] != nil }) {
            throw BoothError.missingArtifacts(
                detail: "cryptographic artifacts must not be returned in a URL; use the authenticated back-channel handoff"
            )
        }

        // The current iOS client intentionally fails closed until the deployed
        // booth exposes a native back-channel handoff. A URL callback can carry
        // only the opaque state and election binding, never ballot material.
        throw BoothError.missingArtifacts(
            detail: "secure back-channel handoff is not configured for this build"
        )
    }
}

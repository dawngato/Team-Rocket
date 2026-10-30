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
    
    public func launchBoothSession(
        boothBaseUrl: URL,
        electionId: String,
        credentialProof: String
    ) async throws -> BoothArtifacts {
        let stateToken = UUID().uuidString.replacingOccurrences(of: "-", with: "")
        
        var components = URLComponents(url: boothBaseUrl, resolvingAgainstBaseURL: false)
        var items = components?.queryItems ?? []
        items.append(URLQueryItem(name: "election_id", value: electionId))
        items.append(URLQueryItem(name: "credential_proof", value: credentialProof))
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
                    let artifacts = try self.parseReturnUrl(callbackUrl, expectedState: stateToken)
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
                continuation.resume(throwing: BoothError.presentationFailure)
            }
        }
    }
    
    public func parseReturnUrl(_ url: URL, expectedState: String) throws -> BoothArtifacts {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let queryItems = components.queryItems else {
            throw BoothError.invalidReturnUrl
        }
        
        let queryDict = Dictionary(uniqueKeysWithValues: queryItems.compactMap { item in
            item.value.map { (item.name, $0) }
        })
        
        guard let returnedState = queryDict["state"], returnedState == expectedState else {
            throw BoothError.stateMismatch
        }
        
        guard let electionId = queryDict["election_id"] else {
            throw BoothError.missingArtifacts(detail: "missing election_id")
        }
        
        guard let credentialProof = queryDict["credential_proof_b64url"] ?? queryDict["credential_proof"] else {
            throw BoothError.missingArtifacts(detail: "missing credential_proof_b64url")
        }
        
        guard let engineBallot = queryDict["engine_ballot_b64url"] ?? queryDict["engine_ballot"] else {
            throw BoothError.missingArtifacts(detail: "missing engine_ballot_b64url")
        }
        
        guard let engineProofs = queryDict["engine_proofs_b64url"] ?? queryDict["engine_proofs"] else {
            throw BoothError.missingArtifacts(detail: "missing engine_proofs_b64url")
        }
        
        return BoothArtifacts(
            electionId: electionId,
            credentialProofB64url: credentialProof,
            engineBallotB64url: engineBallot,
            engineProofsB64url: engineProofs,
            stateToken: returnedState
        )
    }
}

import Foundation
import CryptoKit
import Security

public enum ApiError: LocalizedError, Sendable, Equatable {
    case invalidUrl
    case certificatePinningFailed
    case unauthorized
    case forbidden
    case notFound
    case rateLimited
    case serverError(statusCode: Int, message: String)
    case decodingError(message: String)
    case networkError(message: String)
    
    public var errorDescription: String? {
        switch self {
        case .invalidUrl:
            return "The requested network resource URL is invalid."
        case .certificatePinningFailed:
            return "TLS Certificate pinning verification failed for host."
        case .unauthorized:
            return "Authentication is required or the session token has expired."
        case .forbidden:
            return "You do not have administrative authority to perform this operation."
        case .notFound:
            return "The requested election resource was not found on the platform."
        case .rateLimited:
            return "Too many requests. Please wait before attempting again."
        case .serverError(let statusCode, let message):
            return "Platform server error \(statusCode): \(message)"
        case .decodingError(let message):
            return "Failed to parse platform response payload: \(message)"
        case .networkError(let message):
            return "Network communication failure: \(message)"
        }
    }
}

public final class CertificatePinningDelegate: NSObject, URLSessionDelegate, @unchecked Sendable {
    private let pinnedPublicKeyHashes: Set<String>
    private let allowSelfSignedForTesting: Bool
    
    public init(
        pinnedPublicKeyHashes: Set<String> = [],
        allowSelfSignedForTesting: Bool = false
    ) {
        self.pinnedPublicKeyHashes = pinnedPublicKeyHashes
        self.allowSelfSignedForTesting = allowSelfSignedForTesting
        super.init()
    }
    
    public func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping @Sendable (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let serverTrust = challenge.protectionSpace.serverTrust else {
            completionHandler(.performDefaultHandling, nil)
            return
        }
        
        var error: CFError?
        let isTrusted = SecTrustEvaluateWithError(serverTrust, &error)
        
        if allowSelfSignedForTesting {
            completionHandler(.useCredential, URLCredential(trust: serverTrust))
            return
        }
        
        guard isTrusted else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        
        if pinnedPublicKeyHashes.isEmpty {
            completionHandler(.useCredential, URLCredential(trust: serverTrust))
            return
        }
        
        let certificateCount = SecTrustGetCertificateCount(serverTrust)
        var matched = false
        
        for index in 0..<certificateCount {
            guard let certificate = SecTrustGetCertificateAtIndex(serverTrust, index) else {
                continue
            }
            
            let certData = SecCertificateCopyData(certificate) as Data
            let hash = SHA256.hash(data: certData)
            let base64Hash = Data(hash).base64EncodedString()
            
            if pinnedPublicKeyHashes.contains(base64Hash) {
                matched = true
                break
            }
            
            if let publicKey = SecCertificateCopyKey(certificate),
               let keyData = SecKeyCopyExternalRepresentation(publicKey, nil) as Data? {
                let keyHash = SHA256.hash(data: keyData)
                let keyBase64 = Data(keyHash).base64EncodedString()
                if pinnedPublicKeyHashes.contains(keyBase64) {
                    matched = true
                    break
                }
            }
        }
        
        if matched {
            completionHandler(.useCredential, URLCredential(trust: serverTrust))
        } else {
            completionHandler(.cancelAuthenticationChallenge, nil)
        }
    }
}

public protocol ApiClientProtocol: Sendable {
    func login(request: LoginRequest) async throws -> LoginResponse
    func logout(sessionToken: String) async throws
    func fetchRosterMe(sessionToken: String) async throws -> RosterMeResponse
    func fetchElections(sessionToken: String) async throws -> [ElectionSummary]
    func fetchElection(id: String, sessionToken: String) async throws -> Election
    func requestBlindIssuance(request: BlindedIssuanceRequest, sessionToken: String) async throws -> BlindedIssuanceResponse
    func fetchIssuanceStatus(electionId: String, sessionToken: String) async throws -> IssuanceStatusResponse
    func castBallot(request: CastBallotRequest) async throws -> CastBallotResponse
    func fetchReceiptStatus(electionId: String, handle: String) async throws -> ReceiptStatusResponse
    func fetchResults(electionId: String, sessionToken: String) async throws -> PublishedResults
    func fetchEvidence(electionId: String, sessionToken: String) async throws -> EvidencePackage
}

public final class ApiClient: ApiClientProtocol, @unchecked Sendable {
    public let identityBaseUrl: URL
    public let castingBaseUrl: URL
    private let session: URLSession
    private let jsonDecoder: JSONDecoder
    private let jsonEncoder: JSONEncoder
    
    public init(
        identityBaseUrl: URL = URL(string: "http://localhost:8080")!,
        castingBaseUrl: URL = URL(string: "http://localhost:8080")!,
        pinnedPublicKeyHashes: Set<String> = [],
        allowSelfSignedForTesting: Bool = true
    ) {
        self.identityBaseUrl = identityBaseUrl
        self.castingBaseUrl = castingBaseUrl
        
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 30.0
        config.timeoutIntervalForResource = 60.0
        
        let delegate = CertificatePinningDelegate(
            pinnedPublicKeyHashes: pinnedPublicKeyHashes,
            allowSelfSignedForTesting: allowSelfSignedForTesting
        )
        self.session = URLSession(configuration: config, delegate: delegate, delegateQueue: nil)
        
        self.jsonDecoder = JSONDecoder()
        self.jsonEncoder = JSONEncoder()
    }
    
    public init(session: URLSession, identityBaseUrl: URL, castingBaseUrl: URL) {
        self.session = session
        self.identityBaseUrl = identityBaseUrl
        self.castingBaseUrl = castingBaseUrl
        self.jsonDecoder = JSONDecoder()
        self.jsonEncoder = JSONEncoder()
    }
    
    private func executeRequest<T: Decodable>(
        url: URL,
        method: String,
        body: Data? = nil,
        sessionToken: String? = nil
    ) async throws -> T {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        if let token = sessionToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            request.httpBody = body
        }
        
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch let urlError as URLError where urlError.code == .serverCertificateUntrusted {
            throw ApiError.certificatePinningFailed
        } catch {
            throw ApiError.networkError(message: error.localizedDescription)
        }
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw ApiError.networkError(message: "Invalid response from server")
        }
        
        switch httpResponse.statusCode {
        case 200, 201, 202:
            do {
                return try jsonDecoder.decode(T.self, from: data)
            } catch {
                throw ApiError.decodingError(message: error.localizedDescription)
            }
        case 401:
            throw ApiError.unauthorized
        case 403:
            throw ApiError.forbidden
        case 404:
            throw ApiError.notFound
        case 429:
            throw ApiError.rateLimited
        default:
            let message = String(data: data, encoding: .utf8) ?? "Unknown server error"
            throw ApiError.serverError(statusCode: httpResponse.statusCode, message: message)
        }
    }
    
    public func login(request: LoginRequest) async throws -> LoginResponse {
        let endpoint = identityBaseUrl.appendingPathComponent("v1/auth/login")
        let body = try jsonEncoder.encode(request)
        return try await executeRequest(url: endpoint, method: "POST", body: body)
    }
    
    public func logout(sessionToken: String) async throws {
        let endpoint = identityBaseUrl.appendingPathComponent("v1/auth/logout")
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("Bearer \(sessionToken)", forHTTPHeaderField: "Authorization")
        
        let (_, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw ApiError.unauthorized
        }
    }
    
    public func fetchRosterMe(sessionToken: String) async throws -> RosterMeResponse {
        let endpoint = identityBaseUrl.appendingPathComponent("v1/roster/me")
        return try await executeRequest(url: endpoint, method: "GET", sessionToken: sessionToken)
    }
    
    public func fetchElections(sessionToken: String) async throws -> [ElectionSummary] {
        let endpoint = identityBaseUrl.appendingPathComponent("v1/elections")
        let response: ElectionList = try await executeRequest(url: endpoint, method: "GET", sessionToken: sessionToken)
        return response.elections
    }
    
    public func fetchElection(id: String, sessionToken: String) async throws -> Election {
        let endpoint = identityBaseUrl.appendingPathComponent("v1/elections").appendingPathComponent(id)
        return try await executeRequest(url: endpoint, method: "GET", sessionToken: sessionToken)
    }
    
    public func requestBlindIssuance(request: BlindedIssuanceRequest, sessionToken: String) async throws -> BlindedIssuanceResponse {
        let endpoint = identityBaseUrl.appendingPathComponent("v1/credentials/issue")
        let body = try jsonEncoder.encode(request)
        return try await executeRequest(url: endpoint, method: "POST", body: body, sessionToken: sessionToken)
    }
    
    public func fetchIssuanceStatus(electionId: String, sessionToken: String) async throws -> IssuanceStatusResponse {
        var components = URLComponents(url: identityBaseUrl.appendingPathComponent("v1/credentials/issuance-status"), resolvingAgainstBaseURL: false)
        components?.queryItems = [URLQueryItem(name: "election_id", value: electionId)]
        guard let url = components?.url else {
            throw ApiError.invalidUrl
        }
        return try await executeRequest(url: url, method: "GET", sessionToken: sessionToken)
    }
    
    public func castBallot(request: CastBallotRequest) async throws -> CastBallotResponse {
        let endpoint = castingBaseUrl
            .appendingPathComponent("v1/cast")
            .appendingPathComponent(request.electionId)
            .appendingPathComponent("ballots")
        let body = try jsonEncoder.encode(request)
        return try await executeRequest(url: endpoint, method: "POST", body: body)
    }
    
    public func fetchReceiptStatus(electionId: String, handle: String) async throws -> ReceiptStatusResponse {
        let endpoint = castingBaseUrl
            .appendingPathComponent("v1/cast")
            .appendingPathComponent(electionId)
            .appendingPathComponent("receipts")
            .appendingPathComponent(handle)
        return try await executeRequest(url: endpoint, method: "GET")
    }
    
    public func fetchResults(electionId: String, sessionToken: String) async throws -> PublishedResults {
        let endpoint = identityBaseUrl
            .appendingPathComponent("v1/elections")
            .appendingPathComponent(electionId)
            .appendingPathComponent("results")
        return try await executeRequest(url: endpoint, method: "GET", sessionToken: sessionToken)
    }
    
    public func fetchEvidence(electionId: String, sessionToken: String) async throws -> EvidencePackage {
        let endpoint = identityBaseUrl
            .appendingPathComponent("v1/elections")
            .appendingPathComponent(electionId)
            .appendingPathComponent("evidence")
        return try await executeRequest(url: endpoint, method: "GET", sessionToken: sessionToken)
    }
}

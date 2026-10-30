import Foundation

public enum CredentialStatus: String, Codable, Sendable, CaseIterable {
    case reserved = "RESERVED"
    case signing = "SIGNING"
    case signed = "SIGNED"
    case delivered = "DELIVERED"
    
    public var displayName: String {
        switch self {
        case .reserved:
            return "Reserved"
        case .signing:
            return "Signing In Progress"
        case .signed:
            return "Signed"
        case .delivered:
            return "Delivered to Keychain"
        }
    }
    
    public var isComplete: Bool {
        return self == .signed || self == .delivered
    }
}

public struct BlindedIssuanceRequest: Codable, Sendable, Equatable {
    public let electionId: String
    public let blindedRequest: String
    
    public enum CodingKeys: String, CodingKey {
        case electionId = "election_id"
        case blindedRequest = "blinded_request"
    }
    
    public init(electionId: String, blindedRequest: String) {
        self.electionId = electionId
        self.blindedRequest = blindedRequest
    }
}

public struct BlindedIssuanceResponse: Codable, Sendable, Equatable {
    public let blindSignatureResponse: String
    public let status: CredentialStatus
    
    public enum CodingKeys: String, CodingKey {
        case blindSignatureResponse = "blind_signature_response"
        case status
    }
    
    public init(blindSignatureResponse: String, status: CredentialStatus) {
        self.blindSignatureResponse = blindSignatureResponse
        self.status = status
    }
}

public struct IssuanceStatusResponse: Codable, Sendable, Equatable {
    public let electionId: String
    public let status: String
    public let delivered: Bool
    
    public enum CodingKeys: String, CodingKey {
        case electionId = "election_id"
        case status
        case delivered
    }
    
    public init(electionId: String, status: String, delivered: Bool) {
        self.electionId = electionId
        self.status = status
        self.delivered = delivered
    }
    
    public var credentialStatus: CredentialStatus {
        CredentialStatus(rawValue: status) ?? .reserved
    }
}

public struct Credential: Codable, Identifiable, Sendable, Equatable {
    public var id: String { electionId }
    public let electionId: String
    public let blindSignatureResponse: String?
    public let blindedSecret: String?
    public let unblindedSignature: String?
    public let status: CredentialStatus
    public let issuedAtUtc: String?
    
    public enum CodingKeys: String, CodingKey {
        case electionId = "election_id"
        case blindSignatureResponse = "blind_signature_response"
        case blindedSecret = "blinded_secret"
        case unblindedSignature = "unblinded_signature"
        case status
        case issuedAtUtc = "issued_at_utc"
    }
    
    public init(
        electionId: String,
        blindSignatureResponse: String? = nil,
        blindedSecret: String? = nil,
        unblindedSignature: String? = nil,
        status: CredentialStatus = .reserved,
        issuedAtUtc: String? = nil
    ) {
        self.electionId = electionId
        self.blindSignatureResponse = blindSignatureResponse
        self.blindedSecret = blindedSecret
        self.unblindedSignature = unblindedSignature
        self.status = status
        self.issuedAtUtc = issuedAtUtc
    }
    
    public var blindedRequest: String {
        blindedSecret ?? ""
    }
    
    public var credentialToken: String {
        unblindedSignature ?? blindSignatureResponse ?? ""
    }
    
    public var nullifier: String {
        String((blindedSecret ?? electionId).prefix(16))
    }
}

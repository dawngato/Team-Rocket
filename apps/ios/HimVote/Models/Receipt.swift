import Foundation

public enum ReceiptStatus: String, Codable, Sendable, CaseIterable {
    case committedPendingWitness = "COMMITTED_PENDING_WITNESS"
    case witnessed = "WITNESSED"
    case anchored = "ANCHORED"
    case rejected = "REJECTED"
    
    public var displayName: String {
        switch self {
        case .committedPendingWitness:
            return "Committed Pending Witness"
        case .witnessed:
            return "Witnessed"
        case .anchored:
            return "Anchored on Chain"
        case .rejected:
            return "Rejected"
        }
    }
    
    public var isTerminalSuccess: Bool {
        return self == .witnessed || self == .anchored
    }
}

public struct CastBallotRequest: Codable, Sendable, Equatable {
    public let electionId: String
    public let credentialProofB64url: String
    public let engineBallotB64url: String
    public let engineProofsB64url: String
    public let idempotencyKey: String
    
    public enum CodingKeys: String, CodingKey {
        case electionId = "election_id"
        case credentialProofB64url = "credential_proof_b64url"
        case engineBallotB64url = "engine_ballot_b64url"
        case engineProofsB64url = "engine_proofs_b64url"
        case idempotencyKey = "idempotency_key"
    }
    
    public init(
        electionId: String,
        credentialProofB64url: String,
        engineBallotB64url: String,
        engineProofsB64url: String,
        idempotencyKey: String
    ) {
        self.electionId = electionId
        self.credentialProofB64url = credentialProofB64url
        self.engineBallotB64url = engineBallotB64url
        self.engineProofsB64url = engineProofsB64url
        self.idempotencyKey = idempotencyKey
    }
}

public struct CastBallotResponse: Codable, Sendable, Equatable {
    public let status: String
    public let handle: String
    public let leafIndex: Int
    public let nullifierCommitment: String
    
    public enum CodingKeys: String, CodingKey {
        case status
        case handle
        case leafIndex = "leaf_index"
        case nullifierCommitment = "nullifier_commitment"
    }
    
    public init(
        status: String,
        handle: String,
        leafIndex: Int,
        nullifierCommitment: String
    ) {
        self.status = status
        self.handle = handle
        self.leafIndex = leafIndex
        self.nullifierCommitment = nullifierCommitment
    }
    
    public var receiptStatus: ReceiptStatus {
        ReceiptStatus(rawValue: status) ?? .committedPendingWitness
    }
}

public struct ReceiptStatusResponse: Codable, Sendable, Equatable {
    public let status: String
    public let handle: String
    public let leafIndex: Int
    public let witnessedAtUtc: String?
    
    public enum CodingKeys: String, CodingKey {
        case status
        case handle
        case leafIndex = "leaf_index"
        case witnessedAtUtc = "witnessed_at_utc"
    }
    
    public init(
        status: String,
        handle: String,
        leafIndex: Int,
        witnessedAtUtc: String? = nil
    ) {
        self.status = status
        self.handle = handle
        self.leafIndex = leafIndex
        self.witnessedAtUtc = witnessedAtUtc
    }
    
    public var receiptStatus: ReceiptStatus {
        ReceiptStatus(rawValue: status) ?? .committedPendingWitness
    }
}

public struct Receipt: Codable, Identifiable, Sendable, Equatable {
    public var id: String { handle }
    public let electionId: String
    public let handle: String
    public let leafIndex: Int
    public let status: ReceiptStatus
    public let nullifierCommitment: String?
    public let witnessedAtUtc: String?
    public let leafHash: String?
    
    public enum CodingKeys: String, CodingKey {
        case electionId = "election_id"
        case handle
        case leafIndex = "leaf_index"
        case status
        case nullifierCommitment = "nullifier_commitment"
        case witnessedAtUtc = "witnessed_at_utc"
        case leafHash = "leaf_hash"
    }
    
    public init(
        electionId: String,
        handle: String,
        leafIndex: Int,
        status: ReceiptStatus,
        nullifierCommitment: String? = nil,
        witnessedAtUtc: String? = nil,
        leafHash: String? = nil
    ) {
        self.electionId = electionId
        self.handle = handle
        self.leafIndex = leafIndex
        self.status = status
        self.nullifierCommitment = nullifierCommitment
        self.witnessedAtUtc = witnessedAtUtc
        self.leafHash = leafHash
    }
}

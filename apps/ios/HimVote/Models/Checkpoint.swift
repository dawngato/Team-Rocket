import Foundation

public struct Checkpoint: Codable, Identifiable, Sendable, Equatable {
    public var id: String { checkpointDigest }
    public let checkpointDigest: String
    public let electionId: String
    public let treeSize: Int
    public let rootHash: String
    public let previousCheckpointDigest: String?
    public let witnessedAtUtc: String
    public let signature: String
    public let isFinal: Bool
    
    public enum CodingKeys: String, CodingKey {
        case checkpointDigest = "checkpoint_digest"
        case electionId = "election_id"
        case treeSize = "tree_size"
        case rootHash = "root_hash"
        case previousCheckpointDigest = "previous_checkpoint_digest"
        case witnessedAtUtc = "witnessed_at_utc"
        case signature
        case isFinal = "is_final"
    }
    
    public init(
        checkpointDigest: String,
        electionId: String,
        treeSize: Int,
        rootHash: String,
        previousCheckpointDigest: String? = nil,
        witnessedAtUtc: String,
        signature: String,
        isFinal: Bool = false
    ) {
        self.checkpointDigest = checkpointDigest
        self.electionId = electionId
        self.treeSize = treeSize
        self.rootHash = rootHash
        self.previousCheckpointDigest = previousCheckpointDigest
        self.witnessedAtUtc = witnessedAtUtc
        self.signature = signature
        self.isFinal = isFinal
    }
}

public struct EvidencePackage: Codable, Identifiable, Sendable, Equatable {
    public var id: String { electionId }
    public let electionId: String
    public let manifestDigest: String
    public let finalCheckpointDigest: String
    public let anchorTxHash: String
    public let auditorSignature: String
    public let evidenceUrl: String?
    
    public enum CodingKeys: String, CodingKey {
        case electionId = "election_id"
        case manifestDigest = "manifest_digest"
        case finalCheckpointDigest = "final_checkpoint_digest"
        case anchorTxHash = "anchor_tx_hash"
        case auditorSignature = "auditor_signature"
        case evidenceUrl = "evidence_url"
    }
    
    public init(
        electionId: String,
        manifestDigest: String,
        finalCheckpointDigest: String,
        anchorTxHash: String,
        auditorSignature: String,
        evidenceUrl: String? = nil
    ) {
        self.electionId = electionId
        self.manifestDigest = manifestDigest
        self.finalCheckpointDigest = finalCheckpointDigest
        self.anchorTxHash = anchorTxHash
        self.auditorSignature = auditorSignature
        self.evidenceUrl = evidenceUrl
    }
}

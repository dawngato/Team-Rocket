import Foundation
import Observation

public enum VerificationVerdict: String, Sendable, Equatable {
    case pass = "PASS"
    case fail = "FAIL"
    case limited = "LIMITED"
    case notChecked = "NOT_CHECKED"
    case unverifiable = "UNVERIFIABLE"
}

public struct AuditCheckItem: Identifiable, Sendable {
    public let id: String
    public let name: String
    public let verdict: VerificationVerdict
    public let detail: String
    
    public init(id: String, name: String, verdict: VerificationVerdict, detail: String) {
        self.id = id
        self.name = name
        self.verdict = verdict
        self.detail = detail
    }
}

@Observable
@MainActor
public final class AuditorViewModel {
    public var evidencePackage: EvidencePackage?
    public var auditCheckItems: [AuditCheckItem] = []
    public var isLoading: Bool = false
    public var errorMessage: String?
    public var overallVerdict: VerificationVerdict = .notChecked
    
    private let apiClient: ApiClientProtocol
    
    public init(apiClient: ApiClientProtocol = ApiClient()) {
        self.apiClient = apiClient
    }
    
    public func loadEvidenceAndVerify(electionId: String, sessionToken: String) async {
        isLoading = true
        errorMessage = nil
        auditCheckItems = []
        overallVerdict = .notChecked
        
        do {
            let evidence = try await apiClient.fetchEvidence(electionId: electionId, sessionToken: sessionToken)
            self.evidencePackage = evidence
            
            var checks: [AuditCheckItem] = []
            
            let idMatch = evidence.electionId == electionId
            checks.append(
                AuditCheckItem(
                    id: "election_identity",
                    name: "Election Identity Correlation",
                    verdict: idMatch ? .pass : .fail,
                    detail: idMatch
                        ? "The response field matches the requested election. This is a structural check, not an independent cryptographic attestation."
                        : "Mismatch: Expected \(electionId) but received \(evidence.electionId)"
                )
            )
            
            let isHex64 = { (str: String) -> Bool in
                str.count == 64 && str.allSatisfy { $0.isHexDigit }
            }
            
            let manifestValid = isHex64(evidence.manifestDigest)
            checks.append(
                AuditCheckItem(
                    id: "manifest_digest",
                    name: "Election Manifest SHA256 Digest",
                    verdict: manifestValid ? .limited : .fail,
                    detail: manifestValid
                        ? "Digest is correctly shaped (\(evidence.manifestDigest.prefix(16))...). Recompute and compare it with an independently pinned manifest using the standalone verifier."
                        : "Invalid manifest digest format"
                )
            )
            
            let checkpointValid = isHex64(evidence.finalCheckpointDigest)
            checks.append(
                AuditCheckItem(
                    id: "final_checkpoint",
                    name: "Witness Merkle Tree Final Checkpoint",
                    verdict: checkpointValid ? .limited : .fail,
                    detail: checkpointValid
                        ? "Checkpoint digest is correctly shaped (\(evidence.finalCheckpointDigest.prefix(16))...). Signature, tree contents and continuity require a separately supplied witness pin and offline verifier."
                        : "Invalid checkpoint digest length"
                )
            )
            
            let isAnchorValid = { (tx: String) -> Bool in
                guard tx.hasPrefix("0x") && tx.count == 66 else { return false }
                let hexPart = tx.dropFirst(2)
                return hexPart.allSatisfy { $0.isHexDigit }
            }
            let anchorValid = isAnchorValid(evidence.anchorTxHash)
            checks.append(
                AuditCheckItem(
                    id: "anchor_tx",
                    name: "Ethereum Smart Contract Anchor Transaction",
                    verdict: anchorValid ? .limited : .fail,
                    detail: anchorValid
                        ? "Transaction hash is correctly shaped (\(evidence.anchorTxHash.prefix(18))...). Chain identity, receipt and finality are not checked by this metadata-only client."
                        : "Malformed Ethereum transaction hash format"
                )
            )
            
            let signatureValid = !evidence.auditorSignature.isEmpty && evidence.auditorSignature.count >= 32
            checks.append(
                AuditCheckItem(
                    id: "auditor_signature",
                    name: "Independent Auditor Attestation Signature",
                    verdict: signatureValid ? .limited : .fail,
                    detail: signatureValid
                        ? "A signature-shaped value is present. It is not verified here because no independently trusted auditor key or canonical report digest was supplied."
                        : "Missing or invalid auditor signature"
                )
            )
            
            if let urlString = evidence.evidenceUrl, !urlString.isEmpty {
                let urlValid = URL(string: urlString) != nil
                checks.append(
                    AuditCheckItem(
                        id: "evidence_url",
                        name: "Immutable Evidence Archive Bundle URL",
                        verdict: urlValid ? .limited : .fail,
                        detail: urlValid
                            ? "Archive URL is syntactically valid. The archive remains untrusted until downloaded and checked by the standalone verifier."
                            : "Invalid evidence package URL location"
                    )
                )
            }
            
            self.auditCheckItems = checks
            
            let hasFailure = checks.contains { $0.verdict == .fail }
            self.overallVerdict = hasFailure ? .fail : (checks.isEmpty ? .notChecked : .limited)
        } catch {
            self.errorMessage = error.localizedDescription
            self.overallVerdict = .notChecked
        }
        
        isLoading = false
    }
}

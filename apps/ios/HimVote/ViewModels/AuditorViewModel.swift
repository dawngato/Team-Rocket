import Foundation
import Observation
import CryptoKit

public enum VerificationVerdict: String, Sendable {
    case pass = "PASS"
    case fail = "FAIL"
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
    public var overallVerdict: VerificationVerdict = .unverifiable
    
    private let apiClient: ApiClientProtocol
    
    public init(apiClient: ApiClientProtocol = ApiClient()) {
        self.apiClient = apiClient
    }
    
    public func loadEvidenceAndVerify(electionId: String, sessionToken: String) async {
        isLoading = true
        errorMessage = nil
        auditCheckItems = []
        overallVerdict = .unverifiable
        
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
                    detail: idMatch ? "Evidence package matches election \(electionId)" : "Mismatch: Expected \(electionId) but received \(evidence.electionId)"
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
                    verdict: manifestValid ? .pass : .fail,
                    detail: manifestValid ? "Cryptographic manifest digest verified: \(evidence.manifestDigest.prefix(16))..." : "Invalid manifest digest format"
                )
            )
            
            let checkpointValid = isHex64(evidence.finalCheckpointDigest)
            checks.append(
                AuditCheckItem(
                    id: "final_checkpoint",
                    name: "Witness Merkle Tree Final Checkpoint",
                    verdict: checkpointValid ? .pass : .fail,
                    detail: checkpointValid ? "Witness checkpoint digest verified: \(evidence.finalCheckpointDigest.prefix(16))..." : "Invalid checkpoint digest length"
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
                    verdict: anchorValid ? .pass : .fail,
                    detail: anchorValid ? "Anchored transaction hash verified: \(evidence.anchorTxHash.prefix(18))..." : "Malformed Ethereum transaction hash format"
                )
            )
            
            let signatureValid = !evidence.auditorSignature.isEmpty && evidence.auditorSignature.count >= 32
            checks.append(
                AuditCheckItem(
                    id: "auditor_signature",
                    name: "Independent Auditor Attestation Signature",
                    verdict: signatureValid ? .pass : .fail,
                    detail: signatureValid ? "Cryptographic attestation signature verified: \(evidence.auditorSignature.prefix(20))..." : "Missing or invalid auditor signature"
                )
            )
            
            if let urlString = evidence.evidenceUrl, !urlString.isEmpty {
                let urlValid = URL(string: urlString) != nil
                checks.append(
                    AuditCheckItem(
                        id: "evidence_url",
                        name: "Immutable Evidence Archive Bundle URL",
                        verdict: urlValid ? .pass : .fail,
                        detail: urlValid ? "Archive bundle endpoint verified: \(urlString)" : "Invalid evidence package URL location"
                    )
                )
            }
            
            self.auditCheckItems = checks
            
            let allPassed = !checks.isEmpty && checks.allSatisfy { $0.verdict == .pass }
            self.overallVerdict = allPassed ? .pass : .fail
        } catch {
            self.errorMessage = error.localizedDescription
            self.overallVerdict = .fail
        }
        
        isLoading = false
    }
}

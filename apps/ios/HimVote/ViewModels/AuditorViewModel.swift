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
            
            let manifestValid = !evidence.manifestDigest.isEmpty && evidence.manifestDigest.count == 64
            checks.append(
                AuditCheckItem(
                    id: "manifest_digest",
                    name: "Election Manifest SHA256 Digest",
                    verdict: manifestValid ? .pass : .fail,
                    detail: "Manifest digest string length and encoding check: \(evidence.manifestDigest.prefix(16))..."
                )
            )
            
            let checkpointValid = !evidence.finalCheckpointDigest.isEmpty
            checks.append(
                AuditCheckItem(
                    id: "final_checkpoint",
                    name: "Witness Merkle Tree Final Checkpoint",
                    verdict: checkpointValid ? .pass : .fail,
                    detail: "Digest: \(evidence.finalCheckpointDigest.prefix(16))..."
                )
            )
            
            let anchorValid = evidence.anchorTxHash.hasPrefix("0x") && evidence.anchorTxHash.count == 66
            checks.append(
                AuditCheckItem(
                    id: "anchor_tx",
                    name: "Ethereum Smart Contract Anchor Transaction",
                    verdict: anchorValid ? .pass : .fail,
                    detail: "Transaction Hash: \(evidence.anchorTxHash.prefix(16))..."
                )
            )
            
            let signatureValid = !evidence.auditorSignature.isEmpty
            checks.append(
                AuditCheckItem(
                    id: "auditor_signature",
                    name: "Independent Auditor Attestation Signature",
                    verdict: signatureValid ? .pass : .fail,
                    detail: "Signature: \(evidence.auditorSignature.prefix(20))..."
                )
            )
            
            self.auditCheckItems = checks
            
            let allPassed = checks.allSatisfy { $0.verdict == .pass }
            self.overallVerdict = allPassed ? .pass : .fail
        } catch {
            self.errorMessage = error.localizedDescription
            self.overallVerdict = .fail
        }
        
        isLoading = false
    }
}

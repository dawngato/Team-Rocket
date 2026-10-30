import Foundation
import Observation

public enum ReceiptInclusionStatus: Sendable, Equatable {
    case notAvailable
    case pending
    case verified(MerkleInclusionResult)
    case failed(String)

    public var isVerified: Bool {
        if case .verified(let result) = self {
            return result.valid
        }
        return false
    }
}

@Observable
@MainActor
public final class ReceiptViewModel {
    public var receipt: Receipt?
    public var isPolling: Bool = false
    public var errorMessage: String?
    public var inclusionStatus: ReceiptInclusionStatus = .notAvailable
    
    private let apiClient: ApiClientProtocol
    private let keychainService: KeychainServiceProtocol
    private var pollingTask: Task<Void, Never>?
    
    public init(
        apiClient: ApiClientProtocol = ApiClient(),
        keychainService: KeychainServiceProtocol = KeychainService.shared
    ) {
        self.apiClient = apiClient
        self.keychainService = keychainService
    }
    
    public func loadReceipt(handle: String, electionId: String) {
        if let storedReceipt = try? keychainService.readReceipt(handle: handle) {
            self.receipt = storedReceipt
            verifyInclusion()
        } else {
            // Do not fabricate a leaf index or a pending proof. The holder
            // supplied opaque handle is enough to query the casting origin;
            // a receipt is materialized only after the origin returns it.
            self.receipt = nil
            self.inclusionStatus = .notAvailable
            self.errorMessage = "This receipt for election \(electionId) is not stored on this device yet. The casting origin will be queried using the opaque handle."
        }
    }
    
    public func startPollingReceiptStatus(electionId: String, handle: String) {
        pollingTask?.cancel()
        isPolling = true
        errorMessage = nil
        
        pollingTask = Task { [weak self] in
            guard let self = self else { return }
            
            var terminalReached = false
            var attempts = 0
            
            while !terminalReached && attempts < 30 && !Task.isCancelled {
                do {
                    let statusResponse = try await self.apiClient.fetchReceiptStatus(
                        electionId: electionId,
                        handle: handle
                    )
                    
                    let updated = Receipt(
                        electionId: electionId,
                        handle: handle,
                        leafIndex: statusResponse.leafIndex,
                        status: statusResponse.receiptStatus,
                        nullifierCommitment: self.receipt?.nullifierCommitment,
                        witnessedAtUtc: statusResponse.witnessedAtUtc,
                        leafHash: statusResponse.leafHash ?? self.receipt?.leafHash,
                        treeSize: statusResponse.treeSize ?? self.receipt?.treeSize,
                        merkleRoot: statusResponse.merkleRoot ?? self.receipt?.merkleRoot,
                        merkleProof: statusResponse.merkleProof ?? self.receipt?.merkleProof
                    )
                    
                    self.receipt = updated
                    try? self.keychainService.saveReceipt(updated)
                    self.verifyInclusion()
                    
                    if statusResponse.receiptStatus == .witnessed || statusResponse.receiptStatus == .anchored || statusResponse.receiptStatus == .rejected {
                        terminalReached = true
                    }
                } catch {
                    self.errorMessage = error.localizedDescription
                }
                
                attempts += 1
                if !terminalReached {
                    try? await Task.sleep(nanoseconds: 2_000_000_000)
                }
            }
            
            self.isPolling = false
        }
    }

    public func verifyInclusion() {
        guard let receipt else {
            inclusionStatus = .notAvailable
            return
        }

        guard receipt.status == .witnessed || receipt.status == .anchored else {
            inclusionStatus = receipt.status == .committedPendingWitness ? .pending : .notAvailable
            return
        }

        guard let treeSize = receipt.treeSize,
              let leafHash = receipt.leafHash,
              let merkleRoot = receipt.merkleRoot,
              let merkleProof = receipt.merkleProof else {
            inclusionStatus = .notAvailable
            return
        }

        do {
            let result = try MerkleProofVerifier.verify(
                leafIndex: receipt.leafIndex,
                treeSize: treeSize,
                leafHashHex: leafHash,
                proofHex: merkleProof,
                expectedRootHex: merkleRoot
            )
            inclusionStatus = result.valid
                ? .verified(result)
                : .failed("The computed Merkle root does not match the witnessed root.")
        } catch {
            inclusionStatus = .failed(error.localizedDescription)
        }
    }
    
    public func stopPolling() {
        pollingTask?.cancel()
        pollingTask = nil
        isPolling = false
    }
    
    public func formatReceiptJson() -> String? {
        guard let receipt = receipt else { return nil }
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        guard let data = try? encoder.encode(receipt) else { return nil }
        return String(data: data, encoding: .utf8)
    }
}

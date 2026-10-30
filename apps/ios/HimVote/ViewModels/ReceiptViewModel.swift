import Foundation
import Observation

@Observable
@MainActor
public final class ReceiptViewModel {
    public var receipt: Receipt?
    public var isPolling: Bool = false
    public var errorMessage: String?
    
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
        let key = "himvote_receipt_\(handle)"
        if let storedReceipt = try? keychainService.readCodable(Receipt.self, forKey: key) {
            self.receipt = storedReceipt
        } else {
            self.receipt = Receipt(
                electionId: electionId,
                handle: handle,
                leafIndex: 0,
                status: .committedPendingWitness
            )
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
                        leafHash: self.receipt?.leafHash
                    )
                    
                    self.receipt = updated
                    let key = "himvote_receipt_\(handle)"
                    try? self.keychainService.saveCodable(updated, forKey: key)
                    
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

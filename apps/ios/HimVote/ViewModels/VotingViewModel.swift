import Foundation
import Observation

@Observable
@MainActor
public final class VotingViewModel {
    public var isCasting: Bool = false
    public var isLaunchingBooth: Bool = false
    public var lastCastResponse: CastBallotResponse?
    public var errorMessage: String?
    public var successReceiptHandle: String?
    
    private let apiClient: ApiClientProtocol
    private let boothHandler: BoothSessionHandling
    private let keychainService: KeychainServiceProtocol
    
    public init(
        apiClient: ApiClientProtocol = ApiClient(),
        boothHandler: BoothSessionHandling = BoothSessionHandler.shared,
        keychainService: KeychainServiceProtocol = KeychainService.shared
    ) {
        self.apiClient = apiClient
        self.boothHandler = boothHandler
        self.keychainService = keychainService
    }
    
    public func startVotingFlow(
        boothBaseUrl: URL,
        election: Election,
        credential: Credential
    ) async {
        isLaunchingBooth = true
        errorMessage = nil
        
        guard let proof = credential.unblindedSignature ?? credential.blindSignatureResponse else {
            errorMessage = "Voter credential has not been unblinded or delivered."
            isLaunchingBooth = false
            return
        }
        
        do {
            let artifacts = try await boothHandler.launchBoothSession(
                boothBaseUrl: boothBaseUrl,
                electionId: election.id,
                credentialProof: proof
            )
            
            isLaunchingBooth = false
            await submitCastBallot(artifacts: artifacts)
        } catch {
            self.errorMessage = error.localizedDescription
            self.isLaunchingBooth = false
        }
    }
    
    public func submitCastBallot(artifacts: BoothArtifacts) async {
        isCasting = true
        errorMessage = nil
        
        let idempotencyKey = UUID().uuidString
        let request = CastBallotRequest(
            electionId: artifacts.electionId,
            credentialProofB64url: artifacts.credentialProofB64url,
            engineBallotB64url: artifacts.engineBallotB64url,
            engineProofsB64url: artifacts.engineProofsB64url,
            idempotencyKey: idempotencyKey
        )
        
        do {
            let response = try await apiClient.castBallot(request: request)
            self.lastCastResponse = response
            self.successReceiptHandle = response.handle
            
            let receiptRecord = Receipt(
                electionId: artifacts.electionId,
                handle: response.handle,
                leafIndex: response.leafIndex,
                status: response.receiptStatus,
                nullifierCommitment: response.nullifierCommitment,
                witnessedAtUtc: nil,
                leafHash: nil
            )
            
            let receiptKey = "himvote_receipt_\(response.handle)"
            try? keychainService.saveCodable(receiptRecord, forKey: receiptKey)
        } catch {
            self.errorMessage = error.localizedDescription
        }
        
        isCasting = false
    }
}

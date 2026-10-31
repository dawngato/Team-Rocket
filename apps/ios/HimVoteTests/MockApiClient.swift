import Foundation
@testable import HimVoteKit

public final class MockApiClient: ApiClientProtocol, @unchecked Sendable {
    public var shouldThrowError: Bool = false
    public var errorToThrow: ApiError = .unauthorized
    
    public var loginResponse: LoginResponse = LoginResponse(
        sessionToken: "mock_session_token_xyz",
        userId: "user_std_001",
        role: "student",
        mfaRequired: false
    )
    
    public var rosterMeResponse: RosterMeResponse = RosterMeResponse(
        eligible: true,
        elections: [
            RosterElection(
                electionId: "elec_2026_stu_council",
                state: "open",
                eligible: true,
                credentialStatus: "DELIVERED"
            )
        ]
    )
    
    public var electionsList: [ElectionSummary] = [
        ElectionSummary(
            id: "elec_2026_stu_council",
            title: "Student Council Election 2026",
            state: "open",
            opensAtUtc: "2026-10-30T08:00:00Z",
            closesAtUtc: "2026-10-31T20:00:00Z"
        ),
        ElectionSummary(
            id: "elec_2026_senate",
            title: "Academic Senate Representative",
            state: "closed",
            opensAtUtc: "2026-10-20T08:00:00Z",
            closesAtUtc: "2026-10-22T20:00:00Z"
        )
    ]
    
    public var singleElection: Election = Election(
        id: "elec_2026_stu_council",
        title: "Student Council Election 2026",
        state: .open,
        manifestDigest: "a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef",
        opensAtUtc: "2026-10-30T08:00:00Z",
        closesAtUtc: "2026-10-31T20:00:00Z",
        issuanceCutoffUtc: "2026-10-31T18:00:00Z",
        eligibleCount: 1200,
        candidates: [
            Candidate(id: "cand_01", name: "Aarav Sharma", contest: "President"),
            Candidate(id: "cand_02", name: "Ananya Patel", contest: "President")
        ],
        contest: "Student Council President",
        selectionRule: "SingleChoice"
    )
    
    public var blindIssuanceResponse: BlindedIssuanceResponse = BlindedIssuanceResponse(
        blindSignatureResponse: "mock_blind_sig_resp_base64url",
        status: .delivered
    )
    
    public var issuanceStatusResponse: IssuanceStatusResponse = IssuanceStatusResponse(
        electionId: "elec_2026_stu_council",
        status: "DELIVERED",
        delivered: true
    )
    
    public var castBallotResponse: CastBallotResponse = CastBallotResponse(
        status: "COMMITTED_PENDING_WITNESS",
        handle: "rcpt_handle_998877",
        leafIndex: 42,
        nullifierCommitment: "nullifier_comm_hash_abc"
    )
    
    public var receiptStatusResponse: ReceiptStatusResponse = ReceiptStatusResponse(
        status: "WITNESSED",
        handle: "rcpt_handle_998877",
        leafIndex: 42,
        witnessedAtUtc: "2026-10-30T14:22:00Z"
    )
    
    public var publishedResults: PublishedResults = PublishedResults(
        electionId: "elec_2026_stu_council",
        manifestDigest: "a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef",
        tally: ["cand_01": 520, "cand_02": 480],
        totalBallots: 1000,
        publishedAtUtc: "2026-10-31T21:00:00Z",
        privacyLimited: false
    )
    
    public var evidencePackage: EvidencePackage = EvidencePackage(
        electionId: "elec_2026_stu_council",
        manifestDigest: "a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef",
        finalCheckpointDigest: "f0e1d2c3b4a567890123456789abcdef0123456789abcdef0123456789abcdef",
        anchorTxHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        auditorSignature: "mock_auditor_ed25519_signature_base64_verified",
        evidenceUrl: "https://api.himvote.example.in/evidence/elec_2026_stu_council.zip"
    )
    
    public var profileResponse: UserProfile = UserProfile(
        id: "user_std_001",
        displayName: "Ada Student",
        phoneNumber: "+14155552671",
        updatedAt: "2026-10-31T08:30:00Z"
    )
    public var lastProfileUpdateRequest: ProfileUpdateRequest?
    public var profileUpdateCallCount: Int = 0
    
    public init() {}
    
    public func login(request: LoginRequest) async throws -> LoginResponse {
        if shouldThrowError { throw errorToThrow }
        return loginResponse
    }
    
    public func logout(sessionToken: String) async throws {
        if shouldThrowError { throw errorToThrow }
    }
    
    public func fetchRosterMe(sessionToken: String) async throws -> RosterMeResponse {
        if shouldThrowError { throw errorToThrow }
        return rosterMeResponse
    }
    
    public func fetchElections(sessionToken: String) async throws -> [ElectionSummary] {
        if shouldThrowError { throw errorToThrow }
        return electionsList
    }
    
    public func fetchElection(id: String, sessionToken: String) async throws -> Election {
        if shouldThrowError { throw errorToThrow }
        return singleElection
    }
    
    public func requestBlindIssuance(request: BlindedIssuanceRequest, sessionToken: String) async throws -> BlindedIssuanceResponse {
        if shouldThrowError { throw errorToThrow }
        return blindIssuanceResponse
    }
    
    public func fetchIssuanceStatus(electionId: String, sessionToken: String) async throws -> IssuanceStatusResponse {
        if shouldThrowError { throw errorToThrow }
        return issuanceStatusResponse
    }
    
    public func castBallot(request: CastBallotRequest) async throws -> CastBallotResponse {
        if shouldThrowError { throw errorToThrow }
        return castBallotResponse
    }
    
    public func fetchReceiptStatus(electionId: String, handle: String) async throws -> ReceiptStatusResponse {
        if shouldThrowError { throw errorToThrow }
        return receiptStatusResponse
    }
    
    public func fetchResults(electionId: String, sessionToken: String) async throws -> PublishedResults {
        if shouldThrowError { throw errorToThrow }
        return publishedResults
    }
    
    public func fetchEvidence(electionId: String, sessionToken: String) async throws -> EvidencePackage {
        if shouldThrowError { throw errorToThrow }
        return evidencePackage
    }
    
    public func fetchProfile(sessionToken: String) async throws -> UserProfile {
        if shouldThrowError { throw errorToThrow }
        return profileResponse
    }
    
    public func updateProfile(request: ProfileUpdateRequest, sessionToken: String) async throws -> UserProfile {
        if shouldThrowError { throw errorToThrow }
        profileUpdateCallCount += 1
        lastProfileUpdateRequest = request
        
        var updated = profileResponse
        if request.clearDisplayName {
            updated.displayName = nil
        } else if let name = request.displayName {
            updated.displayName = name
        }
        
        if request.clearPhoneNumber {
            updated.phoneNumber = nil
        } else if let phone = request.phoneNumber {
            updated.phoneNumber = phone
        }
        
        self.profileResponse = updated
        return updated
    }
}

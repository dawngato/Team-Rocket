import XCTest
import SwiftUI
@testable import HimVoteKit

@MainActor
final class DesignSystemTests: XCTestCase {
    
    func testSpringTokensAreConfigured() {
        XCTAssertNotNil(SpringTokens.fluid)
        XCTAssertNotNil(SpringTokens.snappy)
        XCTAssertNotNil(SpringTokens.bouncy)
        XCTAssertNotNil(SpringTokens.gentle)
        XCTAssertNotNil(SpringTokens.sheet)
        XCTAssertNotNil(SpringTokens.auditTransition)
    }
    
    func testHapticFeedbackInvocations() {
        HapticFeedback.light()
        HapticFeedback.medium()
        HapticFeedback.heavy()
        HapticFeedback.soft()
        HapticFeedback.rigid()
        HapticFeedback.selection()
        HapticFeedback.success()
        HapticFeedback.warning()
        HapticFeedback.error()
        XCTAssertTrue(true)
    }
    
    func testElectionStateBadgeInitialization() {
        let openBadge = ElectionStateBadge(state: .open)
        XCTAssertEqual(openBadge.state, .open)
        
        let publishedBadge = ElectionStateBadge(state: .published)
        XCTAssertEqual(publishedBadge.state, .published)
        
        let draftBadge = ElectionStateBadge(state: .draft)
        XCTAssertEqual(draftBadge.state, .draft)
    }
    
    func testReceiptStatusBadgeInitialization() {
        let pendingBadge = ReceiptStatusBadge(status: .committedPendingWitness)
        XCTAssertEqual(pendingBadge.status, .committedPendingWitness)
        
        let witnessedBadge = ReceiptStatusBadge(status: .witnessed)
        XCTAssertEqual(witnessedBadge.status, .witnessed)
        
        let anchoredBadge = ReceiptStatusBadge(status: .anchored)
        XCTAssertEqual(anchoredBadge.status, .anchored)
    }
    
    func testCredentialStatusBadgeInitialization() {
        let reservedBadge = CredentialStatusBadge(status: .reserved)
        XCTAssertEqual(reservedBadge.status, .reserved)
        
        let deliveredBadge = CredentialStatusBadge(status: .delivered)
        XCTAssertEqual(deliveredBadge.status, .delivered)
    }
    
    func testMerkleAuditTreeCardDescriptor() {
        let descriptor = MerkleNodeDescriptor(
            id: "node_01",
            title: "Merkle Root",
            digest: "0x1234567890abcdef",
            level: "Root",
            isVerified: true
        )
        XCTAssertEqual(descriptor.id, "node_01")
        XCTAssertEqual(descriptor.title, "Merkle Root")
        XCTAssertEqual(descriptor.digest, "0x1234567890abcdef")
        XCTAssertEqual(descriptor.level, "Root")
        XCTAssertTrue(descriptor.isVerified)
    }
    
    func testCandidateDetailSheetView() {
        let candidate = Candidate(id: "cand_01", name: "Alice Sharma", contest: "President")
        let sheet = CandidateDetailSheet(
            candidate: candidate,
            contest: "President",
            electionTitle: "Campus Election 2026"
        )
        XCTAssertEqual(sheet.candidate.id, "cand_01")
        XCTAssertEqual(sheet.candidate.name, "Alice Sharma")
    }
    
    func testManifestInspectorSheetView() {
        let election = Election(
            id: "elec_01",
            title: "Student Council Election",
            state: .open,
            manifestDigest: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            opensAtUtc: "20261030T090000Z",
            closesAtUtc: "20261031T170000Z",
            issuanceCutoffUtc: "20261031T120000Z",
            eligibleCount: 1500,
            contest: "Executive Board"
        )
        let sheet = ManifestInspectorSheet(election: election)
        XCTAssertEqual(sheet.election.id, "elec_01")
        XCTAssertEqual(sheet.election.eligibleCount, 1500)
    }
    
    func testMerkleProofSheetView() {
        let receipt = Receipt(
            electionId: "elec_01",
            handle: "rcpt_778899",
            leafIndex: 42,
            status: .anchored,
            nullifierCommitment: "0xabcdef123456",
            witnessedAtUtc: "20261030T160000Z",
            leafHash: "0x9876543210fedcba"
        )
        let sheet = MerkleProofSheet(receipt: receipt, formattedJson: "{}")
        XCTAssertEqual(sheet.receipt.handle, "rcpt_778899")
        XCTAssertEqual(sheet.receipt.leafIndex, 42)
    }
    
    func testMerkleAuditDetailSheetView() {
        let check = AuditCheckItem(
            id: "chk_01",
            name: "Manifest SHA256 Integrity",
            verdict: .pass,
            detail: "Cryptographic manifest digest verified"
        )
        let sheet = MerkleAuditDetailSheet(checkItem: check)
        XCTAssertEqual(sheet.checkItem.id, "chk_01")
        XCTAssertEqual(sheet.checkItem.verdict, .pass)
    }
    
    func testSecurityBulletPointView() {
        let bullet = SecurityBulletPoint(
            icon: "shield.fill",
            title: "Hardware Isolation",
            description: "Keys sealed in enclave"
        )
        XCTAssertEqual(bullet.icon, "shield.fill")
        XCTAssertEqual(bullet.title, "Hardware Isolation")
    }
    
    func testTailAdminThemeColorTokens() {
        XCTAssertNotNil(ColorTokens.tailAdminBrand)
        XCTAssertNotNil(ColorTokens.tailAdminBrandDark)
        XCTAssertNotNil(ColorTokens.tailAdminBrandLight)
        XCTAssertNotNil(ColorTokens.tailAdminBrandBg)
        XCTAssertNotNil(ColorTokens.tailAdminDarkBg)
        XCTAssertNotNil(ColorTokens.tailAdminDarkCard)
        XCTAssertNotNil(ColorTokens.tailAdminDarkBorder)
        XCTAssertNotNil(ColorTokens.tailAdminLightBg)
        XCTAssertNotNil(ColorTokens.tailAdminLightCard)
        XCTAssertNotNil(ColorTokens.tailAdminLightBorder)
        XCTAssertNotNil(ColorTokens.tailAdminSuccess)
        XCTAssertNotNil(ColorTokens.tailAdminWarning)
        XCTAssertNotNil(ColorTokens.tailAdminDanger)
        XCTAssertNotNil(ColorTokens.tailAdminInfo)
        XCTAssertNotNil(ColorTokens.tailAdminPurple)
    }
    
    func testFloatingBottomBarInitialization() {
        var selected = 0
        let binding = Binding<Int>(
            get: { selected },
            set: { selected = $0 }
        )
        let bar = FloatingBottomBar(selectedTab: binding)
        XCTAssertNotNil(bar)
    }
    
    func testTailAdminDashboardViewInitialization() {
        let authVM = AuthViewModel()
        let elecVM = ElectionsViewModel()
        let dashboard = TailAdminDashboardView(
            authViewModel: authVM,
            electionsViewModel: elecVM,
            onNavigateToTab: { _ in },
            onOpenSidebar: { }
        )
        XCTAssertNotNil(dashboard)
    }
    
    func testMainTabViewInitialization() {
        let authVM = AuthViewModel()
        let elecVM = ElectionsViewModel()
        let mainView = MainTabView(
            authViewModel: authVM,
            electionsViewModel: elecVM
        )
        XCTAssertNotNil(mainView)
    }
    
    func testSuperAdminDashboardViewInitialization() {
        let authVM = AuthViewModel()
        let view = SuperAdminDashboardView(authViewModel: authVM)
        XCTAssertNotNil(view)
    }
    
    func testAdminElectionManagerViewInitialization() {
        let authVM = AuthViewModel()
        let elecVM = ElectionsViewModel()
        let view = AdminElectionManagerView(authViewModel: authVM, electionsViewModel: elecVM)
        XCTAssertNotNil(view)
    }
    
    func testVisitorPublicPortalViewInitialization() {
        let authVM = AuthViewModel()
        let elecVM = ElectionsViewModel()
        let view = VisitorPublicPortalView(authViewModel: authVM, electionsViewModel: elecVM)
        XCTAssertNotNil(view)
    }
    
    func testAdminCanPromoteStudentToCandidate() {
        let authVM = AuthViewModel()
        XCTAssertTrue(authVM.registeredStudents.isEmpty)
        
        // Register a new student
        authVM.registerStudent(
            name: "Clara Chen",
            email: "clara.chen@campus.edu",
            password: "StudentPass2026!",
            studentId: "EC2026-042",
            department: "Electronics & Comm"
        )
        XCTAssertEqual(authVM.registeredStudents.count, 1)
        let student = authVM.registeredStudents[0]
        XCTAssertFalse(student.isNominatedCandidate)
        
        authVM.promoteStudentToCandidate(studentId: student.id, contest: "Academic Senate")
        let updated = authVM.registeredStudents.first(where: { $0.id == student.id })
        XCTAssertTrue(updated?.isNominatedCandidate == true)
        XCTAssertEqual(updated?.candidateContest, "Academic Senate")
    }
    
    func testAdminCanCreateElection() {
        let elecVM = ElectionsViewModel()
        let initialCount = elecVM.elections.count
        let newId = elecVM.createElectionByAdmin(title: "Hostel Council", contest: "President", eligibleCount: 800)
        
        XCTAssertEqual(elecVM.elections.count, initialCount + 1)
        XCTAssertEqual(elecVM.elections.first?.id, newId)
        XCTAssertEqual(elecVM.elections.first?.title, "Hostel Council")
        XCTAssertEqual(elecVM.customElections[newId]?.eligibleCount, 800)
    }
    
    func testVisitorModeActivation() {
        let authVM = AuthViewModel()
        authVM.continueAsVisitor()
        XCTAssertTrue(authVM.isAuthenticated)
        XCTAssertEqual(authVM.currentUser?.role, .visitor)
    }
    
    func testVoterBoothPortalViewInitialization() {
        let authVM = AuthViewModel()
        let elecVM = ElectionsViewModel()
        let votingVM = VotingViewModel()
        let view = VoterBoothPortalView(
            authViewModel: authVM,
            electionsViewModel: elecVM,
            votingViewModel: votingVM
        )
        XCTAssertNotNil(view)
    }
    
    func testStudentReceiptPortalViewInitialization() {
        let votingVM = VotingViewModel()
        let view = StudentReceiptPortalView(votingViewModel: votingVM)
        XCTAssertNotNil(view)
    }
    
    func testCredentialModelAndViewModelCompatibility() {
        let cred = Credential(
            electionId: "elec_01",
            blindSignatureResponse: "sig_resp_xyz",
            blindedSecret: "secret_1234567890abcdef",
            unblindedSignature: "unblinded_sig",
            status: .delivered
        )
        XCTAssertEqual(cred.blindedRequest, "secret_1234567890abcdef")
        XCTAssertEqual(cred.credentialToken, "unblinded_sig")
        XCTAssertEqual(cred.nullifier, "secret_123456789")
        
        let credVM = CredentialViewModel()
        XCTAssertFalse(credVM.isLoading)
        XCTAssertNil(credVM.issuedCredential)
    }
    
    func testVotingBoothViewSecondaryInitializer() {
        let votingVM = VotingViewModel()
        let boothView = VotingBoothView(
            electionId: "elec_test",
            electionTitle: "Test Election",
            credentialToken: "tok_test_123",
            votingViewModel: votingVM
        )
        XCTAssertNotNil(boothView)
        XCTAssertEqual(boothView.electionSummary.id, "elec_test")
        XCTAssertEqual(boothView.credential.credentialToken, "tok_test_123")
    }
}

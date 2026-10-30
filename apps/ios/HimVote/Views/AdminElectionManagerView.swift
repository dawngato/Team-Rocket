import SwiftUI

public struct AdminElectionManagerView: View {
    @Bindable var authViewModel: AuthViewModel
    @Bindable var electionsViewModel: ElectionsViewModel
    
    // Create Election Form State
    @State private var newElectionTitle: String = ""
    @State private var newContestName: String = "President & Executive Council"
    @State private var newEligibleCount: String = "2500"
    @State private var showCreateSuccess: Bool = false
    
    // Promote Student State
    @State private var selectedStudentId: String = ""
    @State private var selectedElectionId: String = "elec_01"
    @State private var candidateContestTitle: String = "Executive Board"
    @State private var showNominationSuccess: Bool = false
    @State private var nominationAlertText: String = ""
    
    public init(
        authViewModel: AuthViewModel,
        electionsViewModel: ElectionsViewModel
    ) {
        self.authViewModel = authViewModel
        self.electionsViewModel = electionsViewModel
    }
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Admin Banner
                    adminHeroCard
                    
                    // Section 1: Create New Election
                    createElectionCard
                    
                    // Section 2: PROMOTE NORMAL STUDENT TO CANDIDATE (Crucial Requirement!)
                    promoteStudentToCandidateCard
                    
                    // Section 3: Registered Student Roster & Nomination Status
                    studentRosterStatusCard
                    
                    // Section 4: Election Lifecycle Controls (Open/Close/Freeze)
                    electionLifecycleControlsCard
                    
                    Spacer(minLength: 90)
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
            }
            .background(ColorTokens.tailAdminLightBg)
            .navigationTitle("Admin & Election Officer")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
    
    private var adminHeroCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                ZStack {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(ColorTokens.tailAdminBrand.opacity(0.12))
                        .frame(width: 42, height: 42)
                    
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 20))
                        .foregroundStyle(ColorTokens.tailAdminBrand)
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text("Election Administration")
                            .font(Typography.sectionHeader)
                            .foregroundStyle(ColorTokens.textPrimary)
                        
                        Text("ADMIN LEVEL")
                            .font(Typography.badgeText)
                            .foregroundStyle(ColorTokens.tailAdminBrand)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(ColorTokens.tailAdminBrandBg)
                            .clipShape(Capsule())
                    }
                    
                    Text("Campus Contests • Candidate Roster • Lifecycle Control")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
                
                Spacer()
            }
            
            Text("Authorized officials manage contests, register candidates, freeze manifests, and trigger open/close transitions. All transitions are server-authoritative and recorded in append-only logs.")
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
        }
        .glassCard(cornerRadius: 18, padding: 16)
    }
    
    // MARK: - Section 1: Create Election
    private var createElectionCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Image(systemName: "plus.circle.fill")
                    .foregroundStyle(ColorTokens.tailAdminBrand)
                Text("Create New Campus Election")
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
            }
            
            if showCreateSuccess {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(ColorTokens.tailAdminSuccess)
                    Text("Election created in DRAFT state. Manifest generated.")
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.tailAdminSuccess)
                    Spacer()
                }
                .padding(10)
                .background(ColorTokens.tailAdminSuccessBg)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            
            VStack(alignment: .leading, spacing: 6) {
                Text("Election Title")
                    .font(Typography.captionBold)
                    .foregroundStyle(ColorTokens.textSecondary)
                
                TextField("e.g. Hostel Committee Elections 2026", text: $newElectionTitle)
                    .padding(12)
                    .background(Color.white.opacity(0.7))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            
            VStack(alignment: .leading, spacing: 6) {
                Text("Contest / Office Name")
                    .font(Typography.captionBold)
                    .foregroundStyle(ColorTokens.textSecondary)
                
                TextField("e.g. General Secretary", text: $newContestName)
                    .padding(12)
                    .background(Color.white.opacity(0.7))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            
            Button {
                HapticFeedback.medium()
                let title = newElectionTitle.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !title.isEmpty else { return }
                
                let _ = electionsViewModel.createElectionByAdmin(
                    title: title,
                    contest: newContestName,
                    eligibleCount: Int(newEligibleCount) ?? 1500
                )
                
                showCreateSuccess = true
                newElectionTitle = ""
                Task {
                    try? await Task.sleep(nanoseconds: 3_000_000_000)
                    showCreateSuccess = false
                }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "doc.badge.plus")
                    Text("Initialize Election Manifest")
                }
                .font(Typography.callout)
                .fontWeight(.bold)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(ColorTokens.tailAdminBrand)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .glassCard(cornerRadius: 20, padding: 18)
    }
    
    // MARK: - Section 2: PROMOTE NORMAL STUDENT TO CANDIDATE
    private var promoteStudentToCandidateCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Image(systemName: "person.crop.circle.badge.plus")
                    .foregroundStyle(ColorTokens.tailAdminPurple)
                Text("Promote Normal Student to Candidate")
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
            }
            
            Text("Select an eligible student from the university registry and nominate them as an official candidate standing in an election contest.")
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
            
            if showNominationSuccess {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(ColorTokens.tailAdminSuccess)
                    Text(nominationAlertText)
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.tailAdminSuccess)
                    Spacer()
                }
                .padding(10)
                .background(ColorTokens.tailAdminSuccessBg)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            
            // Student Picker
            VStack(alignment: .leading, spacing: 6) {
                Text("Select Student from Roster")
                    .font(Typography.captionBold)
                    .foregroundStyle(ColorTokens.textSecondary)
                
                if authViewModel.visibleStudents.filter({ !$0.isNominatedCandidate }).isEmpty {
                    Text("No eligible unnominated students currently registered.")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textTertiary)
                        .padding(10)
                } else {
                    Picker("Student", selection: $selectedStudentId) {
                        Text("Select a Student...").tag("")
                        ForEach(authViewModel.visibleStudents.filter { !$0.isNominatedCandidate }) { student in
                            Text("\(student.name) (\(student.studentId) - \(student.department))").tag(student.id)
                        }
                    }
                    .pickerStyle(.menu)
                    .padding(8)
                    .background(Color.white.opacity(0.7))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }
            
            // Contest Field
            VStack(alignment: .leading, spacing: 6) {
                Text("Contest Office to Nominate For")
                    .font(Typography.captionBold)
                    .foregroundStyle(ColorTokens.textSecondary)
                
                TextField("e.g. Executive Board", text: $candidateContestTitle)
                    .padding(12)
                    .background(Color.white.opacity(0.7))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            
            Button {
                HapticFeedback.medium()
                guard !selectedStudentId.isEmpty else { return }
                
                if let student = authViewModel.visibleStudents.first(where: { $0.id == selectedStudentId }) {
                    authViewModel.promoteStudentToCandidate(studentId: student.id, contest: candidateContestTitle)
                    electionsViewModel.addCandidateByAdmin(
                        electionId: selectedElectionId,
                        name: student.name,
                        contest: candidateContestTitle
                    )
                    
                    nominationAlertText = "Successfully promoted \(student.name) to Official Candidate for \(candidateContestTitle)!"
                    showNominationSuccess = true
                    selectedStudentId = ""
                    
                    Task {
                        try? await Task.sleep(nanoseconds: 3_000_000_000)
                        showNominationSuccess = false
                    }
                }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.seal.fill")
                    Text("Nominate Student as Candidate")
                }
                .font(Typography.callout)
                .fontWeight(.bold)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(
                    selectedStudentId.isEmpty
                        ? Color.gray.opacity(0.4)
                        : ColorTokens.tailAdminPurple
                )
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(selectedStudentId.isEmpty)
        }
        .glassCard(cornerRadius: 20, padding: 18)
    }
    
    // MARK: - Section 3: Registered Student Roster & Nomination Status
    private var studentRosterStatusCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Student Roster & Candidate Status")
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
                
                Spacer()
                
                Text("\(authViewModel.visibleStudents.count) Students")
                    .font(Typography.badgeText)
                    .foregroundStyle(ColorTokens.textTertiary)
            }
            
            if authViewModel.visibleStudents.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "person.2.slash")
                        .font(.system(size: 28))
                        .foregroundStyle(ColorTokens.textTertiary)
                    Text("No Students Registered Yet")
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.textSecondary)
                    Text("Students can register their accounts using the app login screen. Registered students will appear here for election nomination.")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textTertiary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(20)
                .background(Color.white.opacity(0.4))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            } else {
                VStack(spacing: 8) {
                    ForEach(authViewModel.visibleStudents) { student in
                    HStack(spacing: 12) {
                        Circle()
                            .fill(student.isNominatedCandidate ? ColorTokens.tailAdminPurple : Color.gray.opacity(0.2))
                            .frame(width: 10, height: 10)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            HStack {
                                Text(student.name)
                                    .font(Typography.callout)
                                    .fontWeight(.semibold)
                                    .foregroundStyle(ColorTokens.textPrimary)
                                
                                Text("(\(student.studentId))")
                                    .font(Typography.caption)
                                    .foregroundStyle(ColorTokens.textTertiary)
                            }
                            
                            Text(student.department)
                                .font(Typography.caption)
                                .foregroundStyle(ColorTokens.textSecondary)
                        }
                        
                        Spacer()
                        
                        if student.isNominatedCandidate {
                            VStack(alignment: .trailing, spacing: 2) {
                                Text("CANDIDATE")
                                    .font(Typography.badgeText)
                                    .foregroundStyle(ColorTokens.tailAdminPurple)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(ColorTokens.tailAdminBrandBg)
                                    .clipShape(Capsule())
                                
                                Button {
                                    HapticFeedback.light()
                                    authViewModel.demoteCandidateToStudent(studentId: student.id)
                                } label: {
                                    Text("Revert")
                                        .font(.system(size: 10, weight: .semibold))
                                        .foregroundStyle(ColorTokens.tailAdminDanger)
                                }
                            }
                        } else {
                            Text("Normal Student")
                                .font(Typography.badgeText)
                                .foregroundStyle(ColorTokens.textTertiary)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.gray.opacity(0.1))
                                .clipShape(Capsule())
                        }
                    }
                    .padding(10)
                    .background(Color.white.opacity(0.6))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
        .glassCard(cornerRadius: 20, padding: 18)
    }
    
    // MARK: - Section 4: Election Lifecycle Controls
    private var electionLifecycleControlsCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Election State Controls")
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
                
                Spacer()
                
                Text("LIFECYCLE")
                    .font(Typography.badgeText)
                    .foregroundStyle(ColorTokens.tailAdminBrand)
            }
            
            VStack(spacing: 12) {
                ForEach(electionsViewModel.elections) { election in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(election.title)
                                    .font(Typography.callout)
                                    .fontWeight(.bold)
                                    .foregroundStyle(ColorTokens.textPrimary)
                                
                                Text("ID: \(election.id)")
                                    .font(Typography.caption)
                                    .foregroundStyle(ColorTokens.textTertiary)
                            }
                            
                            Spacer()
                            
                            ElectionStateBadge(state: election.electionState)
                        }
                        
                        // Action buttons according to state
                        HStack(spacing: 8) {
                            if election.electionState == .draft {
                                Button {
                                    HapticFeedback.medium()
                                    electionsViewModel.updateElectionState(electionId: election.id, newState: .frozen)
                                } label: {
                                    Text("Freeze Manifest")
                                        .font(Typography.captionBold)
                                        .foregroundStyle(.white)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background(ColorTokens.tailAdminInfo)
                                        .clipShape(Capsule())
                                }
                            }
                            
                            if election.electionState == .frozen {
                                Button {
                                    HapticFeedback.medium()
                                    electionsViewModel.updateElectionState(electionId: election.id, newState: .open)
                                } label: {
                                    Text("Open Voting")
                                        .font(Typography.captionBold)
                                        .foregroundStyle(.white)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background(ColorTokens.tailAdminSuccess)
                                        .clipShape(Capsule())
                                }
                            }
                            
                            if election.electionState == .open {
                                Button {
                                    HapticFeedback.heavy()
                                    electionsViewModel.updateElectionState(electionId: election.id, newState: .closed)
                                } label: {
                                    Text("Close Voting")
                                        .font(Typography.captionBold)
                                        .foregroundStyle(.white)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background(ColorTokens.tailAdminWarning)
                                        .clipShape(Capsule())
                                }
                            }
                            
                            if election.electionState == .closed {
                                Button {
                                    HapticFeedback.medium()
                                    electionsViewModel.updateElectionState(electionId: election.id, newState: .published)
                                } label: {
                                    Text("Publish Attested Results")
                                        .font(Typography.captionBold)
                                        .foregroundStyle(.white)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background(ColorTokens.tailAdminBrand)
                                        .clipShape(Capsule())
                                }
                            }
                        }
                    }
                    .padding(12)
                    .background(Color.white.opacity(0.6))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
        .glassCard(cornerRadius: 20, padding: 18)
    }
}

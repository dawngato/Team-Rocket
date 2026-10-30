import SwiftUI

public struct CandidateListView: View {
    public let electionSummary: ElectionSummary
    @Bindable var authViewModel: AuthViewModel
    @Bindable var electionsViewModel: ElectionsViewModel
    
    @State private var digestCopied: Bool = false
    
    public init(
        electionSummary: ElectionSummary,
        authViewModel: AuthViewModel,
        electionsViewModel: ElectionsViewModel
    ) {
        self.electionSummary = electionSummary
        self.authViewModel = authViewModel
        self.electionsViewModel = electionsViewModel
    }
    
    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                electionHeaderCard
                
                candidatesSection
                
                actionButtonsSection
            }
            .padding(16)
        }
        .navigationTitle("Election Details")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if let token = authViewModel.currentUser?.sessionToken {
                await electionsViewModel.loadElectionDetail(id: electionSummary.id, sessionToken: token)
            }
        }
    }
    
    private var electionHeaderCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(electionSummary.title)
                        .font(Typography.sectionHeader)
                        .foregroundStyle(ColorTokens.textPrimary)
                    
                    if let contest = electionsViewModel.selectedElection?.contest {
                        Text("Contest: \(contest)")
                            .font(Typography.callout)
                            .foregroundStyle(ColorTokens.brandAccent)
                    }
                }
                
                Spacer()
                
                ElectionStateBadge(state: electionSummary.electionState)
            }
            
            if let detail = electionsViewModel.selectedElection {
                Divider()
                
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("Manifest SHA256 Digest")
                            .font(Typography.captionBold)
                            .foregroundStyle(ColorTokens.textSecondary)
                        
                        Spacer()
                        
                        Button {
                            UIPasteboard.general.string = detail.manifestDigest
                            digestCopied = true
                            Task {
                                try? await Task.sleep(nanoseconds: 2_000_000_000)
                                digestCopied = false
                            }
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: digestCopied ? "checkmark" : "doc.on.doc")
                                Text(digestCopied ? "Copied" : "Copy")
                            }
                            .font(Typography.badgeText)
                            .foregroundStyle(digestCopied ? ColorTokens.stateSuccess : ColorTokens.brandAccent)
                        }
                    }
                    
                    Text(detail.manifestDigest)
                        .font(Typography.cryptographicDigest)
                        .foregroundStyle(ColorTokens.textTertiary)
                        .textSelection(.enabled)
                }
                
                if let count = detail.eligibleCount {
                    HStack(spacing: 6) {
                        Image(systemName: "person.2.fill")
                            .font(Typography.caption)
                            .foregroundStyle(ColorTokens.textTertiary)
                        
                        Text("Eligible Electorate: \(count) verified voters")
                            .font(Typography.caption)
                            .foregroundStyle(ColorTokens.textSecondary)
                    }
                }
            }
        }
        .padding(16)
        .background(ColorTokens.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(ColorTokens.cardBorder, lineWidth: 1)
        )
    }
    
    private var candidatesSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Nominated Candidates")
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
                
                Spacer()
                
                if let candidates = electionsViewModel.selectedElection?.candidates {
                    Text("\(candidates.count) Candidates")
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.textTertiary)
                }
            }
            
            if let detail = electionsViewModel.selectedElection,
               let candidates = detail.candidates, !candidates.isEmpty {
                ForEach(Array(candidates.enumerated()), id: \.element.id) { index, candidate in
                    CandidateRowView(candidate: candidate, index: index + 1)
                }
            } else if electionsViewModel.isLoading {
                HStack {
                    Spacer()
                    ProgressView("Retrieving official candidate roster...")
                        .font(Typography.callout)
                        .padding(24)
                    Spacer()
                }
            } else {
                HStack {
                    Spacer()
                    VStack(spacing: 8) {
                        Image(systemName: "person.slash")
                            .font(.system(size: 32))
                            .foregroundStyle(ColorTokens.textTertiary)
                        
                        Text("No registered candidates for this contest.")
                            .font(Typography.caption)
                            .foregroundStyle(ColorTokens.textTertiary)
                    }
                    .padding(24)
                    Spacer()
                }
            }
        }
    }
    
    private var actionButtonsSection: some View {
        VStack(spacing: 12) {
            if electionSummary.electionState == .open {
                NavigationLink {
                    CredentialIssueView(
                        electionSummary: electionSummary,
                        authViewModel: authViewModel
                    )
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: "key.fill")
                        Text("Obtain Anonymous Credential")
                    }
                    .font(Typography.cardHeader)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(ColorTokens.brandAccent)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .shadow(color: ColorTokens.brandAccent.opacity(0.3), radius: 6, x: 0, y: 3)
                }
                .accessibilityLabel("Obtain Anonymous Voter Credential button")
            }
            
            if electionSummary.electionState == .published {
                NavigationLink {
                    ResultsView(
                        electionId: electionSummary.id,
                        electionTitle: electionSummary.title,
                        authViewModel: authViewModel
                    )
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: "chart.bar.xaxis")
                        Text("Inspect Official Results")
                    }
                    .font(Typography.cardHeader)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(ColorTokens.stateSuccess)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .shadow(color: ColorTokens.stateSuccess.opacity(0.3), radius: 6, x: 0, y: 3)
                }
                .accessibilityLabel("Inspect official election results button")
            }
            
            NavigationLink {
                VerificationView(
                    electionId: electionSummary.id,
                    authViewModel: authViewModel
                )
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "shield.checkmark")
                    Text("Verify Election Evidence Package")
                }
                .font(Typography.callout)
                .foregroundStyle(ColorTokens.brandPrimary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(ColorTokens.backgroundSecondary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(ColorTokens.brandPrimary, lineWidth: 1.5)
                )
            }
            .accessibilityLabel("Verify election cryptographic evidence button")
        }
        .padding(.top, 10)
    }
}

public struct CandidateRowView: View {
    public let candidate: Candidate
    public let index: Int
    
    public init(candidate: Candidate, index: Int = 1) {
        self.candidate = candidate
        self.index = index
    }
    
    public var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(ColorTokens.brandPrimary.opacity(0.12))
                    .frame(width: 44, height: 44)
                
                Text("\(index)")
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.brandPrimary)
            }
            
            VStack(alignment: .leading, spacing: 3) {
                Text(candidate.name)
                    .font(Typography.bodyBold)
                    .foregroundStyle(ColorTokens.textPrimary)
                
                Text(candidate.contest)
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.textSecondary)
            }
            
            Spacer()
            
            Image(systemName: "person.badge.shield.checkmark")
                .font(.system(size: 18))
                .foregroundStyle(ColorTokens.textTertiary)
        }
        .padding(14)
        .background(ColorTokens.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(ColorTokens.cardBorder, lineWidth: 1)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Candidate number \(index): \(candidate.name), contest \(candidate.contest)")
    }
}

import SwiftUI

public struct CandidateListView: View {
    public let electionSummary: ElectionSummary
    @Bindable var authViewModel: AuthViewModel
    @Bindable var electionsViewModel: ElectionsViewModel
    
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
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(electionSummary.title)
                            .font(Typography.sectionHeader)
                            .foregroundStyle(ColorTokens.textPrimary)
                        
                        Spacer()
                        
                        ElectionStateBadge(state: electionSummary.electionState)
                    }
                    
                    if let detail = electionsViewModel.selectedElection {
                        if let contest = detail.contest {
                            Text("Contest: \(contest)")
                                .font(Typography.callout)
                                .foregroundStyle(ColorTokens.brandAccent)
                        }
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Manifest SHA256 Digest:")
                                .font(Typography.captionBold)
                                .foregroundStyle(ColorTokens.textSecondary)
                            
                            Text(detail.manifestDigest)
                                .font(Typography.cryptographicDigest)
                                .foregroundStyle(ColorTokens.textTertiary)
                                .textSelection(.enabled)
                        }
                        .padding(.top, 4)
                    }
                }
                .padding()
                .background(ColorTokens.backgroundSecondary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                
                VStack(alignment: .leading, spacing: 12) {
                    Text("Nominated Candidates")
                        .font(Typography.cardHeader)
                        .foregroundStyle(ColorTokens.textPrimary)
                    
                    if let detail = electionsViewModel.selectedElection,
                       let candidates = detail.candidates, !candidates.isEmpty {
                        ForEach(candidates) { candidate in
                            CandidateRowView(candidate: candidate)
                        }
                    } else if electionsViewModel.isLoading {
                        ProgressView("Loading candidate roster...")
                            .padding()
                    } else {
                        Text("No registered candidates for this contest.")
                            .font(Typography.caption)
                            .foregroundStyle(ColorTokens.textTertiary)
                            .padding()
                    }
                }
                
                VStack(spacing: 12) {
                    if electionSummary.electionState == .open {
                        NavigationLink {
                            CredentialIssueView(
                                electionSummary: electionSummary,
                                authViewModel: authViewModel
                            )
                        } label: {
                            HStack {
                                Image(systemName: "key.fill")
                                Text("Obtain Anonymous Credential")
                            }
                            .font(Typography.cardHeader)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(ColorTokens.brandAccent)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
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
                            HStack {
                                Image(systemName: "chart.bar.xaxis")
                                Text("Inspect Official Results")
                            }
                            .font(Typography.cardHeader)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(ColorTokens.stateSuccess)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                        .accessibilityLabel("Inspect official election results button")
                    }
                    
                    NavigationLink {
                        VerificationView(
                            electionId: electionSummary.id,
                            authViewModel: authViewModel
                        )
                    } label: {
                        HStack {
                            Image(systemName: "shield.checkmark")
                            Text("Verify Election Evidence Package")
                        }
                        .font(Typography.callout)
                        .foregroundStyle(ColorTokens.brandPrimary)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(ColorTokens.backgroundSecondary)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(ColorTokens.brandPrimary, lineWidth: 1)
                        )
                    }
                    .accessibilityLabel("Verify election cryptographic evidence button")
                }
                .padding(.top, 10)
            }
            .padding()
        }
        .navigationTitle("Election Details")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if let token = authViewModel.currentUser?.sessionToken {
                await electionsViewModel.loadElectionDetail(id: electionSummary.id, sessionToken: token)
            }
        }
    }
}

public struct CandidateRowView: View {
    public let candidate: Candidate
    
    public init(candidate: Candidate) {
        self.candidate = candidate
    }
    
    public var body: some View {
        HStack {
            Image(systemName: "person.circle.fill")
                .font(.system(size: 32))
                .foregroundStyle(ColorTokens.brandPrimary)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(candidate.name)
                    .font(Typography.bodyBold)
                    .foregroundStyle(ColorTokens.textPrimary)
                
                Text(candidate.contest)
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.textSecondary)
            }
            
            Spacer()
        }
        .padding()
        .background(ColorTokens.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Candidate \(candidate.name), contest \(candidate.contest)")
    }
}

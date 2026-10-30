import SwiftUI

public struct VotingBoothView: View {
    public let electionSummary: ElectionSummary
    public let credential: Credential
    @State private var votingViewModel = VotingViewModel()
    
    public init(electionSummary: ElectionSummary, credential: Credential) {
        self.electionSummary = electionSummary
        self.credential = credential
    }
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                VStack(spacing: 8) {
                    Image(systemName: "shield.lefthalf.filled.badge.checkmark")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 56, height: 56)
                        .foregroundStyle(ColorTokens.brandAccent)
                    
                    Text("Secure Voting Booth")
                        .font(Typography.sectionHeader)
                        .foregroundStyle(ColorTokens.institutionalNavy)
                    
                    Text("Isolated Sandbox Environment")
                        .font(Typography.callout)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
                .padding(.top, 20)
                
                VStack(alignment: .leading, spacing: 12) {
                    Text("Audited Voting Engine Protocol")
                        .font(Typography.cardHeader)
                        .foregroundStyle(ColorTokens.textPrimary)
                    
                    Text("Your ballot choices are encrypted client side inside an isolated ASWebAuthenticationSession booth. The mobile application never accesses plaintext ballot selections, complying with Section 0.1 Rule 3.")
                        .font(Typography.callout)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
                .padding()
                .background(ColorTokens.backgroundSecondary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                
                if let error = votingViewModel.errorMessage {
                    Text(error)
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.stateDanger)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(ColorTokens.stateDangerBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                
                if let handle = votingViewModel.successReceiptHandle {
                    VStack(spacing: 16) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 48))
                            .foregroundStyle(ColorTokens.stateSuccess)
                        
                        Text("Ballot Successfully Cast")
                            .font(Typography.sectionHeader)
                            .foregroundStyle(ColorTokens.textPrimary)
                        
                        Text("Receipt Handle: \(handle)")
                            .font(Typography.receiptHandle)
                            .foregroundStyle(ColorTokens.brandAccent)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                        
                        NavigationLink {
                            ReceiptView(
                                electionId: electionSummary.id,
                                receiptHandle: handle
                            )
                        } label: {
                            Text("Inspect Verification Receipt")
                                .font(Typography.cardHeader)
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(ColorTokens.brandPrimary)
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                    }
                    .padding()
                    .background(ColorTokens.backgroundSecondary)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                } else {
                    Button {
                        Task {
                            let boothUrl = URL(string: "http://localhost:8080/booth")!
                            let election = Election(
                                id: electionSummary.id,
                                title: electionSummary.title,
                                state: electionSummary.electionState,
                                manifestDigest: "",
                                opensAtUtc: electionSummary.opensAtUtc,
                                closesAtUtc: electionSummary.closesAtUtc,
                                issuanceCutoffUtc: ""
                            )
                            await votingViewModel.startVotingFlow(
                                boothBaseUrl: boothUrl,
                                election: election,
                                credential: credential
                            )
                        }
                    } label: {
                        HStack {
                            if votingViewModel.isLaunchingBooth || votingViewModel.isCasting {
                                ProgressView()
                                    .tint(.white)
                                    .padding(.trailing, 8)
                            }
                            
                            Text(votingViewModel.isCasting ? "Submitting Cast to Outbox..." : (votingViewModel.isLaunchingBooth ? "Opening Isolated Booth..." : "Launch Isolated Booth"))
                                .font(Typography.cardHeader)
                                .foregroundStyle(.white)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(ColorTokens.brandAccent)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .disabled(votingViewModel.isLaunchingBooth || votingViewModel.isCasting)
                    .accessibilityLabel("Launch isolated voting booth button")
                }
            }
            .padding()
        }
        .navigationTitle("Voting Booth")
        .navigationBarTitleDisplayMode(.inline)
    }
}

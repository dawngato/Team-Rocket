import SwiftUI

public struct ResultsView: View {
    public let electionId: String
    public let electionTitle: String
    @Bindable var authViewModel: AuthViewModel
    
    @State private var results: PublishedResults?
    @State private var isLoading: Bool = false
    @State private var errorMessage: String?
    
    private let apiClient: ApiClientProtocol
    
    public init(
        electionId: String,
        electionTitle: String,
        authViewModel: AuthViewModel,
        apiClient: ApiClientProtocol = ApiClient()
    ) {
        self.electionId = electionId
        self.electionTitle = electionTitle
        self.authViewModel = authViewModel
        self.apiClient = apiClient
    }
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                VStack(spacing: 8) {
                    Image(systemName: "chart.bar.doc.horizontal.fill")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 50, height: 50)
                        .foregroundStyle(ColorTokens.stateSuccess)
                    
                    Text("Official Election Results")
                        .font(Typography.sectionHeader)
                        .foregroundStyle(ColorTokens.institutionalNavy)
                    
                    Text(electionTitle)
                        .font(Typography.callout)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
                .padding(.top, 20)
                
                if isLoading {
                    ProgressView("Tallying published ballots...")
                        .padding()
                } else if let error = errorMessage {
                    Text(error)
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.stateDanger)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(ColorTokens.stateDangerBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                } else if let results = results {
                    VStack(alignment: .leading, spacing: 14) {
                        HStack {
                            Text("Total Valid Ballots")
                                .font(Typography.bodyBold)
                            
                            Spacer()
                            
                            Text("\(results.totalBallots)")
                                .font(Typography.cardHeader)
                                .foregroundStyle(ColorTokens.brandAccent)
                        }
                        
                        Divider()
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Manifest SHA256 Digest")
                                .font(Typography.captionBold)
                                .foregroundStyle(ColorTokens.textSecondary)
                            
                            Text(results.manifestDigest)
                                .font(Typography.cryptographicDigest)
                                .foregroundStyle(ColorTokens.textTertiary)
                                .textSelection(.enabled)
                        }
                    }
                    .padding()
                    .background(ColorTokens.backgroundSecondary)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Certified Tally Count")
                            .font(Typography.cardHeader)
                            .foregroundStyle(ColorTokens.textPrimary)
                        
                        ForEach(results.tally.sorted(by: { $0.value > $1.value }), id: \.key) { candidateId, count in
                            HStack {
                                Text("Candidate \(candidateId)")
                                    .font(Typography.bodyBold)
                                    .foregroundStyle(ColorTokens.textPrimary)
                                
                                Spacer()
                                
                                Text("\(count) votes")
                                    .font(Typography.bodyBold)
                                    .foregroundStyle(ColorTokens.stateSuccess)
                            }
                            .padding()
                            .background(ColorTokens.backgroundSecondary)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                    }
                    
                    if results.privacyLimited == true {
                        HStack(alignment: .top, spacing: 10) {
                            Image(systemName: "info.circle.fill")
                                .foregroundStyle(ColorTokens.stateWarning)
                            
                            Text("Turnout privacy limitations apply: Small electorate cohorts are subject to differential tally protections.")
                                .font(Typography.caption)
                                .foregroundStyle(ColorTokens.textSecondary)
                        }
                        .padding()
                        .background(ColorTokens.stateWarningBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Election Results")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadResults()
        }
    }
    
    private func loadResults() async {
        guard let token = authViewModel.currentUser?.sessionToken else { return }
        isLoading = true
        errorMessage = nil
        do {
            self.results = try await apiClient.fetchResults(electionId: electionId, sessionToken: token)
        } catch {
            self.errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

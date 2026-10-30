import SwiftUI

public struct ResultsView: View {
    public let electionId: String
    public let electionTitle: String
    @Bindable var authViewModel: AuthViewModel
    
    @State private var results: PublishedResults?
    @State private var isLoading: Bool = false
    @State private var errorMessage: String?
    @State private var digestCopied: Bool = false
    
    @ScaledMetric(relativeTo: .title) private var headerCircleSize: CGFloat = 72
    @ScaledMetric(relativeTo: .title) private var headerIconSize: CGFloat = 38
    @ScaledMetric(relativeTo: .body) private var navIconSize: CGFloat = 20
    
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
            VStack(spacing: 22) {
                headerView
                
                if isLoading {
                    loadingView
                        .transition(.opacity)
                } else if let error = errorMessage {
                    errorBanner(message: error)
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .scale(scale: 0.96)),
                            removal: .opacity
                        ))
                } else if let results = results {
                    summaryCard(results: results)
                    
                    tallySection(results: results)
                    
                    if results.privacyLimited == true {
                        privacyDisclosureCard
                    }
                }
            }
            .padding(16)
            .animation(SpringTokens.fluid, value: results)
            .animation(SpringTokens.fluid, value: isLoading)
        }
        .navigationTitle("Election Results")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    HapticFeedback.medium()
                    Task {
                        await loadResults()
                    }
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: navIconSize))
                        .foregroundStyle(ColorTokens.brandPrimary)
                }
                .accessibilityLabel("Refresh election results")
            }
        }
        .task {
            await loadResults()
        }
    }
    
    private var headerView: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(ColorTokens.stateSuccess.opacity(0.12))
                    .frame(width: headerCircleSize, height: headerCircleSize)
                
                Image(systemName: "chart.bar.doc.horizontal.fill")
                    .resizable()
                    .scaledToFit()
                    .frame(width: headerIconSize, height: headerIconSize)
                    .foregroundStyle(ColorTokens.stateSuccess)
            }
            .accessibilityHidden(true)
            .padding(.top, 12)
            
            Text("Official Election Results")
                .font(Typography.sectionHeader)
                .foregroundStyle(ColorTokens.institutionalNavy)
            
            Text(electionTitle)
                .font(Typography.callout)
                .foregroundStyle(ColorTokens.textSecondary)
                .multilineTextAlignment(.center)
        }
    }
    
    private var loadingView: some View {
        VStack(spacing: 16) {
            Spacer(minLength: 40)
            ProgressView()
                .scaleEffect(1.3)
            Text("Tallying certified election ballots...")
                .font(Typography.callout)
                .foregroundStyle(ColorTokens.textSecondary)
            Spacer(minLength: 40)
        }
        .padding(24)
    }
    
    private func errorBanner(message: String) -> some View {
        VStack(spacing: 14) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(ColorTokens.stateDanger)
                    .font(.system(size: 20))
                    .padding(.top, 2)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Results Unavailable")
                        .font(Typography.cardHeader)
                        .foregroundStyle(ColorTokens.stateDanger)
                    
                    Text(message)
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.stateDanger)
                        .fixedSize(horizontal: false, vertical: true)
                }
                
                Spacer()
            }
            
            Button {
                HapticFeedback.medium()
                Task {
                    await loadResults()
                }
            } label: {
                Text("Retry Loading Results")
                    .font(Typography.captionBold)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(ColorTokens.brandPrimary)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            .interactiveSpringButton()
        }
        .padding(16)
        .background(ColorTokens.stateDangerBackground)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(ColorTokens.stateDanger.opacity(0.3), lineWidth: 1)
        )
    }
    
    private func summaryCard(results: PublishedResults) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Total Valid Ballots Cast")
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.textSecondary)
                    
                    Text("\(results.totalBallots)")
                        .font(Typography.appTitle)
                        .foregroundStyle(ColorTokens.brandPrimary)
                }
                
                Spacer()
                
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(ColorTokens.stateSuccess)
            }
            
            Divider()
            
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Manifest SHA256 Digest")
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.textSecondary)
                    
                    Spacer()
                    
                    Button {
                        #if canImport(UIKit)
                        UIPasteboard.general.string = results.manifestDigest
                        #endif
                        HapticFeedback.success()
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
                
                Text(results.manifestDigest)
                    .font(Typography.cryptographicDigest)
                    .foregroundStyle(ColorTokens.textTertiary)
                    .textSelection(.enabled)
            }
            
            HStack(spacing: 6) {
                Image(systemName: "calendar.badge.clock")
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.textTertiary)
                
                Text("Published: \(results.publishedAtUtc)")
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.textSecondary)
            }
        }
        .padding(18)
        .background(ColorTokens.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(ColorTokens.cardBorder, lineWidth: 1)
        )
    }
    
    private func tallySection(results: PublishedResults) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Certified Vote Distribution")
                .font(Typography.cardHeader)
                .foregroundStyle(ColorTokens.textPrimary)
            
            let sortedTally = results.tally.sorted(by: { $0.value > $1.value })
            let maxVotes = sortedTally.first?.value ?? 1
            
            ForEach(Array(sortedTally.enumerated()), id: \.element.key) { index, item in
                let candidateId = item.key
                let count = item.value
                let percentage = results.totalBallots > 0 ? (Double(count) / Double(results.totalBallots)) * 100.0 : 0.0
                let barFraction = maxVotes > 0 ? Double(count) / Double(maxVotes) : 0.0
                
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        if index == 0 {
                            Image(systemName: "trophy.fill")
                                .foregroundStyle(ColorTokens.institutionalGold)
                        }
                        
                        Text("Candidate \(candidateId)")
                            .font(Typography.bodyBold)
                            .foregroundStyle(ColorTokens.textPrimary)
                        
                        Spacer()
                        
                        Text("\(count) votes")
                            .font(Typography.bodyBold)
                            .foregroundStyle(ColorTokens.brandPrimary)
                        
                        Text("(\(String(format: "%.1f", percentage))%)")
                            .font(Typography.caption)
                            .foregroundStyle(ColorTokens.textSecondary)
                    }
                    
                    GeometryReader { geometry in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 6)
                                .fill(ColorTokens.backgroundPrimary)
                                .frame(height: 10)
                            
                            RoundedRectangle(cornerRadius: 6)
                                .fill(index == 0 ? ColorTokens.brandAccent : ColorTokens.brandPrimaryLight)
                                .frame(width: max(0, geometry.size.width * CGFloat(barFraction)), height: 10)
                                .animation(SpringTokens.fluid, value: barFraction)
                        }
                    }
                    .frame(height: 10)
                }
                .padding(14)
                .background(ColorTokens.backgroundSecondary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(ColorTokens.cardBorder, lineWidth: 1)
                )
                .accessibilityElement(children: .combine)
                .accessibilityLabel("Candidate \(candidateId), \(count) votes, \(String(format: "%.1f", percentage)) percent")
            }
        }
    }
    
    private var privacyDisclosureCard: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "shield.lefthalf.filled")
                .foregroundStyle(ColorTokens.stateWarning)
                .font(.system(size: 20))
                .padding(.top, 2)
            
            VStack(alignment: .leading, spacing: 4) {
                Text("Differential Turnout Protections Active")
                    .font(Typography.captionBold)
                    .foregroundStyle(ColorTokens.stateWarning)
                
                Text("Small electorate cohorts are subject to privacy limiting threshold protections to prevent individual voter identification.")
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(14)
        .background(ColorTokens.stateWarningBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(ColorTokens.stateWarning.opacity(0.3), lineWidth: 1)
        )
    }
    
    private func loadResults() async {
        guard let token = authViewModel.currentUser?.sessionToken else { return }
        isLoading = true
        errorMessage = nil
        do {
            self.results = try await apiClient.fetchResults(electionId: electionId, sessionToken: token)
            HapticFeedback.success()
        } catch {
            self.errorMessage = error.localizedDescription
            HapticFeedback.error()
        }
        isLoading = false
    }
}

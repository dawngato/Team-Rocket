import SwiftUI

public struct ElectionsView: View {
    @Bindable var authViewModel: AuthViewModel
    @Bindable var electionsViewModel: ElectionsViewModel
    
    public init(authViewModel: AuthViewModel, electionsViewModel: ElectionsViewModel) {
        self.authViewModel = authViewModel
        self.electionsViewModel = electionsViewModel
    }
    
    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("Filter", selection: $electionsViewModel.activeFilter) {
                    ForEach(ElectionFilter.allCases, id: \.self) { filter in
                        Text(filter.rawValue).tag(filter)
                    }
                }
                .pickerStyle(.segmented)
                .padding()
                
                if electionsViewModel.isLoading && electionsViewModel.elections.isEmpty {
                    Spacer()
                    ProgressView("Loading institutional ballots...")
                    Spacer()
                } else if electionsViewModel.filteredElections.isEmpty {
                    Spacer()
                    VStack(spacing: 12) {
                        Image(systemName: "tray")
                            .font(.system(size: 40))
                            .foregroundStyle(ColorTokens.textTertiary)
                        
                        Text("No Elections Found")
                            .font(Typography.cardHeader)
                            .foregroundStyle(ColorTokens.textSecondary)
                        
                        Text("No elections match the selected filter.")
                            .font(Typography.caption)
                            .foregroundStyle(ColorTokens.textTertiary)
                    }
                    Spacer()
                } else {
                    List(electionsViewModel.filteredElections) { election in
                        NavigationLink {
                            CandidateListView(
                                electionSummary: election,
                                authViewModel: authViewModel,
                                electionsViewModel: electionsViewModel
                            )
                        } label: {
                            ElectionCardRow(election: election)
                        }
                        .listRowSeparator(.hidden)
                        .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                    }
                    .listStyle(.plain)
                    .refreshable {
                        if let token = authViewModel.currentUser?.sessionToken {
                            await electionsViewModel.loadElections(sessionToken: token)
                        }
                    }
                }
            }
            .navigationTitle("HimVote Elections")
            .searchable(text: $electionsViewModel.searchQuery, prompt: "Search elections")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        Task {
                            await authViewModel.logout()
                        }
                    } label: {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                            .foregroundStyle(ColorTokens.brandPrimary)
                    }
                    .accessibilityLabel("Log out of session")
                }
            }
            .task {
                if let token = authViewModel.currentUser?.sessionToken {
                    await electionsViewModel.loadElections(sessionToken: token)
                }
            }
        }
    }
}

public struct ElectionCardRow: View {
    public let election: ElectionSummary
    
    public init(election: ElectionSummary) {
        self.election = election
    }
    
    public var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(election.title)
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
                    .lineLimit(2)
                
                Spacer()
                
                ElectionStateBadge(state: election.electionState)
            }
            
            HStack(spacing: 16) {
                HStack(spacing: 4) {
                    Image(systemName: "calendar")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textTertiary)
                    
                    Text("Closes: \(formattedDate(election.closesAtUtc))")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
            }
        }
        .padding()
        .background(ColorTokens.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(ColorTokens.cardBorder, lineWidth: 1)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(election.title), Status: \(election.state)")
    }
    
    private func formattedDate(_ isoDate: String) -> String {
        let formatter = ISO8601DateFormatter()
        if let date = formatter.date(from: isoDate) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateStyle = .medium
            displayFormatter.timeStyle = .short
            return displayFormatter.string(from: date)
        }
        return isoDate
    }
}

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
                userHeaderBanner
                
                filterPicker
                
                contentBody
            }
            .navigationTitle("HimVote Elections")
            .searchable(text: $electionsViewModel.searchQuery, prompt: "Search elections by title")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    logoutButton
                }
            }
            .task {
                await refreshData()
            }
        }
    }
    
    private var userHeaderBanner: some View {
        HStack {
            VStack(alignment: .leading, spacing: 3) {
                if let user = authViewModel.currentUser {
                    Text(user.email)
                        .font(Typography.bodyBold)
                        .foregroundStyle(ColorTokens.textPrimary)
                    
                    Text(user.role.displayName)
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.brandAccent)
                }
            }
            
            Spacer()
            
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 20))
                .foregroundStyle(ColorTokens.institutionalGold)
                .accessibilityHidden(true)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(ColorTokens.backgroundSecondary.opacity(0.6))
    }
    
    private var filterPicker: some View {
        Picker("Filter", selection: $electionsViewModel.activeFilter) {
            ForEach(ElectionFilter.allCases, id: \.self) { filter in
                Text(filter.rawValue).tag(filter)
            }
        }
        .pickerStyle(.segmented)
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
    
    @ViewBuilder
    private var contentBody: some View {
        if electionsViewModel.isLoading && electionsViewModel.elections.isEmpty {
            Spacer()
            ProgressView("Loading institutional ballots...")
                .font(Typography.callout)
            Spacer()
        } else if electionsViewModel.filteredElections.isEmpty {
            emptyStateView
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
                await refreshData()
            }
        }
    }
    
    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Spacer()
            
            ZStack {
                Circle()
                    .fill(ColorTokens.backgroundSecondary)
                    .frame(width: 80, height: 80)
                
                Image(systemName: "tray.fill")
                    .font(.system(size: 36))
                    .foregroundStyle(ColorTokens.textTertiary)
            }
            
            Text("No Elections Found")
                .font(Typography.sectionHeader)
                .foregroundStyle(ColorTokens.textPrimary)
            
            Text("No elections match the selected filter query.")
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
                .multilineTextAlignment(.center)
            
            Button("Reset Filter") {
                electionsViewModel.activeFilter = .all
                electionsViewModel.searchQuery = ""
            }
            .font(Typography.captionBold)
            .foregroundStyle(ColorTokens.brandAccent)
            .padding(.top, 4)
            
            Spacer()
        }
        .padding(24)
    }
    
    private var logoutButton: some View {
        Button {
            Task {
                await authViewModel.logout()
            }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                Text("Sign Out")
                    .font(Typography.captionBold)
            }
            .foregroundStyle(ColorTokens.brandPrimary)
        }
        .accessibilityLabel("Log out of current session")
    }
    
    private func refreshData() async {
        if let token = authViewModel.currentUser?.sessionToken {
            await electionsViewModel.loadElections(sessionToken: token)
        }
    }
}

public struct ElectionCardRow: View {
    public let election: ElectionSummary
    
    public init(election: ElectionSummary) {
        self.election = election
    }
    
    public var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(election.title)
                        .font(Typography.cardHeader)
                        .foregroundStyle(ColorTokens.textPrimary)
                        .lineLimit(2)
                }
                
                Spacer()
                
                ElectionStateBadge(state: election.electionState)
            }
            
            Divider()
            
            HStack(spacing: 20) {
                HStack(spacing: 6) {
                    Image(systemName: "clock")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textTertiary)
                    
                    Text("Closes: \(formattedDate(election.closesAtUtc))")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
                
                Spacer()
                
                if election.electionState == .open {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(ColorTokens.stateSuccess)
                            .frame(width: 8, height: 8)
                        
                        Text("Active Now")
                            .font(Typography.badgeText)
                            .foregroundStyle(ColorTokens.stateSuccess)
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
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(election.title), Election State: \(election.electionState.displayName)")
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

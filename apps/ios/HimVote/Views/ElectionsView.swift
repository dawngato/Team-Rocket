import SwiftUI

public struct ElectionsView: View {
    @Bindable var authViewModel: AuthViewModel
    @Bindable var electionsViewModel: ElectionsViewModel
    
    @State private var showGuidelinesSheet: Bool = false
    @ScaledMetric(relativeTo: .body) private var navIconSize: CGFloat = 20
    
    public init(authViewModel: AuthViewModel, electionsViewModel: ElectionsViewModel) {
        self.authViewModel = authViewModel
        self.electionsViewModel = electionsViewModel
    }
    
    private var visibleElections: [ElectionSummary] {
        if authViewModel.currentUser?.role == .student {
            let openOnly = electionsViewModel.elections.filter { $0.electionState == .open }
            if !electionsViewModel.searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                let q = electionsViewModel.searchQuery.lowercased()
                return openOnly.filter { $0.title.lowercased().contains(q) }
            }
            return openOnly
        }
        return electionsViewModel.filteredElections
    }

    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                userHeaderBanner
                
                if authViewModel.currentUser?.role != .student {
                    filterPicker
                } else {
                    studentActiveHeader
                }
                
                contentBody
            }
            .navigationTitle(authViewModel.currentUser?.role == .student ? "Open Elections" : "HimVote Elections")
            .searchable(text: $electionsViewModel.searchQuery, prompt: "Search elections by title")
            .safeAreaInset(edge: .bottom) {
                Color.clear.frame(height: 75)
            }
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        HapticFeedback.light()
                        showGuidelinesSheet = true
                    } label: {
                        Image(systemName: "info.circle")
                            .font(.system(size: navIconSize))
                            .foregroundStyle(ColorTokens.brandAccent)
                    }
                    .accessibilityLabel("Voter Guidelines and Process")
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    logoutButton
                }
            }
            .task {
                await refreshData()
            }
            .sheet(isPresented: $showGuidelinesSheet) {
                ElectionGuidelinesSheet()
            }
        }
    }
    
    private var studentActiveHeader: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(ColorTokens.stateSuccess)
                .frame(width: 8, height: 8)
                .beaconPulse(color: ColorTokens.stateSuccess, isActive: true)
            
            Text("Active elections open for your ballot. Select an election to vote.")
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
            
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(ColorTokens.tailAdminSuccessBg.opacity(0.3))
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
                .font(.system(size: navIconSize))
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
        .onChange(of: electionsViewModel.activeFilter) { _, _ in
            HapticFeedback.selection()
        }
    }
    
    @ViewBuilder
    private var contentBody: some View {
        if electionsViewModel.isLoading && electionsViewModel.elections.isEmpty {
            Spacer()
            ProgressView("Loading institutional ballots...")
                .font(Typography.callout)
            Spacer()
        } else if visibleElections.isEmpty {
            emptyStateView
                .transition(.opacity)
        } else {
            List(visibleElections) { election in
                NavigationLink {
                    CandidateListView(
                        electionSummary: election,
                        authViewModel: authViewModel,
                        electionsViewModel: electionsViewModel
                    )
                } label: {
                    ElectionCardRow(election: election, isStudent: authViewModel.currentUser?.role == .student)
                }
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                .simultaneousGesture(TapGesture().onEnded {
                    HapticFeedback.light()
                })
            }
            .listStyle(.plain)
            .animation(SpringTokens.fluid, value: visibleElections)
            .refreshable {
                HapticFeedback.medium()
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
            
            if authViewModel.currentUser?.role == .student {
                Text("No Open Elections")
                    .font(Typography.sectionHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
                
                Text("There are currently no open campus elections accepting votes. You will be notified when your next eligible ballot opens.")
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.textSecondary)
                    .multilineTextAlignment(.center)
            } else {
                Text("No Elections Found")
                    .font(Typography.sectionHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
                
                Text("No elections match the selected filter query.")
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.textSecondary)
                    .multilineTextAlignment(.center)
                
                Button("Reset Filter") {
                    HapticFeedback.light()
                    withAnimation(SpringTokens.snappy) {
                        electionsViewModel.activeFilter = .all
                        electionsViewModel.searchQuery = ""
                    }
                }
                .font(Typography.captionBold)
                .foregroundStyle(ColorTokens.brandAccent)
                .padding(.top, 4)
            }
            
            Spacer()
        }
        .padding(24)
    }
    
    private var logoutButton: some View {
        Button {
            HapticFeedback.medium()
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
    public var isStudent: Bool = false
    
    @ScaledMetric(relativeTo: .caption) private var clockIconSize: CGFloat = 13
    @ScaledMetric(relativeTo: .caption) private var activeDotSize: CGFloat = 8
    
    public init(election: ElectionSummary, isStudent: Bool = false) {
        self.election = election
        self.isStudent = isStudent
    }
    
    public var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(election.title)
                        .font(Typography.cardHeader)
                        .foregroundStyle(ColorTokens.textPrimary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                
                Spacer()
                
                ElectionStateBadge(state: election.electionState)
            }
            
            Divider()
                .opacity(0.6)
            
            HStack(spacing: 12) {
                HStack(spacing: 6) {
                    Image(systemName: "clock")
                        .font(.system(size: clockIconSize))
                        .foregroundStyle(ColorTokens.textTertiary)
                    
                    Text("Closes: \(formattedDate(election.closesAtUtc))")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
                
                Spacer()
                
                if election.electionState == .open {
                    HStack(spacing: 5) {
                        Circle()
                            .fill(ColorTokens.stateSuccess)
                            .frame(width: activeDotSize, height: activeDotSize)
                            .beaconPulse(color: ColorTokens.stateSuccess, isActive: true)
                        
                        Text("Open for Voting")
                            .font(Typography.badgeText)
                            .foregroundStyle(ColorTokens.stateSuccess)
                    }
                }
            }
            
            if isStudent && election.electionState == .open {
                HStack {
                    Spacer()
                    HStack(spacing: 6) {
                        Text("Vote Now")
                            .font(.system(size: 13, weight: .semibold))
                        Image(systemName: "arrow.right")
                            .font(.system(size: 11, weight: .bold))
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(ColorTokens.tailAdminBrand)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .padding(.top, 2)
            }
        }
        .padding(16)
        .background(ColorTokens.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
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

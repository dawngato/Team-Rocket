import SwiftUI

public struct MainTabView: View {
    @Bindable var authViewModel: AuthViewModel
    @Bindable var electionsViewModel: ElectionsViewModel
    
    @State private var selectedTab: Int = 0
    @State private var votingViewModel = VotingViewModel()
    @State private var isSidebarOpen: Bool = false
    @State private var showFloatingActionMenu: Bool = false
    @State private var showGuidelinesSheet: Bool = false
    @State private var showSecuritySheet: Bool = false
    @State private var showLoginSheet: Bool = false
    
    public init(
        authViewModel: AuthViewModel,
        electionsViewModel: ElectionsViewModel
    ) {
        self.authViewModel = authViewModel
        self.electionsViewModel = electionsViewModel
    }
    
    public var body: some View {
        ZStack(alignment: .bottom) {
            // Main Tab Content Area
            TabView(selection: $selectedTab) {
                Group {
                    if !authViewModel.isAuthenticated || authViewModel.currentUser?.role == .visitor {
                        VisitorPublicPortalView(
                            authViewModel: authViewModel,
                            electionsViewModel: electionsViewModel
                        )
                    } else if authViewModel.currentUser?.role == .superAdmin {
                        SuperAdminDashboardView(authViewModel: authViewModel)
                    } else if authViewModel.currentUser?.role == .administrator || authViewModel.currentUser?.role == .electionOfficer {
                        TailAdminDashboardView(
                            authViewModel: authViewModel,
                            electionsViewModel: electionsViewModel,
                            onNavigateToTab: { tab in
                                withAnimation(SpringTokens.snappy) {
                                    selectedTab = tab
                                }
                            },
                            onOpenSidebar: {
                                withAnimation(SpringTokens.snappy) {
                                    isSidebarOpen = true
                                }
                            }
                        )
                    } else {
                        ElectionsView(
                            authViewModel: authViewModel,
                            electionsViewModel: electionsViewModel
                        )
                    }
                }
                .tag(0)
                
                ElectionsView(
                    authViewModel: authViewModel,
                    electionsViewModel: electionsViewModel
                )
                .tag(1)
                
                Group {
                    if authViewModel.currentUser?.role == .student {
                        VoterBoothPortalView(
                            authViewModel: authViewModel,
                            electionsViewModel: electionsViewModel,
                            votingViewModel: votingViewModel
                        )
                    } else {
                        VisitorPublicPortalView(
                            authViewModel: authViewModel,
                            electionsViewModel: electionsViewModel
                        )
                    }
                }
                .tag(2)
                
                Group {
                    if authViewModel.currentUser?.role == .student {
                        StudentReceiptPortalView(votingViewModel: votingViewModel)
                    } else {
                        AuditExplorerView(authViewModel: authViewModel)
                    }
                }
                .tag(3)
                
                Group {
                    if authViewModel.isAuthenticated && authViewModel.currentUser?.role != .visitor {
                        RolesProfileView(authViewModel: authViewModel)
                    } else {
                        VisitorPublicPortalView(
                            authViewModel: authViewModel,
                            electionsViewModel: electionsViewModel
                        )
                    }
                }
                .tag(4)
                
                Group {
                    if authViewModel.currentUser?.role == .superAdmin ||
                        authViewModel.currentUser?.role == .administrator ||
                        authViewModel.currentUser?.role == .electionOfficer {
                        AdminElectionManagerView(
                            authViewModel: authViewModel,
                            electionsViewModel: electionsViewModel
                        )
                    } else {
                        VisitorPublicPortalView(
                            authViewModel: authViewModel,
                            electionsViewModel: electionsViewModel
                        )
                    }
                }
                .tag(5)
                
                VisitorPublicPortalView(
                    authViewModel: authViewModel,
                    electionsViewModel: electionsViewModel
                )
                .tag(6)
            }
            .ignoresSafeArea(edges: .bottom)
            
            // Translucent Floating Bottom Navigation Bar (iOS Glassmorphism)
            FloatingBottomBar(
                selectedTab: $selectedTab,
                userRole: authViewModel.currentUser?.role,
                isAuthenticated: authViewModel.isAuthenticated,
                userEmail: authViewModel.currentUser?.email,
                onTapProfile: {
                    if authViewModel.isAuthenticated {
                        withAnimation(SpringTokens.snappy) {
                            selectedTab = 4
                        }
                    } else {
                        showLoginSheet = true
                    }
                }
            )
            .padding(.bottom, 12)
            
            // Translucent Slide-Out Sidebar Drawer (TailAdmin Menu in iOS Style)
            TranslucentSideMenu(
                isOpen: $isSidebarOpen,
                selectedTab: $selectedTab,
                authViewModel: authViewModel
            )
        }
        .sheet(isPresented: $showLoginSheet) {
            LoginView(authViewModel: authViewModel)
        }
        .sheet(isPresented: $showGuidelinesSheet) {
            ElectionGuidelinesSheet()
        }
        .sheet(isPresented: $showSecuritySheet) {
            InstitutionalSecuritySheet()
        }
        .onChange(of: authViewModel.isAuthenticated) { _, isAuthed in
            if isAuthed {
                showLoginSheet = false
                if authViewModel.currentUser?.role == .visitor {
                    selectedTab = 0
                } else if authViewModel.currentUser?.role == .superAdmin {
                    selectedTab = 0
                } else if authViewModel.currentUser?.role == .administrator || authViewModel.currentUser?.role == .electionOfficer {
                    selectedTab = 0
                } else {
                    selectedTab = 1
                }
            } else {
                selectedTab = 0
            }
        }
    }
}

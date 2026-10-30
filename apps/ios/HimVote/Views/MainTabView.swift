import SwiftUI

public struct MainTabView: View {
    @Bindable var authViewModel: AuthViewModel
    @Bindable var electionsViewModel: ElectionsViewModel
    
    @State private var selectedTab: Int = 0
    @State private var isSidebarOpen: Bool = false
    @State private var showFloatingActionMenu: Bool = false
    @State private var showGuidelinesSheet: Bool = false
    @State private var showSecuritySheet: Bool = false
    
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
                .tag(0)
                
                ElectionsView(
                    authViewModel: authViewModel,
                    electionsViewModel: electionsViewModel
                )
                .tag(1)
                
                VoterBoothPortalView(
                    authViewModel: authViewModel,
                    electionsViewModel: electionsViewModel
                )
                .tag(2)
                
                AuditExplorerView(
                    authViewModel: authViewModel
                )
                .tag(3)
                
                RolesProfileView(
                    authViewModel: authViewModel
                )
                .tag(4)
            }
            .ignoresSafeArea(edges: .bottom)
            
            // Translucent Floating Bottom Navigation Bar (iOS Glassmorphism)
            FloatingBottomBar(selectedTab: $selectedTab)
                .padding(.bottom, 12)
            
            // Translucent Slide-Out Sidebar Drawer (TailAdmin Menu in iOS Style)
            TranslucentSideMenu(
                isOpen: $isSidebarOpen,
                selectedTab: $selectedTab,
                authViewModel: authViewModel
            )
        }
        .sheet(isPresented: $showGuidelinesSheet) {
            ElectionGuidelinesSheet()
        }
        .sheet(isPresented: $showSecuritySheet) {
            InstitutionalSecuritySheet()
        }
    }
}

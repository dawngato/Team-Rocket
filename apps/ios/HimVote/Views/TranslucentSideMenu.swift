import SwiftUI

public struct TranslucentSideMenu: View {
    @Binding var isOpen: Bool
    @Binding var selectedTab: Int
    @Bindable var authViewModel: AuthViewModel
    
    @State private var showSecuritySheet: Bool = false
    @State private var showGuidelinesSheet: Bool = false
    @Environment(\.colorScheme) private var colorScheme
    
    public init(
        isOpen: Binding<Bool>,
        selectedTab: Binding<Int>,
        authViewModel: AuthViewModel
    ) {
        self._isOpen = isOpen
        self._selectedTab = selectedTab
        self.authViewModel = authViewModel
    }
    
    public var body: some View {
        ZStack(alignment: .leading) {
            if isOpen {
                // Dimmed translucent frosted backdrop
                Color.black.opacity(0.4)
                    .background(.ultraThinMaterial.opacity(0.6))
                    .ignoresSafeArea()
                    .onTapGesture {
                        withAnimation(SpringTokens.snappy) {
                            isOpen = false
                        }
                    }
                    .transition(.opacity)
                
                // Sliding Drawer
                drawerContent
                    .frame(width: 310)
                    .transition(.move(edge: .leading))
            }
        }
        .sheet(isPresented: $showSecuritySheet) {
            InstitutionalSecuritySheet()
        }
        .sheet(isPresented: $showGuidelinesSheet) {
            ElectionGuidelinesSheet()
        }
    }
    
    private var drawerContent: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Sidebar Header
            sidebarHeader
                .padding(.horizontal, 20)
                .padding(.top, 50)
                .padding(.bottom, 20)
            
            Divider()
                .padding(.horizontal, 16)
            
            // Menu Items List
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    // Group 1: Navigation
                    menuGroup(title: "CORE WORKFLOWS") {
                        menuRow(title: "Dashboard", icon: "square.grid.2x2.fill", tabIndex: 0)
                        menuRow(title: "All Elections", icon: "tray.full.fill", tabIndex: 1)
                        menuRow(title: "Voting Booth", icon: "checkmark.seal.fill", tabIndex: 2)
                    }
                    
                    // Group 2: Cryptographic Verification
                    menuGroup(title: "CRYPTOGRAPHIC AUDIT") {
                        menuRow(title: "Merkle Tree Visualizer", icon: "point.3.connected.trianglepath.dotted", tabIndex: 3)
                        
                        Button {
                            HapticFeedback.light()
                            isOpen = false
                            showSecuritySheet = true
                        } label: {
                            HStack(spacing: 12) {
                                Image(systemName: "shield.checkered")
                                    .font(.system(size: 17))
                                    .foregroundStyle(ColorTokens.tailAdminBrand)
                                    .frame(width: 24)
                                
                                Text("Trust Architecture")
                                    .font(Typography.callout)
                                    .foregroundStyle(ColorTokens.textPrimary)
                                
                                Spacer()
                            }
                            .padding(.vertical, 8)
                            .padding(.horizontal, 10)
                        }
                        .buttonStyle(.plain)
                    }
                    
                    // Guidelines
                    menuGroup(title: "INSTITUTIONAL POLICY") {
                        Button {
                            HapticFeedback.light()
                            isOpen = false
                            showGuidelinesSheet = true
                        } label: {
                            HStack(spacing: 12) {
                                Image(systemName: "info.circle")
                                    .font(.system(size: 17))
                                    .foregroundStyle(ColorTokens.textSecondary)
                                    .frame(width: 24)
                                
                                Text("Voter Guidelines")
                                    .font(Typography.callout)
                                    .foregroundStyle(ColorTokens.textPrimary)
                                
                                Spacer()
                            }
                            .padding(.vertical, 8)
                            .padding(.horizontal, 10)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 16)
            }
            
            Divider()
                .padding(.horizontal, 16)
            
            // Sidebar Footer (Sign Out)
            sidebarFooter
                .padding(.horizontal, 20)
                .padding(.vertical, 16)
        }
        .background {
            RoundedRectangle(cornerRadius: 0)
                .fill(.ultraThinMaterial)
                .ignoresSafeArea()
        }
        .overlay(alignment: .trailing) {
            Rectangle()
                .fill(
                    colorScheme == .dark
                        ? Color.white.opacity(0.12)
                        : Color.black.opacity(0.08)
                )
                .frame(width: 1)
                .ignoresSafeArea()
        }
    }
    
    private var sidebarHeader: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(ColorTokens.tailAdminBrand)
                        .frame(width: 36, height: 36)
                    
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(.white)
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("HimVote")
                        .font(Typography.sectionHeader)
                        .foregroundStyle(ColorTokens.textPrimary)
                    
                    Text("TailAdmin Edition")
                        .font(Typography.badgeText)
                        .foregroundStyle(ColorTokens.tailAdminBrand)
                }
                
                Spacer()
                
                Button {
                    HapticFeedback.light()
                    withAnimation(SpringTokens.snappy) {
                        isOpen = false
                    }
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 22))
                        .foregroundStyle(ColorTokens.textTertiary)
                }
            }
            
            // Current User Info Card
            if let user = authViewModel.currentUser {
                HStack(spacing: 10) {
                    Circle()
                        .fill(ColorTokens.tailAdminBrand.opacity(0.15))
                        .frame(width: 32, height: 32)
                        .overlay {
                            Text(String(user.email.prefix(1)).uppercased())
                                .font(Typography.captionBold)
                                .foregroundStyle(ColorTokens.tailAdminBrand)
                        }
                    
                    VStack(alignment: .leading, spacing: 1) {
                        Text(user.email)
                            .font(Typography.captionBold)
                            .foregroundStyle(ColorTokens.textPrimary)
                            .lineLimit(1)
                        
                        Text(user.role.displayName)
                            .font(Typography.badgeText)
                            .foregroundStyle(ColorTokens.tailAdminBrand)
                    }
                }
                .padding(8)
                .background(Color.white.opacity(0.5))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
    }
    
    private func menuGroup<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(Typography.badgeText)
                .foregroundStyle(ColorTokens.textTertiary)
                .padding(.horizontal, 10)
            
            content()
        }
    }
    
    private func menuRow(title: String, icon: String, tabIndex: Int) -> some View {
        let isSelected = selectedTab == tabIndex
        
        return Button {
            HapticFeedback.selection()
            selectedTab = tabIndex
            withAnimation(SpringTokens.snappy) {
                isOpen = false
            }
        } label: {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 17))
                    .foregroundStyle(isSelected ? ColorTokens.tailAdminBrand : ColorTokens.textSecondary)
                    .frame(width: 24)
                
                Text(title)
                    .font(Typography.callout)
                    .fontWeight(isSelected ? .semibold : .regular)
                    .foregroundStyle(isSelected ? ColorTokens.tailAdminBrand : ColorTokens.textPrimary)
                
                Spacer()
            }
            .padding(.vertical, 8)
            .padding(.horizontal, 10)
            .background(isSelected ? ColorTokens.tailAdminBrandBg : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
    }
    
    private var sidebarFooter: some View {
        Button {
            HapticFeedback.medium()
            isOpen = false
            Task {
                await authViewModel.logout()
            }
        } label: {
            HStack(spacing: 10) {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                    .font(.system(size: 16))
                    .foregroundStyle(ColorTokens.tailAdminDanger)
                
                Text("Sign Out")
                    .font(Typography.callout)
                    .fontWeight(.medium)
                    .foregroundStyle(ColorTokens.tailAdminDanger)
                
                Spacer()
            }
            .padding(.vertical, 8)
        }
    }
    
}

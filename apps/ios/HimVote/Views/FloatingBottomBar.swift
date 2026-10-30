import SwiftUI

public struct FloatingBottomBar: View {
    @Binding var selectedTab: Int
    public var userRole: UserRole?
    public var isAuthenticated: Bool
    public var userEmail: String?
    public var onTapProfile: () -> Void
    
    @Environment(\.colorScheme) private var colorScheme
    @Namespace private var tabNamespace
    
    public struct TabItem: Identifiable {
        public let id: Int
        public let title: String
        public let icon: String
        public let badgeCount: Int?
    }
    
    private var tabs: [TabItem] {
        guard isAuthenticated, let role = userRole else {
            return [
                TabItem(id: 6, title: "Observer", icon: "chart.bar.xaxis", badgeCount: nil),
                TabItem(id: 1, title: "Elections", icon: "tray.full.fill", badgeCount: nil),
                TabItem(id: 3, title: "Verifier", icon: "checkmark.shield", badgeCount: nil)
            ]
        }
        
        switch role {
        case .visitor:
            return [
                TabItem(id: 6, title: "Observer", icon: "chart.bar.xaxis", badgeCount: nil),
                TabItem(id: 1, title: "Elections", icon: "tray.full.fill", badgeCount: nil),
                TabItem(id: 3, title: "Verifier", icon: "checkmark.shield", badgeCount: nil)
            ]
        case .superAdmin:
            return [
                TabItem(id: 0, title: "System", icon: "person.2", badgeCount: nil),
                TabItem(id: 5, title: "Admin Work", icon: "slider.horizontal.3", badgeCount: nil),
                TabItem(id: 1, title: "Elections", icon: "tray.full.fill", badgeCount: nil),
                TabItem(id: 3, title: "Audit Log", icon: "doc.text.magnifyingglass", badgeCount: nil)
            ]
        case .administrator, .electionOfficer:
            return [
                TabItem(id: 0, title: "Dashboard", icon: "square.grid.2x2.fill", badgeCount: nil),
                TabItem(id: 5, title: "Admin Work", icon: "slider.horizontal.3", badgeCount: nil),
                TabItem(id: 1, title: "Elections", icon: "tray.full.fill", badgeCount: nil),
                TabItem(id: 3, title: "Audit", icon: "doc.text.magnifyingglass", badgeCount: nil)
            ]
        case .student:
            return [
                TabItem(id: 1, title: "Elections", icon: "tray.full.fill", badgeCount: nil),
                TabItem(id: 2, title: "Booth", icon: "square.and.pencil", badgeCount: nil),
                TabItem(id: 3, title: "Receipts", icon: "doc.text", badgeCount: nil)
            ]
        default:
            return [
                TabItem(id: 1, title: "Elections", icon: "tray.full.fill", badgeCount: nil),
                TabItem(id: 3, title: "Verifier", icon: "checkmark.shield", badgeCount: nil)
            ]
        }
    }
    
    public init(
        selectedTab: Binding<Int>,
        userRole: UserRole? = nil,
        isAuthenticated: Bool = false,
        userEmail: String? = nil,
        onTapProfile: @escaping () -> Void = {}
    ) {
        self._selectedTab = selectedTab
        self.userRole = userRole
        self.isAuthenticated = isAuthenticated
        self.userEmail = userEmail
        self.onTapProfile = onTapProfile
    }
    
    public var body: some View {
        HStack(spacing: 0) {
            ForEach(tabs) { tab in
                let isSelected = selectedTab == tab.id
                
                Button {
                    HapticFeedback.selection()
                    withAnimation(SpringTokens.snappy) {
                        selectedTab = tab.id
                    }
                } label: {
                    VStack(spacing: 3) {
                        ZStack {
                            Image(systemName: tab.icon)
                                .font(.system(size: isSelected ? 19 : 17, weight: isSelected ? .semibold : .regular))
                                .foregroundStyle(
                                    isSelected
                                        ? ColorTokens.tailAdminBrand
                                        : (colorScheme == .dark ? Color.white.opacity(0.55) : Color.black.opacity(0.45))
                                )
                                .scaleEffect(isSelected ? 1.05 : 1.0)
                            
                            if let badge = tab.badgeCount, badge > 0 {
                                Circle()
                                    .fill(ColorTokens.tailAdminBrand)
                                    .frame(width: 7, height: 7)
                                    .offset(x: 10, y: -8)
                            }
                        }
                        .frame(height: 22)
                        
                        Text(tab.title)
                            .font(.system(size: 10, weight: isSelected ? .bold : .medium))
                            .foregroundStyle(
                                isSelected
                                    ? ColorTokens.tailAdminBrand
                                    : (colorScheme == .dark ? Color.white.opacity(0.55) : Color.black.opacity(0.45))
                            )
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background {
                        if isSelected {
                            Capsule(style: .continuous)
                                .fill(ColorTokens.tailAdminBrand.opacity(0.14))
                                .matchedGeometryEffect(id: "ActiveTabIndicator", in: tabNamespace)
                        }
                    }
                }
                .buttonStyle(.plain)
            }
            
            // Round Profile Picture Avatar Button (Redirects to Login if not logged in, or Profile if logged in)
            Button {
                HapticFeedback.selection()
                onTapProfile()
            } label: {
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: isAuthenticated
                                    ? (userRole == .superAdmin
                                       ? [ColorTokens.tailAdminPurple, ColorTokens.tailAdminBrand]
                                       : [ColorTokens.tailAdminBrandLight, ColorTokens.tailAdminBrand])
                                    : [Color.gray.opacity(0.3), Color.gray.opacity(0.5)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 36, height: 36)
                        .shadow(color: ColorTokens.tailAdminBrand.opacity(isAuthenticated ? 0.35 : 0.1), radius: 5, x: 0, y: 2)
                    
                    if isAuthenticated {
                        if userRole == .superAdmin {
                            Image(systemName: "person.2.fill")
                                .font(.system(size: 15))
                                .foregroundStyle(.white)
                        } else if userRole == .administrator || userRole == .electionOfficer {
                            Image(systemName: "wrench.and.screwdriver.fill")
                                .font(.system(size: 14))
                                .foregroundStyle(.white)
                        } else {
                            Text(String(userEmail?.prefix(1) ?? "S").uppercased())
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(.white)
                        }
                        
                        // Active online status green indicator
                        Circle()
                            .fill(ColorTokens.tailAdminSuccess)
                            .frame(width: 9, height: 9)
                            .overlay(Circle().stroke(Color.white, lineWidth: 1.5))
                            .offset(x: 12, y: -12)
                    } else {
                        Image(systemName: "person.crop.circle.badge.plus")
                            .font(.system(size: 18))
                            .foregroundStyle(.white)
                    }
                }
                .overlay {
                    Circle()
                        .stroke(
                            (selectedTab == 4 && isAuthenticated)
                                ? ColorTokens.tailAdminBrand
                                : (colorScheme == .dark ? Color.white.opacity(0.2) : Color.black.opacity(0.1)),
                            lineWidth: (selectedTab == 4 && isAuthenticated) ? 2.5 : 1.2
                        )
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(isAuthenticated ? "Account Profile" : "Sign In to Account")
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background {
            Capsule(style: .continuous)
                .fill(.ultraThinMaterial)
        }
        .overlay {
            Capsule(style: .continuous)
                .stroke(
                    colorScheme == .dark
                        ? Color.white.opacity(0.18)
                        : Color.black.opacity(0.08),
                    lineWidth: 1
                )
        }
        .shadow(
            color: colorScheme == .dark
                ? Color.black.opacity(0.45)
                : Color.black.opacity(0.12),
            radius: 24,
            x: 0,
            y: 8
        )
        .padding(.horizontal, 16)
    }
}

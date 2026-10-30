import SwiftUI

public struct FloatingBottomBar: View {
    @Binding var selectedTab: Int
    @Environment(\.colorScheme) private var colorScheme
    
    public struct TabItem: Identifiable {
        public let id: Int
        public let title: String
        public let icon: String
        public let badgeCount: Int?
    }
    
    private let tabs: [TabItem] = [
        TabItem(id: 0, title: "Dashboard", icon: "square.grid.2x2.fill", badgeCount: nil),
        TabItem(id: 1, title: "Elections", icon: "tray.full.fill", badgeCount: nil),
        TabItem(id: 2, title: "Booth", icon: "checkmark.seal.fill", badgeCount: 1),
        TabItem(id: 3, title: "Audit", icon: "point.3.connected.trianglepath.dotted", badgeCount: nil),
        TabItem(id: 4, title: "Roles", icon: "person.crop.circle.fill", badgeCount: nil)
    ]
    
    public init(selectedTab: Binding<Int>) {
        self._selectedTab = selectedTab
    }
    
    public var body: some View {
        HStack(spacing: 4) {
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
                                .font(.system(size: isSelected ? 20 : 18, weight: isSelected ? .semibold : .regular))
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
        .padding(.horizontal, 20)
    }
    
    @Namespace private var tabNamespace
}

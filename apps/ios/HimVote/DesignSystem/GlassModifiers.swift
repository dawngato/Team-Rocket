import SwiftUI

public struct GlassCardModifier: ViewModifier {
    public var cornerRadius: CGFloat = 20
    public var padding: CGFloat = 16
    @Environment(\.colorScheme) private var colorScheme
    
    public init(cornerRadius: CGFloat = 20, padding: CGFloat = 16) {
        self.cornerRadius = cornerRadius
        self.padding = padding
    }
    
    public func body(content: Content) -> some View {
        content
            .padding(padding)
            .background {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(.ultraThinMaterial)
            }
            .overlay {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(
                        colorScheme == .dark
                            ? Color.white.opacity(0.12)
                            : Color.black.opacity(0.06),
                        lineWidth: 1
                    )
            }
            .shadow(
                color: colorScheme == .dark
                    ? Color.black.opacity(0.35)
                    : Color.black.opacity(0.06),
                radius: 12,
                x: 0,
                y: 4
            )
    }
}

public struct GlassPillModifier: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme
    
    public init() {}
    
    public func body(content: Content) -> some View {
        content
            .background {
                Capsule(style: .continuous)
                    .fill(.ultraThinMaterial)
            }
            .overlay {
                Capsule(style: .continuous)
                    .stroke(
                        colorScheme == .dark
                            ? Color.white.opacity(0.16)
                            : Color.black.opacity(0.08),
                        lineWidth: 1
                    )
            }
            .shadow(
                color: Color.black.opacity(0.15),
                radius: 16,
                x: 0,
                y: 8
            )
    }
}

public struct GlassTileModifier: ViewModifier {
    public var cornerRadius: CGFloat = 14
    @Environment(\.colorScheme) private var colorScheme
    
    public init(cornerRadius: CGFloat = 14) {
        self.cornerRadius = cornerRadius
    }
    
    public func body(content: Content) -> some View {
        content
            .background {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(.thinMaterial)
            }
            .overlay {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(
                        colorScheme == .dark
                            ? Color.white.opacity(0.10)
                            : Color.black.opacity(0.05),
                        lineWidth: 1
                    )
            }
    }
}

public extension View {
    func glassCard(cornerRadius: CGFloat = 20, padding: CGFloat = 16) -> some View {
        modifier(GlassCardModifier(cornerRadius: cornerRadius, padding: padding))
    }
    
    func glassPill() -> some View {
        modifier(GlassPillModifier())
    }
    
    func glassTile(cornerRadius: CGFloat = 14) -> some View {
        modifier(GlassTileModifier(cornerRadius: cornerRadius))
    }
}

import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

public enum SpringTokens {
    public static let fluid = Animation.spring(response: 0.36, dampingFraction: 0.74, blendDuration: 0)
    public static let snappy = Animation.spring(response: 0.26, dampingFraction: 0.68, blendDuration: 0)
    public static let bouncy = Animation.spring(response: 0.44, dampingFraction: 0.58, blendDuration: 0)
    public static let gentle = Animation.spring(response: 0.52, dampingFraction: 0.82, blendDuration: 0)
    public static let sheet = Animation.spring(response: 0.42, dampingFraction: 0.80, blendDuration: 0)
    public static let auditTransition = Animation.spring(response: 0.38, dampingFraction: 0.70, blendDuration: 0)
}

public struct InteractiveSpringButtonStyle: ButtonStyle {
    #if canImport(UIKit)
    public let feedbackStyle: UIImpactFeedbackGenerator.FeedbackStyle
    
    public init(feedbackStyle: UIImpactFeedbackGenerator.FeedbackStyle = .medium) {
        self.feedbackStyle = feedbackStyle
    }
    #else
    public init() {}
    #endif
    
    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.96 : 1.0)
            .opacity(configuration.isPressed ? 0.92 : 1.0)
            .animation(SpringTokens.snappy, value: configuration.isPressed)
            .onChange(of: configuration.isPressed) { _, isPressed in
                if isPressed {
                    #if canImport(UIKit)
                    HapticFeedback.impact(style: feedbackStyle)
                    #endif
                }
            }
    }
}

public struct InteractiveCardButtonStyle: ButtonStyle {
    public init() {}
    
    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .opacity(configuration.isPressed ? 0.95 : 1.0)
            .animation(SpringTokens.snappy, value: configuration.isPressed)
            .onChange(of: configuration.isPressed) { _, isPressed in
                if isPressed {
                    HapticFeedback.light()
                }
            }
    }
}

public struct BeaconPulseModifier: ViewModifier {
    public let color: Color
    public let isActive: Bool
    @State private var isPulsing: Bool = false
    
    public init(color: Color = ColorTokens.stateSuccess, isActive: Bool = true) {
        self.color = color
        self.isActive = isActive
    }
    
    public func body(content: Content) -> some View {
        content
            .overlay(
                Circle()
                    .stroke(color.opacity(isPulsing ? 0.0 : 0.6), lineWidth: 2)
                    .scaleEffect(isPulsing ? 1.8 : 1.0)
                    .opacity(isActive ? 1.0 : 0.0)
            )
            .onAppear {
                guard isActive else { return }
                withAnimation(Animation.easeOut(duration: 1.4).repeatForever(autoreverses: false)) {
                    isPulsing = true
                }
            }
    }
}

public extension View {
    func interactiveSpringButton(
        #if canImport(UIKit)
        feedbackStyle: UIImpactFeedbackGenerator.FeedbackStyle = .medium
        #endif
    ) -> some View {
        #if canImport(UIKit)
        buttonStyle(InteractiveSpringButtonStyle(feedbackStyle: feedbackStyle))
        #else
        buttonStyle(InteractiveSpringButtonStyle())
        #endif
    }
    
    func interactiveCardButton() -> some View {
        buttonStyle(InteractiveCardButtonStyle())
    }
    
    func beaconPulse(color: Color = ColorTokens.stateSuccess, isActive: Bool = true) -> some View {
        modifier(BeaconPulseModifier(color: color, isActive: isActive))
    }
}

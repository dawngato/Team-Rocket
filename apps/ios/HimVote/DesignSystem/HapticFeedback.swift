import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

@MainActor
public enum HapticFeedback {
    public static func impact(style: UIImpactFeedbackGenerator.FeedbackStyle = .medium) {
        #if canImport(UIKit)
        let generator = UIImpactFeedbackGenerator(style: style)
        generator.prepare()
        generator.impactOccurred()
        #endif
    }
    
    public static func light() {
        impact(style: .light)
    }
    
    public static func medium() {
        impact(style: .medium)
    }
    
    public static func heavy() {
        impact(style: .heavy)
    }
    
    public static func soft() {
        #if canImport(UIKit)
        let generator = UIImpactFeedbackGenerator(style: .soft)
        generator.prepare()
        generator.impactOccurred()
        #endif
    }
    
    public static func rigid() {
        #if canImport(UIKit)
        let generator = UIImpactFeedbackGenerator(style: .rigid)
        generator.prepare()
        generator.impactOccurred()
        #endif
    }
    
    public static func selection() {
        #if canImport(UIKit)
        let generator = UISelectionFeedbackGenerator()
        generator.prepare()
        generator.selectionChanged()
        #endif
    }
    
    public static func notification(type: UINotificationFeedbackGenerator.FeedbackType) {
        #if canImport(UIKit)
        let generator = UINotificationFeedbackGenerator()
        generator.prepare()
        generator.notificationOccurred(type)
        #endif
    }
    
    public static func success() {
        #if canImport(UIKit)
        notification(type: .success)
        #endif
    }
    
    public static func warning() {
        #if canImport(UIKit)
        notification(type: .warning)
        #endif
    }
    
    public static func error() {
        #if canImport(UIKit)
        notification(type: .error)
        #endif
    }
}

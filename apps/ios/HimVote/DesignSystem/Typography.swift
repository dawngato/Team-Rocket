import SwiftUI

public enum Typography {
    public static let appTitle = Font.system(.largeTitle, design: .default, weight: .bold)
    public static let sectionHeader = Font.system(.title2, design: .default, weight: .bold)
    public static let cardHeader = Font.system(.headline, design: .default, weight: .semibold)
    public static let bodyRegular = Font.system(.body, design: .default, weight: .regular)
    public static let bodyBold = Font.system(.body, design: .default, weight: .semibold)
    public static let callout = Font.system(.callout, design: .default, weight: .regular)
    public static let caption = Font.system(.caption, design: .default, weight: .regular)
    public static let captionBold = Font.system(.caption, design: .default, weight: .semibold)
    
    public static let cryptographicDigest = Font.system(.caption, design: .monospaced, weight: .medium)
    public static let receiptHandle = Font.system(.body, design: .monospaced, weight: .bold)
    public static let badgeText = Font.system(.caption2, design: .default, weight: .bold)
}

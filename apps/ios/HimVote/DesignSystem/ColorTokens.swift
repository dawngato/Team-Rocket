import SwiftUI

public enum ColorTokens {
    // shadcn/ui Design System Tokens: Black / Charcoal / Warm Grey / Stone / Cream / Burnt Orange
    public static let burntOrange = Color(red: 0.761, green: 0.255, blue: 0.047) // #C2410C
    public static let burntOrangeDark = Color(red: 0.604, green: 0.204, blue: 0.071) // #9A3412
    public static let burntOrangeLight = Color(red: 0.918, green: 0.345, blue: 0.047) // #EA580C
    public static let burntOrangeBg = Color(red: 1.0, green: 0.969, blue: 0.929) // #FFF7ED
    
    public static let charcoalBlack = Color(red: 0.047, green: 0.039, blue: 0.035) // #0C0A09
    public static let charcoalCard = Color(red: 0.110, green: 0.098, blue: 0.090) // #1C1917
    public static let charcoalBorder = Color(red: 0.161, green: 0.145, blue: 0.141) // #292524
    public static let warmGreyStone = Color(red: 0.471, green: 0.443, blue: 0.424) // #78716C
    public static let warmGreyBorder = Color(red: 0.906, green: 0.898, blue: 0.894) // #E7E5E4
    public static let creamBackground = Color(red: 0.980, green: 0.973, blue: 0.961) // #FAF8F5
    
    // TailAdmin / shadcn Brand Integration
    public static let tailAdminBrand = burntOrange
    public static let tailAdminBrandDark = burntOrangeDark
    public static let tailAdminBrandLight = burntOrangeLight
    public static let tailAdminBrandBg = burntOrangeBg
    
    public static let tailAdminDarkBg = charcoalBlack
    public static let tailAdminDarkCard = charcoalCard
    public static let tailAdminDarkBorder = charcoalBorder
    public static let tailAdminDarkTextMuted = warmGreyStone
    
    public static let tailAdminLightBg = creamBackground
    public static let tailAdminLightCard = Color.white
    public static let tailAdminLightBorder = warmGreyBorder
    public static let tailAdminLightTextMuted = warmGreyStone
    
    public static let tailAdminSuccess = Color(red: 0.082, green: 0.502, blue: 0.365) // #15805D
    public static let tailAdminSuccessBg = Color(red: 0.922, green: 0.992, blue: 0.961) // #EBFDF5
    public static let tailAdminWarning = Color(red: 0.667, green: 0.424, blue: 0.043) // #AA6C0B
    public static let tailAdminWarningBg = Color(red: 1.0, green: 0.976, blue: 0.922) // #FFFBEB
    public static let tailAdminDanger = Color(red: 0.761, green: 0.235, blue: 0.271) // #C23C45
    public static let tailAdminDangerBg = Color(red: 0.996, green: 0.945, blue: 0.945) // #FEF2F2
    public static let tailAdminInfo = burntOrangeLight
    public static let tailAdminInfoBg = burntOrangeBg
    public static let tailAdminPurple = Color(red: 0.45, green: 0.30, blue: 0.80)
    
    // Core Brand Tokens
    public static let brandPrimary = burntOrangeDark
    public static let brandPrimaryLight = burntOrangeLight
    public static let brandAccent = burntOrange
    
    public static let institutionalNavy = Color(red: 0.05, green: 0.12, blue: 0.25)
    public static let institutionalGold = Color(red: 0.85, green: 0.65, blue: 0.15)
    
    public static let stateSuccess = tailAdminSuccess
    public static let stateSuccessBackground = Color(red: 0.90, green: 0.98, blue: 0.93)
    
    public static let stateWarning = tailAdminWarning
    public static let stateWarningBackground = Color(red: 1.00, green: 0.97, blue: 0.90)
    
    public static let stateDanger = tailAdminDanger
    public static let stateDangerBackground = Color(red: 1.00, green: 0.92, blue: 0.92)
    
    public static let stateNeutral = Color(red: 0.40, green: 0.45, blue: 0.52)
    public static let stateNeutralBackground = Color(red: 0.95, green: 0.96, blue: 0.97)
    
    public static let stateWitnessed = tailAdminPurple
    public static let stateWitnessedBackground = Color(red: 0.94, green: 0.92, blue: 0.99)
    
    public static let stateAnchored = tailAdminInfo
    public static let stateAnchoredBackground = Color(red: 0.91, green: 0.96, blue: 0.99)
    
    public static let backgroundPrimary = Color(uiColor: .systemBackground)
    public static let backgroundSecondary = Color(uiColor: .secondarySystemBackground)
    public static let backgroundTertiary = Color(uiColor: .tertiarySystemBackground)
    
    public static let textPrimary = Color(uiColor: .label)
    public static let textSecondary = Color(uiColor: .secondaryLabel)
    public static let textTertiary = Color(uiColor: .tertiaryLabel)
    
    public static let cardBorder = Color(uiColor: .separator)
}

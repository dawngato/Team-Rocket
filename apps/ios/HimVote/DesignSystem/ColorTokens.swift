import SwiftUI

public enum ColorTokens {
    // TailAdmin Design System Tokens
    public static let tailAdminBrand = Color(red: 0.275, green: 0.373, blue: 1.0) // #465FFF
    public static let tailAdminBrandDark = Color(red: 0.212, green: 0.255, blue: 0.961) // #3641F5
    public static let tailAdminBrandLight = Color(red: 0.388, green: 0.439, blue: 0.973) // #6370F8
    public static let tailAdminBrandBg = Color(red: 0.933, green: 0.945, blue: 1.0) // #EEF2FF
    
    public static let tailAdminDarkBg = Color(red: 0.059, green: 0.090, blue: 0.165) // #0F172A
    public static let tailAdminDarkCard = Color(red: 0.118, green: 0.161, blue: 0.231) // #1E293B
    public static let tailAdminDarkBorder = Color(red: 0.200, green: 0.255, blue: 0.333) // #334155
    public static let tailAdminDarkTextMuted = Color(red: 0.580, green: 0.639, blue: 0.722) // #94A3B8
    
    public static let tailAdminLightBg = Color(red: 0.973, green: 0.980, blue: 0.988) // #F8FAFC
    public static let tailAdminLightCard = Color(red: 1.0, green: 1.0, blue: 1.0)
    public static let tailAdminLightBorder = Color(red: 0.898, green: 0.918, blue: 0.937) // #E2E8F0
    public static let tailAdminLightTextMuted = Color(red: 0.392, green: 0.455, blue: 0.545) // #64748B
    
    public static let tailAdminSuccess = Color(red: 0.063, green: 0.725, blue: 0.506) // #10B981
    public static let tailAdminSuccessBg = Color(red: 0.922, green: 0.992, blue: 0.961) // #EBFDF5
    public static let tailAdminWarning = Color(red: 0.961, green: 0.620, blue: 0.043) // #F59E0B
    public static let tailAdminWarningBg = Color(red: 1.0, green: 0.976, blue: 0.922) // #FFFBEB
    public static let tailAdminDanger = Color(red: 0.937, green: 0.267, blue: 0.267) // #EF4444
    public static let tailAdminDangerBg = Color(red: 0.996, green: 0.945, blue: 0.945) // #FEF2F2
    public static let tailAdminInfo = Color(red: 0.055, green: 0.647, blue: 0.914) // #0EA5E9
    public static let tailAdminInfoBg = Color(red: 0.941, green: 0.984, blue: 1.0) // #F0F9FF
    public static let tailAdminPurple = Color(red: 0.545, green: 0.361, blue: 0.965) // #8B5CF6
    
    // Core Brand Tokens (Preserved for backward compatibility)
    public static let brandPrimary = tailAdminBrandDark
    public static let brandPrimaryLight = tailAdminBrandLight
    public static let brandAccent = tailAdminBrand
    
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

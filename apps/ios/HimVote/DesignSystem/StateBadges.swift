import SwiftUI

public struct ElectionStateBadge: View {
    public let state: ElectionState
    
    public init(state: ElectionState) {
        self.state = state
    }
    
    private var foregroundColor: Color {
        switch state {
        case .draft:
            return ColorTokens.stateNeutral
        case .frozen:
            return ColorTokens.stateWarning
        case .open:
            return ColorTokens.stateSuccess
        case .closed:
            return ColorTokens.stateNeutral
        case .published:
            return ColorTokens.brandAccent
        case .archived:
            return ColorTokens.stateNeutral
        }
    }
    
    private var backgroundColor: Color {
        switch state {
        case .draft:
            return ColorTokens.stateNeutralBackground
        case .frozen:
            return ColorTokens.stateWarningBackground
        case .open:
            return ColorTokens.stateSuccessBackground
        case .closed:
            return ColorTokens.stateNeutralBackground
        case .published:
            return ColorTokens.stateAnchoredBackground
        case .archived:
            return ColorTokens.stateNeutralBackground
        }
    }
    
    public var body: some View {
        Text(state.displayName.uppercased())
            .font(Typography.badgeText)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .foregroundStyle(foregroundColor)
            .background(backgroundColor)
            .clipShape(RoundedRectangle(cornerRadius: 6))
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .stroke(foregroundColor.opacity(0.3), lineWidth: 1)
            )
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Election state: \(state.displayName)")
    }
}

public struct ReceiptStatusBadge: View {
    public let status: ReceiptStatus
    
    public init(status: ReceiptStatus) {
        self.status = status
    }
    
    private var foregroundColor: Color {
        switch status {
        case .committedPendingWitness:
            return ColorTokens.stateWarning
        case .witnessed:
            return ColorTokens.stateWitnessed
        case .anchored:
            return ColorTokens.stateSuccess
        case .rejected:
            return ColorTokens.stateDanger
        }
    }
    
    private var backgroundColor: Color {
        switch status {
        case .committedPendingWitness:
            return ColorTokens.stateWarningBackground
        case .witnessed:
            return ColorTokens.stateWitnessedBackground
        case .anchored:
            return ColorTokens.stateSuccessBackground
        case .rejected:
            return ColorTokens.stateDangerBackground
        }
    }
    
    public var body: some View {
        Text(status.displayName.uppercased())
            .font(Typography.badgeText)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .foregroundStyle(foregroundColor)
            .background(backgroundColor)
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(foregroundColor.opacity(0.4), lineWidth: 1)
            )
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Receipt verification status: \(status.displayName)")
    }
}

public struct CredentialStatusBadge: View {
    public let status: CredentialStatus
    
    public init(status: CredentialStatus) {
        self.status = status
    }
    
    private var foregroundColor: Color {
        switch status {
        case .reserved:
            return ColorTokens.stateNeutral
        case .signing:
            return ColorTokens.stateWarning
        case .signed:
            return ColorTokens.stateWitnessed
        case .delivered:
            return ColorTokens.stateSuccess
        }
    }
    
    private var backgroundColor: Color {
        switch status {
        case .reserved:
            return ColorTokens.stateNeutralBackground
        case .signing:
            return ColorTokens.stateWarningBackground
        case .signed:
            return ColorTokens.stateWitnessedBackground
        case .delivered:
            return ColorTokens.stateSuccessBackground
        }
    }
    
    public var body: some View {
        Text(status.displayName.uppercased())
            .font(Typography.badgeText)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .foregroundStyle(foregroundColor)
            .background(backgroundColor)
            .clipShape(RoundedRectangle(cornerRadius: 6))
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .stroke(foregroundColor.opacity(0.3), lineWidth: 1)
            )
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Voter credential status: \(status.displayName)")
    }
}

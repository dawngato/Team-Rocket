import SwiftUI

public struct InstitutionalSecuritySheet: View {
    @Environment(\.dismiss) private var dismiss
    @ScaledMetric(relativeTo: .body) private var iconSize: CGFloat = 20
    @ScaledMetric(relativeTo: .title) private var headerCircleSize: CGFloat = 64
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 22) {
                    headerView
                    
                    securityPillarsSection
                    
                    sandboxNoticeCard
                }
                .padding(20)
            }
            .navigationTitle("Security Architecture")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        HapticFeedback.light()
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: iconSize))
                            .foregroundStyle(ColorTokens.textTertiary)
                    }
                    .accessibilityLabel("Dismiss security architecture details")
                }
            }
        }
        .presentationDetents([.fraction(0.65), .large])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(24)
    }
    
    private var headerView: some View {
        VStack(spacing: 10) {
            ZStack {
                Circle()
                    .fill(ColorTokens.brandPrimary.opacity(0.12))
                    .frame(width: headerCircleSize, height: headerCircleSize)
                
                Image(systemName: "lock.shield.fill")
                    .resizable()
                    .scaledToFit()
                    .frame(width: headerCircleSize * 0.5, height: headerCircleSize * 0.5)
                    .foregroundStyle(ColorTokens.brandAccent)
            }
            .padding(.top, 4)
            
            Text("Cryptographic Architecture")
                .font(Typography.sectionHeader)
                .foregroundStyle(ColorTokens.institutionalNavy)
            
            Text("Institutional Verifiable Election System")
                .font(Typography.callout)
                .foregroundStyle(ColorTokens.textSecondary)
        }
    }
    
    private var securityPillarsSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Foundational Guarantees")
                .font(Typography.cardHeader)
                .foregroundStyle(ColorTokens.textPrimary)
            
            pillarCard(
                icon: "eye.slash.circle.fill",
                color: ColorTokens.brandAccent,
                title: "RFC 9474 Blind Credentials",
                description: "Voter identity tokens are cryptographically blinded locally before transmission to identity services. The server issues signatures over blinded values, rendering ballot choices mathematically unlinkable to student identities."
            )
            
            pillarCard(
                icon: "shield.lefthalf.filled",
                color: ColorTokens.stateSuccess,
                title: "Zero Plaintext Visibility",
                description: "In compliance with Section 0.1 Rule 3, voting choices are processed entirely inside an ephemeral browser sandbox. Plaintext voter selections are never stored or exposed within native mobile memory."
            )
            
            pillarCard(
                icon: "key.fill",
                color: ColorTokens.institutionalGold,
                title: "Hardware Enclave Keychain",
                description: "All voter secrets are persisted using Apple Keychain with kSecAttrAccessibleWhenUnlockedThisDeviceOnly, preventing extraction across cloud backups or unauthorized device migration."
            )
            
            pillarCard(
                icon: "point.3.connected.trianglepath.dotted",
                color: ColorTokens.stateWitnessed,
                title: "Merkle Audit Log and Blockchain Anchor",
                description: "Every ballot receipt is sequenced into an append only Merkle log signed by independent witness nodes and immutably anchored to the Ethereum public ledger."
            )
        }
    }
    
    private func pillarCard(
        icon: String,
        color: Color,
        title: String,
        description: String
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.system(size: iconSize))
                    .foregroundStyle(color)
                
                Text(title)
                    .font(Typography.bodyBold)
                    .foregroundStyle(ColorTokens.textPrimary)
            }
            
            Text(description)
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(14)
        .background(ColorTokens.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(ColorTokens.cardBorder, lineWidth: 1)
        )
    }
    
    private var sandboxNoticeCard: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "checkmark.seal.fill")
                .foregroundStyle(ColorTokens.stateSuccess)
            
            Text("HimVote security audits verify end to end cryptographic compliance for institutional campus elections.")
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
        }
        .padding(14)
        .background(ColorTokens.stateSuccessBackground.opacity(0.6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

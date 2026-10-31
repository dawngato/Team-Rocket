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
            Text("Security Controls and Limits")
                .font(Typography.cardHeader)
                .foregroundStyle(ColorTokens.textPrimary)
            
            pillarCard(
                icon: "eye.slash.circle.fill",
                color: ColorTokens.brandAccent,
                title: "Credential Issuance Status",
                description: "This client sends a randomly generated request value to the credential issuer without applying RFC 9474 blinding or unblinding. The current flow does not establish that voter identity and ballot use are unlinkable."
            )
            
            pillarCard(
                icon: "shield.lefthalf.filled",
                color: ColorTokens.stateSuccess,
                title: "Ballot Data Handling",
                description: "The iOS app opens the booth in an ephemeral browser session and submits the returned ballot artifacts. The app does not receive a plaintext candidate selection in this flow; ballot privacy also depends on the booth and casting service."
            )
            
            pillarCard(
                icon: "key.fill",
                color: ColorTokens.institutionalGold,
                title: "Device-Scoped Keychain Storage",
                description: "The app stores credentials and receipts as Keychain items with kSecAttrAccessibleWhenUnlockedThisDeviceOnly. This setting limits access to an unlocked device and excludes migration to another device; it does not make each item a Secure Enclave object."
            )
            
            pillarCard(
                icon: "point.3.connected.trianglepath.dotted",
                color: ColorTokens.stateWitnessed,
                title: "Merkle Proof and Local Chain Anchor",
                description: "The app can check a receipt against a supplied Merkle inclusion proof and root. This prototype uses a local Anvil EVM chain for demonstrations; that anchor is not an independent Ethereum public ledger."
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
            
            Text("This educational prototype demonstrates selected verification steps. It does not establish end-to-end security for production elections.")
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
        }
        .padding(14)
        .background(ColorTokens.stateSuccessBackground.opacity(0.6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

import SwiftUI

public struct CredentialIssueView: View {
    public let electionSummary: ElectionSummary
    @Bindable var authViewModel: AuthViewModel
    @State private var credentialViewModel = CredentialViewModel()
    @State private var showSecuritySheet: Bool = false
    
    @ScaledMetric(relativeTo: .title) private var shieldIconSize: CGFloat = 50
    @ScaledMetric(relativeTo: .body) private var navIconSize: CGFloat = 20
    
    public init(electionSummary: ElectionSummary, authViewModel: AuthViewModel) {
        self.electionSummary = electionSummary
        self.authViewModel = authViewModel
    }
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                headerView
                
                securityGuaranteesCard
                
                credentialStatusCard
                
                feedbackBanners
                
                actionButtons
            }
            .padding(16)
            .animation(SpringTokens.fluid, value: credentialViewModel.issuanceStatus)
            .animation(SpringTokens.fluid, value: credentialViewModel.errorMessage)
            .animation(SpringTokens.fluid, value: credentialViewModel.successMessage)
        }
        .navigationTitle("Voter Credential")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    HapticFeedback.light()
                    showSecuritySheet = true
                } label: {
                    Image(systemName: "info.circle")
                        .font(.system(size: navIconSize))
                        .foregroundStyle(ColorTokens.brandAccent)
                }
                .accessibilityLabel("Voter Credential Security Architecture Details")
            }
        }
        .sheet(isPresented: $showSecuritySheet) {
            InstitutionalSecuritySheet()
        }
        .onAppear {
            credentialViewModel.loadStoredCredential(electionId: electionSummary.id)
            if let token = authViewModel.currentUser?.sessionToken {
                Task {
                    await credentialViewModel.checkEligibility(
                        electionId: electionSummary.id,
                        sessionToken: token
                    )
                }
            }
        }
    }
    
    private var headerView: some View {
        VStack(spacing: 8) {
            Image(systemName: "lock.shield.fill")
                .resizable()
                .scaledToFit()
                .frame(width: shieldIconSize, height: shieldIconSize)
                .foregroundStyle(ColorTokens.brandAccent)
            
            Text("Voter Credential")
                .font(Typography.sectionHeader)
                .foregroundStyle(ColorTokens.institutionalNavy)
            
            Text("Credential Issuance Status")
                .font(Typography.callout)
                .foregroundStyle(ColorTokens.textSecondary)
        }
        .padding(.top, 16)
    }
    
    private var securityGuaranteesCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Credential Handling and Limits")
                .font(Typography.cardHeader)
                .foregroundStyle(ColorTokens.textPrimary)
            
            VStack(alignment: .leading, spacing: 10) {
                SecurityBulletPoint(
                    icon: "checkmark.circle.fill",
                    title: "Device-Scoped Keychain Storage",
                    description: "Credential data is stored as a Keychain item with kSecAttrAccessibleWhenUnlockedThisDeviceOnly. It is available when the device is unlocked and is not migrated to another device."
                )
                
                SecurityBulletPoint(
                    icon: "eye.slash.fill",
                    title: "Issuance Privacy Limit",
                    description: "This client sends the request value without an RFC 9474 blinding operation and stores the response as the credential signature. It does not demonstrate that the issuer cannot link credential issuance to ballot use."
                )
                
                SecurityBulletPoint(
                    icon: "1.circle.fill",
                    title: "Receipt Validation",
                    description: "The casting service reports whether it accepts a receipt. A local client flag does not prevent another device from submitting a ballot."
                )
            }
        }
        .padding(16)
        .background(ColorTokens.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(ColorTokens.cardBorder, lineWidth: 1)
        )
    }
    
    private var credentialStatusCard: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Credential Status")
                    .font(Typography.bodyBold)
                    .foregroundStyle(ColorTokens.textPrimary)
                Spacer()
                CredentialStatusBadge(status: credentialViewModel.issuanceStatus)
            }
            
            if let stored = credentialViewModel.currentCredential, stored.status.isComplete {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Credential Secret Fingerprint")
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.textSecondary)
                    
                    Text(stored.blindSignatureResponse?.prefix(32) ?? "Sealed in Keychain")
                        .font(Typography.cryptographicDigest)
                        .foregroundStyle(ColorTokens.textTertiary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.top, 4)
            }
        }
        .padding(16)
        .background(ColorTokens.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(ColorTokens.cardBorder, lineWidth: 1)
        )
    }
    
    @ViewBuilder
    private var feedbackBanners: some View {
        if let error = credentialViewModel.errorMessage {
            Text(error)
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.stateDanger)
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(ColorTokens.stateDangerBackground)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(ColorTokens.stateDanger.opacity(0.3), lineWidth: 1)
                )
        }
        
        if let success = credentialViewModel.successMessage {
            Text(success)
                .font(Typography.captionBold)
                .foregroundStyle(ColorTokens.stateSuccess)
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(ColorTokens.stateSuccessBackground)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(ColorTokens.stateSuccess.opacity(0.3), lineWidth: 1)
                )
        }
    }
    
    @ViewBuilder
    private var actionButtons: some View {
        if credentialViewModel.currentCredential == nil || !credentialViewModel.issuanceStatus.isComplete {
            Button {
                HapticFeedback.medium()
                Task {
                    if let token = authViewModel.currentUser?.sessionToken {
                        await credentialViewModel.requestBlindIssuance(
                            electionId: electionSummary.id,
                            sessionToken: token
                        )
                        if credentialViewModel.errorMessage != nil {
                            HapticFeedback.error()
                        } else if credentialViewModel.issuanceStatus.isComplete {
                            HapticFeedback.success()
                        }
                    }
                }
            } label: {
                HStack(spacing: 8) {
                    if credentialViewModel.isRequesting {
                        ProgressView()
                            .tint(.white)
                            .padding(.trailing, 4)
                    }
                    
                    Text(credentialViewModel.isRequesting ? "Requesting Credential..." : "Request Credential")
                        .font(Typography.cardHeader)
                        .foregroundStyle(.white)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(ColorTokens.brandPrimary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .shadow(color: ColorTokens.brandPrimary.opacity(0.25), radius: 6, x: 0, y: 3)
            }
            .interactiveSpringButton()
            .disabled(credentialViewModel.isRequesting)
            .accessibilityLabel("Generate blind credential button")
        } else {
            NavigationLink {
                VotingBoothView(
                    electionSummary: electionSummary,
                    credential: credentialViewModel.currentCredential!
                )
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "envelope.badge.shield.half.filled")
                    Text("Enter Secure Voting Booth")
                }
                .font(Typography.cardHeader)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(ColorTokens.stateSuccess)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .shadow(color: ColorTokens.stateSuccess.opacity(0.25), radius: 6, x: 0, y: 3)
            }
            .simultaneousGesture(TapGesture().onEnded {
                HapticFeedback.medium()
            })
            .accessibilityLabel("Enter secure voting booth button")
        }
    }
}

public struct SecurityBulletPoint: View {
    public let icon: String
    public let title: String
    public let description: String
    
    @ScaledMetric(relativeTo: .body) private var bulletIconSize: CGFloat = 16
    
    public init(icon: String, title: String, description: String) {
        self.icon = icon
        self.title = title
        self.description = description
    }
    
    public var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon)
                .foregroundStyle(ColorTokens.stateSuccess)
                .font(.system(size: bulletIconSize))
                .padding(.top, 2)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(Typography.bodyBold)
                    .foregroundStyle(ColorTokens.textPrimary)
                
                Text(description)
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .accessibilityElement(children: .combine)
    }
}

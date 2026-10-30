import SwiftUI

public struct CredentialIssueView: View {
    public let electionSummary: ElectionSummary
    @Bindable var authViewModel: AuthViewModel
    @State private var credentialViewModel = CredentialViewModel()
    
    public init(electionSummary: ElectionSummary, authViewModel: AuthViewModel) {
        self.electionSummary = electionSummary
        self.authViewModel = authViewModel
    }
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                VStack(spacing: 8) {
                    Image(systemName: "lock.shield.fill")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 50, height: 50)
                        .foregroundStyle(ColorTokens.brandAccent)
                    
                    Text("Anonymous Voter Credential")
                        .font(Typography.sectionHeader)
                        .foregroundStyle(ColorTokens.institutionalNavy)
                    
                    Text("RFC 9474 Blind Signature Issuance")
                        .font(Typography.callout)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
                .padding(.top, 20)
                
                VStack(alignment: .leading, spacing: 14) {
                    Text("Cryptographic Security Guarantees")
                        .font(Typography.cardHeader)
                        .foregroundStyle(ColorTokens.textPrimary)
                    
                    VStack(alignment: .leading, spacing: 8) {
                        SecurityBulletPoint(
                            icon: "checkmark.circle.fill",
                            title: "Hardware Enclave Sealing",
                            description: "Your credential private secret never leaves your device and is stored with kSecAttrAccessibleWhenUnlockedThisDeviceOnly."
                        )
                        
                        SecurityBulletPoint(
                            icon: "eye.slash.fill",
                            title: "Mathematical Unlinkability",
                            description: "The identity issuer signs a blinded token. The issuer cannot correlate your identity to your cast ballot."
                        )
                        
                        SecurityBulletPoint(
                            icon: "1.circle.fill",
                            title: "Single Cast Enforcement",
                            description: "The casting origin verifies the signature without discovering which student submitted it."
                        )
                    }
                }
                .padding()
                .background(ColorTokens.backgroundSecondary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                
                VStack(spacing: 12) {
                    HStack {
                        Text("Credential Status")
                            .font(Typography.bodyBold)
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
                .padding()
                .background(ColorTokens.backgroundSecondary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                
                if let error = credentialViewModel.errorMessage {
                    Text(error)
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.stateDanger)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(ColorTokens.stateDangerBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                
                if let success = credentialViewModel.successMessage {
                    Text(success)
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.stateSuccess)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(ColorTokens.stateSuccessBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                
                if credentialViewModel.currentCredential == nil || !credentialViewModel.issuanceStatus.isComplete {
                    Button {
                        Task {
                            if let token = authViewModel.currentUser?.sessionToken {
                                await credentialViewModel.requestBlindIssuance(
                                    electionId: electionSummary.id,
                                    sessionToken: token
                                )
                            }
                        }
                    } label: {
                        HStack {
                            if credentialViewModel.isRequesting {
                                ProgressView()
                                    .tint(.white)
                                    .padding(.trailing, 8)
                            }
                            
                            Text(credentialViewModel.isRequesting ? "Blinding and Requesting..." : "Generate Blind Credential")
                                .font(Typography.cardHeader)
                                .foregroundStyle(.white)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(ColorTokens.brandPrimary)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .disabled(credentialViewModel.isRequesting)
                    .accessibilityLabel("Generate blind credential button")
                } else {
                    NavigationLink {
                        VotingBoothView(
                            electionSummary: electionSummary,
                            credential: credentialViewModel.currentCredential!
                        )
                    } label: {
                        HStack {
                            Image(systemName: "envelope.badge.shield.half.filled")
                            Text("Enter Secure Voting Booth")
                        }
                        .font(Typography.cardHeader)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(ColorTokens.stateSuccess)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .accessibilityLabel("Enter secure voting booth button")
                }
            }
            .padding()
        }
        .navigationTitle("Voter Credential")
        .navigationBarTitleDisplayMode(.inline)
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
}

public struct SecurityBulletPoint: View {
    public let icon: String
    public let title: String
    public let description: String
    
    public init(icon: String, title: String, description: String) {
        self.icon = icon
        self.title = title
        self.description = description
    }
    
    public var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon)
                .foregroundStyle(ColorTokens.stateSuccess)
                .font(.system(size: 16))
                .padding(.top, 2)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(Typography.bodyBold)
                    .foregroundStyle(ColorTokens.textPrimary)
                
                Text(description)
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.textSecondary)
            }
        }
        .accessibilityElement(children: .combine)
    }
}

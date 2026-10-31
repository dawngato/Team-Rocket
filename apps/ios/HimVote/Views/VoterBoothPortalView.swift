import SwiftUI

public struct VoterBoothPortalView: View {
    @Bindable var authViewModel: AuthViewModel
    @Bindable var electionsViewModel: ElectionsViewModel
    
    @State private var credentialViewModel = CredentialViewModel()
    @State private var votingViewModel: VotingViewModel
    
    @State private var showBoothModal: Bool = false
    
    public init(
        authViewModel: AuthViewModel,
        electionsViewModel: ElectionsViewModel,
        votingViewModel: VotingViewModel
    ) {
        self.authViewModel = authViewModel
        self.electionsViewModel = electionsViewModel
        _votingViewModel = State(initialValue: votingViewModel)
    }
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Header Card
                    boothHeaderCard
                    
                    // Step 1: Credential Status Card
                    credentialStatusCard
                    
                    // Step 2: Casting Session Action Card
                    castingSessionCard
                    
                    // Security Disclosures
                    securityLimitationsCard
                    
                    Spacer(minLength: 90)
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
            }
            .background(ColorTokens.tailAdminLightBg)
            .navigationTitle("Voting Booth")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear {
                if let openElection {
                    credentialViewModel.loadStoredCredential(electionId: openElection.id)
                }
            }
            .sheet(isPresented: $showBoothModal) {
                if let election = openElection,
                   let credential = credentialViewModel.issuedCredential {
                    VotingBoothView(
                        electionId: election.id,
                        electionTitle: election.title,
                        credentialToken: credential.credentialToken,
                        votingViewModel: votingViewModel
                    )
                }
            }
        }
    }
    
    private var boothHeaderCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                ZStack {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(ColorTokens.tailAdminBrand.opacity(0.12))
                        .frame(width: 40, height: 40)
                    
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(ColorTokens.tailAdminBrand)
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("Secure Voting Terminal")
                        .font(Typography.sectionHeader)
                        .foregroundStyle(ColorTokens.textPrimary)
                    
                    Text("Voting Credential • External Booth Session")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
                
                Spacer()
            }
            
            Text("The design separates identity verification from ballot submission and records receipt status through the casting service. This prototype does not establish complete unlinkability or independent witnessing.")
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .glassCard(cornerRadius: 18, padding: 16)
    }
    
    private var credentialStatusCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("1. Voting Credential")
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
                
                Spacer()
                
                if credentialViewModel.issuedCredential != nil {
                    Text("ISSUED")
                        .font(Typography.badgeText)
                        .foregroundStyle(ColorTokens.tailAdminSuccess)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(ColorTokens.tailAdminSuccessBg)
                        .clipShape(Capsule())
                } else {
                    Text("UNRESERVED")
                        .font(Typography.badgeText)
                        .foregroundStyle(ColorTokens.tailAdminWarning)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(ColorTokens.tailAdminWarningBg)
                        .clipShape(Capsule())
                }
            }
            
            if let cred = credentialViewModel.issuedCredential {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Credential Commitment:")
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.textSecondary)
                    
                    Text(cred.blindedRequest)
                        .font(Typography.cryptographicDigest)
                        .foregroundStyle(ColorTokens.textTertiary)
                        .lineLimit(2)
                    
                    Text("Nullifier Digest: \(cred.nullifier)")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.tailAdminBrand)
                }
                .padding(10)
                .background(Color.white.opacity(0.6))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            } else {
                Text("Request a credential from the identity issuer. This client does not demonstrate unlinkability or one-use enforcement.")
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.textSecondary)

                if openElection == nil {
                    Text("No open election is currently available from the elections service.")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.tailAdminWarning)
                }
                
                Button {
                    HapticFeedback.medium()
                    guard let election = openElection,
                          let sessionToken = authViewModel.currentUser?.sessionToken else { return }
                    Task {
                        await credentialViewModel.requestCredential(
                            electionId: election.id,
                            sessionToken: sessionToken
                        )
                    }
                } label: {
                    HStack {
                        if credentialViewModel.isLoading {
                            ProgressView()
                                .tint(.white)
                                .scaleEffect(0.8)
                        } else {
                            Image(systemName: "key.fill")
                        }
                        Text(credentialViewModel.isLoading ? "Requesting Credential..." : "Request Credential")
                    }
                    .font(Typography.callout)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(ColorTokens.tailAdminBrand)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(
                    credentialViewModel.isLoading
                        || openElection == nil
                        || authViewModel.currentUser?.sessionToken == nil
                )
            }
        }
        .glassCard(cornerRadius: 18, padding: 16)
    }
    
    private var castingSessionCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("2. Supported Voting Booth")
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
                
                Spacer()
                
                Text("SERVICE CONTROL")
                    .font(Typography.badgeText)
                    .foregroundStyle(ColorTokens.tailAdminInfo)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(ColorTokens.tailAdminInfoBg)
                    .clipShape(Capsule())
            }
            
            Text("The configured client submits ballot data to the casting service. This screen does not independently verify encryption, proof validity, or whether identity-bearing cookies are excluded.")
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
            
            Button {
                HapticFeedback.medium()
                showBoothModal = true
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "arrow.up.forward.app.fill")
                    Text("Launch Voting Booth")
                }
                .font(Typography.callout)
                .fontWeight(.semibold)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(
                    credentialViewModel.issuedCredential != nil
                        ? ColorTokens.tailAdminBrand
                        : Color.gray.opacity(0.4)
                )
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(credentialViewModel.issuedCredential == nil || openElection == nil)
        }
        .glassCard(cornerRadius: 18, padding: 16)
    }
    
    private var securityLimitationsCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(ColorTokens.tailAdminWarning)
                
                Text("Educational Prototype Verification Notice")
                    .font(Typography.captionBold)
                    .foregroundStyle(ColorTokens.tailAdminWarning)
            }
            
            Text("A receipt alone does not prove ballot inclusion. Independent checking requires a Merkle proof, a trusted root, and a verifier. A local Anvil chain is for development and does not establish independent network finality.")
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
        }
        .padding(14)
        .background(ColorTokens.tailAdminWarningBg)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private var openElection: ElectionSummary? {
        electionsViewModel.elections.first(where: { $0.state == "open" })
    }
}

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
                if let openElection = electionsViewModel.elections.first(where: { $0.state == "open" }) {
                    credentialViewModel.loadStoredCredential(electionId: openElection.id)
                } else {
                    credentialViewModel.loadStoredCredential(electionId: "elec_01")
                }
            }
            .sheet(isPresented: $showBoothModal) {
                if let election = electionsViewModel.elections.first(where: { $0.state == "open" }) {
                    VotingBoothView(
                        electionId: election.id,
                        electionTitle: election.title,
                        credentialToken: credentialViewModel.issuedCredential?.credentialToken ?? "synthetic_tok_01",
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
                    
                    Text("RFC 9474 Blind Credential • Zero-Knowledge Casting")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
                
                Spacer()
            }
            
            Text("In accordance with institutional guidelines, voter identities and encrypted ballot choices remain cryptographically unlinkable. Your ballot will be committed to the append-only Merkle tree and independently witnessed.")
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .glassCard(cornerRadius: 18, padding: 16)
    }
    
    private var credentialStatusCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("1. Anonymous Credential")
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
                Text("Reserve an idempotent single-use authorization token without linking your student account to the ballot payload.")
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.textSecondary)
                
                Button {
                    HapticFeedback.medium()
                    Task {
                        await credentialViewModel.requestCredential(
                            electionId: "elec_01",
                            sessionToken: authViewModel.currentUser?.sessionToken ?? "mock_token"
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
                        Text(credentialViewModel.isLoading ? "Requesting Blind Token..." : "Request Anonymous Credential")
                    }
                    .font(Typography.callout)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(ColorTokens.tailAdminBrand)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(credentialViewModel.isLoading)
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
                
                Text("STRICT 1-VOTE")
                    .font(Typography.badgeText)
                    .foregroundStyle(ColorTokens.tailAdminInfo)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(ColorTokens.tailAdminInfoBg)
                    .clipShape(Capsule())
            }
            
            Text("Ballot encryption takes place in an isolated session. Vetted proofs and encrypted ciphertexts are submitted directly to the casting origin with no identity-bearing cookies.")
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
            
            Button {
                HapticFeedback.medium()
                showBoothModal = true
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "arrow.up.forward.app.fill")
                    Text("Launch Encrypted Voter Booth")
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
            .disabled(credentialViewModel.issuedCredential == nil)
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
            
            Text("Receipts prove cryptographic inclusion in the ordered Merkle tree without revealing candidate selections. Anvil local blockchain anchoring provides reproducible demonstration proof and does not replace independently operated public chains.")
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
        }
        .padding(14)
        .background(ColorTokens.tailAdminWarningBg)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

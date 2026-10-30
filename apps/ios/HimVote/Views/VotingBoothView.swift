import SwiftUI

public struct VotingBoothView: View {
    public let electionSummary: ElectionSummary
    public let credential: Credential
    @State private var votingViewModel = VotingViewModel()
    @State private var handleCopied: Bool = false
    @State private var showSecuritySheet: Bool = false
    
    @ScaledMetric(relativeTo: .title) private var headerCircleSize: CGFloat = 80
    @ScaledMetric(relativeTo: .title) private var headerIconSize: CGFloat = 44
    @ScaledMetric(relativeTo: .body) private var navIconSize: CGFloat = 20
    
    public init(electionSummary: ElectionSummary, credential: Credential) {
        self.electionSummary = electionSummary
        self.credential = credential
    }
    
    public init(
        electionId: String,
        electionTitle: String,
        credentialToken: String,
        votingViewModel: VotingViewModel? = nil
    ) {
        self.electionSummary = ElectionSummary(
            id: electionId,
            title: electionTitle,
            state: "open",
            opensAtUtc: "",
            closesAtUtc: ""
        )
        self.credential = Credential(
            electionId: electionId,
            blindSignatureResponse: credentialToken,
            unblindedSignature: credentialToken,
            status: .delivered
        )
        if let vm = votingViewModel {
            self._votingViewModel = State(initialValue: vm)
        }
    }
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                headerView
                
                securityGuaranteeCard
                
                credentialVerificationCard
                
                if let error = votingViewModel.errorMessage {
                    errorBanner(message: error)
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .scale(scale: 0.96)),
                            removal: .opacity
                        ))
                }
                
                if let handle = votingViewModel.successReceiptHandle {
                    successReceiptCard(handle: handle)
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .scale(scale: 0.95)),
                            removal: .opacity
                        ))
                } else {
                    launchBoothActionCard
                }
            }
            .padding(16)
            .animation(SpringTokens.fluid, value: votingViewModel.successReceiptHandle)
            .animation(SpringTokens.fluid, value: votingViewModel.errorMessage)
        }
        .navigationTitle("Voting Booth")
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
                .accessibilityLabel("Isolated Voting Booth Architecture Details")
            }
        }
        .sheet(isPresented: $showSecuritySheet) {
            InstitutionalSecuritySheet()
        }
    }
    
    private var headerView: some View {
        VStack(spacing: 10) {
            ZStack {
                Circle()
                    .fill(ColorTokens.brandAccent.opacity(0.12))
                    .frame(width: headerCircleSize, height: headerCircleSize)
                
                Image(systemName: "shield.lefthalf.filled.badge.checkmark")
                    .resizable()
                    .scaledToFit()
                    .frame(width: headerIconSize, height: headerIconSize)
                    .foregroundStyle(ColorTokens.brandAccent)
            }
            .accessibilityHidden(true)
            .padding(.top, 16)
            
            Text("Secure Voting Booth")
                .font(Typography.sectionHeader)
                .foregroundStyle(ColorTokens.institutionalNavy)
            
            Text("Isolated Sandbox Environment")
                .font(Typography.callout)
                .foregroundStyle(ColorTokens.textSecondary)
        }
    }
    
    private var securityGuaranteeCard: some View {
        Button {
            HapticFeedback.light()
            showSecuritySheet = true
        } label: {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) {
                    Image(systemName: "lock.shield.fill")
                        .foregroundStyle(ColorTokens.brandAccent)
                    
                    Text("Zero Plaintext Ballot Visibility")
                        .font(Typography.cardHeader)
                        .foregroundStyle(ColorTokens.textPrimary)
                    
                    Spacer()
                    
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(ColorTokens.textTertiary)
                }
                
                Text("Your ballot choices are encrypted client side inside an isolated ASWebAuthenticationSession booth. The mobile application runtime never accesses plaintext ballot selections, adhering strictly to Section 0.1 Rule 3.")
                    .font(Typography.callout)
                    .foregroundStyle(ColorTokens.textSecondary)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(16)
            .background(ColorTokens.backgroundSecondary)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(ColorTokens.cardBorder, lineWidth: 1)
            )
        }
        .interactiveCardButton()
    }
    
    private var credentialVerificationCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Authenticated Voter Token")
                    .font(Typography.captionBold)
                    .foregroundStyle(ColorTokens.textSecondary)
                
                Spacer()
                
                CredentialStatusBadge(status: credential.status)
            }
            
            if let proof = credential.unblindedSignature ?? credential.blindSignatureResponse {
                Text("Credential Fingerprint: \(proof.prefix(24))...")
                    .font(Typography.cryptographicDigest)
                    .foregroundStyle(ColorTokens.textTertiary)
            }
        }
        .padding(14)
        .background(ColorTokens.backgroundSecondary.opacity(0.7))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(ColorTokens.cardBorder, lineWidth: 1)
        )
    }
    
    private func errorBanner(message: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "exclamationmark.octagon.fill")
                .foregroundStyle(ColorTokens.stateDanger)
                .font(.system(size: 18))
                .padding(.top, 2)
            
            VStack(alignment: .leading, spacing: 4) {
                Text("Session Interruption")
                    .font(Typography.captionBold)
                    .foregroundStyle(ColorTokens.stateDanger)
                
                Text(message)
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.stateDanger)
                    .fixedSize(horizontal: false, vertical: true)
            }
            
            Spacer()
        }
        .padding(14)
        .background(ColorTokens.stateDangerBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(ColorTokens.stateDanger.opacity(0.3), lineWidth: 1)
        )
    }
    
    private func successReceiptCard(handle: String) -> some View {
        VStack(spacing: 18) {
            ZStack {
                Circle()
                    .fill(ColorTokens.stateSuccess.opacity(0.15))
                    .frame(width: 72, height: 72)
                
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 44))
                    .foregroundStyle(ColorTokens.stateSuccess)
                    .beaconPulse(color: ColorTokens.stateSuccess, isActive: true)
            }
            
            VStack(spacing: 6) {
                Text("Ballot Successfully Cast")
                    .font(Typography.sectionHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
                
                Text("Your encrypted ballot has been recorded into the casting origin outbox.")
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.textSecondary)
                    .multilineTextAlignment(.center)
            }
            
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Cryptographic Receipt Handle")
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.textSecondary)
                    
                    Spacer()
                    
                    Button {
                        #if canImport(UIKit)
                        UIPasteboard.general.string = handle
                        #endif
                        HapticFeedback.success()
                        handleCopied = true
                        Task {
                            try? await Task.sleep(nanoseconds: 2_000_000_000)
                            handleCopied = false
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: handleCopied ? "checkmark" : "doc.on.doc")
                            Text(handleCopied ? "Copied" : "Copy")
                        }
                        .font(Typography.badgeText)
                        .foregroundStyle(handleCopied ? ColorTokens.stateSuccess : ColorTokens.brandAccent)
                    }
                }
                
                Text(handle)
                    .font(Typography.receiptHandle)
                    .foregroundStyle(ColorTokens.brandAccent)
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(ColorTokens.backgroundPrimary)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            
            NavigationLink {
                ReceiptView(
                    electionId: electionSummary.id,
                    receiptHandle: handle
                )
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "doc.text.magnifyingglass")
                    Text("Inspect Verification Receipt")
                }
                .font(Typography.cardHeader)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(ColorTokens.brandPrimary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .shadow(color: ColorTokens.brandPrimary.opacity(0.3), radius: 6, x: 0, y: 3)
            }
            .simultaneousGesture(TapGesture().onEnded {
                HapticFeedback.medium()
            })
            .accessibilityLabel("Inspect Verification Receipt button")
        }
        .padding(20)
        .background(ColorTokens.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(ColorTokens.stateSuccess.opacity(0.4), lineWidth: 1.5)
        )
    }
    
    private var launchBoothActionCard: some View {
        Button {
            HapticFeedback.medium()
            Task {
                let boothUrl = URL(string: "http://localhost:8080/booth")!
                let election = Election(
                    id: electionSummary.id,
                    title: electionSummary.title,
                    state: electionSummary.electionState,
                    manifestDigest: "",
                    opensAtUtc: electionSummary.opensAtUtc,
                    closesAtUtc: electionSummary.closesAtUtc,
                    issuanceCutoffUtc: ""
                )
                await votingViewModel.startVotingFlow(
                    boothBaseUrl: boothUrl,
                    election: election,
                    credential: credential
                )
                if votingViewModel.errorMessage != nil {
                    HapticFeedback.error()
                } else if votingViewModel.successReceiptHandle != nil {
                    HapticFeedback.success()
                }
            }
        } label: {
            HStack(spacing: 10) {
                if votingViewModel.isLaunchingBooth || votingViewModel.isCasting {
                    ProgressView()
                        .tint(.white)
                }
                
                let buttonTitle: String = {
                    if votingViewModel.isCasting {
                        return "Submitting Cast to Outbox..."
                    } else if votingViewModel.isLaunchingBooth {
                        return "Opening Isolated Booth..."
                    } else {
                        return "Launch Isolated Voting Booth"
                    }
                }()
                
                Text(buttonTitle)
                    .font(Typography.cardHeader)
                    .foregroundStyle(.white)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(ColorTokens.brandAccent)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: ColorTokens.brandAccent.opacity(0.3), radius: 6, x: 0, y: 3)
        }
        .interactiveSpringButton()
        .disabled(votingViewModel.isLaunchingBooth || votingViewModel.isCasting)
        .accessibilityLabel("Launch isolated voting booth button")
    }
}

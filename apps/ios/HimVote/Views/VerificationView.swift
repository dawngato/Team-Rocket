import SwiftUI

public struct VerificationView: View {
    public let electionId: String
    @Bindable var authViewModel: AuthViewModel
    @State private var auditorViewModel = AuditorViewModel()
    
    public init(electionId: String, authViewModel: AuthViewModel) {
        self.electionId = electionId
        self.authViewModel = authViewModel
    }
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 22) {
                headerView
                
                if auditorViewModel.isLoading {
                    loadingView
                } else if let error = auditorViewModel.errorMessage {
                    errorBanner(message: error)
                } else {
                    verdictSummaryCard
                    
                    securityChecksList
                    
                    evidenceArchiveSection
                }
            }
            .padding(16)
        }
        .navigationTitle("Audit Evidence")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    Task {
                        await runVerification()
                    }
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .foregroundStyle(ColorTokens.brandPrimary)
                }
                .accessibilityLabel("Reverify cryptographic evidence")
            }
        }
        .task {
            await runVerification()
        }
    }
    
    private var headerView: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(ColorTokens.brandAccent.opacity(0.12))
                    .frame(width: 72, height: 72)
                
                Image(systemName: "checkmark.shield.fill")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 38, height: 38)
                    .foregroundStyle(ColorTokens.brandAccent)
            }
            .accessibilityHidden(true)
            .padding(.top, 12)
            
            Text("Cryptographic Verification")
                .font(Typography.sectionHeader)
                .foregroundStyle(ColorTokens.institutionalNavy)
            
            Text("Independent Evidence Integrity Checks")
                .font(Typography.callout)
                .foregroundStyle(ColorTokens.textSecondary)
        }
    }
    
    private var loadingView: some View {
        VStack(spacing: 16) {
            Spacer(minLength: 40)
            ProgressView()
                .scaleEffect(1.3)
            Text("Retrieving and verifying cryptographic evidence package...")
                .font(Typography.callout)
                .foregroundStyle(ColorTokens.textSecondary)
                .multilineTextAlignment(.center)
            Spacer(minLength: 40)
        }
        .padding(24)
    }
    
    private func errorBanner(message: String) -> some View {
        VStack(spacing: 14) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(ColorTokens.stateDanger)
                    .font(.system(size: 20))
                    .padding(.top, 2)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Verification Error")
                        .font(Typography.cardHeader)
                        .foregroundStyle(ColorTokens.stateDanger)
                    
                    Text(message)
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.stateDanger)
                }
                
                Spacer()
            }
            
            Button {
                Task {
                    await runVerification()
                }
            } label: {
                Text("Retry Verification")
                    .font(Typography.captionBold)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(ColorTokens.stateDanger)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
        .padding(16)
        .background(ColorTokens.stateDangerBackground)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(ColorTokens.stateDanger.opacity(0.3), lineWidth: 1)
        )
    }
    
    private var verdictSummaryCard: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Overall Audit Verdict")
                        .font(Typography.cardHeader)
                        .foregroundStyle(ColorTokens.textPrimary)
                    
                    Text(verdictSubtitle)
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
                
                Spacer()
                
                Text(auditorViewModel.overallVerdict.rawValue)
                    .font(Typography.cardHeader)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .foregroundStyle(auditorViewModel.overallVerdict == .pass ? ColorTokens.stateSuccess : ColorTokens.stateDanger)
                    .background(auditorViewModel.overallVerdict == .pass ? ColorTokens.stateSuccessBackground : ColorTokens.stateDangerBackground)
                    .clipShape(Capsule())
                    .overlay(
                        Capsule()
                            .stroke(
                                auditorViewModel.overallVerdict == .pass ? ColorTokens.stateSuccess.opacity(0.4) : ColorTokens.stateDanger.opacity(0.4),
                                lineWidth: 1.5
                            )
                    )
            }
        }
        .padding(18)
        .background(ColorTokens.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(ColorTokens.cardBorder, lineWidth: 1)
        )
    }
    
    private var verdictSubtitle: String {
        switch auditorViewModel.overallVerdict {
        case .pass:
            return "All cryptographic integrity proofs confirmed valid"
        case .fail:
            return "One or more integrity checks failed verification"
        case .unverifiable:
            return "Evidence package pending verification"
        }
    }
    
    private var securityChecksList: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Cryptographic Property Checks")
                .font(Typography.cardHeader)
                .foregroundStyle(ColorTokens.textPrimary)
            
            ForEach(auditorViewModel.auditCheckItems) { check in
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: check.verdict == .pass ? "checkmark.circle.fill" : "xmark.circle.fill")
                            .foregroundStyle(check.verdict == .pass ? ColorTokens.stateSuccess : ColorTokens.stateDanger)
                        
                        Text(check.name)
                            .font(Typography.bodyBold)
                            .foregroundStyle(ColorTokens.textPrimary)
                        
                        Spacer()
                        
                        Text(check.verdict.rawValue)
                            .font(Typography.badgeText)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .foregroundStyle(check.verdict == .pass ? ColorTokens.stateSuccess : ColorTokens.stateDanger)
                            .background(check.verdict == .pass ? ColorTokens.stateSuccessBackground : ColorTokens.stateDangerBackground)
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                    }
                    
                    Text(check.detail)
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
                .padding(14)
                .background(ColorTokens.backgroundSecondary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(ColorTokens.cardBorder, lineWidth: 1)
                )
            }
        }
    }
    
    @ViewBuilder
    private var evidenceArchiveSection: some View {
        if let urlString = auditorViewModel.evidencePackage?.evidenceUrl,
           let url = URL(string: urlString) {
            Link(destination: url) {
                HStack(spacing: 8) {
                    Image(systemName: "arrow.down.doc.fill")
                    Text("Download Full Audit Evidence Bundle")
                }
                .font(Typography.cardHeader)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(ColorTokens.brandPrimary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .shadow(color: ColorTokens.brandPrimary.opacity(0.3), radius: 6, x: 0, y: 3)
            }
            .accessibilityLabel("Download full election audit evidence bundle button")
        }
    }
    
    private func runVerification() async {
        if let token = authViewModel.currentUser?.sessionToken {
            await auditorViewModel.loadEvidenceAndVerify(electionId: electionId, sessionToken: token)
        }
    }
}

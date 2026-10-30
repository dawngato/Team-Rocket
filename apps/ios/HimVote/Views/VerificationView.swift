import SwiftUI

public struct VerificationView: View {
    public let electionId: String
    @Bindable var authViewModel: AuthViewModel
    @State private var auditorViewModel = AuditorViewModel()
    @State private var selectedAuditCheck: AuditCheckItem? = nil
    
    @ScaledMetric(relativeTo: .title) private var headerCircleSize: CGFloat = 72
    @ScaledMetric(relativeTo: .title) private var headerIconSize: CGFloat = 38
    @ScaledMetric(relativeTo: .body) private var navIconSize: CGFloat = 20
    
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
                        .transition(.opacity)
                } else if let error = auditorViewModel.errorMessage {
                    errorBanner(message: error)
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .scale(scale: 0.96)),
                            removal: .opacity
                        ))
                } else {
                    verdictSummaryCard
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .scale(scale: 0.95)),
                            removal: .opacity
                        ))
                    
                    securityChecksList
                    
                    evidenceArchiveSection
                }
            }
            .padding(16)
            .animation(SpringTokens.fluid, value: auditorViewModel.isLoading)
            .animation(SpringTokens.auditTransition, value: auditorViewModel.overallVerdict)
        }
        .navigationTitle("Audit Evidence")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    HapticFeedback.medium()
                    Task {
                        await runVerification()
                    }
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: navIconSize))
                        .foregroundStyle(ColorTokens.brandPrimary)
                }
                .accessibilityLabel("Reverify cryptographic evidence")
            }
        }
        .sheet(item: $selectedAuditCheck) { check in
            MerkleAuditDetailSheet(
                checkItem: check,
                evidencePackage: auditorViewModel.evidencePackage
            )
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
                    .frame(width: headerCircleSize, height: headerCircleSize)
                
                Image(systemName: "checkmark.shield.fill")
                    .resizable()
                    .scaledToFit()
                    .frame(width: headerIconSize, height: headerIconSize)
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
                        .fixedSize(horizontal: false, vertical: true)
                }
                
                Spacer()
            }
            
            Button {
                HapticFeedback.medium()
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
            .interactiveSpringButton()
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
                    .foregroundStyle(verdictColor)
                    .background(verdictBackground)
                    .clipShape(Capsule())
                    .overlay(
                        Capsule()
                            .stroke(
                                verdictColor.opacity(0.4),
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
            return "Every required check completed against independently supplied trust material"
        case .fail:
            return "One or more integrity checks failed verification"
        case .limited:
            return "Metadata checks completed; cryptographic verification still requires the standalone verifier"
        case .notChecked, .unverifiable:
            return "No independent cryptographic verdict is available yet"
        }
    }

    private var verdictColor: Color {
        switch auditorViewModel.overallVerdict {
        case .pass:
            return ColorTokens.stateSuccess
        case .fail:
            return ColorTokens.stateDanger
        case .limited, .notChecked, .unverifiable:
            return ColorTokens.stateWarning
        }
    }

    private var verdictBackground: Color {
        switch auditorViewModel.overallVerdict {
        case .pass:
            return ColorTokens.stateSuccessBackground
        case .fail:
            return ColorTokens.stateDangerBackground
        case .limited, .notChecked, .unverifiable:
            return ColorTokens.stateWarningBackground
        }
    }
    
    private var securityChecksList: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Cryptographic Property Checks")
                .font(Typography.cardHeader)
                .foregroundStyle(ColorTokens.textPrimary)
            
            ForEach(auditorViewModel.auditCheckItems) { check in
                Button {
                    HapticFeedback.light()
                    selectedAuditCheck = check
                } label: {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Image(systemName: verdictIcon(for: check.verdict))
                                .foregroundStyle(verdictColor(for: check.verdict))
                            
                            Text(check.name)
                                .font(Typography.bodyBold)
                                .foregroundStyle(ColorTokens.textPrimary)
                            
                            Spacer()
                            
                            Text(check.verdict.rawValue)
                                .font(Typography.badgeText)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .foregroundStyle(verdictColor(for: check.verdict))
                                .background(verdictBackground(for: check.verdict))
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                            
                            Image(systemName: "chevron.right")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(ColorTokens.textTertiary)
                        }
                        
                        Text(check.detail)
                            .font(Typography.caption)
                            .foregroundStyle(ColorTokens.textSecondary)
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(14)
                    .background(ColorTokens.backgroundSecondary)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(ColorTokens.cardBorder, lineWidth: 1)
                    )
                }
                .interactiveCardButton()
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
            .simultaneousGesture(TapGesture().onEnded {
                HapticFeedback.light()
            })
            .accessibilityLabel("Download full election audit evidence bundle button")
        }
    }
    
    private func runVerification() async {
        if let token = authViewModel.currentUser?.sessionToken {
            await auditorViewModel.loadEvidenceAndVerify(electionId: electionId, sessionToken: token)
            if auditorViewModel.overallVerdict == .pass {
                HapticFeedback.success()
            } else if auditorViewModel.overallVerdict == .fail {
                HapticFeedback.error()
            } else {
                HapticFeedback.warning()
            }
        }
    }

    private func verdictIcon(for verdict: VerificationVerdict) -> String {
        switch verdict {
        case .pass:
            return "checkmark.circle.fill"
        case .fail:
            return "xmark.circle.fill"
        case .limited, .notChecked, .unverifiable:
            return "exclamationmark.circle.fill"
        }
    }

    private func verdictColor(for verdict: VerificationVerdict) -> Color {
        switch verdict {
        case .pass:
            return ColorTokens.stateSuccess
        case .fail:
            return ColorTokens.stateDanger
        case .limited, .notChecked, .unverifiable:
            return ColorTokens.stateWarning
        }
    }

    private func verdictBackground(for verdict: VerificationVerdict) -> Color {
        switch verdict {
        case .pass:
            return ColorTokens.stateSuccessBackground
        case .fail:
            return ColorTokens.stateDangerBackground
        case .limited, .notChecked, .unverifiable:
            return ColorTokens.stateWarningBackground
        }
    }
}

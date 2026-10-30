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
            VStack(spacing: 20) {
                VStack(spacing: 8) {
                    Image(systemName: "checkmark.shield.fill")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 50, height: 50)
                        .foregroundStyle(ColorTokens.brandAccent)
                    
                    Text("Cryptographic Verification")
                        .font(Typography.sectionHeader)
                        .foregroundStyle(ColorTokens.institutionalNavy)
                    
                    Text("Independent Evidence Integrity Checks")
                        .font(Typography.callout)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
                .padding(.top, 20)
                
                if auditorViewModel.isLoading {
                    ProgressView("Retrieving and verifying evidence package...")
                        .padding()
                } else if let error = auditorViewModel.errorMessage {
                    Text(error)
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.stateDanger)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(ColorTokens.stateDangerBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                } else {
                    HStack {
                        Text("Overall Audit Verdict")
                            .font(Typography.bodyBold)
                        
                        Spacer()
                        
                        Text(auditorViewModel.overallVerdict.rawValue)
                            .font(Typography.badgeText)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .foregroundStyle(auditorViewModel.overallVerdict == .pass ? ColorTokens.stateSuccess : ColorTokens.stateDanger)
                            .background(auditorViewModel.overallVerdict == .pass ? ColorTokens.stateSuccessBackground : ColorTokens.stateDangerBackground)
                            .clipShape(Capsule())
                    }
                    .padding()
                    .background(ColorTokens.backgroundSecondary)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Security Property Checks")
                            .font(Typography.cardHeader)
                            .foregroundStyle(ColorTokens.textPrimary)
                        
                        ForEach(auditorViewModel.auditCheckItems) { check in
                            VStack(alignment: .leading, spacing: 6) {
                                HStack {
                                    Text(check.name)
                                        .font(Typography.bodyBold)
                                        .foregroundStyle(ColorTokens.textPrimary)
                                    
                                    Spacer()
                                    
                                    Text(check.verdict.rawValue)
                                        .font(Typography.badgeText)
                                        .foregroundStyle(check.verdict == .pass ? ColorTokens.stateSuccess : ColorTokens.stateDanger)
                                }
                                
                                Text(check.detail)
                                    .font(Typography.caption)
                                    .foregroundStyle(ColorTokens.textSecondary)
                            }
                            .padding()
                            .background(ColorTokens.backgroundSecondary)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Audit Evidence")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if let token = authViewModel.currentUser?.sessionToken {
                await auditorViewModel.loadEvidenceAndVerify(electionId: electionId, sessionToken: token)
            }
        }
    }
}

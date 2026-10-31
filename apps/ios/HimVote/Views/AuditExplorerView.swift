import SwiftUI

public struct AuditExplorerView: View {
    @Bindable var authViewModel: AuthViewModel
    @State private var auditorViewModel = AuditorViewModel()
    
    @State private var selectedNode: MerkleNodeDescriptor? = nil
    @State private var activeAdversarialDemo: String? = nil
    @State private var showSecuritySheet: Bool = false
    @State private var electionId = ""
    
    // Evidence is populated only after it is fetched from the configured service.
    let treeNodes: [MerkleNodeDescriptor] = []
    
    public init(authViewModel: AuthViewModel) {
        self.authViewModel = authViewModel
    }
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Header
                    auditHeroCard
                    
                    // Merkle Tree Visualizer
                    merkleTreeSection
                    
                    // Blockchain Anchor Card
                    evmAnchorCard
                    
                    // Five Mandated Security Attack Demos (Prompt1 & Prompt2 requirement)
                    mandatedAttackDemosSection
                    
                    // Verifier Execution Panel
                    verifierExecutionCard
                    
                    Spacer(minLength: 90)
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
            }
            .background(ColorTokens.tailAdminLightBg)
            .navigationTitle("Cryptographic Auditor")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showSecuritySheet) {
                InstitutionalSecuritySheet()
            }
            .sheet(item: $selectedNode) { node in
                MerkleAuditDetailSheet(
                    checkItem: AuditCheckItem(
                        id: node.id,
                        name: node.title,
                        verdict: node.isVerified ? .pass : .fail,
                        detail: "Node Level: \(node.level)\nDigest: \(node.digest)\nDomain Separation: RFC 9162 RFC compliant hash tree"
                    )
                )
            }
        }
    }
    
    private var auditHeroCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                ZStack {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(ColorTokens.tailAdminPurple.opacity(0.12))
                        .frame(width: 40, height: 40)
                    
                    Image(systemName: "point.3.connected.trianglepath.dotted")
                        .font(.system(size: 20))
                        .foregroundStyle(ColorTokens.tailAdminPurple)
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("Independent Verifier Console")
                        .font(Typography.sectionHeader)
                        .foregroundStyle(ColorTokens.textPrimary)
                    
                    Text("Evidence review • Metadata checks only")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
                
                Spacer()
            }
            
            Text("This screen does not independently verify signatures, Merkle proofs, blockchain inclusion, or finality. Load an evidence package and use the standalone verifier with out-of-band trust pins for those checks.")
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
        }
        .glassCard(cornerRadius: 18, padding: 16)
    }
    
    private var merkleTreeSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Merkle Checkpoint Evidence")
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
                
                Spacer()
                
                Text(treeNodes.isEmpty ? "NO EVIDENCE LOADED" : "SERVICE DATA")
                    .font(Typography.badgeText)
                    .foregroundStyle(ColorTokens.tailAdminBrand)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(ColorTokens.tailAdminBrandBg)
                    .clipShape(Capsule())
            }
            
            VStack(spacing: 10) {
                if treeNodes.isEmpty {
                    Text("No checkpoint evidence is loaded. Connect to the evidence service to inspect Merkle nodes.")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                }
                ForEach(treeNodes) { node in
                    Button {
                        HapticFeedback.light()
                        selectedNode = node
                    } label: {
                        HStack(spacing: 12) {
                            Circle()
                                .fill(node.isVerified ? ColorTokens.tailAdminSuccess : ColorTokens.tailAdminWarning)
                                .frame(width: 10, height: 10)
                            
                            VStack(alignment: .leading, spacing: 2) {
                                HStack {
                                    Text(node.title)
                                        .font(Typography.callout)
                                        .fontWeight(.semibold)
                                        .foregroundStyle(ColorTokens.textPrimary)
                                    
                                    Spacer()
                                    
                                    Text(node.level)
                                        .font(Typography.badgeText)
                                        .foregroundStyle(ColorTokens.textTertiary)
                                }
                                
                                Text(node.digest)
                                    .font(Typography.cryptographicDigest)
                                    .foregroundStyle(ColorTokens.textTertiary)
                                    .lineLimit(1)
                            }
                            
                            Image(systemName: "chevron.right")
                                .font(.system(size: 12))
                                .foregroundStyle(ColorTokens.textTertiary)
                        }
                        .padding(12)
                        .background(Color.white.opacity(0.6))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .glassCard(cornerRadius: 20, padding: 18)
    }
    
    private var evmAnchorCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "link.circle.fill")
                        .foregroundStyle(ColorTokens.tailAdminInfo)
                    Text("EVM Smart Contract Anchor")
                        .font(Typography.cardHeader)
                        .foregroundStyle(ColorTokens.textPrimary)
                }
                
                Spacer()
                
                Text("NOT VERIFIED")
                    .font(Typography.badgeText)
                    .foregroundStyle(ColorTokens.tailAdminWarning)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(ColorTokens.tailAdminWarningBg)
                    .clipShape(Capsule())
            }
            
            VStack(alignment: .leading, spacing: 6) {
                labeledField(label: "Contract Address", value: "Not reported by a connected service")
                labeledField(label: "Anchor Transaction", value: "Not reported by a connected service")
                labeledField(label: "Chain Network", value: "Not configured")
                labeledField(label: "Block and Confirmations", value: "Not verified")
            }
            .padding(12)
            .background(Color.white.opacity(0.6))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .glassCard(cornerRadius: 20, padding: 18)
    }
    
    private func labeledField(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
            Text(value)
                .font(Typography.cryptographicDigest)
                .foregroundStyle(ColorTokens.textPrimary)
                .lineLimit(1)
        }
    }
    
    private var mandatedAttackDemosSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Illustrative Threat Scenarios")
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
                
                Spacer()
                
                Text("NOT EXECUTED")
                    .font(Typography.badgeText)
                    .foregroundStyle(ColorTokens.tailAdminPurple)
            }
            
            VStack(spacing: 8) {
                attackDemoRow(
                    name: "1. Duplicate Submission Replay",
                    desc: "Example scenario: replay a spent nullifier.",
                    result: "NOT RUN"
                )
                attackDemoRow(
                    name: "2. Unauthorized Insertion",
                    desc: "Example scenario: insert an unissued leaf.",
                    result: "NOT RUN"
                )
                attackDemoRow(
                    name: "3. Ballot Deletion Attempt",
                    desc: "Example scenario: omit an accepted ballot.",
                    result: "NOT RUN"
                )
                attackDemoRow(
                    name: "4. Ciphertext Tampering",
                    desc: "Example scenario: modify encrypted ballot bytes.",
                    result: "NOT RUN"
                )
                attackDemoRow(
                    name: "5. Tally Counter Manipulation",
                    desc: "Example scenario: alter a published tally.",
                    result: "NOT RUN"
                )
            }
        }
        .glassCard(cornerRadius: 20, padding: 18)
    }
    
    private func attackDemoRow(name: String, desc: String, result: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "shield.slash.fill")
                .font(.system(size: 16))
                .foregroundStyle(ColorTokens.tailAdminBrand)
                .padding(.top, 2)
            
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(name)
                        .font(Typography.callout)
                        .fontWeight(.semibold)
                        .foregroundStyle(ColorTokens.textPrimary)
                    
                    Spacer()
                    
                    Text(result)
                        .font(Typography.badgeText)
                        .foregroundStyle(ColorTokens.tailAdminWarning)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(ColorTokens.tailAdminWarningBg)
                        .clipShape(Capsule())
                }
                
                Text(desc)
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.textSecondary)
            }
        }
        .padding(8)
        .background(Color.white.opacity(0.4))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
    
    private var verifierExecutionCard: some View {
        VStack(spacing: 12) {
            TextField("Election ID", text: $electionId)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .textFieldStyle(.roundedBorder)

            if authViewModel.currentUser?.sessionToken == nil {
                Text("Sign in with an authorized account before requesting evidence.")
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.tailAdminWarning)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            Button {
                HapticFeedback.heavy()
                Task {
                    guard let sessionToken = authViewModel.currentUser?.sessionToken else { return }
                    await auditorViewModel.loadEvidenceAndVerify(
                        electionId: electionId.trimmingCharacters(in: .whitespacesAndNewlines),
                        sessionToken: sessionToken
                    )
                }
            } label: {
                HStack(spacing: 8) {
                    if auditorViewModel.isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "play.circle.fill")
                    }
                    Text(auditorViewModel.isLoading ? "Reviewing Evidence Metadata..." : "Load and Review Evidence")
                }
                .font(Typography.callout)
                .fontWeight(.bold)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(ColorTokens.tailAdminBrand)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(
                auditorViewModel.isLoading
                    || authViewModel.currentUser?.sessionToken == nil
                    || electionId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            )
            
            if !auditorViewModel.auditCheckItems.isEmpty {
                VStack(spacing: 6) {
                    ForEach(auditorViewModel.auditCheckItems) { item in
                        HStack {
                            Image(systemName: verdictIcon(for: item.verdict))
                                .foregroundStyle(verdictColor(for: item.verdict))
                            
                            Text(item.name)
                                .font(Typography.caption)
                                .foregroundStyle(ColorTokens.textPrimary)
                            
                            Spacer()
                            
                            Text(item.verdict.rawValue)
                                .font(Typography.badgeText)
                                .foregroundStyle(verdictColor(for: item.verdict))
                        }
                        .padding(.vertical, 3)
                    }
                }
                .padding(10)
                .background(Color.white.opacity(0.6))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
        .glassCard(cornerRadius: 20, padding: 18)
    }

    private func verdictIcon(for verdict: VerificationVerdict) -> String {
        switch verdict {
        case .pass:
            return "checkmark.circle.fill"
        case .fail:
            return "xmark.circle.fill"
        case .limited, .notChecked, .unverifiable:
            return "minus.circle.fill"
        }
    }

    private func verdictColor(for verdict: VerificationVerdict) -> Color {
        switch verdict {
        case .pass:
            return ColorTokens.tailAdminSuccess
        case .fail:
            return ColorTokens.tailAdminDanger
        case .limited, .notChecked, .unverifiable:
            return ColorTokens.tailAdminWarning
        }
    }
}

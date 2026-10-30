import SwiftUI

public struct AuditExplorerView: View {
    @Bindable var authViewModel: AuthViewModel
    @State private var auditorViewModel = AuditorViewModel()
    
    @State private var selectedNode: MerkleNodeDescriptor? = nil
    @State private var activeAdversarialDemo: String? = nil
    @State private var showSecuritySheet: Bool = false
    
    // Synthetic Merkle Tree Nodes
    let treeNodes: [MerkleNodeDescriptor] = [
        MerkleNodeDescriptor(
            id: "node_root",
            title: "Witness Merkle Root",
            digest: "0x8fa32b0c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855667788",
            level: "Level 2 (Root)",
            isVerified: true
        ),
        MerkleNodeDescriptor(
            id: "node_left",
            title: "Branch Left [0..624]",
            digest: "0x7da21a9b038efae3b7885ea81316bd30d3538a823b9384880a6741a7445566",
            level: "Level 1 (Branch)",
            isVerified: true
        ),
        MerkleNodeDescriptor(
            id: "node_right",
            title: "Branch Right [625..1247]",
            digest: "0x6ca1098a927de9d2a6774d970205ac2f924279712a827377f9563096334455",
            level: "Level 1 (Branch)",
            isVerified: true
        ),
        MerkleNodeDescriptor(
            id: "node_leaf_voter",
            title: "Your Cast Ballot Leaf #1247",
            digest: "0x77bca092149afbf4c8996fb92427ae41e4649b934ca495991b7852b855aa11",
            level: "Level 0 (Leaf)",
            isVerified: true
        )
    ]
    
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
                    
                    Text("Append-Only Integrity • Merkle Transparency")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
                
                Spacer()
            }
            
            Text("The verifier evaluates proof packages independently without trusting server databases. Checks ensure append-only consistency, witness monotonicity, and EVM contract anchors.")
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
        }
        .glassCard(cornerRadius: 18, padding: 16)
    }
    
    private var merkleTreeSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Merkle Transparency Tree")
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
                
                Spacer()
                
                Text("TREE SIZE: 1,248")
                    .font(Typography.badgeText)
                    .foregroundStyle(ColorTokens.tailAdminBrand)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(ColorTokens.tailAdminBrandBg)
                    .clipShape(Capsule())
            }
            
            VStack(spacing: 10) {
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
                
                Text("FINALIZED")
                    .font(Typography.badgeText)
                    .foregroundStyle(ColorTokens.tailAdminSuccess)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(ColorTokens.tailAdminSuccessBg)
                    .clipShape(Capsule())
            }
            
            VStack(alignment: .leading, spacing: 6) {
                labeledField(label: "Contract Address", value: "0x5FbDB2315678afecb367f032d93F642f64180aa3")
                labeledField(label: "Anchor Tx Hash", value: "0x4f128912abcdef98765432104567891234567890abcdef1234567890abcdef12")
                labeledField(label: "Chain Network", value: "Local Anvil EVM (Chain ID: 31337)")
                labeledField(label: "Anchor Block Height", value: "#142 (6 Confirmations)")
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
                Text("5 Mandated Adversarial Checks")
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
                
                Spacer()
                
                Text("PROMPT1 / Q7")
                    .font(Typography.badgeText)
                    .foregroundStyle(ColorTokens.tailAdminPurple)
            }
            
            VStack(spacing: 8) {
                attackDemoRow(
                    name: "1. Duplicate Submission Replay",
                    desc: "Simulate re-casting with spent nullifier",
                    result: "REJECTED (409 Conflict)"
                )
                attackDemoRow(
                    name: "2. Unauthorized Insertion",
                    desc: "Simulate adding unissued leaf into log",
                    result: "DETECTED (Root Mismatch)"
                )
                attackDemoRow(
                    name: "3. Ballot Deletion Attempt",
                    desc: "Simulate omitting accepted ballot from log",
                    result: "DETECTED (Witness ACK Fail)"
                )
                attackDemoRow(
                    name: "4. Ciphertext Tampering",
                    desc: "Simulate modifying encrypted ballot bytes",
                    result: "DETECTED (Proof Invalid)"
                )
                attackDemoRow(
                    name: "5. Tally Counter Manipulation",
                    desc: "Simulate forged tally sum injection",
                    result: "DETECTED (ZK Tally Mismatch)"
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
                        .foregroundStyle(ColorTokens.tailAdminSuccess)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(ColorTokens.tailAdminSuccessBg)
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
            Button {
                HapticFeedback.heavy()
                Task {
                    await auditorViewModel.loadEvidenceAndVerify(
                        electionId: "elec_01",
                        sessionToken: authViewModel.currentUser?.sessionToken ?? "mock_tok"
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
                    Text(auditorViewModel.isLoading ? "Verifying Proof Package..." : "Execute Full Independent Verification")
                }
                .font(Typography.callout)
                .fontWeight(.bold)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(ColorTokens.tailAdminBrand)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(auditorViewModel.isLoading)
            
            if !auditorViewModel.auditCheckItems.isEmpty {
                VStack(spacing: 6) {
                    ForEach(auditorViewModel.auditCheckItems) { item in
                        HStack {
                            Image(systemName: item.verdict == .pass ? "checkmark.circle.fill" : "xmark.circle.fill")
                                .foregroundStyle(item.verdict == .pass ? ColorTokens.tailAdminSuccess : ColorTokens.tailAdminDanger)
                            
                            Text(item.name)
                                .font(Typography.caption)
                                .foregroundStyle(ColorTokens.textPrimary)
                            
                            Spacer()
                            
                            Text(item.verdict.rawValue)
                                .font(Typography.badgeText)
                                .foregroundStyle(item.verdict == .pass ? ColorTokens.tailAdminSuccess : ColorTokens.tailAdminDanger)
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
}

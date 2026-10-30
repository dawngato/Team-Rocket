import SwiftUI

public struct MerkleNodeDescriptor: Identifiable, Sendable {
    public let id: String
    public let title: String
    public let digest: String
    public let level: String
    public let isVerified: Bool
    
    public init(id: String, title: String, digest: String, level: String, isVerified: Bool) {
        self.id = id
        self.title = title
        self.digest = digest
        self.level = level
        self.isVerified = isVerified
    }
}

public struct MerkleAuditTreeCard: View {
    public let electionId: String
    public let leafIndex: Int
    public let leafHash: String?
    public let nullifierCommitment: String?
    public let rootHash: String?
    public let status: ReceiptStatus
    public let isInclusionVerified: Bool
    public let onInspectProof: (() -> Void)?
    
    @ScaledMetric(relativeTo: .body) private var iconSize: CGFloat = 20
    @ScaledMetric(relativeTo: .headline) private var nodeCircleSize: CGFloat = 36
    @ScaledMetric(relativeTo: .caption) private var connectorHeight: CGFloat = 22
    
    @State private var isExpanded: Bool = false
    
    public init(
        electionId: String,
        leafIndex: Int,
        leafHash: String? = nil,
        nullifierCommitment: String? = nil,
        rootHash: String? = nil,
        status: ReceiptStatus,
        isInclusionVerified: Bool = false,
        onInspectProof: (() -> Void)? = nil
    ) {
        self.electionId = electionId
        self.leafIndex = leafIndex
        self.leafHash = leafHash
        self.nullifierCommitment = nullifierCommitment
        self.rootHash = rootHash
        self.status = status
        self.isInclusionVerified = isInclusionVerified
        self.onInspectProof = onInspectProof
    }
    
    public var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            headerRow
            
            if isExpanded {
                treeFlowView
                    .transition(.asymmetric(
                        insertion: .opacity.combined(with: .scale(scale: 0.96)),
                        removal: .opacity
                    ))
            }
            
            actionsRow
        }
        .padding(16)
        .background(ColorTokens.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(
                    status == .anchored ? ColorTokens.stateSuccess.opacity(0.4) : ColorTokens.cardBorder,
                    lineWidth: status == .anchored ? 1.5 : 1
                )
        )
        .animation(SpringTokens.auditTransition, value: isExpanded)
        .animation(SpringTokens.fluid, value: status)
    }
    
    private var headerRow: some View {
        HStack {
            ZStack {
                Circle()
                    .fill(statusColor.opacity(0.12))
                    .frame(width: nodeCircleSize, height: nodeCircleSize)
                
                Image(systemName: "point.3.connected.trianglepath.dotted")
                    .font(.system(size: iconSize))
                    .foregroundStyle(statusColor)
            }
            
            VStack(alignment: .leading, spacing: 3) {
                Text("Merkle Audit Proof Path")
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
                
                Text("Log Position: Leaf #\(leafIndex)")
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.textSecondary)
            }
            
            Spacer()
            
            Button {
                HapticFeedback.light()
                isExpanded.toggle()
            } label: {
                Image(systemName: isExpanded ? "chevron.up.circle.fill" : "chevron.down.circle.fill")
                    .font(.system(size: iconSize))
                    .foregroundStyle(ColorTokens.brandAccent)
            }
            .accessibilityLabel(isExpanded ? "Collapse Merkle proof path" : "Expand Merkle proof path")
        }
    }
    
    private var treeFlowView: some View {
        VStack(alignment: .leading, spacing: 0) {
            merkleNodeRow(
                levelTitle: "Root Anchor",
                digestText: rootHash ?? "Awaiting authenticated witness root",
                badgeText: status == .anchored ? "Anchor reported" : "Witness pending",
                color: status == .anchored ? ColorTokens.stateAnchored : ColorTokens.stateWarning,
                isTerminal: false
            )
            
            connectorLine(isActive: status == .witnessed || status == .anchored)
            
            merkleNodeRow(
                levelTitle: "Witness Tree Checkpoint",
                digestText: isInclusionVerified ? "Computed root matches supplied witness root" : "Proof has not been verified on this device",
                badgeText: isInclusionVerified ? "Verified" : "Not checked",
                color: isInclusionVerified ? ColorTokens.stateSuccess : ColorTokens.stateWarning,
                isTerminal: false
            )
            
            connectorLine(isActive: true)
            
            merkleNodeRow(
                levelTitle: "Cast Ballot Leaf #\(leafIndex)",
                digestText: leafHash ?? nullifierCommitment ?? "Awaiting authenticated leaf digest",
                badgeText: isInclusionVerified ? "Included" : "Not proven",
                color: isInclusionVerified ? ColorTokens.stateSuccess : ColorTokens.stateWarning,
                isTerminal: true
            )
        }
        .padding(.vertical, 8)
    }
    
    private func merkleNodeRow(
        levelTitle: String,
        digestText: String,
        badgeText: String,
        color: Color,
        isTerminal: Bool
    ) -> some View {
        HStack(alignment: .top, spacing: 12) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.15))
                    .frame(width: 24, height: 24)
                
                Circle()
                    .fill(color)
                    .frame(width: 10, height: 10)
                    .beaconPulse(color: color, isActive: isTerminal && status == .anchored)
            }
            .padding(.top, 2)
            
            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Text(levelTitle)
                        .font(Typography.bodyBold)
                        .foregroundStyle(ColorTokens.textPrimary)
                    
                    Spacer()
                    
                    Text(badgeText.uppercased())
                        .font(Typography.badgeText)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .foregroundStyle(color)
                        .background(color.opacity(0.12))
                        .clipShape(Capsule())
                }
                
                Text(digestText)
                    .font(Typography.cryptographicDigest)
                    .foregroundStyle(ColorTokens.textTertiary)
                    .lineLimit(1)
                    .truncationMode(.middle)
            }
        }
    }
    
    private func connectorLine(isActive: Bool) -> some View {
        HStack {
            Rectangle()
                .fill(isActive ? ColorTokens.brandAccent.opacity(0.5) : ColorTokens.cardBorder)
                .frame(width: 2, height: connectorHeight)
                .padding(.leading, 11)
            Spacer()
        }
    }
    
    private var actionsRow: some View {
        HStack {
            if let onInspect = onInspectProof {
                Button {
                    HapticFeedback.medium()
                    onInspect()
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "magnifyingglass")
                        Text("Inspect Cryptographic Proof")
                    }
                    .font(Typography.captionBold)
                    .foregroundStyle(ColorTokens.brandAccent)
                }
            }
            
            Spacer()
            
            ReceiptStatusBadge(status: status)
        }
        .padding(.top, 4)
    }
    
    private var statusColor: Color {
        switch status {
        case .committedPendingWitness:
            return ColorTokens.stateWarning
        case .witnessed:
            return ColorTokens.stateWitnessed
        case .anchored:
            return ColorTokens.stateAnchored
        case .rejected:
            return ColorTokens.stateDanger
        }
    }
}

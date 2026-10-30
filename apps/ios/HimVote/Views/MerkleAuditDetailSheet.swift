import SwiftUI

public struct MerkleAuditDetailSheet: View {
    public let checkItem: AuditCheckItem
    public let evidencePackage: EvidencePackage?
    
    @Environment(\.dismiss) private var dismiss
    @State private var hasCopied: Bool = false
    @ScaledMetric(relativeTo: .body) private var iconSize: CGFloat = 20
    @ScaledMetric(relativeTo: .title) private var headerCircleSize: CGFloat = 64
    
    public init(checkItem: AuditCheckItem, evidencePackage: EvidencePackage? = nil) {
        self.checkItem = checkItem
        self.evidencePackage = evidencePackage
    }
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    headerView
                    
                    verdictSummaryCard
                    
                    evidenceDetailCard
                    
                    if let evidence = evidencePackage {
                        fullEvidenceCard(evidence: evidence)
                    }
                }
                .padding(20)
            }
            .navigationTitle("Audit Check Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        HapticFeedback.light()
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: iconSize))
                            .foregroundStyle(ColorTokens.textTertiary)
                    }
                    .accessibilityLabel("Dismiss audit check details")
                }
            }
        }
        .presentationDetents([.fraction(0.68), .large])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(24)
    }
    
    private var headerView: some View {
        VStack(spacing: 10) {
            ZStack {
                Circle()
                    .fill(verdictColor.opacity(0.12))
                    .frame(width: headerCircleSize, height: headerCircleSize)
                
                Image(systemName: checkItem.verdict == .pass ? "checkmark.shield.fill" : "xmark.shield.fill")
                    .resizable()
                    .scaledToFit()
                    .frame(width: headerCircleSize * 0.5, height: headerCircleSize * 0.5)
                    .foregroundStyle(verdictColor)
            }
            .padding(.top, 4)
            
            Text(checkItem.name)
                .font(Typography.sectionHeader)
                .foregroundStyle(ColorTokens.institutionalNavy)
                .multilineTextAlignment(.center)
            
            Text("Audit Verification Item: \(checkItem.id)")
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
        }
    }
    
    private var verdictSummaryCard: some View {
        HStack {
            VStack(alignment: .leading, spacing: 3) {
                Text("Verification Result")
                    .font(Typography.captionBold)
                    .foregroundStyle(ColorTokens.textSecondary)
                Text(checkItem.verdict == .pass ? "Cryptographically Sound" : "Verification Incomplete")
                    .font(Typography.bodyBold)
                    .foregroundStyle(ColorTokens.textPrimary)
            }
            
            Spacer()
            
            Text(checkItem.verdict.rawValue)
                .font(Typography.cardHeader)
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .foregroundStyle(verdictColor)
                .background(verdictBackground)
                .clipShape(Capsule())
        }
        .padding(16)
        .background(ColorTokens.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(verdictColor.opacity(0.3), lineWidth: 1)
        )
    }
    
    private var evidenceDetailCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Verification Audit Trail")
                .font(Typography.cardHeader)
                .foregroundStyle(ColorTokens.textPrimary)
            
            Text(checkItem.detail)
                .font(Typography.bodyRegular)
                .foregroundStyle(ColorTokens.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(ColorTokens.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(ColorTokens.cardBorder, lineWidth: 1)
        )
    }
    
    private func fullEvidenceCard(evidence: EvidencePackage) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Evidence Package References")
                .font(Typography.cardHeader)
                .foregroundStyle(ColorTokens.textPrimary)
            
            Divider()
            
            proofField(label: "Manifest SHA256", value: evidence.manifestDigest)
            proofField(label: "Witness Final Checkpoint", value: evidence.finalCheckpointDigest)
            proofField(label: "Ethereum Anchor Transaction", value: evidence.anchorTxHash)
            proofField(label: "Auditor Attestation", value: evidence.auditorSignature)
        }
        .padding(16)
        .background(ColorTokens.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(ColorTokens.cardBorder, lineWidth: 1)
        )
    }
    
    private func proofField(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
            
            Text(value)
                .font(Typography.cryptographicDigest)
                .foregroundStyle(ColorTokens.textTertiary)
                .lineLimit(1)
                .truncationMode(.middle)
        }
    }
    
    private var verdictColor: Color {
        switch checkItem.verdict {
        case .pass:
            return ColorTokens.stateSuccess
        case .fail:
            return ColorTokens.stateDanger
        case .unverifiable:
            return ColorTokens.stateWarning
        }
    }
    
    private var verdictBackground: Color {
        switch checkItem.verdict {
        case .pass:
            return ColorTokens.stateSuccessBackground
        case .fail:
            return ColorTokens.stateDangerBackground
        case .unverifiable:
            return ColorTokens.stateWarningBackground
        }
    }
}

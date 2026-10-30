import SwiftUI

public struct MerkleProofSheet: View {
    public let receipt: Receipt
    public let formattedJson: String?
    public let isInclusionVerified: Bool
    
    @Environment(\.dismiss) private var dismiss
    @State private var hasCopiedHandle: Bool = false
    @State private var hasCopiedNullifier: Bool = false
    @ScaledMetric(relativeTo: .body) private var iconSize: CGFloat = 20
    @ScaledMetric(relativeTo: .title) private var headerCircleSize: CGFloat = 64
    
    public init(
        receipt: Receipt,
        formattedJson: String? = nil,
        isInclusionVerified: Bool = false
    ) {
        self.receipt = receipt
        self.formattedJson = formattedJson
        self.isInclusionVerified = isInclusionVerified
    }
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    headerView
                    
                    merkleInclusionCard
                    
                    cryptographicCommitmentsCard
                    
                    if let json = formattedJson {
                        exportActionsCard(json: json)
                    }
                }
                .padding(20)
            }
            .navigationTitle("Merkle Proof Inspector")
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
                    .accessibilityLabel("Dismiss Merkle proof inspector")
                }
            }
        }
        .presentationDetents([.fraction(0.72), .large])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(24)
    }
    
    private var headerView: some View {
        VStack(spacing: 10) {
            ZStack {
                Circle()
                    .fill(ColorTokens.brandAccent.opacity(0.12))
                    .frame(width: headerCircleSize, height: headerCircleSize)
                
                Image(systemName: "point.3.connected.trianglepath.dotted")
                    .resizable()
                    .scaledToFit()
                    .frame(width: headerCircleSize * 0.5, height: headerCircleSize * 0.5)
                    .foregroundStyle(ColorTokens.brandAccent)
            }
            .padding(.top, 4)
            
            Text("Merkle Inclusion Verification")
                .font(Typography.sectionHeader)
                .foregroundStyle(ColorTokens.institutionalNavy)
            
            ReceiptStatusBadge(status: receipt.status)

            Text(isInclusionVerified
                ? "Computed root matches the supplied witness root. Independently trust the witness key before treating this as final audit evidence."
                : "This screen shows supplied receipt fields. Inclusion is not verified until the local proof check passes.")
                .font(Typography.caption)
                .foregroundStyle(isInclusionVerified ? ColorTokens.stateSuccess : ColorTokens.stateWarning)
                .multilineTextAlignment(.center)
        }
    }
    
    private var merkleInclusionCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Inclusion Log Details")
                .font(Typography.cardHeader)
                .foregroundStyle(ColorTokens.textPrimary)
            
            Divider()
            
            metricRow(title: "Leaf Log Position", value: "Position #\(receipt.leafIndex)")
            metricRow(title: "Election Identifier", value: receipt.electionId)
            
            if let witnessedAt = receipt.witnessedAtUtc {
                metricRow(title: "Witness Attestation Time", value: witnessedAt)
            }
            
            if let leafHash = receipt.leafHash {
                metricRow(title: "SHA256 Leaf Digest", value: leafHash)
            }

            if let treeSize = receipt.treeSize {
                metricRow(title: "Authenticated Tree Size", value: "\(treeSize) leaves")
            }

            if let merkleRoot = receipt.merkleRoot {
                metricRow(title: "Supplied Witness Root", value: merkleRoot)
            }

            if let proofCount = receipt.merkleProof?.count {
                metricRow(title: "Sibling Digests", value: "\(proofCount) supplied")
            }
        }
        .padding(16)
        .background(ColorTokens.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(ColorTokens.cardBorder, lineWidth: 1)
        )
    }
    
    private func metricRow(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
            Text(value)
                .font(Typography.bodyBold)
                .foregroundStyle(ColorTokens.textPrimary)
        }
    }
    
    private var cryptographicCommitmentsCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Cryptographic Commitments")
                .font(Typography.cardHeader)
                .foregroundStyle(ColorTokens.textPrimary)
            
            Divider()
            
            commitmentField(
                label: "Receipt Handle",
                value: receipt.handle,
                isCopied: hasCopiedHandle
            ) {
                #if canImport(UIKit)
                UIPasteboard.general.string = receipt.handle
                #endif
                HapticFeedback.success()
                hasCopiedHandle = true
                Task {
                    try? await Task.sleep(nanoseconds: 2_000_000_000)
                    hasCopiedHandle = false
                }
            }
            
            if let nullifier = receipt.nullifierCommitment {
                commitmentField(
                    label: "Nullifier Commitment",
                    value: nullifier,
                    isCopied: hasCopiedNullifier
                ) {
                    #if canImport(UIKit)
                    UIPasteboard.general.string = nullifier
                    #endif
                    HapticFeedback.success()
                    hasCopiedNullifier = true
                    Task {
                        try? await Task.sleep(nanoseconds: 2_000_000_000)
                        hasCopiedNullifier = false
                    }
                }
            }
        }
        .padding(16)
        .background(ColorTokens.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(ColorTokens.cardBorder, lineWidth: 1)
        )
    }
    
    private func commitmentField(
        label: String,
        value: String,
        isCopied: Bool,
        copyAction: @escaping () -> Void
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(label)
                    .font(Typography.captionBold)
                    .foregroundStyle(ColorTokens.textSecondary)
                Spacer()
                Button(action: copyAction) {
                    HStack(spacing: 4) {
                        Image(systemName: isCopied ? "checkmark" : "doc.on.doc")
                        Text(isCopied ? "Copied" : "Copy")
                    }
                    .font(Typography.badgeText)
                    .foregroundStyle(isCopied ? ColorTokens.stateSuccess : ColorTokens.brandAccent)
                }
            }
            
            Text(value)
                .font(Typography.cryptographicDigest)
                .foregroundStyle(ColorTokens.textPrimary)
                .textSelection(.enabled)
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(ColorTokens.backgroundPrimary)
                .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }
    
    private func exportActionsCard(json: String) -> some View {
        ShareLink(item: json) {
            HStack(spacing: 8) {
                Image(systemName: "square.and.arrow.up")
                Text("Share Proof Evidence JSON")
            }
            .font(Typography.cardHeader)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(ColorTokens.brandPrimary)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: ColorTokens.brandPrimary.opacity(0.25), radius: 6, x: 0, y: 3)
        }
        .simultaneousGesture(TapGesture().onEnded {
            HapticFeedback.light()
        })
    }
}

import SwiftUI

public struct ManifestInspectorSheet: View {
    public let election: Election
    
    @Environment(\.dismiss) private var dismiss
    @State private var hasCopied: Bool = false
    @ScaledMetric(relativeTo: .body) private var iconSize: CGFloat = 20
    
    public init(election: Election) {
        self.election = election
    }
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    headerBadge
                    
                    digestCard
                    
                    parametersCard
                    
                    securityGuaranteeNotice
                }
                .padding(20)
            }
            .navigationTitle("Manifest Inspector")
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
                    .accessibilityLabel("Dismiss manifest inspector")
                }
            }
        }
        .presentationDetents([.fraction(0.65), .large])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(24)
    }
    
    private var headerBadge: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(ColorTokens.brandAccent.opacity(0.12))
                    .frame(width: 60, height: 60)
                
                Image(systemName: "doc.text.below.ecg.fill")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 30, height: 30)
                    .foregroundStyle(ColorTokens.brandAccent)
            }
            .padding(.top, 4)
            
            Text("Cryptographic Manifest")
                .font(Typography.cardHeader)
                .foregroundStyle(ColorTokens.institutionalNavy)
            
            Text(election.title)
                .font(Typography.callout)
                .foregroundStyle(ColorTokens.textSecondary)
                .multilineTextAlignment(.center)
        }
    }
    
    private var digestCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Manifest SHA256 Digest")
                    .font(Typography.captionBold)
                    .foregroundStyle(ColorTokens.textSecondary)
                
                Spacer()
                
                Button {
                    #if canImport(UIKit)
                    UIPasteboard.general.string = election.manifestDigest
                    #endif
                    HapticFeedback.success()
                    hasCopied = true
                    Task {
                        try? await Task.sleep(nanoseconds: 2_000_000_000)
                        hasCopied = false
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: hasCopied ? "checkmark" : "doc.on.doc")
                        Text(hasCopied ? "Copied" : "Copy Digest")
                    }
                    .font(Typography.badgeText)
                    .foregroundStyle(hasCopied ? ColorTokens.stateSuccess : ColorTokens.brandAccent)
                }
            }
            
            Text(election.manifestDigest)
                .font(Typography.cryptographicDigest)
                .foregroundStyle(ColorTokens.textPrimary)
                .textSelection(.enabled)
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(ColorTokens.backgroundPrimary)
                .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .padding(16)
        .background(ColorTokens.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(ColorTokens.cardBorder, lineWidth: 1)
        )
    }
    
    private var parametersCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Election Parameters")
                .font(Typography.cardHeader)
                .foregroundStyle(ColorTokens.textPrimary)
            
            Divider()
            
            if let contest = election.contest {
                parameterRow(label: "Contest Division", value: contest)
            }
            
            if let count = election.eligibleCount {
                parameterRow(label: "Eligible Electorate", value: "\(count) registered voters")
            }
            
            if let rule = election.selectionRule {
                parameterRow(label: "Selection Rule", value: rule)
            }
            
            parameterRow(label: "Voting Starts (UTC)", value: election.opensAtUtc)
            parameterRow(label: "Voting Closes (UTC)", value: election.closesAtUtc)
            parameterRow(label: "Credential Cutoff (UTC)", value: election.issuanceCutoffUtc)
        }
        .padding(16)
        .background(ColorTokens.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(ColorTokens.cardBorder, lineWidth: 1)
        )
    }
    
    private func parameterRow(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
            Text(value)
                .font(Typography.captionBold)
                .foregroundStyle(ColorTokens.textPrimary)
        }
    }
    
    private var securityGuaranteeNotice: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "checkmark.seal.fill")
                .foregroundStyle(ColorTokens.stateSuccess)
            
            Text("This manifest digest is immutably anchored into the Merkle log prior to credential issuance, preventing administrative alteration of contest rules.")
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
        }
        .padding(14)
        .background(ColorTokens.stateSuccessBackground.opacity(0.6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

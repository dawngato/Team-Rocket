import SwiftUI

public struct ElectionGuidelinesSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ScaledMetric(relativeTo: .body) private var iconSize: CGFloat = 20
    @ScaledMetric(relativeTo: .title) private var headerCircleSize: CGFloat = 64
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 22) {
                    headerView
                    
                    stepsSection
                    
                    faqSection
                }
                .padding(20)
            }
            .navigationTitle("Voter Guidelines")
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
                    .accessibilityLabel("Dismiss voter guidelines")
                }
            }
        }
        .presentationDetents([.fraction(0.65), .large])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(24)
    }
    
    private var headerView: some View {
        VStack(spacing: 10) {
            ZStack {
                Circle()
                    .fill(ColorTokens.brandPrimary.opacity(0.12))
                    .frame(width: headerCircleSize, height: headerCircleSize)
                
                Image(systemName: "checklist.checked")
                    .resizable()
                    .scaledToFit()
                    .frame(width: headerCircleSize * 0.5, height: headerCircleSize * 0.5)
                    .foregroundStyle(ColorTokens.brandAccent)
            }
            .padding(.top, 4)
            
            Text("Institutional Voting Process")
                .font(Typography.sectionHeader)
                .foregroundStyle(ColorTokens.institutionalNavy)
            
            Text("Follow these three steps to vote securely")
                .font(Typography.callout)
                .foregroundStyle(ColorTokens.textSecondary)
        }
    }
    
    private var stepsSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            guidelineStepRow(
                number: "1",
                title: "Obtain Blind Credential",
                detail: "Generate a cryptographic authorization token locally. Your identity issuer signs it without discovering your ballot selection."
            )
            
            guidelineStepRow(
                number: "2",
                title: "Cast Inside Sandboxed Booth",
                detail: "Review candidates and submit your choice in an isolated ephemeral session. Encryption happens strictly inside the browser sandbox."
            )
            
            guidelineStepRow(
                number: "3",
                title: "Track Merkle Inclusion",
                detail: "Receive a unique cryptographic receipt handle. Track the status from outbox commit to independent witness signing and smart contract anchoring."
            )
        }
    }
    
    private func guidelineStepRow(number: String, title: String, detail: String) -> some View {
        HStack(alignment: .top, spacing: 14) {
            ZStack {
                Circle()
                    .fill(ColorTokens.brandPrimary)
                    .frame(width: 32, height: 32)
                
                Text(number)
                    .font(Typography.captionBold)
                    .foregroundStyle(.white)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(Typography.bodyBold)
                    .foregroundStyle(ColorTokens.textPrimary)
                
                Text(detail)
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(14)
        .background(ColorTokens.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(ColorTokens.cardBorder, lineWidth: 1)
        )
    }
    
    private var faqSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Privacy Guarantee")
                .font(Typography.captionBold)
                .foregroundStyle(ColorTokens.textSecondary)
            
            Text("Ballot choices cannot be traced back to student records. Even system administrators cannot uncover voter candidate selections.")
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textTertiary)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(ColorTokens.backgroundSecondary.opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

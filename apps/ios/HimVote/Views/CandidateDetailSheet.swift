import SwiftUI

public struct CandidateDetailSheet: View {
    public let candidate: Candidate
    public let contest: String?
    public let electionTitle: String
    
    @Environment(\.dismiss) private var dismiss
    @ScaledMetric(relativeTo: .title) private var avatarSize: CGFloat = 72
    @ScaledMetric(relativeTo: .body) private var iconSize: CGFloat = 20
    
    public init(candidate: Candidate, contest: String? = nil, electionTitle: String) {
        self.candidate = candidate
        self.contest = contest
        self.electionTitle = electionTitle
    }
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 22) {
                    profileHeader
                    
                    contestSummaryCard
                    
                    platformStatementCard
                    
                    cryptographicIdentityCard
                }
                .padding(20)
            }
            .navigationTitle("Candidate Profile")
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
                    .accessibilityLabel("Dismiss candidate profile")
                }
            }
        }
        .presentationDetents([.fraction(0.6), .large])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(24)
    }
    
    private var profileHeader: some View {
        VStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(ColorTokens.brandPrimary.opacity(0.12))
                    .frame(width: avatarSize, height: avatarSize)
                
                Image(systemName: "person.crop.circle.fill")
                    .resizable()
                    .scaledToFit()
                    .frame(width: avatarSize * 0.75, height: avatarSize * 0.75)
                    .foregroundStyle(ColorTokens.brandPrimary)
            }
            .padding(.top, 8)
            
            Text(candidate.name)
                .font(Typography.sectionHeader)
                .foregroundStyle(ColorTokens.textPrimary)
                .multilineTextAlignment(.center)
            
            Text(candidate.contest)
                .font(Typography.callout)
                .foregroundStyle(ColorTokens.brandAccent)
                .multilineTextAlignment(.center)
        }
    }
    
    private var contestSummaryCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Election Context")
                    .font(Typography.captionBold)
                    .foregroundStyle(ColorTokens.textSecondary)
                Spacer()
                Text("Official Nominee")
                    .font(Typography.badgeText)
                    .foregroundStyle(ColorTokens.stateSuccess)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(ColorTokens.stateSuccessBackground)
                    .clipShape(Capsule())
            }
            
            Text(electionTitle)
                .font(Typography.bodyBold)
                .foregroundStyle(ColorTokens.textPrimary)
        }
        .padding(16)
        .background(ColorTokens.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(ColorTokens.cardBorder, lineWidth: 1)
        )
    }
    
    private var platformStatementCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "quote.opening")
                    .foregroundStyle(ColorTokens.brandAccent)
                Text("Institutional Platform Statement")
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
            }
            
            Text("Committed to student welfare, academic transparency, institutional representation, and cryptographic ballot integrity across university governance.")
                .font(Typography.bodyRegular)
                .foregroundStyle(ColorTokens.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(16)
        .background(ColorTokens.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(ColorTokens.cardBorder, lineWidth: 1)
        )
    }
    
    private var cryptographicIdentityCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "key.viewfinder")
                    .foregroundStyle(ColorTokens.textTertiary)
                Text("Nominee Identifier")
                    .font(Typography.captionBold)
                    .foregroundStyle(ColorTokens.textSecondary)
                Spacer()
                Button {
                    HapticFeedback.light()
                    #if canImport(UIKit)
                    UIPasteboard.general.string = candidate.id
                    #endif
                } label: {
                    Image(systemName: "doc.on.doc")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.brandAccent)
                }
                .accessibilityLabel("Copy candidate identifier")
            }
            
            Text(candidate.id)
                .font(Typography.cryptographicDigest)
                .foregroundStyle(ColorTokens.textTertiary)
                .textSelection(.enabled)
        }
        .padding(14)
        .background(ColorTokens.backgroundSecondary.opacity(0.6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(ColorTokens.cardBorder, lineWidth: 1)
        )
    }
}

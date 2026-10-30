import SwiftUI

public struct StudentReceiptPortalView: View {
    @State private var votingViewModel: VotingViewModel

    public init(votingViewModel: VotingViewModel) {
        _votingViewModel = State(initialValue: votingViewModel)
    }

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if let receipt = votingViewModel.latestReceipt {
                        receiptCard(receipt)
                    } else {
                        ContentUnavailableView(
                            "No receipt yet",
                            systemImage: "doc.text",
                            description: Text("After you cast a ballot, its inclusion receipt will appear here.")
                        )
                        .frame(maxWidth: .infinity, minHeight: 300)
                    }
                }
                .padding(16)
            }
            .background(ColorTokens.tailAdminLightBg)
            .navigationTitle("My Receipt")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func receiptCard(_ receipt: Receipt) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Ballot inclusion")
                        .font(Typography.cardHeader)
                        .foregroundStyle(ColorTokens.textPrimary)
                    Text("This receipt does not show your selection.")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
                Spacer(minLength: 8)
                ReceiptStatusBadge(status: receipt.status)
            }

            Divider()

            receiptValue(title: "Receipt handle", value: receipt.handle)
            receiptValue(title: "Election", value: receipt.electionId)
            receiptValue(title: "Merkle leaf", value: "#\(receipt.leafIndex)")

            NavigationLink {
                ReceiptView(electionId: receipt.electionId, receiptHandle: receipt.handle)
            } label: {
                Label("Verify inclusion", systemImage: "checkmark.shield")
                    .font(Typography.callout)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(ColorTokens.tailAdminBrand)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .glassCard(cornerRadius: 18, padding: 16)
    }

    private func receiptValue(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
            Text(value)
                .font(Typography.cryptographicDigest)
                .foregroundStyle(ColorTokens.tailAdminBrand)
                .textSelection(.enabled)
        }
    }
}

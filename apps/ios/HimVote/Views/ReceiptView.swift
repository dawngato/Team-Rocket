import SwiftUI

public struct ReceiptView: View {
    public let electionId: String
    public let receiptHandle: String
    @State private var receiptViewModel = ReceiptViewModel()
    
    public init(electionId: String, receiptHandle: String) {
        self.electionId = electionId
        self.receiptHandle = receiptHandle
    }
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                VStack(spacing: 8) {
                    Image(systemName: "doc.text.magnifyingglass")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 50, height: 50)
                        .foregroundStyle(ColorTokens.brandPrimary)
                    
                    Text("Cryptographic Receipt")
                        .font(Typography.sectionHeader)
                        .foregroundStyle(ColorTokens.institutionalNavy)
                    
                    Text("Inclusion Tracking in Merkle Log")
                        .font(Typography.callout)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
                .padding(.top, 20)
                
                VStack(spacing: 16) {
                    HStack {
                        Text("Current State")
                            .font(Typography.bodyBold)
                        
                        Spacer()
                        
                        if let receipt = receiptViewModel.receipt {
                            ReceiptStatusBadge(status: receipt.status)
                        } else {
                            ProgressView()
                        }
                    }
                    
                    Divider()
                    
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Receipt Handle")
                            .font(Typography.captionBold)
                            .foregroundStyle(ColorTokens.textSecondary)
                        
                        Text(receiptHandle)
                            .font(Typography.receiptHandle)
                            .foregroundStyle(ColorTokens.brandAccent)
                            .textSelection(.enabled)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    
                    if let leafIndex = receiptViewModel.receipt?.leafIndex {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Merkle Leaf Index")
                                .font(Typography.captionBold)
                                .foregroundStyle(ColorTokens.textSecondary)
                            
                            Text("Position #\(leafIndex)")
                                .font(Typography.bodyBold)
                                .foregroundStyle(ColorTokens.textPrimary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    
                    if let witnessedAt = receiptViewModel.receipt?.witnessedAtUtc {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Witnessed Timestamp (UTC)")
                                .font(Typography.captionBold)
                                .foregroundStyle(ColorTokens.textSecondary)
                            
                            Text(witnessedAt)
                                .font(Typography.caption)
                                .foregroundStyle(ColorTokens.textPrimary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .padding()
                .background(ColorTokens.backgroundSecondary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                
                VStack(alignment: .leading, spacing: 14) {
                    Text("Receipt Lifecycle Progression")
                        .font(Typography.cardHeader)
                        .foregroundStyle(ColorTokens.textPrimary)
                    
                    VStack(alignment: .leading, spacing: 12) {
                        LifecycleStepRow(
                            stepNumber: "1",
                            title: "Committed to Outbox",
                            subtitle: "Ballot ciphertext accepted by casting origin",
                            isCompleted: true
                        )
                        
                        LifecycleStepRow(
                            stepNumber: "2",
                            title: "Witnessed in Merkle Log",
                            subtitle: "Signed by independent witness organization",
                            isCompleted: receiptViewModel.receipt?.status == .witnessed || receiptViewModel.receipt?.status == .anchored
                        )
                        
                        LifecycleStepRow(
                            stepNumber: "3",
                            title: "Anchored on Blockchain",
                            subtitle: "Final root published to Ethereum smart contract",
                            isCompleted: receiptViewModel.receipt?.status == .anchored
                        )
                    }
                }
                .padding()
                .background(ColorTokens.backgroundSecondary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                
                if receiptViewModel.isPolling {
                    HStack(spacing: 8) {
                        ProgressView()
                        Text("Polling witness service for confirmation...")
                            .font(Typography.caption)
                            .foregroundStyle(ColorTokens.textSecondary)
                    }
                    .padding()
                }
                
                if let receiptJson = receiptViewModel.formatReceiptJson() {
                    ShareLink(item: receiptJson) {
                        HStack {
                            Image(systemName: "square.and.arrow.up")
                            Text("Export Receipt JSON")
                        }
                        .font(Typography.cardHeader)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(ColorTokens.brandPrimary)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .accessibilityLabel("Export cryptographic receipt JSON")
                }
            }
            .padding()
        }
        .navigationTitle("Receipt")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            receiptViewModel.loadReceipt(handle: receiptHandle, electionId: electionId)
            receiptViewModel.startPollingReceiptStatus(electionId: electionId, handle: receiptHandle)
        }
        .onDisappear {
            receiptViewModel.stopPolling()
        }
    }
}

public struct LifecycleStepRow: View {
    public let stepNumber: String
    public let title: String
    public let subtitle: String
    public let isCompleted: Bool
    
    public init(stepNumber: String, title: String, subtitle: String, isCompleted: Bool) {
        self.stepNumber = stepNumber
        self.title = title
        self.subtitle = subtitle
        self.isCompleted = isCompleted
    }
    
    public var body: some View {
        HStack(alignment: .top, spacing: 12) {
            ZStack {
                Circle()
                    .fill(isCompleted ? ColorTokens.stateSuccess : ColorTokens.stateNeutral.opacity(0.3))
                    .frame(width: 28, height: 28)
                
                if isCompleted {
                    Image(systemName: "checkmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(.white)
                } else {
                    Text(stepNumber)
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(Typography.bodyBold)
                    .foregroundStyle(ColorTokens.textPrimary)
                
                Text(subtitle)
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.textSecondary)
            }
        }
    }
}

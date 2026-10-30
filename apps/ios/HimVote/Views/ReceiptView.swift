import SwiftUI

public struct ReceiptView: View {
    public let electionId: String
    public let receiptHandle: String
    @State private var receiptViewModel = ReceiptViewModel()
    @State private var handleCopied: Bool = false
    
    public init(electionId: String, receiptHandle: String) {
        self.electionId = electionId
        self.receiptHandle = receiptHandle
    }
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 22) {
                headerView
                
                receiptDetailsCard
                
                lifecycleTrackerCard
                
                pollingStatusSection
                
                exportActionsSection
            }
            .padding(16)
        }
        .navigationTitle("Receipt")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    receiptViewModel.startPollingReceiptStatus(electionId: electionId, handle: receiptHandle)
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .foregroundStyle(ColorTokens.brandPrimary)
                }
                .accessibilityLabel("Refresh receipt status")
            }
        }
        .onAppear {
            receiptViewModel.loadReceipt(handle: receiptHandle, electionId: electionId)
            receiptViewModel.startPollingReceiptStatus(electionId: electionId, handle: receiptHandle)
        }
        .onDisappear {
            receiptViewModel.stopPolling()
        }
    }
    
    private var headerView: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(ColorTokens.brandPrimary.opacity(0.12))
                    .frame(width: 72, height: 72)
                
                Image(systemName: "doc.text.magnifyingglass")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 38, height: 38)
                    .foregroundStyle(ColorTokens.brandPrimary)
            }
            .accessibilityHidden(true)
            .padding(.top, 12)
            
            Text("Cryptographic Receipt")
                .font(Typography.sectionHeader)
                .foregroundStyle(ColorTokens.institutionalNavy)
            
            Text("Inclusion Tracking in Public Merkle Log")
                .font(Typography.callout)
                .foregroundStyle(ColorTokens.textSecondary)
        }
    }
    
    private var receiptDetailsCard: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Verification State")
                    .font(Typography.bodyBold)
                    .foregroundStyle(ColorTokens.textPrimary)
                
                Spacer()
                
                if let receipt = receiptViewModel.receipt {
                    ReceiptStatusBadge(status: receipt.status)
                } else {
                    ProgressView()
                }
            }
            
            Divider()
            
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Receipt Handle")
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.textSecondary)
                    
                    Spacer()
                    
                    Button {
                        UIPasteboard.general.string = receiptHandle
                        handleCopied = true
                        Task {
                            try? await Task.sleep(nanoseconds: 2_000_000_000)
                            handleCopied = false
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: handleCopied ? "checkmark" : "doc.on.doc")
                            Text(handleCopied ? "Copied" : "Copy")
                        }
                        .font(Typography.badgeText)
                        .foregroundStyle(handleCopied ? ColorTokens.stateSuccess : ColorTokens.brandAccent)
                    }
                }
                
                Text(receiptHandle)
                    .font(Typography.receiptHandle)
                    .foregroundStyle(ColorTokens.brandAccent)
                    .textSelection(.enabled)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            
            if let leafIndex = receiptViewModel.receipt?.leafIndex {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Merkle Leaf Index")
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.textSecondary)
                    
                    Text("Position #\(leafIndex) in verifiable log")
                        .font(Typography.bodyBold)
                        .foregroundStyle(ColorTokens.textPrimary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            
            if let witnessedAt = receiptViewModel.receipt?.witnessedAtUtc {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Witnessed Timestamp (UTC)")
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.textSecondary)
                    
                    Text(witnessedAt)
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textPrimary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            
            if let nullifier = receiptViewModel.receipt?.nullifierCommitment {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Nullifier Commitment")
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.textSecondary)
                    
                    Text(nullifier)
                        .font(Typography.cryptographicDigest)
                        .foregroundStyle(ColorTokens.textTertiary)
                        .textSelection(.enabled)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(18)
        .background(ColorTokens.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(ColorTokens.cardBorder, lineWidth: 1)
        )
    }
    
    private var lifecycleTrackerCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Receipt Lifecycle Progression")
                .font(Typography.cardHeader)
                .foregroundStyle(ColorTokens.textPrimary)
            
            VStack(alignment: .leading, spacing: 14) {
                LifecycleStepRow(
                    stepNumber: "1",
                    title: "Committed to Outbox",
                    subtitle: "Ballot ciphertext accepted by casting origin",
                    isCompleted: true
                )
                
                let isWitnessed = receiptViewModel.receipt?.status == .witnessed || receiptViewModel.receipt?.status == .anchored
                LifecycleStepRow(
                    stepNumber: "2",
                    title: "Witnessed in Merkle Log",
                    subtitle: "Signed by independent witness organization",
                    isCompleted: isWitnessed
                )
                
                let isAnchored = receiptViewModel.receipt?.status == .anchored
                LifecycleStepRow(
                    stepNumber: "3",
                    title: "Anchored on Blockchain",
                    subtitle: "Final root published to Ethereum smart contract",
                    isCompleted: isAnchored
                )
            }
        }
        .padding(18)
        .background(ColorTokens.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(ColorTokens.cardBorder, lineWidth: 1)
        )
    }
    
    @ViewBuilder
    private var pollingStatusSection: some View {
        if receiptViewModel.isPolling {
            HStack(spacing: 10) {
                ProgressView()
                
                Text("Polling witness service for confirmation...")
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.textSecondary)
            }
            .padding(12)
            .frame(maxWidth: .infinity)
            .background(ColorTokens.backgroundSecondary.opacity(0.5))
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }
    
    @ViewBuilder
    private var exportActionsSection: some View {
        if let receiptJson = receiptViewModel.formatReceiptJson() {
            VStack(spacing: 10) {
                ShareLink(item: receiptJson) {
                    HStack(spacing: 8) {
                        Image(systemName: "square.and.arrow.up")
                        Text("Export Receipt JSON")
                    }
                    .font(Typography.cardHeader)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(ColorTokens.brandPrimary)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .shadow(color: ColorTokens.brandPrimary.opacity(0.3), radius: 6, x: 0, y: 3)
                }
                .accessibilityLabel("Export cryptographic receipt JSON button")
            }
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
        HStack(alignment: .top, spacing: 14) {
            ZStack {
                Circle()
                    .fill(isCompleted ? ColorTokens.stateSuccess : ColorTokens.stateNeutral.opacity(0.25))
                    .frame(width: 30, height: 30)
                
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
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(title), status: \(isCompleted ? "Completed" : "Pending")")
    }
}

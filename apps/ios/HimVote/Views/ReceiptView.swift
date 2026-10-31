import SwiftUI

public struct ReceiptView: View {
    public let electionId: String
    public let receiptHandle: String
    @State private var receiptViewModel = ReceiptViewModel()
    @State private var handleCopied: Bool = false
    @State private var showProofSheet: Bool = false
    
    @ScaledMetric(relativeTo: .title) private var headerCircleSize: CGFloat = 72
    @ScaledMetric(relativeTo: .title) private var headerIconSize: CGFloat = 38
    @ScaledMetric(relativeTo: .body) private var navIconSize: CGFloat = 20
    
    public init(electionId: String, receiptHandle: String) {
        self.electionId = electionId
        self.receiptHandle = receiptHandle
    }
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 22) {
                headerView
                
                receiptDetailsCard

                receiptErrorSection
                
                merkleAuditSection
                
                lifecycleTrackerCard
                
                pollingStatusSection
                
                exportActionsSection
            }
            .padding(16)
            .animation(SpringTokens.fluid, value: receiptViewModel.receipt?.status)
        }
        .navigationTitle("Receipt")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    HapticFeedback.medium()
                    receiptViewModel.startPollingReceiptStatus(electionId: electionId, handle: receiptHandle)
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: navIconSize))
                        .foregroundStyle(ColorTokens.brandPrimary)
                }
                .accessibilityLabel("Refresh receipt status")
            }
        }
        .sheet(isPresented: $showProofSheet) {
            if let receipt = receiptViewModel.receipt {
                MerkleProofSheet(
                    receipt: receipt,
                    formattedJson: receiptViewModel.formatReceiptJson(),
                    isInclusionVerified: receiptViewModel.inclusionStatus.isVerified
                )
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
                    .frame(width: headerCircleSize, height: headerCircleSize)
                
                Image(systemName: "doc.text.magnifyingglass")
                    .resizable()
                    .scaledToFit()
                    .frame(width: headerIconSize, height: headerIconSize)
                    .foregroundStyle(ColorTokens.brandPrimary)
            }
            .accessibilityHidden(true)
            .padding(.top, 12)
            
            Text("Cryptographic Receipt")
                .font(Typography.sectionHeader)
                .foregroundStyle(ColorTokens.institutionalNavy)
            
            Text("Receipt and Merkle Proof Status")
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

            HStack(alignment: .top, spacing: 8) {
                Image(systemName: inclusionStatusIcon)
                    .foregroundStyle(inclusionStatusColor)
                    .accessibilityHidden(true)
                Text(inclusionStatusDescription)
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.textSecondary)
                    .multilineTextAlignment(.leading)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            
            Divider()
            
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Receipt Handle")
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.textSecondary)
                    
                    Spacer()
                    
                    Button {
                        #if canImport(UIKit)
                        UIPasteboard.general.string = receiptHandle
                        #endif
                        HapticFeedback.success()
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

    @ViewBuilder
    private var receiptErrorSection: some View {
        if let errorMessage = receiptViewModel.errorMessage {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(ColorTokens.stateDanger)
                        .accessibilityHidden(true)
                    Text(errorMessage)
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.stateDanger)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Button {
                    receiptViewModel.startPollingReceiptStatus(
                        electionId: electionId,
                        handle: receiptHandle
                    )
                } label: {
                    Text("Retry Status Check")
                        .font(Typography.captionBold)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(ColorTokens.stateDanger)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .accessibilityLabel("Retry receipt status check")
            }
            .padding(14)
            .background(ColorTokens.stateDangerBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(ColorTokens.stateDanger.opacity(0.3), lineWidth: 1)
            )
        }
    }
    
    private var merkleAuditSection: some View {
        Group {
            if let receipt = receiptViewModel.receipt {
                MerkleAuditTreeCard(
                    electionId: electionId,
                    leafIndex: receipt.leafIndex,
                    leafHash: receipt.leafHash,
                    nullifierCommitment: receipt.nullifierCommitment,
                    rootHash: receipt.merkleRoot,
                    status: receipt.status,
                    isInclusionVerified: receiptViewModel.inclusionStatus.isVerified
                ) {
                    HapticFeedback.light()
                    showProofSheet = true
                }
            }
        }
    }

    private var inclusionStatusIcon: String {
        switch receiptViewModel.inclusionStatus {
        case .verified:
            return "checkmark.seal.fill"
        case .failed:
            return "xmark.octagon.fill"
        case .pending:
            return "clock.fill"
        case .notAvailable:
            return "questionmark.circle.fill"
        }
    }

    private var inclusionStatusColor: Color {
        switch receiptViewModel.inclusionStatus {
        case .verified:
            return ColorTokens.stateSuccess
        case .failed:
            return ColorTokens.stateDanger
        case .pending, .notAvailable:
            return ColorTokens.stateWarning
        }
    }

    private var inclusionStatusDescription: String {
        switch receiptViewModel.inclusionStatus {
        case .verified:
            return "Inclusion proof recomputed locally: the RFC 9162 root matches the supplied witness root. Independently trust the witness key before treating it as final audit evidence; this does not prove vote intent or tally correctness."
        case .failed(let reason):
            return "Inclusion verification failed: \(reason)"
        case .pending:
            return "Inclusion is not checked until a witness proof is available."
        case .notAvailable:
            return "A witnessed proof is not available yet. The current status is not proof of inclusion."
        }
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
                    isCompleted: receiptViewModel.receipt != nil,
                    completedColor: ColorTokens.stateAnchored,
                    statusLabel: "Recorded"
                )
                
                let isWitnessed = receiptViewModel.receipt?.status == .witnessed || receiptViewModel.receipt?.status == .anchored
                LifecycleStepRow(
                    stepNumber: "2",
                    title: "Witnessed in Merkle Log",
                    subtitle: "Witness checkpoint reported; independent trust still requires a pinned key",
                    isCompleted: isWitnessed,
                    completedColor: ColorTokens.stateWitnessed,
                    statusLabel: "Witness reported"
                )
                
                let isAnchored = receiptViewModel.receipt?.status == .anchored
                LifecycleStepRow(
                    stepNumber: "3",
                    title: "Blockchain Anchor Reported",
                    subtitle: "A chain anchor was reported; finality still requires independent verification",
                    isCompleted: isAnchored,
                    completedColor: ColorTokens.stateAnchored,
                    statusLabel: "Anchor reported"
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
            .transition(.opacity)
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
                .simultaneousGesture(TapGesture().onEnded {
                    HapticFeedback.light()
                })
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
    public let completedColor: Color
    public let statusLabel: String
    
    @ScaledMetric(relativeTo: .body) private var circleSize: CGFloat = 30
    @ScaledMetric(relativeTo: .caption) private var checkIconSize: CGFloat = 14
    
    public init(
        stepNumber: String,
        title: String,
        subtitle: String,
        isCompleted: Bool,
        completedColor: Color = ColorTokens.stateSuccess,
        statusLabel: String = "Completed"
    ) {
        self.stepNumber = stepNumber
        self.title = title
        self.subtitle = subtitle
        self.isCompleted = isCompleted
        self.completedColor = completedColor
        self.statusLabel = statusLabel
    }
    
    public var body: some View {
        HStack(alignment: .top, spacing: 14) {
            ZStack {
                Circle()
                    .fill(isCompleted ? completedColor : ColorTokens.stateNeutral.opacity(0.25))
                    .frame(width: circleSize, height: circleSize)
                    .beaconPulse(color: completedColor, isActive: isCompleted)
                
                if isCompleted {
                    Image(systemName: "checkmark")
                        .font(.system(size: checkIconSize, weight: .bold))
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
        .accessibilityLabel("\(title), status: \(isCompleted ? statusLabel : "Pending")")
    }
}

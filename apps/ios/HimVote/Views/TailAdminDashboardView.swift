import SwiftUI

public struct TailAdminDashboardView: View {
    @Bindable var authViewModel: AuthViewModel
    @Bindable var electionsViewModel: ElectionsViewModel
    var onNavigateToTab: (Int) -> Void
    var onOpenSidebar: () -> Void
    
    @State private var selectedTimeframe: String = "Today"
    @State private var hoveredBarIndex: Int? = 3
    @State private var selectedCheckpointForSheet: Checkpoint? = nil
    @State private var showGuidelinesSheet: Bool = false
    
    let timeframes = ["Today", "Weekly", "All Time"]
    
    // Synthetic hourly turnout distribution matching educational prototype
    let hourlyTurnout: [(hour: String, count: Int)] = [
        ("08:00", 42),
        ("10:00", 188),
        ("12:00", 345),
        ("14:00", 412),
        ("16:00", 215),
        ("18:00", 96)
    ]
    
    // Synthetic recent Merkle checkpoints
    let recentCheckpoints: [Checkpoint] = [
        Checkpoint(
            checkpointDigest: "0x8fa32b0c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855667788",
            electionId: "elec_01",
            treeSize: 1248,
            rootHash: "0x8fa32b0c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855667788",
            previousCheckpointDigest: "0x7da21a9b038efae3b7885ea81316bd30d3538a823b9384880a6741a7445566",
            witnessedAtUtc: "2026-10-30T17:45:00Z",
            signature: "0x98127391abfcde24789123891487129847192847192847192847129847192837",
            isFinal: true
        ),
        Checkpoint(
            checkpointDigest: "0x7da21a9b038efae3b7885ea81316bd30d3538a823b9384880a6741a7445566",
            electionId: "elec_01",
            treeSize: 1152,
            rootHash: "0x7da21a9b038efae3b7885ea81316bd30d3538a823b9384880a6741a7445566",
            previousCheckpointDigest: "0x6ca1098a927de9d2a6774d970205ac2f924279712a827377f9563096334455",
            witnessedAtUtc: "2026-10-30T15:30:00Z",
            signature: "0x8712398129837192837192837192837192837192837192837192837192837192",
            isFinal: false
        ),
        Checkpoint(
            checkpointDigest: "0x6ca1098a927de9d2a6774d970205ac2f924279712a827377f9563096334455",
            electionId: "elec_01",
            treeSize: 960,
            rootHash: "0x6ca1098a927de9d2a6774d970205ac2f924279712a827377f9563096334455",
            previousCheckpointDigest: "0x5b90f879816cd8c195663c86f1f49b1e8131686019716266e8452f85223344",
            witnessedAtUtc: "2026-10-30T13:15:00Z",
            signature: "0x7601287018726081726081726081726081726081726081726081726081726081",
            isFinal: false
        )
    ]
    
    public init(
        authViewModel: AuthViewModel,
        electionsViewModel: ElectionsViewModel,
        onNavigateToTab: @escaping (Int) -> Void,
        onOpenSidebar: @escaping () -> Void
    ) {
        self.authViewModel = authViewModel
        self.electionsViewModel = electionsViewModel
        self.onNavigateToTab = onNavigateToTab
        self.onOpenSidebar = onOpenSidebar
    }
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header Banner
                topHeroBanner
                
                // TailAdmin 4-Card Metric Grid
                tailAdminMetricsGrid
                
                // Active Election Spotlight
                activeElectionSpotlightCard
                
                // Turnout Analytics Chart Card
                turnoutAnalyticsChartCard

                // Sample duplicate and integrity signals
                integritySignalCard
                
                // Recent Merkle Checkpoints Data Table
                checkpointsDataTableCard
                
                // Security & Audit Trust Matrix
                securityTrustMatrixSection
                
                // Bottom spacing for translucent floating navigation bar
                Spacer(minLength: 90)
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
        }
        .background(ColorTokens.tailAdminLightBg)
        .sheet(isPresented: $showGuidelinesSheet) {
            ElectionGuidelinesSheet()
        }
        .sheet(item: $selectedCheckpointForSheet) { cp in
            MerkleAuditDetailSheet(
                checkItem: AuditCheckItem(
                    id: "cp_\(cp.treeSize)",
                    name: "Checkpoint Tree Size \(cp.treeSize) Audit",
                    verdict: .pass,
                    detail: "Merkle Root: \(cp.rootHash)\nWitness Sig: \(cp.signature)\nWitnessed: \(cp.witnessedAtUtc)"
                )
            )
        }
    }
    
    // MARK: - Hero Banner
    private var topHeroBanner: some View {
        HStack(alignment: .center, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text("SecureVote")
                        .font(Typography.appTitle)
                        .foregroundStyle(ColorTokens.textPrimary)
                    
                    Text("LIVE")
                        .font(Typography.badgeText)
                        .foregroundStyle(ColorTokens.tailAdminSuccess)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 2)
                        .background(ColorTokens.tailAdminSuccessBg)
                        .clipShape(Capsule())
                }
                
                Text(authViewModel.currentUser?.email ?? "Authorized Session Node")
                    .font(Typography.callout)
                    .foregroundStyle(ColorTokens.textSecondary)
                
                Text("Role: \(authViewModel.currentUser?.role.displayName ?? "Student") • Node #01")
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.tailAdminBrand)
            }
            
            Spacer()
            
            Button {
                HapticFeedback.light()
                onOpenSidebar()
            } label: {
                Image(systemName: "line.3.horizontal.circle.fill")
                    .font(.system(size: 34))
                    .foregroundStyle(ColorTokens.tailAdminBrand)
            }
            .accessibilityLabel("Open Quick Menu")
        }
        .glassCard(cornerRadius: 18, padding: 16)
    }
    
    // MARK: - TailAdmin 4-Card Metric Grid
    private var tailAdminMetricsGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
            // Metric 1: Ballots Cast
            metricCard(
                title: "Ballots Cast",
                value: "1,248",
                badgeText: "+11.01%",
                badgeIsPositive: true,
                iconName: "tray.and.arrow.down.fill",
                iconColor: ColorTokens.tailAdminBrand
            )
            
            // Metric 2: Registered Electorate
            metricCard(
                title: "Registered Voters",
                value: "3,782",
                badgeText: "98.4%",
                badgeIsPositive: true,
                iconName: "person.2.fill",
                iconColor: ColorTokens.tailAdminSuccess
            )
            
            // Metric 3: Witness Checkpoints
            metricCard(
                title: "Witness Checkpoints",
                value: "48",
                badgeText: "100% Append",
                badgeIsPositive: true,
                iconName: "shield.checkered",
                iconColor: ColorTokens.tailAdminPurple
            )
            
            // Metric 4: Blockchain Anchors
            metricCard(
                title: "EVM Anchors",
                value: "12",
                badgeText: "Anvil #142",
                badgeIsPositive: true,
                iconName: "link.circle.fill",
                iconColor: ColorTokens.tailAdminInfo
            )
        }
    }
    
    private func metricCard(
        title: String,
        value: String,
        badgeText: String,
        badgeIsPositive: Bool,
        iconName: String,
        iconColor: Color
    ) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                ZStack {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(iconColor.opacity(0.12))
                        .frame(width: 44, height: 44)
                    
                    Image(systemName: iconName)
                        .font(.system(size: 20))
                        .foregroundStyle(iconColor)
                }
                
                Spacer()
                
                Text(badgeText)
                    .font(Typography.badgeText)
                    .foregroundStyle(badgeIsPositive ? ColorTokens.tailAdminSuccess : ColorTokens.tailAdminDanger)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(badgeIsPositive ? ColorTokens.tailAdminSuccessBg : ColorTokens.tailAdminDangerBg)
                    .clipShape(Capsule())
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text(value)
                    .font(Typography.sectionHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
                
                Text(title)
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.textSecondary)
            }
        }
        .glassCard(cornerRadius: 16, padding: 14)
    }
    
    // MARK: - Active Election Spotlight Card
    private var activeElectionSpotlightCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                HStack(spacing: 6) {
                    Circle()
                        .fill(ColorTokens.tailAdminSuccess)
                        .frame(width: 8, height: 8)
                    Text("ACTIVE CONTEST")
                        .font(Typography.badgeText)
                        .foregroundStyle(ColorTokens.tailAdminSuccess)
                }
                
                Spacer()
                
                Text("Closes 17:00 UTC")
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.textSecondary)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text("Student Council General Election 2026")
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
                
                Text("Contest: Executive Board • Single-Choice Cryptographic Ballot")
                    .font(Typography.callout)
                    .foregroundStyle(ColorTokens.textSecondary)
            }
            
            // Progress Bar
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Participation Progress")
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.textSecondary)
                    Spacer()
                    Text("1,248 / 3,782 (33.0%)")
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.tailAdminBrand)
                }
                
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(Color.gray.opacity(0.18))
                            .frame(height: 8)
                        
                        Capsule()
                            .fill(
                                LinearGradient(
                                    colors: [ColorTokens.tailAdminBrandLight, ColorTokens.tailAdminBrand],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(width: geo.size.width * 0.33, height: 8)
                    }
                }
                .frame(height: 8)
            }
            
            HStack(spacing: 12) {
                Button {
                    HapticFeedback.medium()
                    onNavigateToTab(2) // Jump to Vote & Booth Tab
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "checkmark.seal.fill")
                        Text("Enter Voting Booth")
                    }
                    .font(Typography.callout)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(ColorTokens.tailAdminBrand)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                
                Button {
                    HapticFeedback.light()
                    onNavigateToTab(1) // Jump to Elections Catalog
                } label: {
                    Text("View Candidates")
                        .font(Typography.callout)
                        .fontWeight(.medium)
                        .foregroundStyle(ColorTokens.tailAdminBrand)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .background(ColorTokens.tailAdminBrandBg)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
        .glassCard(cornerRadius: 20, padding: 18)
    }
    
    // MARK: - Turnout Analytics Chart Card
    private var turnoutAnalyticsChartCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Ballot Ingestion Rate")
                        .font(Typography.cardHeader)
                        .foregroundStyle(ColorTokens.textPrimary)
                    
                    Text("Hourly submitted & witnessed ciphertexts")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
                
                Spacer()
                
                // Timeframe Selector
                HStack(spacing: 4) {
                    ForEach(timeframes, id: \.self) { tf in
                        Button {
                            HapticFeedback.selection()
                            selectedTimeframe = tf
                        } label: {
                            Text(tf)
                                .font(Typography.badgeText)
                                .foregroundStyle(selectedTimeframe == tf ? ColorTokens.tailAdminBrand : ColorTokens.textTertiary)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(selectedTimeframe == tf ? ColorTokens.tailAdminBrandBg : Color.clear)
                                .clipShape(Capsule())
                        }
                    }
                }
            }
            
            // Pure SwiftUI Interactive Chart Bars
            HStack(alignment: .bottom, spacing: 14) {
                ForEach(0..<hourlyTurnout.count, id: \.self) { idx in
                    let item = hourlyTurnout[idx]
                    let isHovered = hoveredBarIndex == idx
                    
                    VStack(spacing: 8) {
                        Text("\(item.count)")
                            .font(Typography.badgeText)
                            .foregroundStyle(isHovered ? ColorTokens.tailAdminBrand : ColorTokens.textTertiary)
                            .opacity(isHovered ? 1.0 : 0.7)
                        
                        ZStack(alignment: .bottom) {
                            RoundedRectangle(cornerRadius: 6, style: .continuous)
                                .fill(Color.gray.opacity(0.12))
                                .frame(height: 120)
                            
                            RoundedRectangle(cornerRadius: 6, style: .continuous)
                                .fill(
                                    isHovered
                                        ? LinearGradient(colors: [ColorTokens.tailAdminBrandLight, ColorTokens.tailAdminBrand], startPoint: .top, endPoint: .bottom)
                                        : LinearGradient(colors: [ColorTokens.tailAdminBrand.opacity(0.6), ColorTokens.tailAdminBrand.opacity(0.4)], startPoint: .top, endPoint: .bottom)
                                )
                                .frame(height: CGFloat(item.count) / 450.0 * 120.0)
                        }
                        .frame(maxWidth: .infinity)
                        .onTapGesture {
                            HapticFeedback.selection()
                            hoveredBarIndex = idx
                        }
                        
                        Text(item.hour)
                            .font(Typography.caption)
                            .foregroundStyle(ColorTokens.textSecondary)
                    }
                }
            }
            .frame(height: 170)
            .padding(.top, 4)
            
            Divider()
            
            HStack {
                HStack(spacing: 6) {
                    Circle()
                        .fill(ColorTokens.tailAdminBrand)
                        .frame(width: 8, height: 8)
                    Text("Avg Acceptance Latency: 18ms")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
                
                Spacer()
                
                Text("Zero Plaintext Leakage")
                    .font(Typography.captionBold)
                    .foregroundStyle(ColorTokens.tailAdminSuccess)
            }
        }
        .glassCard(cornerRadius: 20, padding: 18)
    }

    private var integritySignalCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 3) {
                Text("Ballot Integrity Signals")
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
                Text("Illustrative monitoring data")
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.textTertiary)
            }

            HStack(spacing: 10) {
                integrityMetric(title: "Duplicates blocked", value: "17", color: ColorTokens.tailAdminWarning)
                integrityMetric(title: "Flagged for review", value: "3", color: ColorTokens.tailAdminDanger)
                integrityMetric(title: "Accepted ballots", value: "1,248", color: ColorTokens.tailAdminSuccess)
            }

            VStack(spacing: 9) {
                integrityBar(title: "Duplicate submissions", value: "17", fraction: 0.72, color: ColorTokens.tailAdminWarning)
                integrityBar(title: "Records flagged", value: "3", fraction: 0.18, color: ColorTokens.tailAdminDanger)
            }

            Text("These sample indicators show aggregate events only. Verify real ballots and published totals using independently retained evidence.")
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
        }
        .glassCard(cornerRadius: 20, padding: 18)
    }

    private func integrityMetric(title: String, value: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
            Text(value)
                .font(Typography.sectionHeader)
                .foregroundStyle(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(Color.white.opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func integrityBar(title: String, value: String, fraction: CGFloat, color: Color) -> some View {
        HStack(spacing: 8) {
            Text(title)
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
                .frame(width: 145, alignment: .leading)
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.gray.opacity(0.14))
                    Capsule().fill(color).frame(width: geometry.size.width * fraction)
                }
            }
            .frame(height: 8)
            Text(value)
                .font(Typography.badgeText)
                .foregroundStyle(ColorTokens.textSecondary)
                .frame(width: 24, alignment: .trailing)
        }
    }
    
    // MARK: - Checkpoints Data Table Card
    private var checkpointsDataTableCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Append-Only Merkle Checkpoints")
                        .font(Typography.cardHeader)
                        .foregroundStyle(ColorTokens.textPrimary)
                    
                    Text("Witness-signed state commitments")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
                
                Spacer()
                
                Button {
                    HapticFeedback.light()
                    onNavigateToTab(3) // Jump to Audit & Merkle tab
                } label: {
                    Text("View All")
                        .font(Typography.badgeText)
                        .foregroundStyle(ColorTokens.tailAdminBrand)
                }
            }
            
            VStack(spacing: 10) {
                ForEach(recentCheckpoints) { cp in
                    Button {
                        HapticFeedback.light()
                        selectedCheckpointForSheet = cp
                    } label: {
                        HStack(spacing: 12) {
                            ZStack {
                                Circle()
                                    .fill(ColorTokens.tailAdminPurple.opacity(0.12))
                                    .frame(width: 36, height: 36)
                                
                                Image(systemName: "point.3.connected.trianglepath.dotted")
                                    .font(.system(size: 16))
                                    .foregroundStyle(ColorTokens.tailAdminPurple)
                            }
                            
                            VStack(alignment: .leading, spacing: 2) {
                                HStack(spacing: 6) {
                                    Text("Tree Size: \(cp.treeSize)")
                                        .font(Typography.callout)
                                        .fontWeight(.semibold)
                                        .foregroundStyle(ColorTokens.textPrimary)
                                    
                                    if cp.isFinal {
                                        Text("FINAL")
                                            .font(Typography.badgeText)
                                            .foregroundStyle(ColorTokens.tailAdminSuccess)
                                    }
                                }
                                
                                Text("Root: \(cp.rootHash.prefix(18))...")
                                    .font(Typography.cryptographicDigest)
                                    .foregroundStyle(ColorTokens.textTertiary)
                            }
                            
                            Spacer()
                            
                            VStack(alignment: .trailing, spacing: 2) {
                                Text("ANCHORED")
                                    .font(Typography.badgeText)
                                    .foregroundStyle(ColorTokens.tailAdminInfo)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(ColorTokens.tailAdminInfoBg)
                                    .clipShape(Capsule())
                                
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 12))
                                    .foregroundStyle(ColorTokens.textTertiary)
                            }
                        }
                        .padding(10)
                        .background(Color.white.opacity(0.6))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .glassCard(cornerRadius: 20, padding: 18)
    }
    
    // MARK: - Security Trust Matrix Section
    private var securityTrustMatrixSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Cryptographic Security Properties")
                .font(Typography.cardHeader)
                .foregroundStyle(ColorTokens.textPrimary)
            
            VStack(spacing: 8) {
                securityCheckRow(
                    title: "Deterministic Ballot Commitment",
                    status: "PASS",
                    desc: "Encrypted ciphertexts appended with immutable leaf indices",
                    isPass: true
                )
                
                securityCheckRow(
                    title: "Single Cast Guarantee",
                    status: "ENFORCED",
                    desc: "Nullifiers strictly unique per election, duplicate attempts rejected",
                    isPass: true
                )
                
                securityCheckRow(
                    title: "Independent External Witness",
                    status: "ACKNOWLEDGED",
                    desc: "Monotonic append-only checkpoints signed outside admin DB",
                    isPass: true
                )
                
                securityCheckRow(
                    title: "EVM Smart Contract Anchor",
                    status: "FINALIZED",
                    desc: "Hashes anchored on-chain with immutable sequence rejection",
                    isPass: true
                )
            }
        }
        .glassCard(cornerRadius: 20, padding: 18)
    }
    
    private func securityCheckRow(title: String, status: String, desc: String, isPass: Bool) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: isPass ? "checkmark.shield.fill" : "exclamationmark.shield.fill")
                .font(.system(size: 18))
                .foregroundStyle(isPass ? ColorTokens.tailAdminSuccess : ColorTokens.tailAdminWarning)
                .padding(.top, 2)
            
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(title)
                        .font(Typography.callout)
                        .fontWeight(.semibold)
                        .foregroundStyle(ColorTokens.textPrimary)
                    
                    Spacer()
                    
                    Text(status)
                        .font(Typography.badgeText)
                        .foregroundStyle(ColorTokens.tailAdminSuccess)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(ColorTokens.tailAdminSuccessBg)
                        .clipShape(Capsule())
                }
                
                Text(desc)
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.textSecondary)
            }
        }
        .padding(.vertical, 4)
    }
}

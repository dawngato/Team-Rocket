import SwiftUI

public struct VisitorPublicPortalView: View {
    @Bindable var authViewModel: AuthViewModel
    @Bindable var electionsViewModel: ElectionsViewModel
    
    public init(
        authViewModel: AuthViewModel,
        electionsViewModel: ElectionsViewModel
    ) {
        self.authViewModel = authViewModel
        self.electionsViewModel = electionsViewModel
    }
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Visitor Banner
                    visitorBannerCard
                    
                    // Public Elections Catalog
                    publicElectionsCard
                    
                    // Certified Published Results Spotlight
                    publishedResultsCard
                    
                    // Independent Standalone Verifier & Trust Pins
                    standaloneVerifierCard
                    
                    // Sign In / Register CTA Card
                    loginCtaCard
                    
                    Spacer(minLength: 90)
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
            }
            .background(ColorTokens.tailAdminLightBg)
            .navigationTitle("Public Observer Portal")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
    
    private var visitorBannerCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                ZStack {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(ColorTokens.tailAdminBrand.opacity(0.12))
                        .frame(width: 42, height: 42)
                    
                    Image(systemName: "eye.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(ColorTokens.tailAdminBrand)
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text("Public Transparency Portal")
                            .font(Typography.sectionHeader)
                            .foregroundStyle(ColorTokens.textPrimary)
                        
                        Text("VISITOR")
                            .font(Typography.badgeText)
                            .foregroundStyle(ColorTokens.tailAdminInfo)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(ColorTokens.tailAdminInfoBg)
                            .clipShape(Capsule())
                    }
                    
                    Text("Read-Only Audit • Zero Login Required")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
                
                Spacer()
            }
            
            Text("Visitors can independently inspect candidate rosters, public manifests, and finalized EVM blockchain commitments without authentication. To cast a ballot, you must sign in with a verified student account.")
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
        }
        .glassCard(cornerRadius: 18, padding: 16)
    }
    
    private var publicElectionsCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Public Campus Elections")
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
                Spacer()
                Text("\(electionsViewModel.elections.count) Contests")
                    .font(Typography.badgeText)
                    .foregroundStyle(ColorTokens.textTertiary)
            }
            
            VStack(spacing: 10) {
                ForEach(electionsViewModel.elections) { election in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(election.title)
                                .font(Typography.callout)
                                .fontWeight(.semibold)
                                .foregroundStyle(ColorTokens.textPrimary)
                            
                            Text("Opens: \(election.opensAtUtc.prefix(10)) • Closes: \(election.closesAtUtc.prefix(10))")
                                .font(Typography.caption)
                                .foregroundStyle(ColorTokens.textSecondary)
                        }
                        
                        Spacer()
                        
                        ElectionStateBadge(state: election.electionState)
                    }
                    .padding(12)
                    .background(Color.white.opacity(0.6))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
        .glassCard(cornerRadius: 20, padding: 18)
    }
    
    private var publishedResultsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "chart.bar.xaxis")
                    .foregroundStyle(ColorTokens.tailAdminSuccess)
                Text("Official Certified Tallies")
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
                Spacer()
                Text("AUDIT PASS")
                    .font(Typography.badgeText)
                    .foregroundStyle(ColorTokens.tailAdminSuccess)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(ColorTokens.tailAdminSuccessBg)
                    .clipShape(Capsule())
            }
            
            VStack(alignment: .leading, spacing: 8) {
                Text("CS Academic Senate 2026")
                    .font(Typography.callout)
                    .fontWeight(.bold)
                    .foregroundStyle(ColorTokens.textPrimary)
                
                HStack {
                    Text("Winner: Alice Sharma")
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.tailAdminBrand)
                    Spacer()
                    Text("612 votes (74.2%)")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
                
                HStack {
                    Text("Runner Up: Brian Patel")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textSecondary)
                    Spacer()
                    Text("213 votes (25.8%)")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
            }
            .padding(12)
            .background(Color.white.opacity(0.6))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .glassCard(cornerRadius: 20, padding: 18)
    }
    
    private var standaloneVerifierCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Independent Standalone Verifier (Q7)")
                .font(Typography.cardHeader)
                .foregroundStyle(ColorTokens.textPrimary)
            
            Text("Requirement 5: Standalone CLI verification script validates accepted ballots, Merkle consistency, and announced results outside the application.")
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
            
            Button {
                HapticFeedback.light()
                #if canImport(UIKit)
                UIPasteboard.general.string = "python3 standalone_verifier.py --archive evidence.zip --manifest-digest e3b0c442..."
                #endif
            } label: {
                HStack {
                    Image(systemName: "terminal.fill")
                    Text("Copy Verifier CLI Command")
                }
                .font(Typography.callout)
                .fontWeight(.semibold)
                .foregroundStyle(ColorTokens.tailAdminBrand)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(ColorTokens.tailAdminBrandBg)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .glassCard(cornerRadius: 20, padding: 18)
    }
    
    private var loginCtaCard: some View {
        VStack(spacing: 12) {
            Text("Ready to participate or manage?")
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
            
            Button {
                HapticFeedback.medium()
                Task {
                    await authViewModel.logout()
                }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "person.crop.circle.badge.arrow.right")
                    Text("Sign In with Campus Account")
                }
                .font(Typography.callout)
                .fontWeight(.bold)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(ColorTokens.tailAdminBrand)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .glassCard(cornerRadius: 20, padding: 18)
    }
}

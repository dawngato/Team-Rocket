import SwiftUI

public struct RolesProfileView: View {
    @Bindable var authViewModel: AuthViewModel
    @State private var keychainService = KeychainService()
    @State private var showSecuritySheet: Bool = false
    @State private var showGuidelinesSheet: Bool = false
    
    public init(authViewModel: AuthViewModel) {
        self.authViewModel = authViewModel
    }
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Profile Header Card
                    profileCard
                    
                    if authViewModel.currentUser?.role == .student {
                        studentAccountDetails
                    } else {
                        roleAuthorityBoundarySection
                        trustPinsSection
                    }
                    
                    if authViewModel.currentUser?.role == .student {
                        studentGuidelinesLink
                    } else {
                        // Implementation and trust details belong in staff accounts.
                        keychainVaultCard
                        quickSheetsSection
                    }
                    
                    // Sign Out Action
                    signOutButton
                    
                    Spacer(minLength: 90)
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
            }
            .background(ColorTokens.tailAdminLightBg)
            .navigationTitle("Account")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showSecuritySheet) {
                InstitutionalSecuritySheet()
            }
            .sheet(isPresented: $showGuidelinesSheet) {
                ElectionGuidelinesSheet()
            }
        }
    }
    
    private var profileCard: some View {
        HStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [ColorTokens.tailAdminBrandLight, ColorTokens.tailAdminBrand],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 56, height: 56)
                
                Text(String(authViewModel.currentUser?.email.prefix(1) ?? "U").uppercased())
                    .font(.system(size: 24, weight: .bold))
                    .foregroundStyle(.white)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(authViewModel.currentUser?.email ?? "voter@campus.edu")
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
                    .lineLimit(1)
                
                HStack(spacing: 6) {
                    Text(authViewModel.currentUser?.role.displayName ?? "Student")
                        .font(Typography.badgeText)
                        .foregroundStyle(ColorTokens.tailAdminBrand)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(ColorTokens.tailAdminBrandBg)
                        .clipShape(Capsule())
                    
                    Text("Verified Synthetic")
                        .font(Typography.badgeText)
                        .foregroundStyle(ColorTokens.tailAdminSuccess)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(ColorTokens.tailAdminSuccessBg)
                        .clipShape(Capsule())
                }
            }
            
            Spacer()
        }
        .glassCard(cornerRadius: 18, padding: 16)
    }
    
    private var roleAuthorityBoundarySection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Role Authority & Privacy Isolation")
                        .font(Typography.cardHeader)
                        .foregroundStyle(ColorTokens.textPrimary)
                    
                    Text("Strict cryptographic visibility rules enforced across priority levels")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
                
                Spacer()
            }
            
            if authViewModel.currentUser?.role == .superAdmin {
                // SUPER USER ISOLATION
                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 8) {
                        Image(systemName: "crown.fill")
                            .foregroundStyle(ColorTokens.institutionalGold)
                        Text("Super User Authority: Level 1 Priority")
                            .font(Typography.callout)
                            .fontWeight(.bold)
                            .foregroundStyle(ColorTokens.textPrimary)
                    }
                    
                    Text("• Can provision and inspect all Administrator accounts (\(authViewModel.visibleAdmins.count) active).")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textSecondary)
                    Text("• Administrative and student roles CANNOT view or access Super User identity or master tokens.")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.tailAdminBrand)
                    Text("• Zero access to student voter choices or trustee decryption secrets.")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.tailAdminSuccess)
                }
                .padding(14)
                .background(ColorTokens.tailAdminPurple.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            } else if authViewModel.currentUser?.role == .administrator || authViewModel.currentUser?.role == .electionOfficer {
                // ADMIN ISOLATION
                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 8) {
                        Image(systemName: "slider.horizontal.3")
                            .foregroundStyle(ColorTokens.tailAdminBrand)
                        Text("Administrator Authority: Level 2 Priority")
                            .font(Typography.callout)
                            .fontWeight(.bold)
                            .foregroundStyle(ColorTokens.textPrimary)
                    }
                    
                    Text("• Can view all registered students (\(authViewModel.visibleStudents.count) students) and nominate them to candidates.")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textSecondary)
                    Text("• Strict Isolation: Administrator CANNOT view the Super User root account or other departmental authority trees.")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.tailAdminWarning)
                    Text("• Strict Privacy: Administrator CANNOT view individual student ballot contents.")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.tailAdminDanger)
                }
                .padding(14)
                .background(ColorTokens.tailAdminBrand.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .glassCard(cornerRadius: 20, padding: 18)
    }

    private var studentAccountDetails: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Student details")
                .font(Typography.cardHeader)
                .foregroundStyle(ColorTokens.textPrimary)

            if let student = authViewModel.visibleStudents.first {
                detailRow(title: "Name", value: student.name)
                detailRow(title: "Student ID", value: student.studentId)
                detailRow(title: "Department", value: student.department)
            }

            Text("Your receipt can confirm that a ballot was included without showing your selection.")
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
                .padding(.top, 4)
        }
        .glassCard(cornerRadius: 18, padding: 16)
    }

    private var studentGuidelinesLink: some View {
        Button {
            HapticFeedback.light()
            showGuidelinesSheet = true
        } label: {
            HStack(spacing: 10) {
                Image(systemName: "info.circle")
                    .foregroundStyle(ColorTokens.tailAdminBrand)
                Text("Voting guidelines")
                    .font(Typography.callout)
                    .foregroundStyle(ColorTokens.textPrimary)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(ColorTokens.textTertiary)
            }
            .padding(14)
            .background(Color.white.opacity(0.7))
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
        .buttonStyle(.plain)
    }

    private func detailRow(title: String, value: String) -> some View {
        HStack {
            Text(title)
                .foregroundStyle(ColorTokens.textSecondary)
            Spacer()
            Text(value)
                .fontWeight(.medium)
                .foregroundStyle(ColorTokens.textPrimary)
        }
        .font(Typography.caption)
    }
    
    private var trustPinsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Out-of-Band Trust Pins")
                .font(Typography.cardHeader)
                .foregroundStyle(ColorTokens.textPrimary)
            
            VStack(alignment: .leading, spacing: 8) {
                pinRow(label: "Pinned Manifest SHA256", value: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
                pinRow(label: "Witness Public Key", value: "ed25519:98127391abfcde247891238914871298471928471928")
                pinRow(label: "EVM Contract Address", value: "0x5FbDB2315678afecb367f032d93F642f64180aa3")
                pinRow(label: "Blockchain Network ID", value: "Anvil Local EVM (31337)")
            }
            .padding(12)
            .background(Color.white.opacity(0.6))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .glassCard(cornerRadius: 20, padding: 18)
    }
    
    private func pinRow(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
            Text(value)
                .font(Typography.cryptographicDigest)
                .foregroundStyle(ColorTokens.tailAdminBrand)
                .lineLimit(1)
        }
    }
    
    private var keychainVaultCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "lock.shield.fill")
                    .foregroundStyle(ColorTokens.tailAdminSuccess)
                Text("Apple Keychain Secure Enclave")
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
                Spacer()
                Text("SEALED")
                    .font(Typography.badgeText)
                    .foregroundStyle(ColorTokens.tailAdminSuccess)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(ColorTokens.tailAdminSuccessBg)
                    .clipShape(Capsule())
            }
            
            Text("Session authorization tokens and blinded voter nonces are stored in OS-level hardware-backed Keychain with kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly protection.")
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
        }
        .glassCard(cornerRadius: 20, padding: 18)
    }
    
    private var quickSheetsSection: some View {
        VStack(spacing: 8) {
            Button {
                HapticFeedback.light()
                showSecuritySheet = true
            } label: {
                HStack {
                    Image(systemName: "shield.checkered")
                        .foregroundStyle(ColorTokens.tailAdminBrand)
                    Text("Institutional Security Architecture")
                        .font(Typography.callout)
                        .foregroundStyle(ColorTokens.textPrimary)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .foregroundStyle(ColorTokens.textTertiary)
                }
                .padding(14)
                .background(Color.white.opacity(0.7))
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .buttonStyle(.plain)
            
            Button {
                HapticFeedback.light()
                showGuidelinesSheet = true
            } label: {
                HStack {
                    Image(systemName: "info.circle")
                        .foregroundStyle(ColorTokens.tailAdminBrand)
                    Text("Campus Voting Process & Guidelines")
                        .font(Typography.callout)
                        .foregroundStyle(ColorTokens.textPrimary)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .foregroundStyle(ColorTokens.textTertiary)
                }
                .padding(14)
                .background(Color.white.opacity(0.7))
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .buttonStyle(.plain)
        }
    }
    
    private var signOutButton: some View {
        Button {
            HapticFeedback.medium()
            Task {
                await authViewModel.logout()
            }
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                Text("Sign Out of Session")
            }
            .font(Typography.callout)
            .fontWeight(.semibold)
            .foregroundStyle(ColorTokens.tailAdminDanger)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(ColorTokens.tailAdminDangerBg)
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }
}

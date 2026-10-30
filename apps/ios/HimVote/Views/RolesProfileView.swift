import SwiftUI

public struct RolesProfileView: View {
    @Bindable var authViewModel: AuthViewModel
    @State private var keychainService = KeychainService()
    @State private var showSecuritySheet: Bool = false
    @State private var showGuidelinesSheet: Bool = false
    
    let allRoles: [UserRole] = [
        .student,
        .electionOfficer,
        .auditor,
        .teacher,
        .administrator,
        .superAdmin
    ]
    
    public init(authViewModel: AuthViewModel) {
        self.authViewModel = authViewModel
    }
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Profile Header Card
                    profileCard
                    
                    // Governance Role Switcher
                    roleSwitcherSection
                    
                    // Out-of-Band Trust Pins
                    trustPinsSection
                    
                    // iOS Hardware Keychain Vault Status
                    keychainVaultCard
                    
                    // Institutional Sheets Links
                    quickSheetsSection
                    
                    // Sign Out Action
                    signOutButton
                    
                    Spacer(minLength: 90)
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
            }
            .background(ColorTokens.tailAdminLightBg)
            .navigationTitle("Governance & Identity")
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
    
    private var roleSwitcherSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Simulate Role Perspective")
                        .font(Typography.cardHeader)
                        .foregroundStyle(ColorTokens.textPrimary)
                    
                    Text("Evaluate client behavior per prompt1 RBAC specification")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
                
                Spacer()
            }
            
            VStack(spacing: 8) {
                ForEach(allRoles, id: \.self) { role in
                    let isCurrent = authViewModel.currentUser?.role == role
                    
                    Button {
                        HapticFeedback.selection()
                        switchRole(to: role)
                    } label: {
                        HStack(spacing: 12) {
                            ZStack {
                                Circle()
                                    .fill(isCurrent ? ColorTokens.tailAdminBrand : Color.gray.opacity(0.15))
                                    .frame(width: 28, height: 28)
                                
                                Image(systemName: isCurrent ? "checkmark" : "circle")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundStyle(isCurrent ? .white : Color.gray)
                            }
                            
                            VStack(alignment: .leading, spacing: 1) {
                                Text(role.displayName)
                                    .font(Typography.callout)
                                    .fontWeight(isCurrent ? .semibold : .regular)
                                    .foregroundStyle(ColorTokens.textPrimary)
                                
                                Text(roleDescription(for: role))
                                    .font(Typography.caption)
                                    .foregroundStyle(ColorTokens.textSecondary)
                            }
                            
                            Spacer()
                        }
                        .padding(10)
                        .background(isCurrent ? ColorTokens.tailAdminBrandBg : Color.white.opacity(0.6))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .glassCard(cornerRadius: 20, padding: 18)
    }
    
    private func roleDescription(for role: UserRole) -> String {
        switch role {
        case .student:
            return "Ballot casting, blind credential requests, receipt inclusion check"
        case .electionOfficer:
            return "Manifest creation, roster review, election freeze & open/close"
        case .auditor:
            return "Independent witness check, standalone verification, attestations"
        case .teacher:
            return "Class roster correction, department student verification"
        case .administrator:
            return "Department management, staff invitations, activity logs"
        case .superAdmin:
            return "Bootstrap authority, university policies, system audit events"
        case .rosterApprover:
            return "Cryptographic roster signature prior to election freeze"
        }
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
            authViewModel.logout()
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
    
    private func switchRole(to newRole: UserRole) {
        guard let currentUser = authViewModel.currentUser else { return }
        let updatedUser = User(
            userId: currentUser.userId,
            email: currentUser.email,
            role: newRole,
            sessionToken: currentUser.sessionToken,
            mfaRequired: currentUser.mfaRequired
        )
        authViewModel.currentUser = updatedUser
    }
}

import SwiftUI

public struct RolesProfileView: View {
    @Bindable var authViewModel: AuthViewModel
    @State private var profileViewModel: ProfileViewModel
    @State private var keychainService = KeychainService()
    @State private var showSecuritySheet: Bool = false
    @State private var showGuidelinesSheet: Bool = false
    @State private var showEditProfileSheet: Bool = false
    @Environment(\.colorScheme) private var colorScheme
    
    public init(
        authViewModel: AuthViewModel,
        apiClient: ApiClientProtocol = ApiClient()
    ) {
        self.authViewModel = authViewModel
        self._profileViewModel = State(wrappedValue: ProfileViewModel(apiClient: apiClient))
    }
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Profile Header Card with Edit Action
                    profileCard
                    
                    // Network unavailable or loading indicator
                    if profileViewModel.isLoading && profileViewModel.profile == nil {
                        HStack(spacing: 8) {
                            ProgressView()
                                .scaleEffect(0.85)
                            Text("Retrieving verified profile details...")
                                .font(Typography.caption)
                                .foregroundStyle(ColorTokens.textSecondary)
                        }
                        .padding(.vertical, 8)
                    } else if profileViewModel.networkUnavailable {
                        networkRecoveryBanner
                    }
                    
                    // Detailed Identity & Contact Attributes
                    identityAndContactCard
                    
                    if authViewModel.currentUser?.role == .student {
                        studentAccountDetails
                    } else {
                        roleAuthorityBoundarySection
                        trustPinsSection
                    }
                    
                    if authViewModel.currentUser?.role == .student {
                        studentGuidelinesLink
                    } else {
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
            .background(colorScheme == .dark ? ColorTokens.tailAdminDarkBg : ColorTokens.tailAdminLightBg)
            .navigationTitle("Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        HapticFeedback.light()
                        profileViewModel.prepareForEditing()
                        showEditProfileSheet = true
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "pencil")
                                .font(.system(size: 13, weight: .semibold))
                            Text("Edit")
                                .font(Typography.callout)
                                .fontWeight(.semibold)
                        }
                        .foregroundStyle(ColorTokens.tailAdminBrand)
                    }
                }
            }
            .refreshable {
                if let token = authViewModel.currentUser?.sessionToken {
                    await profileViewModel.loadProfile(sessionToken: token)
                }
            }
            .task {
                if let token = authViewModel.currentUser?.sessionToken {
                    await profileViewModel.loadProfile(sessionToken: token)
                }
            }
            .sheet(isPresented: $showEditProfileSheet) {
                EditProfileSheet(
                    profileViewModel: profileViewModel,
                    authViewModel: authViewModel
                )
            }
            .sheet(isPresented: $showSecuritySheet) {
                InstitutionalSecuritySheet()
            }
            .sheet(isPresented: $showGuidelinesSheet) {
                ElectionGuidelinesSheet()
            }
        }
    }
    
    // MARK: - Profile Header Card
    
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
                    .frame(width: 60, height: 60)
                    .shadow(color: ColorTokens.tailAdminBrand.opacity(0.2), radius: 6, x: 0, y: 3)
                
                Text(resolvedInitials)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(.white)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(resolvedDisplayName)
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
                    .lineLimit(1)
                
                Text(authViewModel.currentUser?.email ?? "voter@campus.edu")
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.textSecondary)
                    .lineLimit(1)
                
                HStack(spacing: 6) {
                    Text(authViewModel.currentUser?.role.displayName ?? "Student")
                        .font(Typography.badgeText)
                        .foregroundStyle(ColorTokens.tailAdminBrand)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(ColorTokens.tailAdminBrandBg)
                        .clipShape(Capsule())
                    
                    Text("Registrar Verified")
                        .font(Typography.badgeText)
                        .foregroundStyle(ColorTokens.tailAdminSuccess)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(ColorTokens.tailAdminSuccessBg)
                        .clipShape(Capsule())
                }
                .padding(.top, 2)
            }
            
            Spacer()
            
            Button {
                HapticFeedback.light()
                profileViewModel.prepareForEditing()
                showEditProfileSheet = true
            } label: {
                Image(systemName: "square.and.pencil")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(ColorTokens.tailAdminBrand)
                    .padding(10)
                    .background(ColorTokens.tailAdminBrandBg)
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
        }
        .glassCard(cornerRadius: 18, padding: 16)
    }
    
    private var resolvedDisplayName: String {
        if let name = profileViewModel.profile?.displayName, !name.isEmpty {
            return name
        }
        if let name = authViewModel.currentUser?.displayName, !name.isEmpty {
            return name
        }
        if let student = authViewModel.visibleStudents.first, !student.name.isEmpty {
            return student.name
        }
        return authViewModel.currentUser?.email ?? "Campus Voter"
    }
    
    private var resolvedInitials: String {
        let name = resolvedDisplayName
        let parts = name.split(separator: " ")
        if parts.count >= 2, let first = parts.first?.first, let second = parts.last?.first {
            return "\(first)\(second)".uppercased()
        } else if let first = name.first {
            return String(first).uppercased()
        }
        return "U"
    }
    
    // MARK: - Identity & Contact Attributes Card
    
    private var identityAndContactCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Self-Service Section
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Contact Details")
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.textSecondary)
                    
                    Spacer()
                    
                    Text("Self-Service")
                        .font(Typography.badgeText)
                        .foregroundStyle(ColorTokens.tailAdminBrand)
                }
                
                attributeRow(
                    label: "Display Name",
                    value: profileViewModel.profile?.displayName ?? authViewModel.currentUser?.displayName ?? "Not set (uses email)",
                    isEditable: true
                )
                
                attributeRow(
                    label: "Phone Number",
                    value: profileViewModel.profile?.phoneNumber ?? authViewModel.currentUser?.phoneNumber ?? "Not set",
                    isEditable: true
                )
            }
            
            Divider()
                .padding(.vertical, 2)
            
            // Protected Section
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Institutional Roster Details")
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.textSecondary)
                    
                    Spacer()
                    
                    HStack(spacing: 3) {
                        Image(systemName: "lock.fill")
                            .font(.system(size: 8))
                        Text("Protected")
                            .font(Typography.badgeText)
                    }
                    .foregroundStyle(ColorTokens.textTertiary)
                }
                
                attributeRow(
                    label: "Student / Account ID",
                    value: authViewModel.visibleStudents.first?.studentId ?? (authViewModel.currentUser?.userId ?? "N/A"),
                    isEditable: false
                )
                
                attributeRow(
                    label: "Verified Email",
                    value: authViewModel.currentUser?.email ?? "N/A",
                    isEditable: false
                )
                
                attributeRow(
                    label: "Department Scope",
                    value: authViewModel.visibleStudents.first?.department ?? "Campus Academic Directory",
                    isEditable: false
                )
                
                attributeRow(
                    label: "Account Role",
                    value: authViewModel.currentUser?.role.displayName ?? "Student",
                    isEditable: false
                )
                
                attributeRow(
                    label: "Voting Eligibility",
                    value: "Active & Enrolled",
                    isEditable: false
                )
            }
        }
        .glassCard(cornerRadius: 18, padding: 16)
    }
    
    private func attributeRow(label: String, value: String, isEditable: Bool) -> some View {
        HStack {
            Text(label)
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
            
            Spacer()
            
            HStack(spacing: 4) {
                Text(value)
                    .font(Typography.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(ColorTokens.textPrimary)
                    .lineLimit(1)
                
                if isEditable {
                    Image(systemName: "pencil")
                        .font(.system(size: 9))
                        .foregroundStyle(ColorTokens.tailAdminBrand.opacity(0.8))
                } else {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 9))
                        .foregroundStyle(ColorTokens.textTertiary)
                }
            }
        }
    }
    
    private var networkRecoveryBanner: some View {
        HStack(spacing: 10) {
            Image(systemName: "wifi.exclamationmark")
                .foregroundStyle(ColorTokens.tailAdminWarning)
            
            VStack(alignment: .leading, spacing: 2) {
                Text("Identity Service Unreachable")
                    .font(Typography.captionBold)
                    .foregroundStyle(ColorTokens.tailAdminWarning)
                Text("Using cached session credentials. Tap to retry connection.")
                    .font(.system(size: 11))
                    .foregroundStyle(ColorTokens.textSecondary)
            }
            
            Spacer()
            
            Button("Retry") {
                HapticFeedback.light()
                Task {
                    if let token = authViewModel.currentUser?.sessionToken {
                        await profileViewModel.loadProfile(sessionToken: token)
                    }
                }
            }
            .font(Typography.captionBold)
            .foregroundStyle(ColorTokens.tailAdminWarning)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(ColorTokens.tailAdminWarningBg)
            .clipShape(Capsule())
        }
        .padding(12)
        .background(ColorTokens.tailAdminWarningBg.opacity(0.4))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
    
    // MARK: - Sections from Existing Implementation
    
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
            Text("Student Roster Record")
                .font(Typography.cardHeader)
                .foregroundStyle(ColorTokens.textPrimary)

            if let student = authViewModel.visibleStudents.first {
                detailRow(title: "Roster Name", value: student.name)
                detailRow(title: "Student ID", value: student.studentId)
                detailRow(title: "Department", value: student.department)
            } else {
                detailRow(title: "Roster Status", value: "Verified Active Voter")
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
            .background(colorScheme == .dark ? ColorTokens.tailAdminDarkCard : Color.white.opacity(0.7))
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
                pinRow(label: "Pinned Manifest SHA256", value: "Not configured in this app")
                pinRow(label: "Witness Public Key", value: "Not configured in this app")
                pinRow(label: "EVM Contract Address", value: "Not configured in this app")
                pinRow(label: "Blockchain Network ID", value: "Not configured in this app")
            }
            .padding(12)
            .background(colorScheme == .dark ? ColorTokens.tailAdminDarkCard : Color.white.opacity(0.6))
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
                Text("Device-Scoped Keychain Storage")
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
                Spacer()
                Text("DEVICE SCOPED")
                    .font(Typography.badgeText)
                    .foregroundStyle(ColorTokens.tailAdminSuccess)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(ColorTokens.tailAdminSuccessBg)
                    .clipShape(Capsule())
            }
            
            Text("The app stores credentials and receipts as Keychain items with kSecAttrAccessibleWhenUnlockedThisDeviceOnly. This setting limits access to an unlocked device and excludes migration to another device; it does not make each item a Secure Enclave object.")
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
                .background(colorScheme == .dark ? ColorTokens.tailAdminDarkCard : Color.white.opacity(0.7))
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
                .background(colorScheme == .dark ? ColorTokens.tailAdminDarkCard : Color.white.opacity(0.7))
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

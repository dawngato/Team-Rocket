import SwiftUI

public struct EditProfileSheet: View {
    @Bindable var profileViewModel: ProfileViewModel
    @Bindable var authViewModel: AuthViewModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    
    public init(
        profileViewModel: ProfileViewModel,
        authViewModel: AuthViewModel
    ) {
        self.profileViewModel = profileViewModel
        self.authViewModel = authViewModel
    }
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Avatar Header
                    avatarHeader
                    
                    // Asynchronous Status Banners
                    if let error = profileViewModel.errorMessage {
                        errorBanner(message: error)
                    }
                    if let success = profileViewModel.successMessage {
                        successBanner(message: success)
                    }
                    
                    // Editable Form Section
                    editableFieldsSection
                    
                    // Read-only / Protected Institutional Section
                    protectedFieldsSection
                    
                    Spacer(minLength: 32)
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
            }
            .background(colorScheme == .dark ? ColorTokens.tailAdminDarkBg : ColorTokens.tailAdminLightBg)
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        HapticFeedback.light()
                        profileViewModel.handleCancelAction {
                            dismiss()
                        }
                    }
                    .foregroundStyle(ColorTokens.textSecondary)
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        HapticFeedback.medium()
                        Task {
                            guard let token = authViewModel.currentUser?.sessionToken else { return }
                            let success = await profileViewModel.saveChanges(sessionToken: token) { updatedProfile in
                                authViewModel.updateUserProfile(
                                    displayName: updatedProfile.displayName,
                                    phoneNumber: updatedProfile.phoneNumber
                                )
                                HapticFeedback.success()
                                DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
                                    dismiss()
                                }
                            }
                            if !success {
                                HapticFeedback.error()
                            }
                        }
                    } label: {
                        if profileViewModel.isSaving {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle())
                                .scaleEffect(0.8)
                        } else {
                            Text("Save")
                                .fontWeight(.semibold)
                        }
                    }
                    .disabled(!profileViewModel.canSave)
                    .foregroundStyle(profileViewModel.canSave ? ColorTokens.tailAdminBrand : ColorTokens.textTertiary)
                }
            }
            .confirmationDialog(
                "Discard Unsaved Changes?",
                isPresented: $profileViewModel.showDiscardAlert,
                titleVisibility: .visible
            ) {
                Button("Discard Changes", role: .destructive) {
                    profileViewModel.discardChanges {
                        dismiss()
                    }
                }
                Button("Keep Editing", role: .cancel) {}
            } message: {
                Text("You have unsaved changes. Are you sure you want to discard them?")
            }
        }
    }
    
    // MARK: - Avatar Header
    
    private var avatarHeader: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [ColorTokens.tailAdminBrandLight, ColorTokens.tailAdminBrand],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 76, height: 76)
                    .shadow(color: ColorTokens.tailAdminBrand.opacity(0.25), radius: 8, x: 0, y: 4)
                
                Text(avatarInitials)
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(.white)
            }
            
            VStack(spacing: 2) {
                Text(authViewModel.currentUser?.email ?? "voter@campus.edu")
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.textSecondary)
                
                Text("Monogram updates dynamically from your display name")
                    .font(.system(size: 11))
                    .foregroundStyle(ColorTokens.textTertiary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }
    
    private var avatarInitials: String {
        let name = profileViewModel.normalizedDisplayName
        if !name.isEmpty {
            let parts = name.split(separator: " ")
            if parts.count >= 2, let first = parts.first?.first, let second = parts.last?.first {
                return "\(first)\(second)".uppercased()
            } else if let first = name.first {
                return String(first).uppercased()
            }
        }
        return String(authViewModel.currentUser?.email.prefix(1) ?? "U").uppercased()
    }
    
    // MARK: - Editable Fields
    
    private var editableFieldsSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Editable Attributes")
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
                
                Spacer()
                
                Text("Self-Service")
                    .font(Typography.badgeText)
                    .foregroundStyle(ColorTokens.tailAdminBrand)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(ColorTokens.tailAdminBrandBg)
                    .clipShape(Capsule())
            }
            
            // Display Name Field
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Display Name")
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.textPrimary)
                    
                    Spacer()
                    
                    Text("\(profileViewModel.normalizedDisplayName.count)/80")
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundStyle(
                            profileViewModel.normalizedDisplayName.count > 80
                                ? ColorTokens.tailAdminDanger
                                : ColorTokens.textTertiary
                        )
                }
                
                HStack {
                    TextField("Enter your full name", text: $profileViewModel.editDisplayName)
                        .textContentType(.name)
                        .autocorrectionDisabled(false)
                        .font(Typography.callout)
                        .foregroundStyle(ColorTokens.textPrimary)
                    
                    if !profileViewModel.editDisplayName.isEmpty {
                        Button {
                            profileViewModel.editDisplayName = ""
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(ColorTokens.textTertiary)
                        }
                    }
                }
                .padding(12)
                .background(colorScheme == .dark ? ColorTokens.tailAdminDarkCard : Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay {
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(
                            profileViewModel.displayNameError != nil
                                ? ColorTokens.tailAdminDanger
                                : (colorScheme == .dark ? ColorTokens.tailAdminDarkBorder : ColorTokens.tailAdminLightBorder),
                            lineWidth: 1
                        )
                }
                
                if let error = profileViewModel.displayNameError {
                    HStack(spacing: 4) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 11))
                        Text(error)
                            .font(.system(size: 11))
                    }
                    .foregroundStyle(ColorTokens.tailAdminDanger)
                } else {
                    Text("Clearing this field sets display name to null on the identity service.")
                        .font(.system(size: 11))
                        .foregroundStyle(ColorTokens.textTertiary)
                }
            }
            
            Divider()
                .padding(.vertical, 2)
            
            // Phone Number Field
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Phone Number (E.164)")
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.textPrimary)
                    
                    Spacer()
                    
                    Text("Optional")
                        .font(.system(size: 11))
                        .foregroundStyle(ColorTokens.textTertiary)
                }
                
                HStack {
                    TextField("+14155552671", text: $profileViewModel.editPhoneNumber)
                        .keyboardType(.asciiCapable)
                        .textContentType(.telephoneNumber)
                        .autocorrectionDisabled(true)
                        .font(Typography.callout)
                        .foregroundStyle(ColorTokens.textPrimary)
                    
                    if !profileViewModel.editPhoneNumber.isEmpty {
                        Button {
                            profileViewModel.editPhoneNumber = ""
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(ColorTokens.textTertiary)
                        }
                    }
                }
                .padding(12)
                .background(colorScheme == .dark ? ColorTokens.tailAdminDarkCard : Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay {
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(
                            profileViewModel.phoneNumberError != nil
                                ? ColorTokens.tailAdminDanger
                                : (colorScheme == .dark ? ColorTokens.tailAdminDarkBorder : ColorTokens.tailAdminLightBorder),
                            lineWidth: 1
                        )
                }
                
                if let error = profileViewModel.phoneNumberError {
                    HStack(spacing: 4) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 11))
                        Text(error)
                            .font(.system(size: 11))
                    }
                    .foregroundStyle(ColorTokens.tailAdminDanger)
                } else {
                    Text("Must start with '+' followed by 8 to 15 digits (e.g. +14155552671).")
                        .font(.system(size: 11))
                        .foregroundStyle(ColorTokens.textTertiary)
                }
            }
        }
        .glassCard(cornerRadius: 18, padding: 16)
    }
    
    // MARK: - Protected Fields Section
    
    private var protectedFieldsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "lock.shield.fill")
                        .font(.system(size: 13))
                        .foregroundStyle(ColorTokens.textSecondary)
                    Text("Institution-Controlled (Protected)")
                        .font(Typography.cardHeader)
                        .foregroundStyle(ColorTokens.textPrimary)
                }
                
                Spacer()
                
                Text("Authoritative")
                    .font(Typography.badgeText)
                    .foregroundStyle(ColorTokens.textSecondary)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(ColorTokens.stateNeutralBackground)
                    .clipShape(Capsule())
            }
            
            Text("These academic identity attributes are locked to the registrar roster. They cannot be modified through self-service.")
                .font(.system(size: 11))
                .foregroundStyle(ColorTokens.textSecondary)
                .lineLimit(2)
            
            VStack(spacing: 8) {
                protectedRow(
                    label: "Verified Email",
                    value: authViewModel.currentUser?.email ?? "N/A",
                    icon: "envelope.fill"
                )
                
                protectedRow(
                    label: "Account ID / Student ID",
                    value: authViewModel.visibleStudents.first?.studentId ?? (authViewModel.currentUser?.userId ?? "N/A"),
                    icon: "person.text.rectangle"
                )
                
                protectedRow(
                    label: "Department Scope",
                    value: authViewModel.visibleStudents.first?.department ?? "Campus Academic Directory",
                    icon: "building.columns.fill"
                )
                
                protectedRow(
                    label: "Assigned Authority",
                    value: authViewModel.currentUser?.role.displayName ?? "Voter",
                    icon: "key.fill"
                )
                
                protectedRow(
                    label: "Roster Eligibility",
                    value: "Eligible for Active Elections",
                    icon: "checkmark.seal.fill"
                )
            }
            .padding(12)
            .background(colorScheme == .dark ? ColorTokens.tailAdminDarkCard.opacity(0.6) : Color.white.opacity(0.6))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .glassCard(cornerRadius: 18, padding: 16)
    }
    
    private func protectedRow(label: String, value: String, icon: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundStyle(ColorTokens.textTertiary)
                .frame(width: 16)
            
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
                
                Image(systemName: "lock.fill")
                    .font(.system(size: 9))
                    .foregroundStyle(ColorTokens.textTertiary)
            }
        }
    }
    
    // MARK: - Banner Helpers
    
    private func errorBanner(message: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.octagon.fill")
                .foregroundStyle(ColorTokens.tailAdminDanger)
            Text(message)
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.tailAdminDanger)
            Spacer()
        }
        .padding(12)
        .background(ColorTokens.tailAdminDangerBg)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
    
    private func successBanner(message: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(ColorTokens.tailAdminSuccess)
            Text(message)
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.tailAdminSuccess)
            Spacer()
        }
        .padding(12)
        .background(ColorTokens.tailAdminSuccessBg)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

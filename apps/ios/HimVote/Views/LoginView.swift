import SwiftUI

public struct LoginView: View {
    @Bindable var authViewModel: AuthViewModel
    @Environment(\.dismiss) private var dismiss
    
    public enum AuthTab: String, CaseIterable {
        case signIn = "Sign In"
        case registerStudent = "Register Student"
    }
    
    @State private var activeAuthTab: AuthTab = .signIn
    @State private var email: String = ""
    @State private var password: String = ""
    @State private var mfaToken: String = ""
    @State private var showPassword: Bool = false
    @State private var registrationNotice: String?
    
    // Student Sign-Up Fields
    @State private var studentName: String = ""
    @State private var studentIdNumber: String = ""
    @State private var studentDepartment: String = "Computer Science"
    
    @FocusState private var focusedField: Field?
    
    @ScaledMetric(relativeTo: .title) private var headerCircleSize: CGFloat = 72
    @ScaledMetric(relativeTo: .title) private var headerIconSize: CGFloat = 40
    @ScaledMetric(relativeTo: .body) private var inputIconSize: CGFloat = 20
    
    private enum Field: Hashable {
        case email
        case password
        case mfaToken
        case studentName
        case studentId
    }
    
    public init(authViewModel: AuthViewModel) {
        self.authViewModel = authViewModel
    }
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Top Dismiss Bar
                HStack {
                    Spacer()
                    Button {
                        HapticFeedback.light()
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 26))
                            .foregroundStyle(ColorTokens.textTertiary)
                    }
                }
                .padding(.top, 12)
                
                headerView
                
                // Auth Tab Switcher (Sign In vs Register Student)
                Picker("Authentication Mode", selection: $activeAuthTab) {
                    ForEach(AuthTab.allCases, id: \.self) { tab in
                        Text(tab.rawValue).tag(tab)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 4)
                
                if let error = authViewModel.errorMessage {
                    errorBanner(message: error)
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .scale(scale: 0.96)),
                            removal: .opacity
                        ))
                }

                if let registrationNotice {
                    Text(registrationNotice)
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.tailAdminSuccess)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .background(ColorTokens.tailAdminSuccessBg)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                
                credentialsCard
                
                actionButton
                
                Spacer(minLength: 32)
            }
            .padding(.horizontal, 20)
            .animation(SpringTokens.fluid, value: authViewModel.errorMessage)
            .animation(SpringTokens.fluid, value: authViewModel.mfaRequired)
            .animation(SpringTokens.fluid, value: activeAuthTab)
        }
        .background(ColorTokens.tailAdminLightBg)
        .onTapGesture {
            focusedField = nil
        }
    }
    
    private var headerView: some View {
        VStack(spacing: 12) {
            BallotBoxHero()
                .scaleEffect(headerCircleSize / 88)
                .accessibilityHidden(true)
                .padding(.top, 36)
            
            Text("Campus Elections")
                .font(Typography.appTitle)
                .foregroundStyle(ColorTokens.institutionalNavy)
            
            Text("Sign in or register with your campus email.")
                .font(Typography.callout)
                .foregroundStyle(ColorTokens.textSecondary)
                .multilineTextAlignment(.center)
        }
    }
    
    private func errorBanner(message: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(ColorTokens.stateDanger)
                .font(.system(size: inputIconSize))
                .padding(.top, 2)
            
            VStack(alignment: .leading, spacing: 4) {
                Text("Authentication Alert")
                    .font(Typography.captionBold)
                    .foregroundStyle(ColorTokens.stateDanger)
                
                Text(message)
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.stateDanger)
                    .fixedSize(horizontal: false, vertical: true)
            }
            
            Spacer()
            
            Button {
                HapticFeedback.light()
                authViewModel.clearError()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(ColorTokens.stateDanger)
            }
            .accessibilityLabel("Dismiss error message")
        }
        .padding(14)
        .background(ColorTokens.stateDangerBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(ColorTokens.stateDanger.opacity(0.3), lineWidth: 1)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Error message: \(message)")
    }
    
    private var credentialsCard: some View {
        VStack(spacing: 16) {
            if activeAuthTab == .registerStudent {
                // Student Sign-Up Fields
                VStack(alignment: .leading, spacing: 6) {
                    Text("Full Legal Name")
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.textSecondary)
                    
                    TextField("e.g. Clara Chen", text: $studentName)
                        .focused($focusedField, equals: .studentName)
                        .padding(12)
                        .background(Color.white.opacity(0.7))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                
                VStack(alignment: .leading, spacing: 6) {
                    Text("Student Roll / ID Number")
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.textSecondary)
                    
                    TextField("e.g. CS2026-042", text: $studentIdNumber)
                        .focused($focusedField, equals: .studentId)
                        .padding(12)
                        .background(Color.white.opacity(0.7))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }
            
            VStack(alignment: .leading, spacing: 6) {
                Text(activeAuthTab == .registerStudent ? "Campus Email" : "Institutional Email")
                    .font(Typography.captionBold)
                    .foregroundStyle(ColorTokens.textSecondary)
                
                HStack {
                    Image(systemName: "envelope.fill")
                        .foregroundStyle(ColorTokens.textTertiary)
                        .frame(width: inputIconSize)
                    
                    TextField("student@campus.edu", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                        .focused($focusedField, equals: .email)
                }
                .padding(12)
                .background(Color.white.opacity(0.7))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            
            VStack(alignment: .leading, spacing: 6) {
                Text("Password")
                    .font(Typography.captionBold)
                    .foregroundStyle(ColorTokens.textSecondary)
                
                HStack {
                    Image(systemName: "lock.fill")
                        .foregroundStyle(ColorTokens.textTertiary)
                        .frame(width: inputIconSize)
                    
                    if showPassword {
                        TextField("Enter password", text: $password)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                            .focused($focusedField, equals: .password)
                    } else {
                        SecureField("Enter password", text: $password)
                            .textContentType(.password)
                            .focused($focusedField, equals: .password)
                    }
                    
                    Button {
                        HapticFeedback.selection()
                        showPassword.toggle()
                    } label: {
                        Image(systemName: showPassword ? "eye.slash.fill" : "eye.fill")
                            .foregroundStyle(ColorTokens.textTertiary)
                    }
                }
                .padding(12)
                .background(Color.white.opacity(0.7))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
        .padding(18)
        .background(ColorTokens.backgroundSecondary.opacity(0.6))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(ColorTokens.cardBorder, lineWidth: 1)
        )
    }
    
    private var actionButton: some View {
        Button {
            focusedField = nil
            HapticFeedback.medium()
            
            if activeAuthTab == .registerStudent {
                guard !email.isEmpty, !studentName.isEmpty, !studentIdNumber.isEmpty, !password.isEmpty else { return }
                authViewModel.clearError()
                authViewModel.registerStudent(
                    name: studentName,
                    email: email,
                    password: password,
                    studentId: studentIdNumber,
                    department: studentDepartment
                )
                guard authViewModel.errorMessage == nil else { return }
                registrationNotice = "Student account created. Sign in with your new credentials to continue."
                password = ""
                studentName = ""
                studentIdNumber = ""
                activeAuthTab = .signIn
            } else {
                Task {
                    await authViewModel.login(
                        email: email,
                        password: password,
                        mfaToken: authViewModel.mfaRequired ? mfaToken : nil
                    )
                    if authViewModel.isAuthenticated {
                        dismiss()
                    }
                }
            }
        } label: {
            HStack(spacing: 8) {
                if authViewModel.isLoading {
                    ProgressView().tint(.white)
                }
                Text(activeAuthTab == .registerStudent ? "Complete Student Registration" : "Sign In to Account")
                    .font(Typography.cardHeader)
                    .foregroundStyle(.white)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 15)
            .background(ColorTokens.tailAdminBrand)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: ColorTokens.tailAdminBrand.opacity(0.3), radius: 6, x: 0, y: 3)
        }
        .disabled(activeAuthTab == .registerStudent
            ? (email.isEmpty || password.isEmpty || studentName.isEmpty || studentIdNumber.isEmpty)
            : (email.isEmpty || password.isEmpty))
        .opacity(activeAuthTab == .registerStudent
            ? ((email.isEmpty || password.isEmpty || studentName.isEmpty || studentIdNumber.isEmpty) ? 0.6 : 1.0)
            : ((email.isEmpty || password.isEmpty) ? 0.6 : 1.0))
    }
}

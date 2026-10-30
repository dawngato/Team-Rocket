import SwiftUI

public struct LoginView: View {
    @Bindable var authViewModel: AuthViewModel
    
    @State private var email: String = ""
    @State private var password: String = ""
    @State private var mfaToken: String = ""
    @State private var showPassword: Bool = false
    @State private var showSecuritySheet: Bool = false
    @FocusState private var focusedField: Field?
    
    @ScaledMetric(relativeTo: .title) private var headerCircleSize: CGFloat = 88
    @ScaledMetric(relativeTo: .body) private var inputIconSize: CGFloat = 20
    
    private enum Field: Hashable {
        case email
        case password
        case mfaToken
    }
    
    public init(authViewModel: AuthViewModel) {
        self.authViewModel = authViewModel
    }
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 28) {
                headerView
                
                if let error = authViewModel.errorMessage {
                    errorBanner(message: error)
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .scale(scale: 0.96)),
                            removal: .opacity
                        ))
                }
                
                credentialsCard
                
                signInButton
                
                securityFooterButton
                
                Spacer(minLength: 32)
            }
            .padding(.horizontal, 20)
            .animation(SpringTokens.fluid, value: authViewModel.errorMessage)
            .animation(SpringTokens.fluid, value: authViewModel.mfaRequired)
        }
        .background(ColorTokens.backgroundPrimary)
        .onTapGesture {
            focusedField = nil
        }
        .sheet(isPresented: $showSecuritySheet) {
            InstitutionalSecuritySheet()
        }
    }
    
    private var headerView: some View {
        VStack(spacing: 12) {
            BallotBoxHero()
                .scaleEffect(headerCircleSize / 88)
                .accessibilityHidden(true)
                .padding(.top, 36)
            
            Text("HimVote")
                .font(Typography.appTitle)
                .foregroundStyle(ColorTokens.institutionalNavy)
            
            Text("Institutional Cryptographic Election Platform")
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
        VStack(spacing: 18) {
            VStack(alignment: .leading, spacing: 6) {
                Text("University Email")
                    .font(Typography.captionBold)
                    .foregroundStyle(ColorTokens.textSecondary)
                
                HStack {
                    Image(systemName: "envelope.fill")
                        .foregroundStyle(ColorTokens.textTertiary)
                        .frame(width: inputIconSize)
                    
                    TextField("student@example.in", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                        .focused($focusedField, equals: .email)
                        .submitLabel(.next)
                        .onSubmit {
                            focusedField = .password
                        }
                }
                .padding(14)
                .background(ColorTokens.backgroundSecondary)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(focusedField == .email ? ColorTokens.brandAccent : ColorTokens.cardBorder, lineWidth: 1)
                )
                .accessibilityLabel("University Email Input")
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
                    .accessibilityLabel(showPassword ? "Hide password" : "Show password")
                }
                .padding(14)
                .background(ColorTokens.backgroundSecondary)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(focusedField == .password ? ColorTokens.brandAccent : ColorTokens.cardBorder, lineWidth: 1)
                )
                .accessibilityLabel("Password Input")
            }
            
            if authViewModel.mfaRequired {
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("Multi Factor Security Code")
                            .font(Typography.captionBold)
                            .foregroundStyle(ColorTokens.brandAccent)
                        
                        Spacer()
                        
                        Text("6 digits")
                            .font(Typography.caption)
                            .foregroundStyle(ColorTokens.textTertiary)
                    }
                    
                    HStack {
                        Image(systemName: "shield.lefthalf.filled")
                            .foregroundStyle(ColorTokens.brandAccent)
                            .frame(width: inputIconSize)
                        
                        TextField("Enter 6 digit authentication token", text: $mfaToken)
                            .keyboardType(.numberPad)
                            .focused($focusedField, equals: .mfaToken)
                    }
                    .padding(14)
                    .background(ColorTokens.stateWarningBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(ColorTokens.brandAccent, lineWidth: 1.5)
                    )
                    .accessibilityLabel("Multi Factor Authentication Code Input")
                }
                .transition(.asymmetric(
                    insertion: .opacity.combined(with: .scale(scale: 0.95)),
                    removal: .opacity
                ))
            }
        }
        .padding(20)
        .background(ColorTokens.backgroundSecondary.opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(ColorTokens.cardBorder, lineWidth: 1)
        )
    }
    
    private var signInButton: some View {
        Button {
            focusedField = nil
            HapticFeedback.medium()
            Task {
                await authViewModel.login(
                    email: email,
                    password: password,
                    mfaToken: authViewModel.mfaRequired ? mfaToken : nil
                )
                if authViewModel.errorMessage != nil {
                    HapticFeedback.error()
                } else if authViewModel.isAuthenticated {
                    HapticFeedback.success()
                }
            }
        } label: {
            HStack(spacing: 10) {
                if authViewModel.isLoading {
                    ProgressView()
                        .tint(.white)
                }
                
                Text(authViewModel.mfaRequired ? "Verify Code and Proceed" : "Sign In with Institutional ID")
                    .font(Typography.cardHeader)
                    .foregroundStyle(.white)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(ColorTokens.brandPrimary)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: ColorTokens.brandPrimary.opacity(0.25), radius: 6, x: 0, y: 3)
        }
        .interactiveSpringButton()
        .disabled(authViewModel.isLoading || email.isEmpty || password.isEmpty)
        .opacity((email.isEmpty || password.isEmpty) ? 0.6 : 1.0)
        .accessibilityLabel(authViewModel.mfaRequired ? "Verify Multi Factor Code button" : "Sign in button")
    }
    
    private var securityFooterButton: some View {
        Button {
            HapticFeedback.light()
            showSecuritySheet = true
        } label: {
            VStack(spacing: 8) {
                HStack(spacing: 6) {
                    Image(systemName: "lock.shield")
                        .font(.system(size: 14))
                        .foregroundStyle(ColorTokens.brandAccent)
                    
                    Text("Secured by hardware backed RFC 9474 blind credentials")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textTertiary)
                }
                
                HStack(spacing: 4) {
                    Text("Audited verifiable zero knowledge architecture")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textTertiary)
                    
                    Image(systemName: "info.circle")
                        .font(.system(size: 11))
                        .foregroundStyle(ColorTokens.brandAccent)
                }
            }
            .multilineTextAlignment(.center)
            .padding(.top, 12)
        }
        .accessibilityLabel("View institutional security architecture details")
    }
}

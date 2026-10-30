import SwiftUI

public struct LoginView: View {
    @Bindable var authViewModel: AuthViewModel
    
    @State private var email: String = ""
    @State private var password: String = ""
    @State private var mfaToken: String = ""
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    
    public init(authViewModel: AuthViewModel) {
        self.authViewModel = authViewModel
    }
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                VStack(spacing: 8) {
                    Image(systemName: "checkmark.seal.fill")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 56, height: 56)
                        .foregroundStyle(ColorTokens.brandAccent)
                        .accessibilityHidden(true)
                    
                    Text("HimVote")
                        .font(Typography.appTitle)
                        .foregroundStyle(ColorTokens.institutionalNavy)
                    
                    Text("Institutional Election Platform")
                        .font(Typography.callout)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
                .padding(.top, 40)
                
                if let error = authViewModel.errorMessage {
                    HStack(spacing: 12) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(ColorTokens.stateDanger)
                        
                        Text(error)
                            .font(Typography.caption)
                            .foregroundStyle(ColorTokens.stateDanger)
                        
                        Spacer()
                    }
                    .padding()
                    .background(ColorTokens.stateDangerBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .accessibilityElement(children: .combine)
                    .accessibilityLabel("Error message: \(error)")
                }
                
                VStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("University Email")
                            .font(Typography.captionBold)
                            .foregroundStyle(ColorTokens.textSecondary)
                        
                        TextField("student@example.in", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                            .padding()
                            .background(ColorTokens.backgroundSecondary)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(ColorTokens.cardBorder, lineWidth: 1)
                            )
                            .accessibilityLabel("University Email")
                    }
                    
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Password")
                            .font(Typography.captionBold)
                            .foregroundStyle(ColorTokens.textSecondary)
                        
                        SecureField("Enter your password", text: $password)
                            .textContentType(.password)
                            .padding()
                            .background(ColorTokens.backgroundSecondary)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(ColorTokens.cardBorder, lineWidth: 1)
                            )
                            .accessibilityLabel("Password")
                    }
                    
                    if authViewModel.mfaRequired {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("MFA Security Code")
                                .font(Typography.captionBold)
                                .foregroundStyle(ColorTokens.brandAccent)
                            
                            TextField("Enter 6 digit code", text: $mfaToken)
                                .keyboardType(.numberPad)
                                .padding()
                                .background(ColorTokens.stateWarningBackground)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(ColorTokens.brandAccent, lineWidth: 1)
                                )
                                .accessibilityLabel("Multi Factor Authentication code")
                        }
                    }
                }
                .padding(.horizontal)
                
                Button {
                    Task {
                        await authViewModel.login(
                            email: email,
                            password: password,
                            mfaToken: authViewModel.mfaRequired ? mfaToken : nil
                        )
                    }
                } label: {
                    HStack {
                        if authViewModel.isLoading {
                            ProgressView()
                                .tint(.white)
                                .padding(.trailing, 8)
                        }
                        
                        Text(authViewModel.mfaRequired ? "Verify Code and Enter" : "Sign In with Institutional ID")
                            .font(Typography.cardHeader)
                            .foregroundStyle(.white)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(ColorTokens.brandPrimary)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .disabled(authViewModel.isLoading || email.isEmpty || password.isEmpty)
                .opacity((email.isEmpty || password.isEmpty) ? 0.6 : 1.0)
                .padding(.horizontal)
                .accessibilityLabel("Sign in button")
                
                VStack(spacing: 8) {
                    Text("Secured by hardware backed RFC 9474 blind credentials")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textTertiary)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 20)
                
                Spacer()
            }
        }
        .background(ColorTokens.backgroundPrimary)
    }
}

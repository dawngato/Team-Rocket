import SwiftUI
import Charts

public struct SuperAdminDashboardView: View {
    @Bindable var authViewModel: AuthViewModel
    
    @State private var newAdminEmail: String = ""
    @State private var newAdminPassword: String = ""
    @State private var newAdminDept: String = "Engineering & Sciences"
    @State private var showSuccessBanner: Bool = false
    @State private var isBannerError: Bool = false
    @State private var successMessage: String = ""
    
    let departments = [
        "Engineering & Sciences",
        "Humanities & Social Sciences",
        "Business & Management",
        "Medical & Health Sciences",
        "School of Law"
    ]
    
    public init(authViewModel: AuthViewModel) {
        self.authViewModel = authViewModel
    }
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Authority Header
                    heroCard

                    integrityOverviewCard
                    
                    // Provision Administrator Account Form
                    provisionAdminCard
                    
                    // Active Administrators Directory (Only visible to Super User)
                    adminDirectoryCard
                    
                    // System Security Constraints & Boundary Notice
                    securityNoticeCard
                    
                    Spacer(minLength: 90)
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
            }
            .background(ColorTokens.tailAdminLightBg)
            .navigationTitle("System Administration")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
    
    private var heroCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                ZStack {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(ColorTokens.tailAdminBrand.opacity(0.12))
                        .frame(width: 42, height: 42)
                    
                    Image(systemName: "person.2")
                        .font(.system(size: 20))
                        .foregroundStyle(ColorTokens.tailAdminBrand)
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text("System Administration")
                            .font(Typography.sectionHeader)
                            .foregroundStyle(ColorTokens.textPrimary)
                        
                        Text("SUPER USER")
                            .font(Typography.badgeText)
                            .foregroundStyle(ColorTokens.tailAdminBrand)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(ColorTokens.tailAdminBrandBg)
                            .clipShape(Capsule())
                    }
                    
                    Text("Administrator accounts • Election oversight")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textSecondary)
                }
                
                Spacer()
            }
            
            Text("Create administrator accounts, oversee campus elections, and review integrity summaries. Ballot choices remain private; independent checks use externally retained evidence.")
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
        }
        .glassCard(cornerRadius: 18, padding: 16)
    }

    private var integrityOverviewCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Ballot Integrity Overview")
                        .font(Typography.cardHeader)
                        .foregroundStyle(ColorTokens.textPrimary)
                    Text("Illustrative monitoring data")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textTertiary)
                }
                Spacer()
                Image(systemName: "chart.bar.xaxis")
                    .foregroundStyle(ColorTokens.tailAdminBrand)
            }

            HStack(spacing: 10) {
                integrityMetric(title: "Accepted", value: "1,248", color: ColorTokens.tailAdminSuccess)
                integrityMetric(title: "Duplicates", value: "17", color: ColorTokens.tailAdminWarning)
                integrityMetric(title: "Flagged", value: "3", color: ColorTokens.tailAdminDanger)
            }

            Chart {
                BarMark(x: .value("Hour", "08"), y: .value("Accepted", 42)).foregroundStyle(ColorTokens.tailAdminBrand)
                BarMark(x: .value("Hour", "10"), y: .value("Accepted", 188)).foregroundStyle(ColorTokens.tailAdminBrand)
                BarMark(x: .value("Hour", "12"), y: .value("Accepted", 345)).foregroundStyle(ColorTokens.tailAdminBrand)
                BarMark(x: .value("Hour", "14"), y: .value("Accepted", 412)).foregroundStyle(ColorTokens.tailAdminBrand)
                BarMark(x: .value("Hour", "16"), y: .value("Accepted", 215)).foregroundStyle(ColorTokens.tailAdminBrand)
                BarMark(x: .value("Hour", "18"), y: .value("Accepted", 96)).foregroundStyle(ColorTokens.tailAdminBrand)
            }
            .chartYAxis { AxisMarks(position: .leading) }
            .frame(height: 150)

            Text("Counts are sample values for the prototype. Review aggregate integrity signals without exposing individual ballot choices; confirm real results with the independent verifier.")
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
    
    private var provisionAdminCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Image(systemName: "person.badge.plus")
                    .foregroundStyle(ColorTokens.tailAdminBrand)
                Text("Provision Administrator Login")
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
            }
            
            if showSuccessBanner {
                HStack {
                    Image(systemName: isBannerError ? "exclamationmark.circle.fill" : "checkmark.circle.fill")
                        .foregroundStyle(isBannerError ? ColorTokens.tailAdminDanger : ColorTokens.tailAdminSuccess)
                    Text(successMessage)
                        .font(Typography.captionBold)
                        .foregroundStyle(isBannerError ? ColorTokens.tailAdminDanger : ColorTokens.tailAdminSuccess)
                    Spacer()
                }
                .padding(10)
                .background(isBannerError ? ColorTokens.tailAdminDangerBg : ColorTokens.tailAdminSuccessBg)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            
            VStack(alignment: .leading, spacing: 6) {
                Text("Administrator Work Email")
                    .font(Typography.captionBold)
                    .foregroundStyle(ColorTokens.textSecondary)
                
                TextField("officer.name@campus.edu", text: $newAdminEmail)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)
                    .padding(12)
                    .background(Color.white.opacity(0.7))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            
            VStack(alignment: .leading, spacing: 6) {
                Text("Temporary Administrator Password")
                    .font(Typography.captionBold)
                    .foregroundStyle(ColorTokens.textSecondary)
                
                SecureField("Enter secure temporary password", text: $newAdminPassword)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .padding(12)
                    .background(Color.white.opacity(0.7))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            
            VStack(alignment: .leading, spacing: 6) {
                Text("Department Scope Jurisdiction")
                    .font(Typography.captionBold)
                    .foregroundStyle(ColorTokens.textSecondary)
                
                Picker("Department", selection: $newAdminDept) {
                    ForEach(departments, id: \.self) { dept in
                        Text(dept).tag(dept)
                    }
                }
                .pickerStyle(.menu)
                .padding(8)
                .background(Color.white.opacity(0.7))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            
            Button {
                HapticFeedback.medium()
                let emailToCreate = newAdminEmail.trimmingCharacters(in: .whitespacesAndNewlines)
                let passToCreate = newAdminPassword.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !emailToCreate.isEmpty, !passToCreate.isEmpty else { return }
                
                guard authViewModel.createAdminBySuperUser(email: emailToCreate, password: passToCreate, department: newAdminDept) else {
                    successMessage = "That email is already in use."
                    isBannerError = true
                    showSuccessBanner = true
                    return
                }
                successMessage = "Provisioned Admin \(emailToCreate) for \(newAdminDept)"
                isBannerError = false
                showSuccessBanner = true
                newAdminEmail = ""
                newAdminPassword = ""
                
                Task {
                    try? await Task.sleep(nanoseconds: 3_000_000_000)
                    showSuccessBanner = false
                }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "key.fill")
                    Text("Generate Administrator Credentials")
                }
                .font(Typography.callout)
                .fontWeight(.bold)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background((newAdminEmail.isEmpty || newAdminPassword.isEmpty) ? ColorTokens.tailAdminBrand.opacity(0.5) : ColorTokens.tailAdminBrand)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(newAdminEmail.isEmpty || newAdminPassword.isEmpty)
        }
        .glassCard(cornerRadius: 20, padding: 18)
    }
    
    private var adminDirectoryCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Active Administrators (\(authViewModel.visibleAdmins.count))")
                    .font(Typography.cardHeader)
                    .foregroundStyle(ColorTokens.textPrimary)
                
                Spacer()
                
                Text("Administrator accounts")
                    .font(Typography.caption)
                    .foregroundStyle(ColorTokens.textSecondary)
            }
            
            if authViewModel.visibleAdmins.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "person.crop.circle.badge.exclamationmark")
                        .font(.system(size: 32))
                        .foregroundStyle(ColorTokens.textTertiary)
                    Text("No Administrator Accounts Provisioned Yet")
                        .font(Typography.captionBold)
                        .foregroundStyle(ColorTokens.textSecondary)
                    Text("Use the form above to generate the first administrative account. The admin will then be able to log in and manage campus elections.")
                        .font(Typography.caption)
                        .foregroundStyle(ColorTokens.textTertiary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(24)
                .background(Color.white.opacity(0.4))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            } else {
                VStack(spacing: 10) {
                    ForEach(authViewModel.visibleAdmins) { admin in
                        HStack(spacing: 12) {
                            ZStack {
                                Circle()
                                    .fill(ColorTokens.tailAdminBrand.opacity(0.12))
                                    .frame(width: 36, height: 36)
                                
                                Image(systemName: "person.crop.circle.badge.checkmark")
                                    .font(.system(size: 16))
                                    .foregroundStyle(ColorTokens.tailAdminBrand)
                            }
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text(admin.email)
                                    .font(Typography.callout)
                                    .fontWeight(.semibold)
                                    .foregroundStyle(ColorTokens.textPrimary)
                                
                                Text("Scope: \(admin.departmentScope)")
                                    .font(Typography.caption)
                                    .foregroundStyle(ColorTokens.textSecondary)
                            }
                            
                            Spacer()
                            
                            Text("ACTIVE")
                                .font(Typography.badgeText)
                                .foregroundStyle(ColorTokens.tailAdminSuccess)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(ColorTokens.tailAdminSuccessBg)
                                .clipShape(Capsule())
                        }
                        .padding(10)
                        .background(Color.white.opacity(0.6))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
            }
        }
        .glassCard(cornerRadius: 20, padding: 18)
    }
    
    private var securityNoticeCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: "lock.shield")
                    .foregroundStyle(ColorTokens.tailAdminBrand)
                Text("Ballot privacy")
                    .font(Typography.captionBold)
                    .foregroundStyle(ColorTokens.textPrimary)
            }
            
            Text("Administrative screens display aggregate counts only. Individual ballot choices are not shown. Independent verification depends on trusted evidence retained outside the main application database.")
                .font(Typography.caption)
                .foregroundStyle(ColorTokens.textSecondary)
        }
        .padding(14)
        .background(ColorTokens.tailAdminWarningBg)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

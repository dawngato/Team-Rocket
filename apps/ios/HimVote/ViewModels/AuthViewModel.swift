import Foundation
import Observation

@Observable
@MainActor
public final class AuthViewModel {
    public var currentUser: User?
    public var isAuthenticated: Bool = false
    public var isLoading: Bool = false
    public var errorMessage: String?
    public var mfaRequired: Bool = false
    public var pendingMfaEmail: String?
    
    // Standard Super User Root Credentials
    public static let superUserEmail = "superuser@campus.edu"
    public static let superUserPassword = "SuperUser@2026"
    
    // Super User Managed Admins (Initially empty as per requirements)
    public var adminProfiles: [AdminProfile] = []
    
    // Campus Registered Students Roster (Initially empty as per requirements)
    public var registeredStudents: [RegisteredStudent] = []
    
    /// Strict Visibility Rule: Super User can see admin accounts; Admin and Student CANNOT see admin accounts.
    public var visibleAdmins: [AdminProfile] {
        guard let role = currentUser?.role, role == .superAdmin else {
            return []
        }
        return adminProfiles
    }
    
    /// Strict Visibility Rule:
    /// - Admins & Super User can see all registered students.
    /// - Students can ONLY see their own account (cannot see other students).
    /// - Visitors see none.
    public var visibleStudents: [RegisteredStudent] {
        guard let current = currentUser else { return [] }
        if current.role == .superAdmin || current.role == .administrator || current.role == .electionOfficer {
            return registeredStudents
        } else if current.role == .student {
            return registeredStudents.filter { $0.id == current.userId || $0.email == current.email }
        }
        return []
    }
    
    private let apiClient: ApiClientProtocol
    private let keychainService: KeychainServiceProtocol
    
    private static let sessionTokenKey = "himvote_session_token"
    private static let userProfileKey = "himvote_user_profile"
    
    public init(
        apiClient: ApiClientProtocol = ApiClient(),
        keychainService: KeychainServiceProtocol = KeychainService.shared
    ) {
        self.apiClient = apiClient
        self.keychainService = keychainService
        self.restoreSession()
    }
    
    public func restoreSession() {
        do {
            let tokenData = try keychainService.read(forKey: Self.sessionTokenKey)
            guard let token = String(data: tokenData, encoding: .utf8), !token.isEmpty else {
                return
            }
            
            let userData = try keychainService.read(forKey: Self.userProfileKey)
            let user = try JSONDecoder().decode(User.self, from: userData)
            
            self.currentUser = user
            self.isAuthenticated = true
        } catch {
            self.currentUser = nil
            self.isAuthenticated = false
        }
    }
    
    public func login(email: String, password: String, mfaToken: String? = nil) async {
        isLoading = true
        errorMessage = nil
        
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedPassword = password.trimmingCharacters(in: .whitespacesAndNewlines)
        
        guard !trimmedEmail.isEmpty, !trimmedPassword.isEmpty else {
            errorMessage = "Email and password cannot be empty."
            isLoading = false
            return
        }
        
        // 1. Check Super User Root Credentials (Top Priority)
        if trimmedEmail.lowercased() == Self.superUserEmail.lowercased() && trimmedPassword == Self.superUserPassword {
            let user = User(
                userId: "superuser_root",
                email: Self.superUserEmail,
                role: .superAdmin,
                sessionToken: "session_super_\(UUID().uuidString.prefix(8))",
                mfaRequired: false
            )
            self.currentUser = user
            self.isAuthenticated = true
            self.mfaRequired = false
            self.isLoading = false
            return
        }
        
        // 2. Check Provisioned Admin Credentials (Created by Super User)
        if let admin = adminProfiles.first(where: { 
            $0.email.lowercased() == trimmedEmail.lowercased() && 
            ($0.passwordHash == trimmedPassword || $0.passwordHash == nil) 
        }) {
            let user = User(
                userId: admin.id,
                email: admin.email,
                role: .administrator,
                sessionToken: "session_adm_\(UUID().uuidString.prefix(8))",
                mfaRequired: false
            )
            self.currentUser = user
            self.isAuthenticated = true
            self.mfaRequired = false
            self.isLoading = false
            return
        }
        
        // 3. Check Registered Student Credentials
        if let student = registeredStudents.first(where: { 
            $0.email.lowercased() == trimmedEmail.lowercased() && 
            ($0.passwordHash == trimmedPassword || $0.passwordHash == nil) 
        }) {
            let user = User(
                userId: student.id,
                email: student.email,
                role: .student,
                sessionToken: "session_std_\(UUID().uuidString.prefix(8))",
                mfaRequired: false
            )
            self.currentUser = user
            self.isAuthenticated = true
            self.mfaRequired = false
            self.isLoading = false
            return
        }
        
        // 4. Fallback to API Client if external backend server is running
        let request = LoginRequest(
            email: trimmedEmail,
            password: trimmedPassword,
            mfaToken: mfaToken
        )
        
        do {
            let response = try await apiClient.login(request: request)
            
            if response.mfaRequired && (mfaToken == nil || mfaToken?.isEmpty == true) {
                self.mfaRequired = true
                self.pendingMfaEmail = trimmedEmail
                self.isLoading = false
                return
            }
            
            let user = User(
                userId: response.userId,
                email: trimmedEmail,
                role: response.userRole,
                sessionToken: response.sessionToken,
                mfaRequired: response.mfaRequired
            )
            
            if let tokenData = response.sessionToken.data(using: .utf8) {
                try keychainService.save(data: tokenData, forKey: Self.sessionTokenKey)
            }
            
            let userProfileData = try JSONEncoder().encode(user)
            try keychainService.save(data: userProfileData, forKey: Self.userProfileKey)
            
            self.currentUser = user
            self.isAuthenticated = true
            self.mfaRequired = false
            self.pendingMfaEmail = nil
        } catch {
            self.errorMessage = "Invalid email or password. Please try again."
        }
        
        isLoading = false
    }
    
    public func logout() async {
        isLoading = true
        if let token = currentUser?.sessionToken {
            try? await apiClient.logout(sessionToken: token)
        }
        
        try? keychainService.delete(forKey: Self.sessionTokenKey)
        try? keychainService.delete(forKey: Self.userProfileKey)
        
        self.currentUser = nil
        self.isAuthenticated = false
        self.mfaRequired = false
        self.pendingMfaEmail = nil
        self.errorMessage = nil
        self.isLoading = false
    }
    
    public func clearError() {
        self.errorMessage = nil
    }
    
    // Visitor Mode (Unauthenticated Public Observer)
    public func continueAsVisitor() {
        self.currentUser = User(
            userId: "visitor_guest",
            email: "visitor@public.observer",
            role: .visitor,
            sessionToken: "public_observer_token",
            mfaRequired: false
        )
        self.isAuthenticated = true
        self.errorMessage = nil
    }
    
    // Super User creates Admin Login & Password
    @discardableResult
    public func createAdminBySuperUser(email: String, password: String, department: String) -> Bool {
        let normalizedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard currentUser?.role == .superAdmin,
              !normalizedEmail.isEmpty,
              normalizedEmail.caseInsensitiveCompare(Self.superUserEmail) != .orderedSame,
              !adminProfiles.contains(where: { $0.email.caseInsensitiveCompare(normalizedEmail) == .orderedSame }),
              !registeredStudents.contains(where: { $0.email.caseInsensitiveCompare(normalizedEmail) == .orderedSame }) else { return false }
        let newAdmin = AdminProfile(
            id: "adm_\(UUID().uuidString.prefix(6))",
            email: normalizedEmail,
            departmentScope: department,
            createdBySuperUserId: currentUser?.userId ?? "superuser_root",
            createdAtUtc: ISO8601DateFormatter().string(from: Date()),
            passwordHash: password.trimmingCharacters(in: .whitespacesAndNewlines)
        )
        self.adminProfiles.append(newAdmin)
        return true
    }

    // Student Registration (Prompt 1 requirement: Students self-register, matched to synthetic roster)
    public func registerStudent(name: String, email: String, password: String, studentId: String, department: String) {
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedPassword = password.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedStudentId = studentId.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              !trimmedEmail.isEmpty,
              !trimmedPassword.isEmpty,
              !trimmedStudentId.isEmpty else {
            errorMessage = "Complete all student registration fields."
            return
        }

        let isReservedEmail = trimmedEmail.caseInsensitiveCompare(Self.superUserEmail) == .orderedSame ||
            adminProfiles.contains(where: { $0.email.caseInsensitiveCompare(trimmedEmail) == .orderedSame })
        let studentAlreadyExists = registeredStudents.contains(where: {
            $0.email.caseInsensitiveCompare(trimmedEmail) == .orderedSame ||
            $0.studentId.caseInsensitiveCompare(trimmedStudentId) == .orderedSame
        })
        guard !isReservedEmail, !studentAlreadyExists else {
            errorMessage = "That email or student ID cannot be used for this registration."
            return
        }

        let newStudent = RegisteredStudent(
            id: "std_\(UUID().uuidString.prefix(6))",
            studentId: trimmedStudentId,
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            email: trimmedEmail,
            department: department,
            isNominatedCandidate: false,
            candidateContest: nil,
            passwordHash: trimmedPassword
        )
        self.registeredStudents.append(newStudent)
        self.currentUser = nil
        self.isAuthenticated = false
        self.errorMessage = nil
    }
    
    // Admin Promotes a normal student to a Candidate standing in an election
    public func promoteStudentToCandidate(studentId: String, contest: String) {
        if let idx = registeredStudents.firstIndex(where: { $0.id == studentId || $0.studentId == studentId }) {
            registeredStudents[idx].isNominatedCandidate = true
            registeredStudents[idx].candidateContest = contest
        }
    }
    
    // Admin removes Candidate nomination (reverts back to normal student)
    public func demoteCandidateToStudent(studentId: String) {
        if let idx = registeredStudents.firstIndex(where: { $0.id == studentId || $0.studentId == studentId }) {
            registeredStudents[idx].isNominatedCandidate = false
            registeredStudents[idx].candidateContest = nil
        }
    }
}

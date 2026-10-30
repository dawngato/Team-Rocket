import Foundation

public enum UserRole: String, Codable, Sendable, CaseIterable {
    case superAdmin = "super_admin"
    case administrator = "administrator"
    case electionOfficer = "election_officer"
    case teacher = "teacher"
    case student = "student"
    case rosterApprover = "roster_approver"
    case auditor = "auditor"
    case visitor = "visitor"
    
    public var displayName: String {
        switch self {
        case .superAdmin:
            return "Super Administrator"
        case .administrator:
            return "Administrator"
        case .electionOfficer:
            return "Election Officer"
        case .teacher:
            return "Faculty Member"
        case .student:
            return "Eligible Student"
        case .rosterApprover:
            return "Roster Approver"
        case .auditor:
            return "Independent Auditor"
        case .visitor:
            return "Public Visitor"
        }
    }
    
    public var priorityLevel: Int {
        switch self {
        case .superAdmin: return 1   // Highest Authority
        case .administrator, .electionOfficer: return 2
        case .teacher, .rosterApprover: return 3
        case .auditor: return 4
        case .student: return 5      // Normal Student
        case .visitor: return 6      // Public Observer (Lowest / Unauthenticated)
        }
    }
}

public struct RegisteredStudent: Codable, Identifiable, Sendable, Equatable {
    public let id: String
    public let studentId: String
    public let name: String
    public let email: String
    public let department: String
    public var isNominatedCandidate: Bool
    public var candidateContest: String?
    public var passwordHash: String?
    
    public init(
        id: String,
        studentId: String,
        name: String,
        email: String,
        department: String,
        isNominatedCandidate: Bool = false,
        candidateContest: String? = nil,
        passwordHash: String? = nil
    ) {
        self.id = id
        self.studentId = studentId
        self.name = name
        self.email = email
        self.department = department
        self.isNominatedCandidate = isNominatedCandidate
        self.candidateContest = candidateContest
        self.passwordHash = passwordHash
    }
}

public struct AdminProfile: Codable, Identifiable, Sendable, Equatable {
    public let id: String
    public let email: String
    public let departmentScope: String
    public let createdBySuperUserId: String
    public let createdAtUtc: String
    public var passwordHash: String?
    
    public init(
        id: String,
        email: String,
        departmentScope: String,
        createdBySuperUserId: String,
        createdAtUtc: String,
        passwordHash: String? = nil
    ) {
        self.id = id
        self.email = email
        self.departmentScope = departmentScope
        self.createdBySuperUserId = createdBySuperUserId
        self.createdAtUtc = createdAtUtc
        self.passwordHash = passwordHash
    }
}

public struct User: Codable, Identifiable, Sendable, Equatable {
    public var id: String { userId }
    public let userId: String
    public let email: String
    public let role: UserRole
    public let sessionToken: String
    public let mfaRequired: Bool
    
    public enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case email
        case role
        case sessionToken = "session_token"
        case mfaRequired = "mfa_required"
    }
    
    public init(
        userId: String,
        email: String,
        role: UserRole,
        sessionToken: String,
        mfaRequired: Bool = false
    ) {
        self.userId = userId
        self.email = email
        self.role = role
        self.sessionToken = sessionToken
        self.mfaRequired = mfaRequired
    }
}

public struct LoginRequest: Codable, Sendable, Equatable {
    public let email: String
    public let password: String
    public let mfaToken: String?
    
    public enum CodingKeys: String, CodingKey {
        case email
        case password
        case mfaToken = "mfa_token"
    }
    
    public init(email: String, password: String, mfaToken: String? = nil) {
        self.email = email
        self.password = password
        self.mfaToken = mfaToken
    }
}

public struct LoginResponse: Codable, Sendable, Equatable {
    public let sessionToken: String
    public let userId: String
    public let role: String
    public let mfaRequired: Bool
    
    public enum CodingKeys: String, CodingKey {
        case sessionToken = "session_token"
        case userId = "user_id"
        case role
        case mfaRequired = "mfa_required"
    }
    
    public init(sessionToken: String, userId: String, role: String, mfaRequired: Bool) {
        self.sessionToken = sessionToken
        self.userId = userId
        self.role = role
        self.mfaRequired = mfaRequired
    }
    
    public var userRole: UserRole {
        UserRole(rawValue: role) ?? .student
    }
}

public struct RosterElection: Codable, Identifiable, Sendable, Equatable {
    public var id: String { electionId }
    public let electionId: String
    public let state: String
    public let eligible: Bool
    public let credentialStatus: String?
    
    public enum CodingKeys: String, CodingKey {
        case electionId = "election_id"
        case state
        case eligible
        case credentialStatus = "credential_status"
    }
    
    public init(
        electionId: String,
        state: String,
        eligible: Bool,
        credentialStatus: String? = nil
    ) {
        self.electionId = electionId
        self.state = state
        self.eligible = eligible
        self.credentialStatus = credentialStatus
    }
}

public struct RosterMeResponse: Codable, Sendable, Equatable {
    public let eligible: Bool
    public let elections: [RosterElection]
    
    public init(eligible: Bool, elections: [RosterElection]) {
        self.eligible = eligible
        self.elections = elections
    }
}

public struct ApiErrorPayload: Codable, Sendable, Equatable {
    public let errorCode: String
    public let message: String
    public let requestId: String
    
    public enum CodingKeys: String, CodingKey {
        case errorCode = "error_code"
        case message
        case requestId = "request_id"
    }
    
    public init(errorCode: String, message: String, requestId: String) {
        self.errorCode = errorCode
        self.message = message
        self.requestId = requestId
    }
}

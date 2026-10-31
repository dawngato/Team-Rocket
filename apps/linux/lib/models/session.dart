import 'json_utils.dart';

/// User roles served by the Identity origin.
enum UserRole {
  admin,
  student,
  unknown;

  static UserRole fromWire(String? raw) {
    for (final r in UserRole.values) {
      if (r.name == raw) return r;
    }
    return unknown;
  }

  bool get isAdmin => this == UserRole.admin;
}

/// `SessionProfile` from `/v1/auth/me` and login `profile`.
class SessionProfile {
  final String id;
  final UserRole role;
  final String name;
  final String email;
  final String? studentNumber;
  final bool mfaEnabled;
  final bool verified;

  const SessionProfile({
    required this.id,
    this.role = UserRole.unknown,
    this.name = '',
    this.email = '',
    this.studentNumber,
    this.mfaEnabled = false,
    this.verified = false,
  });

  factory SessionProfile.fromJson(Map<String, dynamic> json) => SessionProfile(
        id: asStringOr(json, 'id', ''),
        role: UserRole.fromWire(asString(json, 'role')),
        name: asStringOr(json, 'name', ''),
        email: asStringOr(json, 'email', ''),
        studentNumber: asString(json, 'student_number'),
        mfaEnabled: asBool(json, 'mfa_enabled'),
        verified: asBool(json, 'verified'),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'role': role.name,
        'name': name,
        'email': email,
        'student_number': studentNumber,
        'mfa_enabled': mfaEnabled,
        'verified': verified,
      };
}

/// `session` object inside the login response.
class UserSession {
  final String id;
  final DateTime startedAt;
  final bool mfaEnabled;
  final String device;

  const UserSession({
    required this.id,
    required this.startedAt,
    this.mfaEnabled = false,
    this.device = '',
  });

  factory UserSession.fromJson(Map<String, dynamic> json) => UserSession(
        id: asStringOr(json, 'id', ''),
        startedAt: parseIso(json['started_at']) ?? DateTime.now().toUtc(),
        mfaEnabled: asBool(json, 'mfa_enabled'),
        device: asStringOr(json, 'device', ''),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'started_at': isoString(startedAt),
        'mfa_enabled': mfaEnabled,
        'device': device,
      };
}

/// `POST /v1/auth/login` response.
class LoginResponse {
  final String accessToken;
  final UserSession session;
  final SessionProfile profile;

  const LoginResponse({
    required this.accessToken,
    required this.session,
    required this.profile,
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json) => LoginResponse(
        accessToken: asStringOr(json, 'access_token', ''),
        session: UserSession.fromJson(
            (json['session'] as Map<String, dynamic>?) ?? const {}),
        profile: SessionProfile.fromJson(
            (json['profile'] as Map<String, dynamic>?) ?? const {}),
      );
}

/// `POST /v1/auth/claim` response.
class BootstrapClaimResponse {
  final String claimId;
  final String status; // accepted | pending_review
  final String studentNumber;
  final String message;

  const BootstrapClaimResponse({
    required this.claimId,
    required this.status,
    required this.studentNumber,
    this.message = '',
  });

  factory BootstrapClaimResponse.fromJson(Map<String, dynamic> json) =>
      BootstrapClaimResponse(
        claimId: asStringOr(json, 'claim_id', ''),
        status: asStringOr(json, 'status', ''),
        studentNumber: asStringOr(json, 'student_number', ''),
        message: asStringOr(json, 'message', ''),
      );
}

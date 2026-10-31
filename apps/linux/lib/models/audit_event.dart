import 'json_utils.dart';

/// One row of `/v1/admin/audit-events` (append-only admin log).
class AuditEvent {
  final String id;
  final DateTime at;
  final String actor;
  final String action; // e.g. ELECTION_CREATED, ELECTION_FREEZE
  final String target;
  final String detail;

  const AuditEvent({
    required this.id,
    required this.at,
    required this.actor,
    required this.action,
    required this.target,
    this.detail = '',
  });

  factory AuditEvent.fromJson(Map<String, dynamic> json) => AuditEvent(
        id: asStringOr(json, 'id', ''),
        at: parseIso(json['at']) ?? DateTime.now().toUtc(),
        actor: asStringOr(json, 'actor', ''),
        action: asStringOr(json, 'action', ''),
        target: asStringOr(json, 'target', ''),
        detail: asStringOr(json, 'detail', ''),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'at': isoString(at),
        'actor': actor,
        'action': action,
        'target': target,
        'detail': detail,
      };
}

/// Pending trustee approval from `/v1/admin/approvals`.
class AdminApproval {
  final String id;
  final String kind; // ELECTION_CREATE | ELECTION_FREEZE | ...
  final DateTime at;
  final String summary;
  final String status;

  const AdminApproval({
    required this.id,
    required this.kind,
    required this.at,
    required this.summary,
    this.status = 'pending',
  });

  factory AdminApproval.fromJson(Map<String, dynamic> json) => AdminApproval(
        id: asStringOr(json, 'id', ''),
        kind: asStringOr(json, 'kind', ''),
        at: parseIso(json['at']) ?? DateTime.now().toUtc(),
        summary: asStringOr(json, 'summary', ''),
        status: asStringOr(json, 'status', 'pending'),
      );
}

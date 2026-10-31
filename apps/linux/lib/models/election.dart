import 'json_utils.dart';

/// Election lifecycle statuses — API_CONTRACT.md:
/// draft|scheduled|open|paused|closed|counting|certified|archived.
enum ElectionStatus {
  draft,
  scheduled,
  open,
  paused,
  closed,
  counting,
  certified,
  archived,
  unknown;

  static ElectionStatus fromWire(String? raw) {
    for (final s in ElectionStatus.values) {
      if (s.name == raw) return s;
    }
    return unknown;
  }

  String get wire => name;
}

class Election {
  final String id;
  final String title;
  final ElectionStatus status;
  final DateTime? startsAt;
  final DateTime? endsAt;
  final String description;
  final int candidateCount;

  const Election({
    required this.id,
    required this.title,
    required this.status,
    this.startsAt,
    this.endsAt,
    this.description = '',
    this.candidateCount = 0,
  });

  factory Election.fromJson(Map<String, dynamic> json) => Election(
        id: asStringOr(json, 'id', ''),
        title: asStringOr(json, 'title', 'Untitled election'),
        status: ElectionStatus.fromWire(asString(json, 'status')),
        startsAt: parseIso(json['starts_at']),
        endsAt: parseIso(json['ends_at']),
        description: asStringOr(json, 'description', ''),
        candidateCount: asInt(json, 'candidate_count'),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'status': status.wire,
        'starts_at': isoString(startsAt),
        'ends_at': isoString(endsAt),
        'description': description,
        'candidate_count': candidateCount,
      };

  Election copyWith({ElectionStatus? status}) => Election(
        id: id,
        title: title,
        status: status ?? this.status,
        startsAt: startsAt,
        endsAt: endsAt,
        description: description,
        candidateCount: candidateCount,
      );

  bool get isOpen => status == ElectionStatus.open;

  @override
  String toString() => 'Election($id, $title, ${status.wire})';
}

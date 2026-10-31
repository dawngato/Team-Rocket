import 'json_utils.dart';

class Candidate {
  final String id;
  final String name;
  final String slate;
  final String manifesto;
  final String? photoUrl;

  const Candidate({
    required this.id,
    required this.name,
    this.slate = '',
    this.manifesto = '',
    this.photoUrl,
  });

  factory Candidate.fromJson(Map<String, dynamic> json) => Candidate(
        id: asStringOr(json, 'id', ''),
        name: asStringOr(json, 'name', 'Unknown candidate'),
        slate: asStringOr(json, 'slate', ''),
        manifesto: asStringOr(json, 'manifesto', ''),
        photoUrl: asString(json, 'photo_url'),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'slate': slate,
        'manifesto': manifesto,
        'photo_url': photoUrl,
      };
}

/// One row of `/v1/elections/{id}/results`.
class CandidateTally {
  final String candidateId;
  final String candidateName;
  final int votes;

  const CandidateTally({
    required this.candidateId,
    required this.candidateName,
    required this.votes,
  });

  factory CandidateTally.fromJson(Map<String, dynamic> json) => CandidateTally(
        candidateId: asStringOr(json, 'candidate_id', ''),
        candidateName: asStringOr(json, 'candidate_name', ''),
        votes: asInt(json, 'votes'),
      );

  Map<String, dynamic> toJson() =>
      {'candidate_id': candidateId, 'candidate_name': candidateName, 'votes': votes};
}

/// Published results payload (RankedPivot for ResultsComparison DIFF chips).
class PublishedResults {
  final String electionId;
  final String title;
  final String status;
  final int totalBallots;
  final double turnoutPct;
  final List<CandidateTally> rows;
  final DateTime? publishedAt;

  const PublishedResults({
    required this.electionId,
    required this.title,
    required this.status,
    required this.totalBallots,
    required this.turnoutPct,
    required this.rows,
    this.publishedAt,
  });

  factory PublishedResults.fromJson(Map<String, dynamic> json) => PublishedResults(
        electionId: asStringOr(json, 'election_id', ''),
        title: asStringOr(json, 'title', ''),
        status: asStringOr(json, 'status', ''),
        totalBallots: asInt(json, 'total_ballots'),
        turnoutPct: (json['turnout_pct'] is num)
            ? (json['turnout_pct'] as num).toDouble()
            : 0.0,
        rows: ((json['rows'] as List?) ?? const [])
            .whereType<Map<String, dynamic>>() // never assume raw map types
            .map(CandidateTally.fromJson)
            .toList(),
        publishedAt: parseIso(json['published_at']),
      );

  Map<String, dynamic> toJson() => {
        'election_id': electionId,
        'title': title,
        'status': status,
        'total_ballots': totalBallots,
        'turnout_pct': turnoutPct,
        'rows': rows.map((r) => r.toJson()).toList(),
        'published_at': isoString(publishedAt),
      };
}

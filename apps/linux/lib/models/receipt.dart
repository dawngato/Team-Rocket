import 'json_utils.dart';

/// The four pipeline stages of a receipt — API_CONTRACT.md:
/// SUBMITTED -> ACCEPTED -> WITNESSED -> ANCHORED.
enum ReceiptStage {
  submitted,
  accepted,
  witnessed,
  anchored,
  unknown;

  static ReceiptStage fromWire(String? raw) {
    for (final s in ReceiptStage.values) {
      if (s.name.toUpperCase() == (raw ?? '').toUpperCase()) return s;
    }
    return unknown;
  }

  String get wire => name.toUpperCase();
}

class ReceiptStageEntry {
  final ReceiptStage stage;
  final DateTime at;
  final String note;

  const ReceiptStageEntry({
    required this.stage,
    required this.at,
    this.note = '',
  });

  factory ReceiptStageEntry.fromJson(Map<String, dynamic> json) => ReceiptStageEntry(
        stage: ReceiptStage.fromWire(asString(json, 'stage')),
        at: parseIso(json['at']) ?? DateTime.now().toUtc(),
        note: asStringOr(json, 'note', ''),
      );

  Map<String, dynamic> toJson() =>
      {'stage': stage.wire, 'at': isoString(at), 'note': note};
}

/// A saved receipt — the `receipt_wallet_entry` from `/v1/cast/`, persisted
/// at `$XDG_DATA_HOME/himvote/receipts.json` (see lib/storage/).
class SavedReceipt {
  final String btch;
  final String electionId;
  final String electionTitle;
  final DateTime submittedAt;
  final String status;
  final String voterRef;
  final List<ReceiptStageEntry> stages;

  const SavedReceipt({
    required this.btch,
    required this.electionId,
    required this.electionTitle,
    required this.submittedAt,
    required this.status,
    this.voterRef = '',
    this.stages = const [],
  });

  factory SavedReceipt.fromJson(Map<String, dynamic> json) => SavedReceipt(
        btch: asStringOr(json, 'btch', ''),
        electionId: asStringOr(json, 'election_id', ''),
        electionTitle: asStringOr(json, 'election_title', ''),
        submittedAt: parseIso(json['submitted_at']) ?? DateTime.now().toUtc(),
        status: asStringOr(json, 'status', ''),
        voterRef: asStringOr(json, 'voter_ref', ''),
        stages: ((json['stages'] as List?) ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(ReceiptStageEntry.fromJson)
            .toList(),
      );

  Map<String, dynamic> toJson() => {
        'btch': btch,
        'election_id': electionId,
        'election_title': electionTitle,
        'submitted_at': isoString(submittedAt),
        'status': status,
        'voter_ref': voterRef,
        'stages': stages.map((s) => s.toJson()).toList(),
      };

  String get displayHandle => btch.isEmpty ? 'HV-????-????-????' : btch;
}

/// The receipts.json root document.
class ReceiptWallet {
  static const int currentVersion = 1;
  final int version;
  final List<SavedReceipt> receipts;

  const ReceiptWallet({this.version = currentVersion, this.receipts = const []});

  factory ReceiptWallet.fromJson(Map<String, dynamic> json) => ReceiptWallet(
        version: asInt(json, 'version', currentVersion),
        receipts: ((json['receipts'] as List?) ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(SavedReceipt.fromJson)
            .toList(),
      );

  Map<String, dynamic> toJson() =>
      {'version': version, 'receipts': receipts.map((r) => r.toJson()).toList()};

  ReceiptWallet withReceipt(SavedReceipt receipt) => ReceiptWallet(
        version: version,
        receipts: [receipt, ...receipts.where((r) => r.btch != receipt.btch)],
      );
}

/// Response of `POST /v1/cast/`.
class CastResponse {
  final String btch;
  final String submissionStatus;
  final List<ReceiptStage> stages;
  final SavedReceipt receiptWalletEntry;

  const CastResponse({
    required this.btch,
    required this.submissionStatus,
    required this.stages,
    required this.receiptWalletEntry,
  });

  factory CastResponse.fromJson(Map<String, dynamic> json) => CastResponse(
        btch: asStringOr(json, 'btch', ''),
        submissionStatus: asStringOr(json, 'submission_status', ''),
        stages: ((json['stages'] as List?) ?? const [])
            .map((s) => ReceiptStage.fromWire(s?.toString()))
            .toList(),
        receiptWalletEntry: SavedReceipt.fromJson(
            (json['receipt_wallet_entry'] as Map<String, dynamic>?) ?? const {}),
      );
}

/// Response of `POST /v1/engine/verify_inclusion`.
class VerifyInclusionResponse {
  final String status; // WITNESSED | ANCHORED | UNKNOWN_RECEIPT
  final String btch;
  final int leafIndex;
  final Map<String, dynamic> proof; // RFC 9162-style, kept raw for the UI
  final Map<String, dynamic> witness;
  final DateTime? verifiedAt;

  const VerifyInclusionResponse({
    required this.status,
    required this.btch,
    required this.leafIndex,
    this.proof = const {},
    this.witness = const {},
    this.verifiedAt,
  });

  factory VerifyInclusionResponse.fromJson(Map<String, dynamic> json) =>
      VerifyInclusionResponse(
        status: asStringOr(json, 'status', 'UNKNOWN_RECEIPT'),
        btch: asStringOr(json, 'btch', ''),
        leafIndex: asInt(json, 'leaf_index'),
        proof: (json['proof'] as Map<String, dynamic>?) ?? const {},
        witness: (json['witness'] as Map<String, dynamic>?) ?? const {},
        verifiedAt: parseIso(json['verified_at']),
      );

  bool get isAnchored => status == 'ANCHORED';
}

/// Response of `POST /v1/engine/verify_tally`.
class VerifyTallyResponse {
  final String electionId;
  final String status; // VERIFIED | UNVERIFIED
  final Map<String, int> identityTally;
  final Map<String, int> witnessTally;
  final bool match;
  final String ledgerRef;

  const VerifyTallyResponse({
    required this.electionId,
    required this.status,
    required this.identityTally,
    required this.witnessTally,
    required this.match,
    this.ledgerRef = '',
  });

  factory VerifyTallyResponse.fromJson(Map<String, dynamic> json) =>
      VerifyTallyResponse(
        electionId: asStringOr(json, 'election_id', ''),
        status: asStringOr(json, 'status', ''),
        identityTally: _tallyMap(json['identity_origin_tally']),
        witnessTally: _tallyMap(json['witness_tally']),
        match: asBool(json, 'match'),
        ledgerRef: asStringOr(json, 'ledger_ref', ''),
      );

  static Map<String, int> _tallyMap(dynamic raw) {
    final out = <String, int>{};
    if (raw is Map) {
      raw.forEach((k, v) {
        if (k is String) out[k] = v is num ? v.toInt() : 0;
      });
    }
    return out;
  }
}

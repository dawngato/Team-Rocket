/// Shared JSON helpers: tolerant field extraction used by all models.
///
/// Server payloads come from API_CONTRACT.md shapes and may carry extra
/// fields (e.g. `candidate_count`) — models must ignore unknown keys, never
/// crash on them.
library;

String? asString(Map<String, dynamic> json, String key) {
  final v = json[key];
  return v is String ? v : null;
}

int asInt(Map<String, dynamic> json, String key, [int fallback = 0]) {
  final v = json[key];
  if (v is int) return v;
  if (v is num) return v.toInt();
  if (v is String) return int.tryParse(v) ?? fallback;
  return fallback;
}

bool asBool(Map<String, dynamic> json, String key, [bool fallback = false]) {
  final v = json[key];
  if (v is bool) return v;
  if (v is String) return v.toLowerCase() == 'true';
  return fallback;
}

String asStringOr(Map<String, dynamic> json, String key, String fallback) {
  final v = json[key];
  return v is String ? v : fallback;
}

/// Parses ISO-8601 strings ("2026-10-31T04:11:41Z") to UTC [DateTime].
/// Never throws on the wire: unparseable input yields null.
DateTime? parseIso(dynamic value) {
  if (value == null) return null;
  final s = value.toString().trim().isEmpty ? null : value.toString();
  if (s == null) return null;
  final dt = DateTime.tryParse(s);
  return dt?.toUtc();
}

String? isoString(DateTime? dt) {
  if (dt == null) return null;
  final u = dt.toUtc();
  String two(int n) => n.toString().padLeft(2, '0');
  return '${u.year}-${two(u.month)}-${two(u.day)}T'
      '${two(u.hour)}:${two(u.minute)}:${two(u.second)}Z';
}

/// Typed API failure — mirrors the FastAPI convention the backend uses
/// ({detail: ...} on error bodies), so the UI can show real server messages.
class ApiException implements Exception {
  /// HTTP status code; null for transport-level failures.
  final int? statusCode;

  /// Human-readable message: the server's `detail` field, or a client-side
  /// summary for network errors.
  final String detail;

  /// True when the server was never reached (DNS/connect/timeout).
  final bool isNetwork;

  const ApiException({this.statusCode, this.detail = '', this.isNetwork = false});

  factory ApiException.network(String cause) =>
      ApiException(detail: 'Network error: $cause', isNetwork: true);

  bool get isUnauthorized => statusCode == 401;

  bool get isConflict => statusCode == 409;

  bool get isNotFound => statusCode == 404;

  @override
  String toString() => 'ApiException(${isNetwork ? 'network' : statusCode}): $detail';
}

import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/app_settings.dart';
import '../models/audit_event.dart';
import '../models/candidate.dart';
import '../models/election.dart';
import '../models/receipt.dart';
import '../models/session.dart';
import 'api_exception.dart';

/// The three independent origins from API_CONTRACT.md.
enum OriginKind { identity, casting, witness }

/// Port of the tkinter LinuxApiClient — auth, elections, cast, verification,
/// audit. Every path is defined in API_CONTRACT.md; nothing invented here.
///
/// Uses [AppSettings] for per-origin base URLs (defaults match the dev mock),
/// attaches `Authorization: Bearer <token>` after login, and maps non-2xx
/// responses to [ApiException] with the server's `detail` message.
class LinuxApiClient {
  LinuxApiClient({
    AppSettings? settings,
    http.Client? httpClient,
    this.timeout = const Duration(seconds: 10),
  })  : _settings = settings ?? AppSettings.defaults(),
        _http = httpClient ?? http.Client();

  AppSettings _settings;
  final http.Client _http;
  final Duration timeout;

  String? accessToken;

  bool get isLoggedIn => accessToken != null && accessToken!.isNotEmpty;

  /// Swaps the three origin URLs at runtime (Settings screen) so subsequent
  /// requests follow the newly configured base URLs.
  void reconfigure(AppSettings settings) => _settings = settings;

  String _base(OriginKind origin) => switch (origin) {
        OriginKind.identity => _settings.identityOrigin,
        OriginKind.casting => _settings.castingOrigin,
        OriginKind.witness => _settings.witnessOrigin,
      };

  String _url(OriginKind origin, String path) => '${_base(origin)}$path';

  // ---------------------------------------------------------------- plumbing

  Future<dynamic> _send(
    OriginKind origin,
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool auth = true,
  }) async {
    final uri = Uri.parse(_url(origin, path));
    try {
      final request = http.Request(method, uri);
      request.headers['Content-Type'] = 'application/json';
      if (auth && isLoggedIn) {
        request.headers['Authorization'] = 'Bearer $accessToken';
      }
      if (body != null) request.body = jsonEncode(body);

      final streamed = await _http.send(request).timeout(timeout);
      final response = await http.Response.fromStream(streamed);

      final decoded = _decode(response.body);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return decoded;
      }
      throw ApiException(
        statusCode: response.statusCode,
        detail: decoded is Map<String, dynamic>
            ? decoded['detail']?.toString() ?? 'HTTP ${response.statusCode}'
            : 'HTTP ${response.statusCode}',
      );
    } on ApiException {
      rethrow;
    } on TimeoutException {
      throw ApiException.network('timeout after ${timeout.inSeconds}s');
    } catch (e) {
      throw ApiException.network(e.toString());
    }
  }

  dynamic _decode(String raw) {
    if (raw.trim().isEmpty) return <String, dynamic>{};
    try {
      return jsonDecode(raw);
    } catch (_) {
      return <String, dynamic>{};
    }
  }

  Map<String, dynamic> _asMap(dynamic value) =>
      (value as Map<String, dynamic>?) ?? const {};

  /// Health ping with measured latency; null when the origin is unreachable.
  Future<Duration?> ping(OriginKind origin) async {
    final stopwatch = Stopwatch()..start();
    try {
      await _send(origin, 'GET', '/v1/health', auth: false);
      stopwatch.stop();
      return stopwatch.elapsed;
    } catch (_) {
      return null;
    }
  }

  // ------------------------------------------------------------------- auth

  /// POST /v1/auth/login
  Future<LoginResponse> login(String identifier, String password,
      {String? mfaToken}) async {
    final raw = await _send(
      OriginKind.identity,
      'POST',
      '/v1/auth/login',
      auth: false,
      body: {
        'identifier': identifier,
        'password': password,
        'mfa_token': ?mfaToken,
      },
    );
    final login = LoginResponse.fromJson(_asMap(raw));
    accessToken = login.accessToken;
    return login;
  }

  /// POST /v1/auth/logout
  Future<void> logout() async {
    try {
      await _send(OriginKind.identity, 'POST', '/v1/auth/logout');
    } finally {
      accessToken = null;
    }
  }

  /// GET /v1/auth/me
  Future<SessionProfile> me() async =>
      SessionProfile.fromJson(_asMap(await _send(OriginKind.identity, 'GET', '/v1/auth/me')));

  /// POST /v1/auth/mfa/setup  -> raw {secret, qr, issuer, account}
  Future<Map<String, dynamic>> mfaSetup() async =>
      _asMap(await _send(OriginKind.identity, 'POST', '/v1/auth/mfa/setup', body: {}));

  /// POST /v1/auth/mfa/verify -> {ok}
  Future<bool> mfaVerify(String code) async {
    final raw = await _send(OriginKind.identity, 'POST', '/v1/auth/mfa/verify',
        body: {'code': code});
    return _asMap(raw)['ok'] == true;
  }

  /// POST /v1/auth/claim
  Future<BootstrapClaimResponse> claim(String studentNumber,
      {String? email, String? name}) async {
    final raw = await _send(
      OriginKind.identity,
      'POST',
      '/v1/auth/claim',
      auth: false,
      body: {
        'student_number': studentNumber,
        'email': ?email,
        'name': ?name,
      },
    );
    return BootstrapClaimResponse.fromJson(_asMap(raw));
  }

  // -------------------------------------------------------------- elections

  /// GET /v1/elections (optional ?status= filter)
  Future<List<Election>> elections({String? status}) async {
    final raw = await _send(OriginKind.identity, 'GET',
        '/v1/elections${status != null ? '?status=$status' : ''}');
    return (raw as List? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(Election.fromJson)
        .toList();
  }

  /// GET /v1/elections/{id}
  Future<Election> election(String id) async =>
      Election.fromJson(_asMap(await _send(OriginKind.identity, 'GET', '/v1/elections/$id')));

  /// GET /v1/elections/{id}/candidates
  Future<List<Candidate>> candidates(String electionId) async {
    final raw = await _send(
        OriginKind.identity, 'GET', '/v1/elections/$electionId/candidates');
    return (raw as List? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(Candidate.fromJson)
        .toList();
  }

  /// GET /v1/elections/{id}/results
  Future<PublishedResults> results(String electionId) async =>
      PublishedResults.fromJson(_asMap(await _send(
          OriginKind.identity, 'GET', '/v1/elections/$electionId/results')));

  /// GET /v1/elections/{id}/evidence -> raw archive metadata
  Future<Map<String, dynamic>> evidence(String electionId) async =>
      _asMap(await _send(
          OriginKind.identity, 'GET', '/v1/elections/$electionId/evidence'));

  /// POST /v1/elections (admin create)
  Future<Election> createElection({
    required String title,
    DateTime? startsAt,
    DateTime? endsAt,
    String description = '',
    List<Map<String, String>> candidates = const [],
  }) async {
    final raw = await _send(
      OriginKind.identity,
      'POST',
      '/v1/elections',
      body: {
        'title': title,
        'starts_at': startsAt?.toUtc().toIso8601String(),
        'ends_at': endsAt?.toUtc().toIso8601String(),
        'description': description,
        'candidates': candidates,
      },
    );
    return Election.fromJson(_asMap(raw));
  }

  /// POST /v1/elections/{id}/{action} — open|pause|close|freeze|cancel
  Future<Election> transitionElection(String id, String action) async =>
      Election.fromJson(_asMap(await _send(
          OriginKind.identity, 'POST', '/v1/elections/$id/$action', body: {})));

  /// PUT /v1/elections/{id} (admin update, partial)
  Future<Election> updateElection(String id, Map<String, dynamic> fields) async =>
      Election.fromJson(_asMap(await _send(
          OriginKind.identity, 'PUT', '/v1/elections/$id', body: fields)));

  // ------------------------------------------------------------------ ballot

  /// POST /v1/cast/ — Casting origin. The client NEVER encrypts (Rule 0.1(3)).
  Future<CastResponse> castBallot(
    String electionId,
    List<String> selections, {
    String? studentNumber,
  }) async {
    final raw = await _send(
      OriginKind.casting,
      'POST',
      '/v1/cast/',
      auth: false,
      body: {
        'election_id': electionId,
        'selections': selections,
        'student_number': ?studentNumber,
      },
    );
    return CastResponse.fromJson(_asMap(raw));
  }

  // -------------------------------------------------------------- verification

  /// POST /v1/engine/verify_inclusion — Witness origin, RFC 9162 proof.
  Future<VerifyInclusionResponse> verifyInclusion(String btch) async =>
      VerifyInclusionResponse.fromJson(_asMap(await _send(
          OriginKind.witness, 'POST', '/v1/engine/verify_inclusion',
          body: {'btch': btch})));

  /// POST /v1/engine/verify_tally — Witness origin.
  Future<VerifyTallyResponse> verifyTally(String electionId) async =>
      VerifyTallyResponse.fromJson(_asMap(await _send(
          OriginKind.witness, 'POST', '/v1/engine/verify_tally',
          body: {'election_id': electionId})));

  /// GET /witness/public_key — raw Ed25519 hex key for pin verification.
  Future<String> witnessPublicKey() async {
    final raw = await _send(
        OriginKind.witness, 'GET', '/witness/public_key', auth: false);
    return _asMap(raw)['public_key']?.toString() ?? '';
  }

  // ------------------------------------------------------------------- admin

  /// GET /v1/admin/audit-events (append-only log)
  Future<List<AuditEvent>> auditEvents({int limit = 50}) async {
    final raw = await _send(
        OriginKind.identity, 'GET', '/v1/admin/audit-events?limit=$limit');
    final body = _asMap(raw);
    return (body['events'] as List? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(AuditEvent.fromJson)
        .toList();
  }

  /// GET /v1/admin/approvals
  Future<List<AdminApproval>> approvals() async {
    final raw = await _send(OriginKind.identity, 'GET', '/v1/admin/approvals');
    final body = _asMap(raw);
    return (body['approvals'] as List? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(AdminApproval.fromJson)
        .toList();
  }
}

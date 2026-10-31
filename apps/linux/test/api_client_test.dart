import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:himvote/api/api_exception.dart';
import 'package:himvote/api/linux_api_client.dart';
import 'package:himvote/models/app_settings.dart';
import 'package:himvote/models/election.dart';

const loginPayload = {
  'access_token': 't_abc123',
  'session': {'id': 's1', 'started_at': '2026-10-31T06:11:41Z', 'mfa_enabled': false},
  'profile': {'id': 'u1', 'role': 'student', 'name': 'Demo', 'email': 'demo@campus.edu'},
};

const electionListPayload = [
  {'id': 'elec-1', 'title': 'President', 'status': 'open', 'candidate_count': 4},
  {'id': 'elec-2', 'title': 'Drama', 'status': 'counting', 'candidate_count': 3},
];

const castPayload = {
  'btch': 'HV-1111-2222-3333',
  'submission_status': 'ACCEPTED',
  'stages': ['SUBMITTED', 'ACCEPTED', 'WITNESSED', 'ANCHORED'],
  'receipt_wallet_entry': {
    'btch': 'HV-1111-2222-3333',
    'election_id': 'elec-1',
    'election_title': 'President',
    'submitted_at': '2026-10-31T06:12:07Z',
    'status': 'ANCHORED',
    'stages': [
      {'stage': 'SUBMITTED', 'at': '2026-10-31T06:12:03Z', 'note': 'in'},
      {'stage': 'ANCHORED', 'at': '2026-10-31T06:12:07Z', 'note': 'out'},
    ],
  },
};

MockClient _mock(Future<http.Response> Function(http.Request req) handler) =>
    MockClient(handler);

http.Response _json(Object payload, [int status = 200]) => http.Response(
    jsonEncode(payload), status,
    headers: {'content-type': 'application/json'});

void main() {
  late LinuxApiClient client;
  late List<http.Request> seen;

  setUp(() {
    seen = [];
    client = LinuxApiClient(
      settings: const AppSettings(
        identityOrigin: 'http://id.test',
        castingOrigin: 'http://cast.test',
        witnessOrigin: 'http://wit.test',
      ),
      httpClient: _mock((req) async {
        seen.add(req);
        final path = req.url.path;
        if (path == '/v1/auth/login') return _json(loginPayload);
        if (path == '/v1/elections') return _json(electionListPayload);
        if (path == '/v1/cast/') return _json(castPayload);
        if (path == '/v1/health') return _json({'status': 'ok'});
        if (path == '/v1/auth/me') return _json(loginPayload['profile']!);
        return _json({'detail': 'Not found'}, 404);
      }),
    );
  });

  test('login stores the token and returns profile + session', () async {
    final login = await client.login('demo@campus.edu', 'demo123');
    expect(login.accessToken, 't_abc123');
    expect(login.profile.role.name, 'student');
    expect(client.isLoggedIn, isTrue);
    expect(client.accessToken, 't_abc123');
  });

  test('authed calls attach Bearer token', () async {
    await client.login('demo@campus.edu', 'demo123');
    await client.me();
    final me = seen.last;
    expect(me.headers['Authorization'], 'Bearer t_abc123');
    expect(me.url.host, 'id.test');
  });

  test('login does NOT send auth header', () async {
    await client.login('demo@campus.edu', 'demo123');
    final loginReq = seen.first;
    expect(loginReq.headers.containsKey('Authorization'), isFalse);
  });

  test('elections parse list with status filter on the URL', () async {
    final list = await client.elections(status: 'open');
    expect(list, hasLength(2));
    expect(list.first.status, ElectionStatus.open);
    expect(seen.last.url.queryParameters['status'], 'open');
  });

  test('cast goes to the CASTING origin without auth', () async {
    await client.login('demo@campus.edu', 'demo123');
    final cast = await client.castBallot('elec-1', ['c-1-2'], studentNumber: 'S1');
    expect(cast.btch, 'HV-1111-2222-3333');
    expect(cast.stages, hasLength(4));
    expect(cast.receiptWalletEntry.status, 'ANCHORED');
    final castReq = seen.last;
    expect(castReq.url.host, 'cast.test');
    expect(castReq.headers.containsKey('Authorization'), isFalse);
    final body = jsonDecode(castReq.body) as Map<String, dynamic>;
    expect(body['student_number'], 'S1');
  });

  test('404 maps to ApiException with server detail', () async {
    try {
      await client.election('missing');
      fail('should throw');
    } on ApiException catch (e) {
      expect(e.isNotFound, isTrue);
      expect(e.statusCode, 404);
      expect(e.detail, 'Not found');
    }
  });

  test('transport failure maps to network ApiException', () async {
    final broken = LinuxApiClient(
      settings: clientSettings(),
      httpClient: _mock((_) async => throw http.ClientException('refused')),
    );
    try {
      await broken.elections();
      fail('should throw');
    } on ApiException catch (e) {
      expect(e.isNetwork, isTrue);
      expect(e.statusCode, isNull);
    }
  });

  test('401 surfaces isUnauthorized for session-expiry handling', () async {
    final unauthorized = LinuxApiClient(
      settings: clientSettings(),
      httpClient: _mock((_) async => _json({'detail': 'Not authenticated'}, 401)),
    );
    try {
      await unauthorized.me();
      fail('should throw');
    } on ApiException catch (e) {
      expect(e.isUnauthorized, isTrue);
    }
  });

  test('ping measures latency or null on failure', () async {
    final ok = await client.ping(OriginKind.identity);
    expect(ok, isNotNull);
    expect(ok!.inMilliseconds, greaterThanOrEqualTo(0));
    final broken = LinuxApiClient(
      settings: clientSettings(),
      httpClient: _mock((_) async => throw http.ClientException('down')),
    );
    expect(await broken.ping(OriginKind.witness), isNull);
  });
}

AppSettings clientSettings() => const AppSettings(
      identityOrigin: 'http://id.test',
      castingOrigin: 'http://cast.test',
      witnessOrigin: 'http://wit.test',
    );

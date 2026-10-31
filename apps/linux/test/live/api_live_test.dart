// LIVE smoke test: exercises LinuxApiClient against the real dev mock server
// (apps/linux/dev/mock_v1_server.py). Requires the mock to be running on
// localhost:8080/8081/8082.
//
// Run explicitly:  flutter test test/live/api_live_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:himvote/api/api_exception.dart';
import 'package:himvote/api/linux_api_client.dart';
import 'package:himvote/models/election.dart';

void main() {
  final client = LinuxApiClient();

  group('live mock (localhost:8080/81/82)', () {
    test('health ping on all three origins', () async {
      for (final origin in OriginKind.values) {
        final latency = await client.ping(origin);
        expect(latency, isNotNull, reason: 'origin $origin should answer /v1/health');
      }
    });

    test('login -> me -> elections full round trip', () async {
      final login = await client.login('demo@campus.edu', 'demo123');
      expect(login.accessToken, isNotEmpty);
      expect(login.profile.email, 'demo@campus.edu');

      final me = await client.me();
      expect(me.studentNumber, 'STU2026001');

      final elections = await client.elections();
      expect(elections, isNotEmpty);
      expect(elections.any((e) => e.status == ElectionStatus.open), isTrue);
    });

    test('bad credentials -> 401 ApiException', () async {
      try {
        await client.login('demo@campus.edu', 'wrong-password');
        fail('should throw');
      } on ApiException catch (e) {
        expect(e.isUnauthorized, isTrue);
        expect(e.detail, contains('Invalid'));
      }
    });

    test('cast + verify_inclusion + verify_tally via the mock', () async {
      // one-student-one-vote guard: unique voter per run
      final voter = 'STU-LIVE-${DateTime.now().millisecondsSinceEpoch % 100000}';
      final cast = await client.castBallot('elec-1', ['c-1-3'],
          studentNumber: voter);
      expect(cast.btch, startsWith('HV-'));
      expect(cast.stages, hasLength(4));

      final inclusion = await client.verifyInclusion(cast.btch);
      expect(inclusion.isAnchored, isTrue);
      expect(inclusion.proof['spec'], 'RFC 9162');

      final tally = await client.verifyTally('elec-2');
      expect(tally.match, isTrue);
      expect(tally.identityTally['c-2-1'], 412);

      // double vote for the same voter is rejected
      try {
        await client.castBallot('elec-1', ['c-1-1'], studentNumber: voter);
        fail('should throw 409');
      } on ApiException catch (e) {
        expect(e.isConflict, isTrue);
      }
    });

    test('witness public key + admin endpoints (admin login)', () async {
      final key = await client.witnessPublicKey();
      expect(key.length, greaterThanOrEqualTo(64));

      final admin = LinuxApiClient();
      await admin.login('admin@campus.edu', 'admin123');
      final events = await admin.auditEvents();
      expect(events, isNotEmpty);
      expect(events.first.action, isNotEmpty);

      final approvals = await admin.approvals();
      expect(approvals, isNotEmpty);
    });
  });
}

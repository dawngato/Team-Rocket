import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:himvote/api/linux_api_client.dart';
import 'package:himvote/models/app_settings.dart';
import 'package:himvote/screens/admin_audit_page.dart';
import 'package:himvote/screens/session_page.dart';
import 'package:himvote/screens/settings_page.dart';
import 'package:himvote/storage/app_settings_store.dart';
import 'package:himvote/storage/file_store.dart';
import 'package:himvote/storage/trust_pin_store.dart';

// ---------------------------------------------------------------- mock data
// Payload shapes match the live dev mock server (API_CONTRACT.md).

const studentProfile = {
  'id': 'u-stu-1',
  'role': 'student',
  'name': 'Demo Student',
  'email': 'demo@campus.edu',
  'student_number': 'STU2026001',
  'mfa_enabled': false,
  'verified': true,
};

const adminProfile = {
  'id': 'u-admin-1',
  'role': 'admin',
  'name': 'Admin User',
  'email': 'admin@campus.edu',
  'student_number': 'ADM0001',
  'mfa_enabled': true,
  'verified': true,
};

const loginPayload = {
  'access_token': 't_abc123',
  'session': {
    'id': 's1',
    'started_at': '2026-10-31T06:11:41Z',
    'mfa_enabled': false,
    'device': 'mock-linux',
  },
  'profile': studentProfile,
};

const eventsPayload = {
  'events': [
    {
      'id': 'e1',
      'at': '2026-10-31T06:11:41Z',
      'actor': 'admin@campus.edu',
      'action': 'ELECTION_CLOSED',
      'target': 'elec-2',
      'detail': 'polls closed; tally frozen',
    },
    {
      'id': 'e2',
      'at': '2026-10-31T06:11:41Z',
      'actor': 'system',
      'action': 'ELECTION_CREATED',
      'target': 'elec-2',
      'detail': 'Drama Society Committee',
    },
  ],
  'total': 2,
};

const approvalsPayload = {
  'approvals': [
    {
      'id': 'ap-1',
      'kind': 'ELECTION_CREATE',
      'at': '2026-10-31T05:41:41Z',
      'summary': 'Poster: Sports Secretary by-election 2026 (open 72h)',
      'status': 'pending',
    },
  ],
};

// ------------------------------------------------------------------ helpers

/// In-memory FileStore (Map of String to String) so TrustPin and settings
/// persistence never touch the real XDG config dir during tests.
class MemoryFileStore implements FileStore {
  final Map<String, String> files = {};

  @override
  Future<String?> read(String relativePath) async => files[relativePath];

  @override
  Future<void> write(String relativePath, String contents) async {
    files[relativePath] = contents;
  }

  @override
  Future<void> remove(String relativePath) async {
    files.remove(relativePath);
  }
}

MockClient _mock(Future<http.Response> Function(http.Request req) handler) =>
    MockClient(handler);

http.Response _json(Object payload, [int status = 200]) => http.Response(
    jsonEncode(payload), status,
    headers: {'content-type': 'application/json'});

LinuxApiClient _client(MockClient mock) => LinuxApiClient(
      settings: const AppSettings(
        identityOrigin: 'http://id.test',
        castingOrigin: 'http://cast.test',
        witnessOrigin: 'http://wit.test',
      ),
      httpClient: mock,
    );

Future<void> _pump(WidgetTester tester, Widget child) async {
  tester.view.physicalSize = const Size(1280, 900);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(MaterialApp(home: Scaffold(body: child)));
  await tester.pumpAndSettle();
}

/// Flushes the 3s snackbar timer so no pending timers fail the test.
Future<void> _flushToasts(WidgetTester tester) async {
  await tester.pump(const Duration(seconds: 4));
  await tester.pumpAndSettle();
}

// ------------------------------------------------------------------- session

void main() {
  group('SessionPage', () {
    testWidgets('login success shows the profile and session panel',
        (tester) async {
      final client = _client(_mock((req) async {
        if (req.url.path == '/v1/auth/login') return _json(loginPayload);
        return _json({'detail': 'Not found'}, 404);
      }));
      await _pump(tester, SessionPage(client: client));

      await tester.enterText(find.byType(TextField).at(0), 'demo@campus.edu');
      await tester.enterText(find.byType(TextField).at(1), 'demo123');
      await tester.tap(find.widgetWithText(FilledButton, 'Login'));
      await tester.pumpAndSettle();

      expect(find.text('Demo Student'), findsOneWidget);
      expect(find.text('demo@campus.edu'), findsOneWidget);
      expect(find.text('STUDENT'), findsOneWidget); // role chip
      expect(find.text('STU2026001'), findsOneWidget);
      expect(find.text('Logout'), findsOneWidget);
      expect(find.text('Set up MFA'), findsOneWidget);
      expect(find.text('Verify'), findsOneWidget);
      final started = DateTime.parse('2026-10-31T06:11:41Z')
          .toLocal()
          .toString()
          .split('.')
          .first;
      expect(find.text(started), findsOneWidget);
      expect(client.isLoggedIn, isTrue);
    });

    testWidgets('wrong password shows the inline error', (tester) async {
      final client = _client(_mock((req) async {
        if (req.url.path == '/v1/auth/login') {
          return _json({'detail': 'Invalid credentials'}, 401);
        }
        return _json({'detail': 'Not found'}, 404);
      }));
      await _pump(tester, SessionPage(client: client));

      await tester.enterText(find.byType(TextField).at(0), 'demo@campus.edu');
      await tester.enterText(find.byType(TextField).at(1), 'wrong');
      await tester.tap(find.widgetWithText(FilledButton, 'Login'));
      await tester.pumpAndSettle();

      expect(find.text('Invalid credentials'), findsOneWidget);
      expect(client.isLoggedIn, isFalse);
      // Still on the login form, no session panel.
      expect(find.text('Logout'), findsNothing);
    });
  });

  // ----------------------------------------------------------------- settings

  group('SettingsPage', () {
    testWidgets('loads pre-filled origin URLs from settings', (tester) async {
      final store = MemoryFileStore();
      await _pump(
        tester,
        SettingsPage(
          client: _client(_mock((_) async => _json({'status': 'ok'}))),
          settings: const AppSettings(
            identityOrigin: 'http://id.test',
            castingOrigin: 'http://cast.test',
            witnessOrigin: 'http://wit.test',
          ),
          settingsStore: AppSettingsStore(store),
          pinStore: TrustPinStore(store),
        ),
      );

      expect(find.text('http://id.test'), findsOneWidget);
      expect(find.text('http://cast.test'), findsOneWidget);
      expect(find.text('http://wit.test'), findsOneWidget);
      expect(find.text('No trust pins yet.'), findsOneWidget);
    });

    testWidgets('ping shows per-origin latencies from /v1/health',
        (tester) async {
      final store = MemoryFileStore();
      await _pump(
        tester,
        SettingsPage(
          client: _client(_mock((req) async {
            if (req.url.path == '/v1/health') {
              return _json({'status': 'ok'});
            }
            return _json({'detail': 'Not found'}, 404);
          })),
          settings: AppSettings.defaults(),
          settingsStore: AppSettingsStore(store),
          pinStore: TrustPinStore(store),
        ),
      );

      await tester.tap(find.text('Ping origins'));
      await tester.pumpAndSettle();

      expect(find.text('Identity'), findsOneWidget);
      expect(find.text('Casting'), findsOneWidget);
      expect(find.text('Witness'), findsOneWidget);
      expect(find.textContaining(' ms'), findsNWidgets(3));
      expect(find.text('unreachable'), findsNothing);
    });

    testWidgets('Save persists new origins to the file store',
        (tester) async {
      final store = MemoryFileStore();
      await _pump(
        tester,
        SettingsPage(
          client: _client(_mock((_) async => _json({'status': 'ok'}))),
          settings: AppSettings.defaults(),
          settingsStore: AppSettingsStore(store),
          pinStore: TrustPinStore(store),
        ),
      );

      await tester.enterText(
          find.widgetWithText(TextField, 'Identity origin'), 'http://id.new:9000');
      await tester.enterText(
          find.widgetWithText(TextField, 'Casting origin'), 'http://cast.new:9001');
      await tester.enterText(
          find.widgetWithText(TextField, 'Witness origin'), 'http://wit.new:9002');
      await tester.tap(find.text('Save'));
      await tester.pumpAndSettle();

      expect(find.text('Settings saved'), findsOneWidget);
      final saved =
          jsonDecode(store.files['settings.json']!) as Map<String, dynamic>;
      expect(saved['identity_origin'], 'http://id.new:9000');
      expect(saved['casting_origin'], 'http://cast.new:9001');
      expect(saved['witness_origin'], 'http://wit.new:9002');
      await _flushToasts(tester);
    });

    testWidgets('Add persists a trust pin to the file store', (tester) async {
      final store = MemoryFileStore();
      await _pump(
        tester,
        SettingsPage(
          client: _client(_mock((_) async => _json({'status': 'ok'}))),
          settings: AppSettings.defaults(),
          settingsStore: AppSettingsStore(store),
          pinStore: TrustPinStore(store),
        ),
      );

      await tester.enterText(
          find.widgetWithText(TextField, 'Origin'), 'http://wit.test');
      await tester.enterText(find.widgetWithText(TextField, 'Key fingerprint'),
          'DEADBEEF0123456789');
      await tester.tap(find.text('Add'));
      await tester.pumpAndSettle();

      expect(find.text('http://wit.test'), findsOneWidget);
      expect(find.textContaining('DEADBEEF0123456789'), findsOneWidget);
      expect(find.text('Trust pin added'), findsOneWidget);
      expect(store.files['pins.json'], contains('http://wit.test'));
      await _flushToasts(tester);
    });
  });

  // ------------------------------------------------------------------- admin

  group('AdminAuditPage', () {
    testWidgets('admin profile shows audit events and approvals',
        (tester) async {
      final client = _client(_mock((req) async {
        switch (req.url.path) {
          case '/v1/auth/me':
            return _json(adminProfile);
          case '/v1/admin/audit-events':
            return _json(eventsPayload);
          case '/v1/admin/approvals':
            return _json(approvalsPayload);
        }
        return _json({'detail': 'Not found'}, 404);
      }));
      await _pump(tester, AdminAuditPage(client: client));

      expect(find.text('Audit trail (append-only)'), findsOneWidget);
      expect(find.text('ELECTION_CLOSED'), findsOneWidget); // action chip
      expect(find.text('ELECTION_CREATED'), findsOneWidget);
      expect(find.textContaining('admin@campus.edu'), findsOneWidget); // actor
      expect(find.text('polls closed; tally frozen'), findsOneWidget);
      expect(find.text('Pending approvals'), findsOneWidget);
      expect(find.textContaining('ELECTION_CREATE ·'), findsOneWidget); // kind
      expect(find.textContaining('Sports Secretary by-election'),
          findsOneWidget);
      expect(find.text('pending'), findsOneWidget); // status chip
    });

    testWidgets('student profile sees the admin gate message',
        (tester) async {
      final client = _client(_mock((req) async {
        if (req.url.path == '/v1/auth/me') return _json(studentProfile);
        return _json({'detail': 'Not found'}, 404);
      }));
      await _pump(tester, AdminAuditPage(client: client));

      expect(find.text('Admin access required'), findsOneWidget);
      expect(find.textContaining('admin account'), findsWidgets);
      expect(find.text('Audit trail (append-only)'), findsNothing);
    });

    testWidgets('unauthenticated client sees the gate with a login hint',
        (tester) async {
      final client = _client(_mock((req) async {
        if (req.url.path == '/v1/auth/me') {
          return _json({'detail': 'Not authenticated'}, 401);
        }
        return _json({'detail': 'Not found'}, 404);
      }));
      await _pump(tester, AdminAuditPage(client: client));

      expect(find.text('Admin access required'), findsOneWidget);
      expect(find.textContaining('not signed in'), findsOneWidget);
    });
  });
}

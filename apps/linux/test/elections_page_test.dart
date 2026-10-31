import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:himvote/api/linux_api_client.dart';
import 'package:himvote/design/himvote_theme.dart';
import 'package:himvote/models/app_settings.dart';
import 'package:himvote/screens/elections_page.dart';

/// Wire shapes below mirror apps/linux/dev/mock_v1_server.py exactly.
List<Map<String, dynamic>> mockElections() => [
      {
        'id': 'elec-1',
        'title': 'Student Council President 2026',
        'status': 'open',
        'starts_at': '2026-10-30T00:00:00Z',
        'ends_at': '2026-11-02T00:00:00Z',
        'description': 'Annual election for Student Council President.',
        'candidate_count': 3,
      },
      {
        'id': 'elec-2',
        'title': 'Drama Society Committee 2026',
        'status': 'counting',
        'starts_at': '2026-10-20T00:00:00Z',
        'ends_at': '2026-10-28T00:00:00Z',
        'description': 'Committee seats for the Drama Society.',
        'candidate_count': 2,
      },
      {
        'id': 'elec-3',
        'title': 'Fee Clause Amendment Referendum',
        'status': 'scheduled',
        'starts_at': '2026-11-05T00:00:00Z',
        'ends_at': '2026-11-08T00:00:00Z',
        'description': 'Ratify the revised fee-clause amendment.',
        'candidate_count': 2,
      },
    ];

List<Map<String, dynamic>> mockCandidates() => [
      {
        'id': 'c-1',
        'name': 'Aarav Mehta',
        'slate': 'Merit Coalition',
        'manifesto': 'Transparent budgets, better infrastructure.',
        'photo_url': null,
      },
      {
        'id': 'c-2',
        'name': 'Sofia D Souza',
        'slate': 'Unity Front',
        'manifesto': 'Mental-health support and open forums.',
        'photo_url': null,
      },
      {
        'id': 'c-3',
        'name': 'Rohan Verma',
        'slate': 'Innovate Now',
        'manifesto': 'Tech labs and industry mentorship.',
        'photo_url': null,
      },
    ];

Map<String, dynamic> mockCastResponse() => {
      'btch': 'HV-AAAA-BBBB-CCCC',
      'submission_status': 'ACCEPTED',
      'stages': ['SUBMITTED', 'ACCEPTED', 'WITNESSED', 'ANCHORED'],
      'receipt_wallet_entry': {
        'btch': 'HV-AAAA-BBBB-CCCC',
        'election_id': 'elec-1',
        'election_title': 'Student Council President 2026',
        'submitted_at': '2026-10-31T00:00:00Z',
        'status': 'ANCHORED',
        'voter_ref': 'v123',
        'stages': [
          {'stage': 'SUBMITTED', 'at': '2026-10-31T00:00:00Z', 'note': ''},
          {'stage': 'ANCHORED', 'at': '2026-10-31T00:00:01Z', 'note': ''},
        ],
      },
    };

/// Router that emulates the three mock origins on path+method.
MockClient buildMock({bool failElections = false}) {
  return MockClient((request) async {
    final path = request.url.path;
    final method = request.method;

    http.Response json(dynamic body, [int code = 200]) => http.Response(
          jsonEncode(body),
          code,
          headers: {'content-type': 'application/json'},
        );

    if (failElections && path == '/v1/elections' && method == 'GET') {
      return json({'detail': 'Service unavailable'}, 503);
    }
    if (path == '/v1/elections' && method == 'GET') {
      return json(mockElections());
    }
    if (method == 'GET' &&
        RegExp(r'^/v1/elections/[^/]+/candidates$').hasMatch(path)) {
      return json(mockCandidates());
    }
    if (path == '/v1/auth/me' && method == 'GET') {
      return json({
        'id': 'u-1',
        'role': 'student',
        'name': 'Demo Student',
        'email': 'demo@campus.edu',
        'student_number': 'STU2026001',
        'mfa_enabled': false,
        'verified': true,
      });
    }
    if (path == '/v1/cast/' && method == 'POST') {
      return json(mockCastResponse());
    }
    return json({'detail': 'Not found'}, 404);
  });
}

LinuxApiClient makeClient({bool failElections = false}) {
  return LinuxApiClient(
    settings: AppSettings.defaults(),
    httpClient: buildMock(failElections: failElections),
  )..accessToken = 't_test';
}

Future<void> pumpPage(WidgetTester tester, LinuxApiClient client) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: HimVoteTheme.build(dark: false, highContrast: false),
      home: Scaffold(body: ElectionsPage(client: client)),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('renders all 3 elections from the mocked payload',
      (tester) async {
    await pumpPage(tester, makeClient());

    expect(find.text('Student Council President 2026'), findsOneWidget);
    expect(find.text('Drama Society Committee 2026'), findsOneWidget);
    expect(find.text('Fee Clause Amendment Referendum'), findsOneWidget);
    // Status chips rendered.
    for (final label in ['All', 'open', 'scheduled', 'counting']) {
      expect(find.widgetWithText(ChoiceChip, label), findsOneWidget);
    }
  });

  testWidgets('search TextField filters by title', (tester) async {
    await pumpPage(tester, makeClient());

    await tester.enterText(
        find.byType(TextField), 'Fee Clause');
    await tester.pumpAndSettle();

    expect(find.text('Fee Clause Amendment Referendum'), findsOneWidget);
    expect(find.text('Student Council President 2026'), findsNothing);
    expect(find.text('Drama Society Committee 2026'), findsNothing);

    // Clearing restores the full list.
    await tester.enterText(find.byType(TextField), '');
    await tester.pumpAndSettle();
    expect(find.text('Student Council President 2026'), findsOneWidget);
  });

  testWidgets('status chip filters the list', (tester) async {
    await pumpPage(tester, makeClient());

    // Open only.
    await tester.tap(find.widgetWithText(ChoiceChip, 'open'));
    await tester.pumpAndSettle();
    expect(find.text('Student Council President 2026'), findsOneWidget);
    expect(find.text('Drama Society Committee 2026'), findsNothing);
    expect(find.text('Fee Clause Amendment Referendum'), findsNothing);

    // Counting only.
    await tester.tap(find.widgetWithText(ChoiceChip, 'counting'));
    await tester.pumpAndSettle();
    expect(find.text('Drama Society Committee 2026'), findsOneWidget);
    expect(find.text('Student Council President 2026'), findsNothing);

    // Back to All.
    await tester.tap(find.widgetWithText(ChoiceChip, 'All'));
    await tester.pumpAndSettle();
    expect(find.text('Student Council President 2026'), findsOneWidget);
  });

  testWidgets('error state shows the ApiException message and retry',
      (tester) async {
    await pumpPage(tester, makeClient(failElections: true));

    expect(find.text('Service unavailable'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Retry'), findsOneWidget);
    expect(find.text('Student Council President 2026'), findsNothing);
  });

  testWidgets('tapping a card opens the candidate modal and lists candidates',
      (tester) async {
    await pumpPage(tester, makeClient());

    await tester.tap(find.text('Student Council President 2026'));
    await tester.pumpAndSettle();

    // Colloquial name of the sheet body is the CandidateDetailSheet widget.
    expect(
        find.byWidgetPredicate((w) =>
            w.runtimeType.toString().contains('CandidateDetailSheet')),
        findsOneWidget);
    expect(find.text('Aarav Mehta'), findsOneWidget);
    expect(find.text('Sofia D Souza'), findsOneWidget);
    expect(find.text('Rohan Verma'), findsOneWidget);
    expect(find.text('Merit Coalition'), findsOneWidget);
  });

  testWidgets('cast button calls the API and shows a toast with the btch',
      (tester) async {
    await pumpPage(tester, makeClient());

    await tester.tap(find.text('Student Council President 2026'));
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(FilledButton, 'Vote').first);
    await tester.pumpAndSettle();

    // Toast carries the receipt handle via showToast.
    expect(find.textContaining('HV-AAAA-BBBB-CCCC'), findsOneWidget);
  });
}
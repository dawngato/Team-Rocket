import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:himvote/api/linux_api_client.dart';
import 'package:himvote/design/himvote_theme.dart';
import 'package:himvote/models/app_settings.dart';
import 'package:himvote/screens/explain_page.dart';
import 'package:himvote/screens/trust_model_page.dart';

const witnessKeyHex =
    'b1d7a2f3c4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1';

LinuxApiClient _clientWithWitnessKey(String key) => LinuxApiClient(
      settings: const AppSettings(
        identityOrigin: 'http://id.test',
        castingOrigin: 'http://cast.test',
        witnessOrigin: 'http://wit.test',
      ),
      httpClient: MockClient((req) async {
        if (req.url.path == '/witness/public_key') {
          return http.Response(
            jsonEncode({'public_key': key}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response(jsonEncode({'detail': 'Not found'}), 404);
      }),
    );

LinuxApiClient _failingClient() => LinuxApiClient(
      settings: const AppSettings(
        identityOrigin: 'http://id.test',
        castingOrigin: 'http://cast.test',
        witnessOrigin: 'http://wit.test',
      ),
      httpClient: MockClient(
        (req) async => http.Response(jsonEncode({'detail': 'boom'}), 500),
      ),
    );

Widget _host(Widget body) => MaterialApp(
      theme: HimVoteTheme.build(dark: false, highContrast: false),
      home: Scaffold(body: body),
    );

void main() {
  group('ExplainPage', () {
    testWidgets('renders the four tier cards on the timeline', (tester) async {
      await tester.pumpWidget(_host(const ExplainPage()));

      expect(find.text('How Verification Works'), findsOneWidget);
      for (var i = 1; i <= 4; i++) {
        expect(find.byKey(ValueKey('tier-card-$i')), findsOneWidget);
      }
      expect(find.textContaining('Tier 1 —'), findsOneWidget);
      expect(find.textContaining('Tier 2 —'), findsOneWidget);
      expect(find.textContaining('Tier 3 —'), findsOneWidget);
      expect(find.textContaining('Tier 4 —'), findsOneWidget);
    });

    testWidgets('without a client it is informational and has no fetch button',
        (tester) async {
      await tester.pumpWidget(_host(const ExplainPage()));

      expect(find.byKey(const ValueKey('witness-key-card')), findsNothing);
      expect(find.text('Fetch witness key'), findsNothing);
      expect(find.textContaining('Connect the Witness origin'), findsOneWidget);
    });

    testWidgets('fetching the witness key shows the first 16 chars + ellipsis',
        (tester) async {
      final client = _clientWithWitnessKey(witnessKeyHex);
      await tester.pumpWidget(_host(ExplainPage(client: client)));

      await tester.ensureVisible(find.byKey(const ValueKey('fetch-witness-key')));
      await tester.tap(find.byKey(const ValueKey('fetch-witness-key')));
      await tester.pumpAndSettle();

      final truncated = '${witnessKeyHex.substring(0, 16)}…';
      expect(find.text(truncated), findsOneWidget);
      expect(find.byKey(const ValueKey('witness-key-row')), findsOneWidget);
      expect(find.text(witnessKeyHex), findsNothing); // full key never shown
    });

    testWidgets('copy action puts the full key on the clipboard',
        (tester) async {
      String? copied;
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        (call) async {
          if (call.method == 'Clipboard.setData') {
            copied = (call.arguments as Map)['text'] as String?;
          }
          return null;
        },
      );
      addTearDown(() => tester.binding.defaultBinaryMessenger
          .setMockMethodCallHandler(SystemChannels.platform, null));

      final client = _clientWithWitnessKey(witnessKeyHex);
      await tester.pumpWidget(_host(ExplainPage(client: client)));

      await tester.ensureVisible(find.byKey(const ValueKey('fetch-witness-key')));
      await tester.tap(find.byKey(const ValueKey('fetch-witness-key')));
      await tester.pumpAndSettle();

      await tester.ensureVisible(find.byKey(const ValueKey('copy-witness-key')));
      await tester.tap(find.byKey(const ValueKey('copy-witness-key')));
      await tester.pump();

      expect(copied, witnessKeyHex);
    });

    testWidgets('a failed fetch surfaces an inline error state',
        (tester) async {
      await tester.pumpWidget(_host(ExplainPage(client: _failingClient())));

      await tester.ensureVisible(find.byKey(const ValueKey('fetch-witness-key')));
      await tester.tap(find.byKey(const ValueKey('fetch-witness-key')));
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('witness-key-error')), findsOneWidget);
    });
  });

  group('TrustModelPage', () {
    testWidgets('renders guarantees, boundaries and the 4-stage pipeline',
        (tester) async {
      await tester.pumpWidget(_host(const TrustModelPage()));

      expect(find.text('What You Must Trust'), findsOneWidget);
      expect(find.byKey(const ValueKey('guarantees-section')), findsOneWidget);
      expect(find.byKey(const ValueKey('boundaries-section')), findsOneWidget);
      expect(find.byKey(const ValueKey('pipeline-section')), findsOneWidget);

      for (final stage in ['submitted', 'accepted', 'witnessed', 'anchored']) {
        expect(find.byKey(ValueKey('pipeline-stage-$stage')), findsOneWidget);
      }
      expect(find.text('SUBMITTED'), findsOneWidget);
      expect(find.text('ACCEPTED'), findsOneWidget);
      expect(find.text('WITNESSED'), findsOneWidget);
      expect(find.text('ANCHORED'), findsOneWidget);
    });

    testWidgets('states the three guarantees and the three trust boundaries',
        (tester) async {
      await tester.pumpWidget(_host(const TrustModelPage()));

      for (final title in [
        'Nobody can see your ballot',
        'Officials cannot alter published results without breaking proofs',
        'Receipts are independently verifiable',
      ]) {
        expect(find.text(title), findsOneWidget);
      }
      for (final title in [
        'You trust the Witness to log correctly — so pin its key',
        'You trust the registrar for voter eligibility',
        'Auditors can recompute everything offline',
      ]) {
        expect(find.text(title), findsOneWidget);
      }
    });
  });
}

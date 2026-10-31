import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:himvote/api/linux_api_client.dart';
import 'package:himvote/design/status_chip.dart';
import 'package:himvote/models/app_settings.dart';
import 'package:himvote/screens/audit_explorer_page.dart';
import 'package:himvote/screens/receipt_verify_page.dart';
import 'package:himvote/storage/file_store.dart';
import 'package:himvote/storage/receipt_store.dart';

const _btch = 'HV-AAA1-BBB2-CCC3';

// ---- Fixtures: shapes identical to the real dev mock / API_CONTRACT.md. ----

const verifyInclusionPayload = {
  'status': 'ANCHORED',
  'btch': _btch,
  'leaf_index': 1,
  'proof': {
    'root_hash': 'a1b2c3d4e5f60718293a4b5c6d7e8f90ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
    'spec': 'RFC 9162',
  },
  'witness': {'pubkey': 'ed25519:ABCDEF1234567890ABCDEF1234567890'},
  'verified_at': '2026-10-31T06:30:00Z',
};

const resultsPayload = {
  'election_id': 'elec-1',
  'title': 'President',
  'status': 'certified',
  'total_ballots': 100,
  'turnout_pct': 82.5,
  'rows': [
    {'candidate_id': 'c-1', 'candidate_name': 'Ada Lovelace', 'votes': 54},
    {'candidate_id': 'c-2', 'candidate_name': 'Grace Hopper', 'votes': 31},
    {'candidate_id': 'c-3', 'candidate_name': 'Alan Turing', 'votes': 15},
  ],
  'published_at': '2026-10-31T06:00:00Z',
};

const evidencePayload = {
  'election_id': 'elec-1',
  'status': 'COMPLETE',
  'archive_url': 'https://archive.example/elec-1.zip',
  'sha256': 'cafebabecafebabecafebabecafebabecafebabecafebabecafebabecafebabe',
  'blocks': ['blk-0001', 'blk-0002', 'blk-0003'],
  'merkle_root': 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
};

const verifyTallyPayload = {
  'election_id': 'elec-1',
  'status': 'VERIFIED',
  'identity_origin_tally': {'c-1': 54, 'c-2': 31, 'c-3': 15},
  'witness_tally': {'c-1': 54, 'c-2': 31, 'c-3': 15},
  'match': true,
  'ledger_ref': 'ledger-1',
};

const singleElectionPayload = [
  {'id': 'elec-1', 'title': 'President', 'status': 'certified'},
];

const explorerElectionsPayload = [
  {'id': 'elec-1', 'title': 'President', 'status': 'certified'},
  {'id': 'elec-2', 'title': 'Drama', 'status': 'closed'},
];

// ---- In-memory FileStore so the wallet persists without disk I/O. --------

class _MemoryFileStore implements FileStore {
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

// ---- Helpers. --------------------------------------------------------------

LinuxApiClient _client(
  List<Map<String, dynamic>> elections, {
  bool certifyTally = true,
  Future<void>? holdInclusion,
}) {
  return LinuxApiClient(
    settings: const AppSettings(
      identityOrigin: 'http://id.test',
      castingOrigin: 'http://cast.test',
      witnessOrigin: 'http://wit.test',
    ),
    httpClient: MockClient((req) async {
      http.Response json(Object body, [int status = 200]) => http.Response(
            jsonEncode(body), status,
            headers: {'content-type': 'application/json'});
      final path = req.url.path;
      if (path == '/v1/elections') return json(elections);
      if (path == '/v1/elections/elec-1/results') return json(resultsPayload);
      if (path == '/v1/elections/elec-1/evidence') return json(evidencePayload);
      if (path == '/v1/engine/verify_inclusion') {
        if (holdInclusion != null) await holdInclusion;
        return json(verifyInclusionPayload);
      }
      if (path == '/v1/engine/verify_tally') {
        return json(certifyTally
            ? verifyTallyPayload
            : {...verifyTallyPayload, 'match': false, 'status': 'UNVERIFIED'});
      }
      return json({'detail': 'Not found'}, 404);
    }),
  );
}

/// Desktop/tall viewport: pages scroll lazily, so keep the whole pipeline,
/// tally card and evidence section on screen for the widget tests.
void _setView(WidgetTester tester) {
  tester.view.physicalSize = const Size(1280, 2200);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
}

Future<void> _verifyReceipt(WidgetTester tester) async {
  await tester.enterText(
      find.byKey(const ValueKey('verify-handle-input')), _btch);
  await tester.tap(find.byKey(const ValueKey('verify-button')));
  await tester.pumpAndSettle();
}

void main() {
  group('ReceiptVerifyPage', () {
    testWidgets('pipeline renders the 4 stages and reaches ANCHORED after '
        'verify', (tester) async {
      _setView(tester);

      // Hold the witness response open so the pending (hourglass) state is
      // observable before the API confirms ANCHORED.
      final gate = Completer<void>();
      final store = ReceiptWalletStore(_MemoryFileStore());
      await tester.pumpWidget(
        MaterialApp(
          home: ReceiptVerifyPage(
            client: _client(singleElectionPayload, holdInclusion: gate.future),
            walletStore: store,
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(
          find.byKey(const ValueKey('verify-handle-input')), _btch);
      await tester.tap(find.byKey(const ValueKey('verify-button')));
      await tester.pump(); // loading frame: 4 pending hourglasses
      expect(find.byIcon(Icons.hourglass_bottom), findsNWidgets(4));
      expect(find.byIcon(Icons.check_circle), findsNothing);

      // Release the witness origin; the pipeline reaches ANCHORED.
      gate.complete();
      await tester.pumpAndSettle();

      // Four stages with reached (check) icons; no pending left.
      for (final label in ['SUBMITTED', 'ACCEPTED', 'WITNESSED', 'ANCHORED']) {
        expect(find.text(label), findsWidgets);
      }
      expect(find.byIcon(Icons.check_circle), findsNWidgets(4));
      expect(find.byIcon(Icons.hourglass_bottom), findsNothing);
      expect(find.byKey(const ValueKey('save-to-wallet-button')),
          findsOneWidget);

      // ANCHORED confirmation: leaf index, proof root hash, witness
      // fingerprint, verified_at.
      expect(find.byKey(const ValueKey('verify-leaf-index')), findsOneWidget);
      expect(find.text('1'), findsOneWidget);
      expect(find.textContaining('a1b2c3d4'), findsOneWidget);
      expect(find.textContaining('ed25519:ABCDEF'), findsOneWidget);
      expect(find.textContaining('2026-10-31 06:30'), findsOneWidget);
    });

    testWidgets('save-to-wallet persists and the wallet drawer lists it',
        (tester) async {
      _setView(tester);
      final store = ReceiptWalletStore(_MemoryFileStore());
      await tester.pumpWidget(
        MaterialApp(
          home: ReceiptVerifyPage(
            client: _client(singleElectionPayload),
            walletStore: store,
          ),
        ),
      );
      await tester.pumpAndSettle();
      await _verifyReceipt(tester);

      await tester.tap(find.byKey(const ValueKey('save-to-wallet-button')));
      await tester.pumpAndSettle();

      // Success toast fired.
      expect(find.textContaining('saved to your wallet'), findsOneWidget);

      // Receipt persisted via the store with the election lookup filled.
      final wallet = await store.load();
      expect(wallet.receipts, hasLength(1));
      final saved = wallet.receipts.first;
      expect(saved.btch, _btch);
      expect(saved.electionId, 'elec-1');
      expect(saved.electionTitle, 'President');
      expect(saved.status, 'ANCHORED');

      // End-drawer lists the receipt: btch, title, date, StatusChip.
      await tester.tap(find.byTooltip('Receipt wallet'));
      await tester.pumpAndSettle();
      final item = find.byKey(ValueKey('wallet-item-$_btch'));
      expect(item, findsOneWidget);
      expect(
        find.descendant(of: item, matching: find.text(_btch)),
        findsOneWidget,
      );
      expect(
        find.descendant(of: item, matching: find.text('President')),
        findsOneWidget,
      );
      expect(
        find.descendant(
            of: item, matching: find.textContaining('Submitted ')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: item, matching: find.byType(StatusChip)),
        findsOneWidget,
      );
      // Last stage of the saved receipt is ANCHORED.
      expect(saved.stages.last.stage.wire, 'ANCHORED');
    });
  });

  group('AuditExplorerPage', () {
    testWidgets('lists elections; results bars show counts; tally VERIFIED',
        (tester) async {
      _setView(tester);
      await tester.pumpWidget(
        MaterialApp(
          home: AuditExplorerPage(client: _client(explorerElectionsPayload)),
        ),
      );
      await tester.pumpAndSettle();

      // Election catalog listed with lifecycle chips.
      expect(find.text('President'), findsOneWidget);
      expect(find.text('Drama'), findsOneWidget);
      expect(find.text('certified'), findsOneWidget);
      expect(find.text('closed'), findsOneWidget);

      // Open the detail view for elec-1.
      await tester.tap(find.byKey(const ValueKey('election-elec-1')));
      await tester.pumpAndSettle();

      // Results table: ranked candidates with vote counts.
      expect(find.text('Ada Lovelace'), findsOneWidget);
      expect(find.text('Grace Hopper'), findsOneWidget);
      expect(find.text('Alan Turing'), findsOneWidget);
      expect(find.text('54'), findsOneWidget);
      expect(find.text('31'), findsOneWidget);
      expect(find.text('15'), findsOneWidget);

      // Proportional bars: c-1 (54) wider than c-3 (15).
      final bar1 = tester.getSize(find.byKey(const ValueKey('result-bar-c-1')));
      final bar3 = tester.getSize(find.byKey(const ValueKey('result-bar-c-3')));
      expect(bar1.width, greaterThan(bar3.width));
      expect(bar3.width, greaterThan(0));

      // Evidence archive metadata section.
      expect(find.textContaining('archive.example'), findsOneWidget);
      expect(find.byKey(const ValueKey('evidence-sha256')), findsOneWidget);
      expect(find.textContaining('cafebabe'), findsOneWidget);
      expect(find.byKey(const ValueKey('evidence-merkle-root')), findsOneWidget);
      expect(find.text('3 block(s)'), findsOneWidget);

      // Witness tally verification confirms VERIFIED.
      await tester.tap(find.byKey(const ValueKey('verify-tally-button')));
      await tester.pumpAndSettle();
      expect(find.text('VERIFIED'), findsOneWidget);
      expect(find.byIcon(Icons.check_circle), findsOneWidget);
      expect(find.byIcon(Icons.warning_amber_rounded), findsNothing);
    });
  });
}

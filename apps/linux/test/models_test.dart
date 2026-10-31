import 'package:flutter_test/flutter_test.dart';
import 'package:himvote/models/app_settings.dart';
import 'package:himvote/models/audit_event.dart';
import 'package:himvote/models/candidate.dart';
import 'package:himvote/models/election.dart';
import 'package:himvote/models/json_utils.dart';
import 'package:himvote/models/receipt.dart';
import 'package:himvote/models/session.dart';

// Fixtures below mirror the real shapes served by the dev mock
// (apps/linux/dev/mock_v1_server.py), which follow API_CONTRACT.md.

const electionFixture = {
  'id': 'elec-1',
  'title': 'Student Council President 2026',
  'status': 'open',
  'starts_at': '2026-10-31T04:11:41Z',
  'ends_at': '2026-11-01T06:11:41Z',
  'description': 'Annual election for Student Council President.',
  'candidate_count': 4, // extra field the UI adds; must be tolerated
};

const castFixture = {
  'btch': 'HV-1V5V-2GMJ-2LZG',
  'submission_status': 'ACCEPTED',
  'stages': ['SUBMITTED', 'ACCEPTED', 'WITNESSED', 'ANCHORED'],
  'receipt_wallet_entry': {
    'btch': 'HV-1V5V-2GMJ-2LZG',
    'election_id': 'elec-1',
    'election_title': 'Student Council President 2026',
    'submitted_at': '2026-10-31T06:12:07Z',
    'status': 'ANCHORED',
    'voter_ref': '936b5e4f-81a',
    'stages': [
      {'stage': 'SUBMITTED', 'at': '2026-10-31T06:12:03Z', 'note': 'ballot accepted'},
      {'stage': 'ACCEPTED', 'at': '2026-10-31T06:12:04Z', 'note': 'signed'},
      {'stage': 'WITNESSED', 'at': '2026-10-31T06:12:05Z', 'note': 'leaf recorded'},
      {'stage': 'ANCHORED', 'at': '2026-10-31T06:12:07Z', 'note': 'root anchored'},
    ],
  },
};

const loginFixture = {
  'access_token': 't_rp8wew8od5example',
  'session': {
    'id': 'sess-1',
    'started_at': '2026-10-31T06:11:41Z',
    'mfa_enabled': false,
    'device': 'mock-linux',
  },
  'profile': {
    'id': 'u-stu-1',
    'role': 'student',
    'name': 'Demo Student',
    'email': 'demo@campus.edu',
    'student_number': 'STU2026001',
  },
};

const verifyInclusionFixture = {
  'status': 'ANCHORED',
  'btch': 'HV-1V5V-2GMJ-2LZG',
  'leaf_index': 1,
  'proof': {
    'type': 'inclusion_proof',
    'spec': 'RFC 9162',
    'leaf_index': 397757,
    'merkle_path': ['0xabc', '0xdef'],
    'root_hash': '0x123456',
  },
  'witness': {'pubkey': 'b1d7...', 'signature': '0xdead'},
  'verified_at': '2026-10-31T06:12:12Z',
};

const verifyTallyFixture = {
  'election_id': 'elec-2',
  'status': 'VERIFIED',
  'identity_origin_tally': {'c-2-1': 412, 'c-2-2': 287, 'c-2-3': 151},
  'witness_tally': {'c-2-1': 412, 'c-2-2': 287, 'c-2-3': 151},
  'match': true,
  'ledger_ref': '0x6bdcfda1',
};

void main() {
  group('json_utils', () {
    test('parseIso handles Z-suffixed UTC strings', () {
      final dt = parseIso('2026-10-31T06:12:07Z');
      expect(dt, isNotNull);
      expect(dt!.isUtc, isTrue);
      expect(dt.year, 2026);
      expect(dt.month, 10);
      expect(dt.day, 31);
    });

    test('parseIso returns null on garbage without throwing', () {
      expect(parseIso(null), isNull);
      expect(parseIso('not-a-date'), isNull);
      expect(parseIso(''), isNull);
    });

    test('isoString round-trips', () {
      final dt = DateTime.utc(2026, 10, 31, 6, 12, 7);
      expect(parseIso(isoString(dt)), dt);
    });

    test('asInt/asBool tolerant of strings', () {
      expect(asInt({'k': '42'}, 'k'), 42);
      expect(asInt({'k': 'zzz'}, 'k', 7), 7);
      expect(asBool({'k': 'true'}, 'k'), isTrue);
      expect(asBool({}, 'missing'), isFalse);
    });
  });

  group('Election', () {
    test('parses contract fixture including extra fields', () {
      final e = Election.fromJson(electionFixture);
      expect(e.id, 'elec-1');
      expect(e.title, 'Student Council President 2026');
      expect(e.status, ElectionStatus.open);
      expect(e.isOpen, isTrue);
      expect(e.startsAt, isNotNull);
      expect(e.endsAt, isNotNull);
      expect(e.candidateCount, 4);
    });

    test('parses every status value + unknown fallback', () {
      for (final s in ['draft', 'scheduled', 'open', 'paused', 'closed',
          'counting', 'certified', 'archived']) {
        expect(ElectionStatus.fromWire(s).wire, s);
      }
      expect(ElectionStatus.fromWire('bogus'), ElectionStatus.unknown);
    });

    test('toJson -> fromJson round-trips', () {
      final e = Election.fromJson(electionFixture);
      final back = Election.fromJson(e.toJson());
      expect(back.id, e.id);
      expect(back.title, e.title);
      expect(back.status, e.status);
      expect(back.startsAt, e.startsAt);
      expect(back.endsAt, e.endsAt);
      expect(back.candidateCount, e.candidateCount);
    });

    test('copyWith changes only the requested field', () {
      final e = Election.fromJson(electionFixture);
      final paused = e.copyWith(status: ElectionStatus.paused);
      expect(paused.status, ElectionStatus.paused);
      expect(paused.title, e.title);
    });
  });

  group('Candidate / tally', () {
    test('Candidate parses contract shape', () {
      final c = Candidate.fromJson({
        'id': 'c-1-1',
        'name': 'Aarav Mehta',
        'slate': 'Merit Coalition',
        'manifesto': 'Transparent budgets.',
      });
      expect(c.id, 'c-1-1');
      expect(c.slate, 'Merit Coalition');
      expect(c.photoUrl, isNull);
    });

    test('results rows parse and sort by votes', () {
      final r = PublishedResults.fromJson({
        'election_id': 'elec-2',
        'title': 'Drama Society Committee 2026',
        'status': 'counting',
        'total_ballots': 850,
        'turnout_pct': 68.4,
        'rows': [
          {'candidate_id': 'c-2-1', 'candidate_name': 'Kabir Shah', 'votes': 412},
          {'candidate_id': 'c-2-2', 'candidate_name': 'Meera Iyer', 'votes': 287},
          {'candidate_id': 'c-2-3', 'candidate_name': 'Dev Patel', 'votes': 151},
        ],
        'published_at': '2026-10-31T06:11:56Z',
      });
      expect(r.totalBallots, 850);
      expect(r.rows, hasLength(3));
      expect(r.rows.first.votes, 412);
      expect(r.publishedAt, isNotNull);
      final back = PublishedResults.fromJson(r.toJson());
      expect(back.rows, hasLength(3));
      expect(back.rows[1].candidateName, 'Meera Iyer');
    });
  });

  group('Receipts', () {
    test('CastResponse parses the full mock cast payload', () {
      final c = CastResponse.fromJson(castFixture);
      expect(c.btch, 'HV-1V5V-2GMJ-2LZG');
      expect(c.submissionStatus, 'ACCEPTED');
      expect(c.stages, [
        ReceiptStage.submitted,
        ReceiptStage.accepted,
        ReceiptStage.witnessed,
        ReceiptStage.anchored,
      ]);
      final entry = c.receiptWalletEntry;
      expect(entry.electionTitle, 'Student Council President 2026');
      expect(entry.stages, hasLength(4));
      expect(entry.stages.last.stage, ReceiptStage.anchored);
      expect(entry.stages.first.at, DateTime.utc(2026, 10, 31, 6, 12, 3));
    });

    test('SavedReceipt round-trips through storage JSON', () {
      final entry = CastResponse.fromJson(castFixture).receiptWalletEntry;
      final back = SavedReceipt.fromJson(entry.toJson());
      expect(back.btch, entry.btch);
      expect(back.voterRef, entry.voterRef);
      expect(back.stages, hasLength(4));
      expect(back.submittedAt, entry.submittedAt);
    });

    test('ReceiptWallet dedupes by btch on insert', () {
      final wallet = const ReceiptWallet()
          .withReceipt(CastResponse.fromJson(castFixture).receiptWalletEntry)
          .withReceipt(CastResponse.fromJson(castFixture).receiptWalletEntry);
      expect(wallet.receipts, hasLength(1));
      final back = ReceiptWallet.fromJson(wallet.toJson());
      expect(back.receipts, hasLength(1));
      expect(back.version, ReceiptWallet.currentVersion);
    });

    test('VerifyInclusionResponse parses proof and flags anchored', () {
      final v = VerifyInclusionResponse.fromJson(verifyInclusionFixture);
      expect(v.status, 'ANCHORED');
      expect(v.isAnchored, isTrue);
      expect(v.leafIndex, 1);
      expect(v.proof['spec'], 'RFC 9162');
      expect(v.witness['pubkey'], 'b1d7...');
      expect(v.verifiedAt, isNotNull);
    });

    test('VerifyTallyResponse parses both tallies and match flag', () {
      final v = VerifyTallyResponse.fromJson(verifyTallyFixture);
      expect(v.status, 'VERIFIED');
      expect(v.match, isTrue);
      expect(v.identityTally['c-2-1'], 412);
      expect(v.witnessTally['c-2-2'], 287);
      expect(v.ledgerRef, '0x6bdcfda1');
    });
  });

  group('Session', () {
    test('LoginResponse parses token + session + profile', () {
      final l = LoginResponse.fromJson(loginFixture);
      expect(l.accessToken, startsWith('t_'));
      expect(l.session.device, 'mock-linux');
      expect(l.profile.role, UserRole.student);
      expect(l.profile.email, 'demo@campus.edu');
      expect(l.profile.studentNumber, 'STU2026001');
      expect(l.profile.role.isAdmin, isFalse);
    });

    test('SessionProfile round-trip keeps role', () {
      final p = LoginResponse.fromJson(loginFixture).profile;
      expect(SessionProfile.fromJson(p.toJson()).role, UserRole.student);
    });

    test('BootstrapClaimResponse parses', () {
      final c = BootstrapClaimResponse.fromJson({
        'claim_id': 'abc',
        'status': 'accepted',
        'student_number': 'STU2026001',
        'message': 'Profile claimed',
      });
      expect(c.status, 'accepted');
      expect(c.studentNumber, 'STU2026001');
    });
  });

  group('Audit + admin', () {
    test('AuditEvent parses mock payload', () {
      final a = AuditEvent.fromJson({
        'id': 'f575e186',
        'at': '2026-10-31T06:11:41Z',
        'actor': 'admin@campus.edu',
        'action': 'ELECTION_CLOSED',
        'target': 'elec-2',
        'detail': 'polls closed',
      });
      expect(a.action, 'ELECTION_CLOSED');
      expect(a.actor, 'admin@campus.edu');
      expect(AuditEvent.fromJson(a.toJson()).action, 'ELECTION_CLOSED');
    });

    test('AdminApproval parses', () {
      final ap = AdminApproval.fromJson({
        'id': 'ap-1',
        'kind': 'ELECTION_CREATE',
        'at': '2026-10-31T05:41:41Z',
        'summary': 'Poster: Sports Secretary by-election',
        'status': 'pending',
      });
      expect(ap.kind, 'ELECTION_CREATE');
      expect(ap.status, 'pending');
    });
  });

  group('AppSettings / TrustPin', () {
    test('defaults: contract origins, light theme, no high contrast', () {
      final s = AppSettings.defaults();
      expect(s.identityOrigin, 'http://localhost:8080');
      expect(s.castingOrigin, 'http://localhost:8081');
      expect(s.witnessOrigin, 'http://localhost:8082');
      expect(s.highContrast, isFalse);
      // Classic white is the default (user decision 2026-10-31).
      expect(s.themePreference, ThemePreference.light);
    });

    test('round-trips and copyWith', () {
      final s = AppSettings.defaults().copyWith(highContrast: true);
      final back = AppSettings.fromJson(s.toJson());
      expect(back, s);
      expect(back.highContrast, isTrue);
      expect(back.identityOrigin, AppSettings.defaultIdentity);
    });

    test('theme_mode survives JSON round trip', () {
      final s = AppSettings.defaults().copyWith(themePreference: ThemePreference.dark);
      expect(AppSettings.fromJson(s.toJson()).themePreference, ThemePreference.dark);
    });

    test('legacy dark_mode_default settings migrate to dark', () {
      final migrated = AppSettings.fromJson(const {'dark_mode_default': true});
      expect(migrated.themePreference, ThemePreference.dark);
      expect(migrated.highContrast, isFalse);
    });

    test('TrustPin round-trips', () {
      final pin = TrustPin(
        origin: 'http://localhost:8082',
        keyFingerprint: 'b1d7a2f3',
        label: 'mock witness',
        pinnedAt: DateTime.utc(2026, 10, 31),
      );
      final back = TrustPin.fromJson(pin.toJson());
      expect(back.origin, 'http://localhost:8082');
      expect(back.keyFingerprint, 'b1d7a2f3');
      expect(back.pinnedAt, pin.pinnedAt);
    });
  });
}

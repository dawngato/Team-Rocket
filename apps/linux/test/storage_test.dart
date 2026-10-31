import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:himvote/models/receipt.dart';
import 'package:himvote/models/app_settings.dart';
import 'package:himvote/storage/file_store.dart';
import 'package:himvote/storage/file_store_io.dart';
import 'package:himvote/storage/storage_backend.dart';
import 'package:himvote/storage/app_settings_store.dart';
import 'package:himvote/storage/receipt_store.dart';
import 'package:himvote/storage/trust_pin_store.dart';

void main() {
  group('XdgPaths', () {
    test('uses XDG env vars when set', () {
      final p = XdgPaths.resolve(
          home: '/home/demo', xdgDataHome: '/custom/data', xdgConfigHome: '/custom/cfg');
      expect(p.dataHome, '/custom/data');
      expect(p.configHome, '/custom/cfg');
      expect(p.himvoteDataDir, '/custom/data/himvote');
      expect(p.himvoteConfigDir, '/custom/cfg/himvote');
    });

    test('falls back to \$HOME/.local/share and \$HOME/.config', () {
      final p = XdgPaths.resolve(home: '/home/demo');
      expect(p.dataHome, '/home/demo/.local/share');
      expect(p.configHome, '/home/demo/.config');
    });

    test('PlatformStores.create passes overridden XDG roots to the io store', () {
      final stores = PlatformStores.create(
          home: '/home/demo', xdgDataHome: '/xd/data', xdgConfigHome: '/xd/cfg');
      expect(stores.data, isA<XdgFileStore>());
      expect(stores.config, isA<XdgFileStore>());
      expect((stores.data as XdgFileStore).rootDir, '/xd/data/himvote');
      expect((stores.config as XdgFileStore).rootDir, '/xd/cfg/himvote');
    });
  });

  group('XdgFileStore', () {
    late Directory tmp;
    late XdgFileStore store;

    setUp(() {
      tmp = Directory.systemTemp.createTempSync('himvote_test_');
      store = XdgFileStore('${tmp.path}/data/himvote');
    });

    tearDown(() => tmp.deleteSync(recursive: true));

    test('read null on missing file, round-trips written content', () async {
      expect(await store.read('settings.json'), isNull);
      await store.write('settings.json', '{"a":1}');
      expect(await store.read('settings.json'), '{"a":1}');
      expect(Directory('${tmp.path}/data/himvote').existsSync(), isTrue);
    });

    test('remove deletes and falls back to null', () async {
      await store.write('x.json', 'x');
      await store.remove('x.json');
      expect(await store.read('x.json'), isNull);
    });
  });

  group('AppSettingsStore', () {
    test('defaults when no file, round-trips custom values', () async {
      final tmp = Directory.systemTemp.createTempSync('himvote_test_');
      final store = AppSettingsStore(XdgFileStore('${tmp.path}/cfg/himvote'));
      expect((await store.load()).highContrast, isFalse);

      await store.save(
          AppSettings.defaults().copyWith(highContrast: true, castingOrigin: 'http://x:9'));
      final loaded = await store.load();
      expect(loaded.highContrast, isTrue);
      expect(loaded.castingOrigin, 'http://x:9');
      tmp.deleteSync(recursive: true);
    });

    test('corrupt file degrades to defaults instead of crashing', () async {
      final tmp = Directory.systemTemp.createTempSync('himvote_test_');
      final store = AppSettingsStore(XdgFileStore('${tmp.path}/cfg/himvote'));
      await store.save(AppSettings.defaults());
      await File('${tmp.path}/cfg/himvote/settings.json').writeAsString('{not json');
      expect(await store.load(), AppSettings.defaults());
      tmp.deleteSync(recursive: true);
    });
  });

  group('ReceiptWalletStore', () {
    test('add persists and dedupes by btch', () async {
      final tmp = Directory.systemTemp.createTempSync('himvote_test_');
      final store = ReceiptWalletStore(XdgFileStore('${tmp.path}/data/himvote'));
      expect((await store.load()).receipts, isEmpty);

      final receipt = SavedReceipt(
        btch: 'HV-AAAA-BBBB-CCCC',
        electionId: 'elec-1',
        electionTitle: 'Test election',
        submittedAt: DateTime.utc(2026, 10, 31),
        status: 'ANCHORED',
      );
      await store.add(receipt);
      await store.add(receipt); // same btch -> dedupe

      final wallet = await store.load();
      expect(wallet.receipts, hasLength(1));
      expect(wallet.receipts.first.electionTitle, 'Test election');
      tmp.deleteSync(recursive: true);
    });

    test('corrupt wallet file degrades to empty wallet', () async {
      final tmp = Directory.systemTemp.createTempSync('himvote_test_');
      final store = ReceiptWalletStore(XdgFileStore('${tmp.path}/data/himvote'));
      Directory('${tmp.path}/data/himvote').createSync(recursive: true);
      await File('${tmp.path}/data/himvote/receipts.json').writeAsString('garbage');
      expect((await store.load()).receipts, isEmpty);
      tmp.deleteSync(recursive: true);
    });
  });

  group('TrustPinStore', () {
    test('saves and loads pins, dedupes by fingerprint', () async {
      final tmp = Directory.systemTemp.createTempSync('himvote_test_');
      final store = TrustPinStore(XdgFileStore('${tmp.path}/cfg/himvote'));
      final pin = TrustPin(
        origin: 'http://localhost:8082',
        keyFingerprint: 'b1d7a2f3',
        label: 'mock witness',
        pinnedAt: DateTime.utc(2026, 10, 31),
      );
      await store.add(pin);
      await store.add(pin);
      final pins = await store.load();
      expect(pins, hasLength(1));
      expect(pins.first.origin, 'http://localhost:8082');
      tmp.deleteSync(recursive: true);
    });
  });
}

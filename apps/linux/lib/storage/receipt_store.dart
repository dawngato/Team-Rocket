import 'dart:convert';

import '../models/receipt.dart';
import 'file_store.dart';

/// Persists the receipt wallet at $XDG_DATA_HOME/himvote/receipts.json.
/// Corrupt or missing files degrade to an empty wallet.
class ReceiptWalletStore {
  final FileStore _data;

  const ReceiptWalletStore(this._data);

  static const fileName = 'receipts.json';

  Future<ReceiptWallet> load() async {
    final raw = await _data.read(fileName);
    if (raw == null || raw.trim().isEmpty) return const ReceiptWallet();
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, dynamic>) return const ReceiptWallet();
      return ReceiptWallet.fromJson(decoded);
    } catch (_) {
      return const ReceiptWallet();
    }
  }

  Future<void> save(ReceiptWallet wallet) =>
      _data.write(fileName, jsonEncode(wallet.toJson()));

  Future<ReceiptWallet> add(SavedReceipt receipt) async {
    final wallet = await load();
    final updated = wallet.withReceipt(receipt);
    await save(updated);
    return updated;
  }
}

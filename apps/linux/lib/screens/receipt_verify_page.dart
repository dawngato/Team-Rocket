import 'package:flutter/material.dart';

import '../api/api_exception.dart';
import '../api/linux_api_client.dart';
import '../design/status_chip.dart';
import '../design/toast_notification.dart';
import '../models/receipt.dart';
import '../storage/receipt_store.dart';

/// Receipt Verification (Phase 2 of the Receipts destination).
///
/// User types a receipt handle (btch) and the page calls the WITNESS origin
/// (`POST /v1/engine/verify_inclusion`) — the client never reimplements
/// RFC 9162 / Merkle verification in Dart (API_CONTRACT.md Rule 4); it only
/// renders what the witness API confirms.
///
/// On a confirmed ANCHORED response the page shows the 4-stage pipeline
/// (SUBMITTED -> ACCEPTED -> WITNESSED -> ANCHORED) with the leaf index,
/// Merkle proof summary, witness fingerprint and verified timestamp, and lets
/// the user persist the receipt into the local receipt wallet.
class ReceiptVerifyPage extends StatefulWidget {
  const ReceiptVerifyPage({
    super.key,
    required this.client,
    required this.walletStore,
  });

  final LinuxApiClient client;
  final ReceiptWalletStore walletStore;

  @override
  State<ReceiptVerifyPage> createState() => _ReceiptVerifyPageState();
}

class _ReceiptVerifyPageState extends State<ReceiptVerifyPage> {
  static const List<ReceiptStage> _pipeline = [
    ReceiptStage.submitted,
    ReceiptStage.accepted,
    ReceiptStage.witnessed,
    ReceiptStage.anchored,
  ];

  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  final TextEditingController _handleController = TextEditingController();

  bool _verifying = false;
  bool _saving = false;
  VerifyInclusionResponse? _result;
  String? _error;

  // Best-effort election metadata for the wallet entry (see _lookupElection).
  String _electionId = '';
  String _electionTitle = '';
  String _lookupNote = '';

  /// Stages the witness origin has confirmed as reached. An ANCHORED receipt
  /// implies all four; the pipeline renders the rest as pending.
  int get _reachedCount {
    final result = _result;
    if (result == null) return 0;
    if (result.isAnchored) return _pipeline.length;
    final index = _pipeline.indexOf(ReceiptStage.fromWire(result.status));
    return index < 0 ? 0 : index + 1;
  }

  Future<void> _verify() async {
    final btch = _handleController.text.trim();
    if (btch.isEmpty) {
      showToast(context, 'Enter a receipt handle (btch) first',
          kind: ToastKind.warning);
      return;
    }
    setState(() {
      _verifying = true;
      _error = null;
      _result = null;
      _electionId = '';
      _electionTitle = '';
      _lookupNote = '';
    });
    try {
      final result = await widget.client.verifyInclusion(btch);
      if (!mounted) return;
      setState(() {
        _result = result;
        _verifying = false;
      });
      if (result.isAnchored) {
        // Fire the election metadata lookup in the background; the saved
        // receipt may carry an empty election reference with a note instead.
        _lookupElection();
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _verifying = false;
        _error = e.detail;
      });
      showToast(context, 'Verification failed: ${e.detail}',
          kind: ToastKind.error);
    }
  }

  /// The witness API answers by receipt handle only — it does not echo which
  /// election a btch belongs to. Best-effort fill: when the election catalog
  /// resolves to exactly one election (the dev-mock scenario) we use it;
  /// otherwise the wallet entry is saved with an empty reference plus a note.
  Future<void> _lookupElection() async {
    String id = '';
    String title = '';
    String note = '';
    try {
      final elections = await widget.client.elections();
      if (elections.length == 1) {
        id = elections.first.id;
        title = elections.first.title;
      } else if (elections.isEmpty) {
        note = 'Election lookup returned no elections — saved with an empty '
            'election reference.';
      } else {
        note = 'Election reference requires manual selection — saved empty. '
            'The witness API does not echo the election for a btch.';
      }
    } on ApiException catch (e) {
      note = 'Election lookup failed (${e.detail}) — saved with an empty '
          'election reference.';
    } catch (_) {
      note = 'Election lookup failed — saved with an empty election reference.';
    }
    if (!mounted) return;
    setState(() {
      _electionId = id;
      _electionTitle = title;
      _lookupNote = note;
    });
  }

  Future<void> _saveToWallet() async {
    final result = _result;
    if (result == null) return;
    setState(() => _saving = true);
    final now = DateTime.now().toUtc();
    final receipt = SavedReceipt(
      btch: result.btch,
      electionId: _electionId,
      electionTitle: _electionTitle,
      submittedAt: now,
      status: result.status,
      stages: [
        for (final (i, stage) in _pipeline.indexed)
          ReceiptStageEntry(
            stage: stage,
            at: result.verifiedAt ?? now,
            note: i < _reachedCount ? 'Confirmed by witness API' : 'Pending',
          ),
      ],
    );
    try {
      await widget.walletStore.add(receipt);
      if (!mounted) return;
      setState(() => _saving = false);
      showToast(context, 'Receipt ${result.btch} saved to your wallet',
          kind: ToastKind.success);
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      showToast(context, 'Could not save receipt: $e', kind: ToastKind.error);
    }
  }

  void _openWallet() => _scaffoldKey.currentState?.openEndDrawer();

  String _formatDateTime(DateTime dt) {
    final u = dt.toUtc();
    String two(int n) => n.toString().padLeft(2, '0');
    return '${u.year}-${two(u.month)}-${two(u.day)} '
        '${two(u.hour)}:${two(u.minute)} UTC';
  }

  String _formatDate(DateTime dt) {
    final u = dt.toUtc();
    String two(int n) => n.toString().padLeft(2, '0');
    return '${u.year}-${two(u.month)}-${two(u.day)}';
  }

  String get _proofRoot {
    final raw = _result?.proof['root_hash'];
    return raw?.toString() ?? '—';
  }

  String get _witnessFingerprint {
    final pubkey = _result?.witness['pubkey']?.toString() ?? '';
    if (pubkey.isEmpty) return '—';
    return pubkey.length <= 16 ? pubkey : '${pubkey.substring(0, 16)}…';
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final result = _result;
    return Scaffold(
      key: _scaffoldKey,
      appBar: AppBar(
        title: const Text('Receipt Verification'),
        actions: [
          IconButton(
            tooltip: 'Receipt wallet',
            icon: const Icon(Icons.account_balance_wallet_outlined),
            onPressed: _openWallet,
          ),
        ],
      ),
      endDrawer: Drawer(
        width: 340,
        child: _ReceiptWalletDrawer(
          walletStore: widget.walletStore,
          formatDate: _formatDate,
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text('Verify a receipt', style: text.headlineSmall),
          const SizedBox(height: 8),
          Text(
            'Enter your receipt handle (btch) — the witness origin proves '
            'inclusion against the Merkle log (RFC 9162). Verification always '
            'runs on the Witness API, never on this device.',
            style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: TextField(
                  key: const ValueKey('verify-handle-input'),
                  controller: _handleController,
                  enabled: !_verifying,
                  decoration: const InputDecoration(
                    labelText: 'Receipt handle (btch)',
                    hintText: 'HV-XXXX-XXXX-XXXX',
                    border: OutlineInputBorder(),
                  ),
                  onSubmitted: (_) => _verify(),
                ),
              ),
              const SizedBox(width: 12),
              FilledButton.icon(
                key: const ValueKey('verify-button'),
                onPressed: _verifying ? null : _verify,
                icon: _verifying
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.verified_outlined),
                label: Text(_verifying ? 'Verifying…' : 'Verify'),
              ),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 16),
            Card(
              color: scheme.errorContainer,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Icon(Icons.error_outline, color: scheme.onErrorContainer),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _error!,
                        style: text.bodyMedium
                            ?.copyWith(color: scheme.onErrorContainer),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
          if (_verifying || result != null) ...[
            const SizedBox(height: 24),
            Text('Receipt pipeline', style: text.titleMedium),
            const SizedBox(height: 12),
            for (final (i, stage) in _pipeline.indexed)
              _PipelineStageRow(
                key: ValueKey('stage-${stage.wire.toLowerCase()}'),
                stage: stage,
                reached: i < _reachedCount,
                isLast: i == _pipeline.length - 1,
              ),
            if (result != null && result.isAnchored) ...[
              const SizedBox(height: 16),
              _AnchoredSummary(
                result: result,
                proofRoot: _proofRoot,
                witnessFingerprint: _witnessFingerprint,
                verifiedAtLabel: _formatDateTime(result.verifiedAt ?? DateTime.now()),
              ),
              const SizedBox(height: 16),
              if (_lookupNote.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(
                    _lookupNote,
                    style: text.bodySmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ),
              FilledButton.icon(
                key: const ValueKey('save-to-wallet-button'),
                onPressed: _saving ? null : _saveToWallet,
                icon: _saving
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.save_outlined),
                label: Text(_saving ? 'Saving…' : 'Save to Receipt Wallet'),
              ),
            ],
          ],
        ],
      ),
    );
  }
}

/// One row of the 4-stage pipeline: check icon when reached, hourglass while
/// pending, followed by the wire stage label.
class _PipelineStageRow extends StatelessWidget {
  const _PipelineStageRow({
    super.key,
    required this.stage,
    required this.reached,
    this.isLast = false,
  });

  final ReceiptStage stage;
  final bool reached;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Row(
      children: [
        Icon(
          reached ? Icons.check_circle : Icons.hourglass_bottom,
          color: reached ? Colors.green.shade600 : scheme.outline,
          size: 26,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            decoration: BoxDecoration(
              color: reached
                  ? Colors.green.withValues(alpha: 0.08)
                  : scheme.surfaceContainerHighest.withValues(alpha: 0.4),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: reached
                    ? Colors.green.withValues(alpha: 0.5)
                    : scheme.outlineVariant,
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    stage.wire,
                    style: Theme.of(context)
                        .textTheme
                        .titleSmall
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
                StatusChip.receipt(stage),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// Confirmation block shown only when the witness API confirms ANCHORED:
/// leaf index, Merkle proof summary (root hash), witness fingerprint and the
/// verified timestamp.
class _AnchoredSummary extends StatelessWidget {
  const _AnchoredSummary({
    required this.result,
    required this.proofRoot,
    required this.witnessFingerprint,
    required this.verifiedAtLabel,
  });

  final VerifyInclusionResponse result;
  final String proofRoot;
  final String witnessFingerprint;
  final String verifiedAtLabel;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    Widget row(String label, String value, Key key) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 140,
                child: Text(label,
                    style: text.labelMedium
                        ?.copyWith(color: scheme.onSurfaceVariant)),
              ),
              Expanded(
                child: SelectableText(value,
                    key: key, style: text.bodyMedium),
              ),
            ],
          ),
        );
    return Card(
      color: Colors.green.withValues(alpha: 0.08),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.verified, color: Colors.green.shade600),
                const SizedBox(width: 8),
                Text('ANCHORED — inclusion proven',
                    style: text.titleSmall
                        ?.copyWith(color: Colors.green.shade700)),
              ],
            ),
            const SizedBox(height: 12),
            row('Leaf index', '${result.leafIndex}',
                const ValueKey('verify-leaf-index')),
            row('Proof root hash', proofRoot,
                const ValueKey('verify-proof-root')),
            row('Witness fingerprint', witnessFingerprint,
                const ValueKey('verify-witness-fingerprint')),
            row('Verified at', verifiedAtLabel,
                const ValueKey('verify-verified-at')),
            const SizedBox(height: 4),
            Text(
              'Proof spec: '
              '${result.proof['spec']?.toString() ?? 'RFC 9162'}',
              style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }
}

/// End-drawer listing of the local receipt wallet: btch, election title,
/// submitted date and the StatusChip of the last confirmed stage.
class _ReceiptWalletDrawer extends StatelessWidget {
  const _ReceiptWalletDrawer({
    required this.walletStore,
    required this.formatDate,
  });

  final ReceiptWalletStore walletStore;
  final String Function(DateTime) formatDate;

  ReceiptStage _lastStage(SavedReceipt receipt) => receipt.stages.isNotEmpty
      ? receipt.stages.last.stage
      : ReceiptStage.fromWire(receipt.status);

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return SafeArea(
      child: FutureBuilder<ReceiptWallet>(
        future: walletStore.load(),
        builder: (context, snapshot) {
          final receipts = snapshot.data?.receipts ?? const <SavedReceipt>[];
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text('Receipt Wallet', style: text.titleLarge),
              ),
              const Divider(),
              if (receipts.isEmpty)
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      'No saved receipts yet. Verify a receipt handle and '
                      'tap "Save to Receipt Wallet".',
                      style: text.bodyMedium
                          ?.copyWith(color: scheme.onSurfaceVariant),
                    ),
                  ),
                )
              else
                Expanded(
                  child: ListView.builder(
                    itemCount: receipts.length,
                    itemBuilder: (context, index) {
                      final receipt = receipts[index];
                      return Container(
                        key: ValueKey('wallet-item-${receipt.btch}'),
                        margin: const EdgeInsets.fromLTRB(12, 4, 12, 4),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: scheme.surfaceContainerHighest
                              .withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              receipt.btch,
                              style: text.titleSmall
                                  ?.copyWith(fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              receipt.electionTitle.isEmpty
                                  ? 'Election: —'
                                  : receipt.electionTitle,
                              style: text.bodySmall,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Submitted ${formatDate(receipt.submittedAt)}',
                              style: text.bodySmall
                                  ?.copyWith(color: scheme.onSurfaceVariant),
                            ),
                            const SizedBox(height: 8),
                            Align(
                              alignment: Alignment.centerLeft,
                              child: StatusChip.receipt(_lastStage(receipt)),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

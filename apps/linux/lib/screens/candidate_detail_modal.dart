import 'package:flutter/material.dart';

import '../api/api_exception.dart';
import '../api/linux_api_client.dart';
import '../design/toast_notification.dart';
import '../models/candidate.dart';
import '../models/election.dart';

/// Opens the candidate detail + ballot-cast sheet for an election.
///
/// Non-modal helper so callers (the elections page card tap) can fire it
/// directly. The sheet loads `/v1/elections/{id}/candidates` via the client
/// and casts one ballot per press through `POST /v1/cast/` — the ballot is
/// never encrypted in Dart (Rule 0.1(3)); the casting origin handles it.
Future<void> showCandidateDetailModal(
  BuildContext context, {
  required LinuxApiClient client,
  required Election election,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (_) => CandidateDetailSheet(client: client, election: election),
  );
}

/// A bottom-sheet body that lists an election's candidates and allows a
/// logged-in voter to cast a ballot while the election is open.
class CandidateDetailSheet extends StatefulWidget {
  const CandidateDetailSheet({
    super.key,
    required this.client,
    required this.election,
  });

  final LinuxApiClient client;
  final Election election;

  @override
  State<CandidateDetailSheet> createState() => _CandidateDetailSheetState();
}

class _CandidateDetailSheetState extends State<CandidateDetailSheet> {
  late Future<List<Candidate>> _future;
  String? _castingId;
  bool _hasVoted = false;

  @override
  void initState() {
    super.initState();
    _future = widget.client.candidates(widget.election.id);
  }

  Future<String?> _studentNumber() async {
    if (!widget.client.isLoggedIn) return null;
    try {
      final me = await widget.client.me();
      return me.studentNumber;
    } catch (_) {
      return null; // casting stays anonymous if /me fails.
    }
  }

  Future<void> _cast(Candidate candidate) async {
    setState(() => _castingId = candidate.id);
    try {
      final studentNumber = await _studentNumber();
      final receipt = await widget.client.castBallot(
        widget.election.id,
        [candidate.id],
        studentNumber: studentNumber,
      );
      if (!mounted) return;
      setState(() => _hasVoted = true);
      showToast(
        context,
        'Ballot cast — receipt ${receipt.btch}',
        kind: ToastKind.success,
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      showToast(
        context,
        e.isConflict
            ? 'You have already voted in this election.'
            : (e.detail.isEmpty ? 'Failed to cast ballot.' : e.detail),
        kind: e.isConflict ? ToastKind.warning : ToastKind.error,
      );
    } catch (e) {
      if (!mounted) return;
      showToast(context, 'Failed to cast ballot: $e', kind: ToastKind.error);
    } finally {
      if (mounted) setState(() => _castingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final maxHeight = MediaQuery.of(context).size.height * 0.75;
    final canCast = widget.election.isOpen;

    return SizedBox(
      height: maxHeight,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 4, 24, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(widget.election.title, style: text.titleLarge),
                const SizedBox(height: 4),
                if (!canCast)
                  Text(
                    'Voting closed — polls are ${widget.election.status.wire}.',
                    style: text.bodySmall?.copyWith(color: scheme.error),
                  )
                else if (_hasVoted)
                  Text(
                    'You voted. Receipt saved to your wallet.',
                    style: text.bodySmall?.copyWith(color: scheme.tertiary),
                  )
                else
                  Text(
                    'Tap a candidate to cast your single ballot.',
                    style: text.bodySmall
                        ?.copyWith(color: scheme.onSurfaceVariant),
                  ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: FutureBuilder<List<Candidate>>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  final err = snapshot.error;
                  final msg = err is ApiException && err.detail.isNotEmpty
                      ? err.detail
                      : err?.toString() ?? 'Failed to load candidates.';
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(msg, textAlign: TextAlign.center),
                    ),
                  );
                }
                final candidates = snapshot.data ?? const [];
                if (candidates.isEmpty) {
                  return const Center(child: Text('No candidates yet.'));
                }
                return ListView.builder(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  itemCount: candidates.length,
                  itemBuilder: (context, i) =>
                      _CandidateTile(
                        candidate: candidates[i],
                        canCast: canCast && !_hasVoted,
                        casting: _castingId == candidates[i].id,
                        busy: _castingId != null,
                        onCast: () => _cast(candidates[i]),
                      ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _CandidateTile extends StatelessWidget {
  const _CandidateTile({
    required this.candidate,
    required this.canCast,
    required this.casting,
    required this.busy,
    required this.onCast,
  });

  final Candidate candidate;
  final bool canCast;
  final bool casting;
  final bool busy;
  final VoidCallback onCast;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final avatar = candidate.photoUrl != null && candidate.photoUrl!.isNotEmpty
        ? CircleAvatar(backgroundImage: NetworkImage(candidate.photoUrl!))
        : CircleAvatar(
            backgroundColor: scheme.secondaryContainer,
            child: Icon(Icons.person, color: scheme.onSecondaryContainer),
          );

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            avatar,
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(candidate.name, style: text.titleSmall),
                  if (candidate.slate.isNotEmpty)
                    Text(
                      candidate.slate,
                      style: text.labelMedium
                          ?.copyWith(color: scheme.secondary),
                    ),
                  const SizedBox(height: 4),
                  if (candidate.manifesto.isNotEmpty)
                    Text(
                      candidate.manifesto,
                      style: text.bodySmall
                          ?.copyWith(color: scheme.onSurfaceVariant),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            if (canCast)
              FilledButton.icon(
                onPressed: busy ? null : onCast,
                icon: casting
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.how_to_vote, size: 18),
                label: Text(casting ? 'Casting…' : 'Vote'),
              )
            else
              Tooltip(
                message: 'Casting allowed only while the election is open',
                child: Icon(Icons.lock_outline, color: scheme.outline),
              ),
          ],
        ),
      ),
    );
  }
}
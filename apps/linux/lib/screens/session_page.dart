import 'package:flutter/material.dart';

import '../api/api_exception.dart';
import '../api/linux_api_client.dart';
import '../design/toast_notification.dart';
import '../models/session.dart';

/// SSO login / session panel (Identity origin). Shows a login form when
/// logged out, and a profile + session + MFA panel once authenticated.
class SessionPage extends StatefulWidget {
  const SessionPage({super.key, required this.client});

  final LinuxApiClient client;

  @override
  State<SessionPage> createState() => _SessionPageState();
}

class _SessionPageState extends State<SessionPage> {
  final _identifier = TextEditingController();
  final _password = TextEditingController();
  final _mfaCode = TextEditingController();

  bool _busy = false;
  String? _error;
  LoginResponse? _session;

  @override
  void dispose() {
    _identifier.dispose();
    _password.dispose();
    _mfaCode.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final login = await widget.client.login(
        _identifier.text.trim(),
        _password.text,
      );
      if (!mounted) return;
      setState(() => _session = login);
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.isUnauthorized) {
        setState(() => _error = e.detail.isEmpty
            ? 'Invalid credentials'
            : e.detail);
      } else {
        setState(() => _error = e.detail.isEmpty ? 'Login failed' : e.detail);
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _logout() async {
    setState(() => _busy = true);
    try {
      await widget.client.logout();
      if (!mounted) return;
      setState(() {
        _session = null;
        _error = null;
        _mfaCode.clear();
      });
      showToast(context, 'Signed out', kind: ToastKind.info);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _setupMfa() async {
    setState(() => _busy = true);
    try {
      final result = await widget.client.mfaSetup();
      if (!mounted) return;
      final secret = result['secret']?.toString() ?? '';
      final issuer = result['issuer']?.toString() ?? 'HimVote';
      final account = result['account']?.toString() ?? '';
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('MFA Setup'),
          content: SelectableText(
            secret.isNotEmpty
                ? 'Issuer: $issuer\nAccount: $account\n\nSecret: $secret'
                : 'No secret returned',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      showToast(context, e.detail.isEmpty ? 'MFA setup failed' : e.detail,
          kind: ToastKind.error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verifyMfa() async {
    final code = _mfaCode.text.trim();
    if (code.isEmpty) {
      showToast(context, 'Enter a code first', kind: ToastKind.warning);
      return;
    }
    setState(() => _busy = true);
    try {
      final ok = await widget.client.mfaVerify(code);
      if (!mounted) return;
      if (ok) {
        showToast(context, 'MFA verified', kind: ToastKind.success);
      } else {
        showToast(context, 'MFA verification failed', kind: ToastKind.error);
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      showToast(context, e.detail.isEmpty ? 'MFA verify failed' : e.detail,
          kind: ToastKind.error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final loggedIn = widget.client.isLoggedIn && _session != null;
    if (!loggedIn) return _buildLogin();
    return _buildSession(_session!);
  }

  Widget _buildLogin() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.badge_outlined, size: 48),
              const SizedBox(height: 16),
              Text('Sign in to HimVote',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 24),
              TextField(
                controller: _identifier,
                decoration: const InputDecoration(
                  labelText: 'Identifier (email)',
                  prefixIcon: Icon(Icons.person_outline),
                ),
                enabled: !_busy,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _password,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Password',
                  prefixIcon: Icon(Icons.lock_outline),
                ),
                enabled: !_busy,
                onSubmitted: (_) => _login(),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Theme.of(context)
                        .colorScheme
                        .error
                        .withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.error_outline,
                          color: Theme.of(context).colorScheme.error),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _error!,
                          style: TextStyle(
                              color: Theme.of(context).colorScheme.error),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: _busy ? null : _login,
                icon: _busy
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.login),
                label: const Text('Login'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSession(LoginResponse login) {
    final profile = login.profile;
    final roleChip = Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: profile.role.isAdmin
            ? Colors.deepPurple.withValues(alpha: 0.12)
            : Colors.blueGrey.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0xFF79747E).withValues(alpha: 0.5)),
      ),
      child: Text(
        profile.role.name.toUpperCase(),
        style: Theme.of(context)
            .textTheme
            .labelMedium
            ?.copyWith(fontWeight: FontWeight.w600),
      ),
    );

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 28,
                            backgroundColor:
                                Theme.of(context).colorScheme.secondaryContainer,
                            child: Icon(Icons.person,
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSecondaryContainer),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(profile.name,
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleLarge),
                                Text(profile.email,
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodyMedium
                                        ?.copyWith(
                                            color: Theme.of(context)
                                                .colorScheme
                                                .onSurfaceVariant)),
                              ],
                            ),
                          ),
                          roleChip,
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Divider(),
                      _infoRow('Student number',
                          profile.studentNumber ?? '—'),
                      _infoRow('Session started',
                          _formatAt(login.session.startedAt)),
                      _infoRow('Session ID', login.session.id),
                      _infoRow('Device', login.session.device.isEmpty
                          ? '—'
                          : login.session.device),
                      _infoRow('MFA enabled',
                          login.session.mfaEnabled ? 'Yes' : 'No'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('MFA',
                          style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: _busy ? null : _setupMfa,
                              icon: const Icon(Icons.manage_accounts_outlined),
                              label: const Text('Set up MFA'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _mfaCode,
                              decoration: const InputDecoration(
                                labelText: 'Verification code',
                                isDense: true,
                              ),
                              enabled: !_busy,
                            ),
                          ),
                          const SizedBox(width: 12),
                          FilledButton(
                            onPressed: _busy ? null : _verifyMfa,
                            child: const Text('Verify'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              OutlinedButton.icon(
                onPressed: _busy ? null : _logout,
                icon: const Icon(Icons.logout),
                label: const Text('Logout'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 140,
            child: Text(label,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant)),
          ),
          Expanded(
            child: Text(value,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  String _formatAt(DateTime at) => at.toLocal().toString().split('.').first;
}

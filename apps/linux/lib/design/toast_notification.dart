import 'package:flutter/material.dart';

enum ToastKind { info, success, warning, error }

/// App-wide toast (MIGRATION_SPEC.md shared components). Rides the
/// ScaffoldMessenger so it survives navigation between shell destinations.
class ToastNotification extends StatelessWidget {
  const ToastNotification({
    super.key,
    required this.message,
    this.kind = ToastKind.info,
  });

  final String message;
  final ToastKind kind;

  Color get _color => switch (kind) {
        ToastKind.info => Colors.blueGrey.shade700,
        ToastKind.success => Colors.green.shade700,
        ToastKind.warning => Colors.amber.shade800,
        ToastKind.error => Colors.red.shade700,
      };

  IconData get _icon => switch (kind) {
        ToastKind.info => Icons.info_outline,
        ToastKind.success => Icons.check_circle_outline,
        ToastKind.warning => Icons.warning_amber_outlined,
        ToastKind.error => Icons.error_outline,
      };

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(_icon, color: Colors.white),
        const SizedBox(width: 10),
        Expanded(child: Text(message, style: const TextStyle(color: Colors.white))),
      ],
    );
  }
}

/// Convenience call — shows a toast via the nearest ScaffoldMessenger.
void showToast(
  BuildContext context,
  String message, {
  ToastKind kind = ToastKind.info,
  Duration duration = const Duration(seconds: 3),
}) {
  final messenger = ScaffoldMessenger.of(context);
  messenger
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: ToastNotification(message: message, kind: kind),
        duration: duration,
        backgroundColor: ToastNotification(message: message, kind: kind)._color,
      ),
    );
}

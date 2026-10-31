import 'dart:io';

/// Real $HOME on the VM (flutter test / Linux desktop).
String? defaultHome() => Platform.environment['HOME'];

import 'package:web/web.dart' as web;

import 'file_store.dart';

/// Web preview fallback: the XDG paths don't exist in a browser, so the same
/// namespace keys live in localStorage prefixed with `himvote:`. Keeps the
/// Linux storage contract untouched (real files on the desktop build).
class WebLocalStore extends RootedFileStore {
  const WebLocalStore(super.rootDir);

  static const _prefix = 'himvote:';

  @override
  Future<String?> read(String relativePath) async {
    final storage = web.window.localStorage;
    final value = storage.getItem('$_prefix$relativePath');
    return value == null || value.isEmpty ? null : value;
  }

  @override
  Future<void> write(String relativePath, String contents) async {
    web.window.localStorage.setItem('$_prefix$relativePath', contents);
  }

  @override
  Future<void> remove(String relativePath) async {
    web.window.localStorage.removeItem('$_prefix$relativePath');
  }
}

/// Conditional-import entry point (web targets).
FileStore createStore(String rootDir) => WebLocalStore(rootDir);

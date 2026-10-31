import 'dart:io';

import 'package:path/path.dart' as p;

import 'file_store.dart';

/// Linux/desktop implementation: real files under the himvote XDG dirs.
class XdgFileStore extends RootedFileStore {
  const XdgFileStore(super.rootDir);

  @override
  Future<String?> read(String relativePath) async {
    final file = File(p.join(rootDir, relativePath));
    if (!await file.exists()) return null;
    return file.readAsString();
  }

  @override
  Future<void> write(String relativePath, String contents) async {
    final file = File(p.join(rootDir, relativePath));
    await file.parent.create(recursive: true);
    await file.writeAsString(contents, flush: true);
  }

  @override
  Future<void> remove(String relativePath) async {
    final file = File(p.join(rootDir, relativePath));
    if (await file.exists()) await file.delete();
  }
}

/// Conditional-import entry point (VM targets).
FileStore createStore(String rootDir) => XdgFileStore(rootDir);

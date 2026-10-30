#!/usr/bin/env python3
"""Linux Standalone Packaging Script for HimVote Desktop Application.

Builds a self-contained Linux executable or AppDir bundling himvote_linux.py
along with desktop integration metadata and icon assets.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path


def get_base_dir() -> Path:
    return Path(__file__).resolve().parent.parent


def package_appdir(output_dir: Path) -> Path:
    """Prepare an AppDir structure conforming to the AppImage specification."""
    base_dir = get_base_dir()
    appdir = output_dir / "HimVote.AppDir"
    if appdir.exists():
        shutil.rmtree(appdir)

    usr_bin = appdir / "usr" / "bin"
    usr_share_apps = appdir / "usr" / "share" / "applications"
    usr_share_icons = appdir / "usr" / "share" / "icons" / "hicolor" / "scalable" / "apps"
    usr_share_metainfo = appdir / "usr" / "share" / "metainfo"

    for d in (usr_bin, usr_share_apps, usr_share_icons, usr_share_metainfo):
        d.mkdir(parents=True, exist_ok=True)

    # Copy files
    shutil.copy2(base_dir / "himvote_linux.py", usr_bin / "himvote")
    shutil.copy2(base_dir / "desktop" / "himvote.desktop", usr_share_apps / "himvote.desktop")
    shutil.copy2(base_dir / "desktop" / "himvote.desktop", appdir / "himvote.desktop")
    shutil.copy2(base_dir / "desktop" / "io.himvote.HimVote.metainfo.xml", usr_share_metainfo / "io.himvote.HimVote.metainfo.xml")

    icon_src = base_dir / "assets" / "icons" / "himvote.svg"
    if icon_src.exists():
        shutil.copy2(icon_src, usr_share_icons / "himvote.svg")
        shutil.copy2(icon_src, appdir / "himvote.svg")
        shutil.copy2(icon_src, appdir / ".DirIcon")

    # AppRun entrypoint
    apprun = appdir / "AppRun"
    with open(apprun, "w", encoding="utf-8") as f:
        f.write(
            "#!/bin/sh\\n"
            "HERE=$(dirname $(readlink -f \"${0}\"))\\n"
            "exec python3 \"${HERE}/usr/bin/himvote\" \"$@\"\\n"
        )
    os.chmod(apprun, 0o755)
    return appdir


def main() -> int:
    parser = argparse.ArgumentParser(description="Package HimVote Linux client")
    parser.add_argument("--out", default="dist", help="Output distribution directory")
    args = parser.parse_args()

    out_p = Path(args.out).resolve()
    out_p.mkdir(parents=True, exist_ok=True)

    appdir = package_appdir(out_p)
    print(f"HimVote AppDir packaged successfully at: {appdir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

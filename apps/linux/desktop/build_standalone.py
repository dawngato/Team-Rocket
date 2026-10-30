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
    usr_share_man = appdir / "usr" / "share" / "man" / "man1"
    usr_share_bash = appdir / "usr" / "share" / "bash-completion" / "completions"

    for d in (usr_bin, usr_share_apps, usr_share_icons, usr_share_metainfo, usr_share_man, usr_share_bash):
        d.mkdir(parents=True, exist_ok=True)

    # Copy binary and desktop assets
    shutil.copy2(base_dir / "himvote_linux.py", usr_bin / "himvote")
    shutil.copy2(base_dir / "desktop" / "himvote.desktop", usr_share_apps / "himvote.desktop")
    shutil.copy2(base_dir / "desktop" / "himvote.desktop", appdir / "himvote.desktop")
    shutil.copy2(base_dir / "desktop" / "io.himvote.HimVote.metainfo.xml", usr_share_metainfo / "io.himvote.HimVote.metainfo.xml")

    man_src = base_dir / "desktop" / "himvote.1"
    if man_src.exists():
        shutil.copy2(man_src, usr_share_man / "himvote.1")

    comp_src = base_dir / "desktop" / "himvote-completion.bash"
    if comp_src.exists():
        shutil.copy2(comp_src, usr_share_bash / "himvote")

    icon_src = base_dir / "assets" / "icons" / "himvote.svg"
    if icon_src.exists():
        shutil.copy2(icon_src, usr_share_icons / "himvote.svg")
        shutil.copy2(icon_src, appdir / "himvote.svg")
        shutil.copy2(icon_src, appdir / ".DirIcon")

    # AppRun entrypoint
    apprun = appdir / "AppRun"
    with open(apprun, "w", encoding="utf-8") as f:
        f.write(
            "#!/bin/sh\n"
            "HERE=$(dirname $(readlink -f \"${0}\"))\n"
            "exec python3 \"${HERE}/usr/bin/himvote\" \"$@\"\n"
        )
    try:
        os.chmod(apprun, 0o755)
    except Exception:
        pass
    return appdir


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build HimVote Linux AppDir and distribution packages")
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=Path.home() / "dist",
        help="Destination directory for distribution assets",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    appdir = package_appdir(args.output)
    print(f"HimVote AppDir packaged successfully at: {appdir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

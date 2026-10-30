"""Tests for FreeDesktop integration files, AppStream metadata, and packaging."""

import configparser
from pathlib import Path
import xml.etree.ElementTree as ET
import pytest

_REPO_ROOT = Path(__file__).resolve().parents[3]
_DESKTOP_DIR = _REPO_ROOT / "apps" / "linux" / "desktop"
_ICONS_DIR = _REPO_ROOT / "apps" / "linux" / "assets" / "icons"


def test_himvote_desktop_entry_syntax() -> None:
    desktop_file = _DESKTOP_DIR / "himvote.desktop"
    assert desktop_file.exists(), "himvote.desktop must exist"

    config = configparser.ConfigParser(interpolation=None)
    config.read(desktop_file, encoding="utf-8")

    assert "Desktop Entry" in config
    entry = config["Desktop Entry"]
    assert entry.get("Type") == "Application"
    assert entry.get("Name") == "HimVote"
    assert "Security" in entry.get("Categories", "")
    assert entry.get("Terminal") == "false"
    assert "AuditArchive" in entry.get("Actions", "")
    assert "VerifyReceipt" in entry.get("Actions", "")


def test_appstream_metainfo_xml_validity() -> None:
    metainfo_file = _DESKTOP_DIR / "io.himvote.HimVote.metainfo.xml"
    assert metainfo_file.exists(), "io.himvote.HimVote.metainfo.xml must exist"

    tree = ET.parse(metainfo_file)
    root = tree.getroot()
    assert root.tag == "component"
    assert root.attrib.get("type") == "desktop-application"

    component_id = root.find("id")
    assert component_id is not None
    assert component_id.text == "io.himvote.HimVote"

    name = root.find("name")
    assert name is not None
    assert name.text == "HimVote Linux"

    launchable = root.find("launchable")
    assert launchable is not None
    assert launchable.text == "himvote.desktop"


def test_svg_icon_asset_validity() -> None:
    svg_file = _ICONS_DIR / "himvote.svg"
    assert svg_file.exists(), "himvote.svg icon must exist"

    with open(svg_file, "r", encoding="utf-8") as f:
        svg_content = f.read()

    assert "<svg" in svg_content
    assert "</svg>" in svg_content
    assert "#10233F" in svg_content  # Institutional navy
    assert "#157E92" in svg_content  # Teal

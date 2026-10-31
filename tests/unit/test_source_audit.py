from pathlib import Path
import zipfile

from tools.source_audit import build_report, inspect_archive


def test_source_audit_marks_missing_himvote_inputs(tmp_path: Path) -> None:
    report = build_report(tmp_path)
    assert report["input_status"] == "INCOMPLETE"
    assert report["documents"]["architecture.md"]["present"] is False
    assert report["archives"]["helios-server-master.zip"]["executed"] is False


def test_source_audit_reads_archive_metadata_without_execution(tmp_path: Path) -> None:
    archive_path = tmp_path / "helios-server-master.zip"
    with zipfile.ZipFile(archive_path, "w") as archive:
        archive.writestr("LICENSE", "Apache License")
        archive.writestr("README.md", "reference")
    report = inspect_archive(archive_path)
    assert report["present"] is True
    assert report["executed"] is False
    assert report["license_candidates"] == ["LICENSE"]

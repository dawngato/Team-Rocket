import os
import tempfile
from pathlib import Path
import pytest
from apps.linux.himvote_linux import ElectionStore

def test_election_store_lifecycle():
    with tempfile.TemporaryDirectory() as tmpdir:
        store = ElectionStore(storage_dir=Path(tmpdir))
        
        # 1. No sample campaigns by default
        elections = store.list_elections()
        assert len(elections) == 0
        
        # 2. Create an election campaign
        camp = store.create_election(
            title="Himachal University Council 2026",
            contest="Council President",
            description="Official election for council presidency",
            end_date="30 Nov 2026",
            candidates=[
                {"id": "cand_1", "name": "Aarav Sharma", "slate": "Tech First", "department": "Computer Science", "statement": "Digital campus"},
                {"id": "cand_2", "name": "Ishita Verma", "slate": "Student First", "department": "Electronics", "statement": "Innovation lab"}
            ]
        )
        assert camp.election_id.startswith("elec_")
        assert len(store.list_elections()) == 1
        
        # 3. Student Registration
        success, msg = store.register_student(
            student_id="STU-2026-901",
            name="Abhay Thakur",
            email="abhay@hptu.ac.in",
            department="Computer Science"
        )
        assert success is True
        assert "Registration successful" in msg
        
        # Duplicate registration check
        dup_success, dup_msg = store.register_student(
            student_id="STU-2026-901",
            name="Abhay Thakur",
            email="abhay@hptu.ac.in",
            department="Computer Science"
        )
        assert dup_success is False
        assert "already registered" in dup_msg
        
        # 4. Cast ballot - first time succeeds
        receipt = store.cast_vote(
            election_id=camp.election_id,
            student_id="STU-2026-901",
            candidate_id="cand_1",
            department="Computer Science"
        )
        assert receipt["receipt_handle"].startswith("rcpt_")
        assert receipt["candidate_id"] == "cand_1"
        assert store.has_student_voted(camp.election_id, "STU-2026-901") is True
        
        # 5. One Student, One Vote enforcement - second ballot MUST fail
        with pytest.raises(ValueError, match="ONE STUDENT, ONE VOTE"):
            store.cast_vote(
                election_id=camp.election_id,
                student_id="STU-2026-901",
                candidate_id="cand_2"
            )
            
        # 6. Admin Analytics & Preview
        analytics = store.get_analytics(camp.election_id)
        assert analytics["total_votes"] == 1
        assert analytics["total_registered"] == 1
        assert analytics["turnout_percentage"] == 100.0
        assert analytics["margin_of_victory"] == 1
        assert analytics["candidates"][0]["name"] == "Aarav Sharma"
        assert analytics["candidates"][0]["vote_count"] == 1
        assert analytics["candidates"][0]["is_winner"] is True
        assert analytics["candidates"][1]["vote_count"] == 0
        assert analytics["department_distribution"]["Computer Science"] == 1
        
        # 7. Markdown Report Generation
        md_report = store.generate_markdown_report(camp.election_id)
        assert "# HimVote Official Certified Election Analytical Report" in md_report
        assert "**Election Title:** Himachal University Council 2026" in md_report
        assert "Aarav Sharma" in md_report
        assert "100.0%" in md_report

"""Initial Casting Cluster Schema

Revision ID: 0001_casting
Revises: 
Create Date: 2026_10_30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001_casting"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Elections table
    op.create_table(
        "elections",
        sa.Column("id", sa.String(255), primary_key=True),
        sa.Column("state", sa.String(100), server_default="DRAFT", nullable=False),
        sa.Column("manifest_digest", sa.Text(), nullable=True),
        sa.Column("opens_at_utc", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closes_at_utc", sa.DateTime(timezone=True), nullable=True),
        sa.Column("issuance_cutoff_utc", sa.DateTime(timezone=True), nullable=True),
        sa.Column("state_version", sa.Integer(), server_default="0", nullable=False),
        sa.Column("next_leaf_index", sa.BigInteger(), server_default="0", nullable=False),
        sa.Column("last_witnessed_tree_size", sa.BigInteger(), server_default="0", nullable=False),
        sa.Column("final_tree_size", sa.BigInteger(), nullable=True),
        sa.Column("transition_digest", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # Manifest versions table
    op.create_table(
        "manifest_versions",
        sa.Column("id", sa.String(255), primary_key=True),
        sa.Column("election_id", sa.String(255), sa.ForeignKey("elections.id"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("digest", sa.Text(), nullable=False),
        sa.Column("signed_by", sa.String(255), nullable=True),
        sa.Column("signed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # Contests table
    op.create_table(
        "contests",
        sa.Column("id", sa.String(255), primary_key=True),
        sa.Column("election_id", sa.String(255), sa.ForeignKey("elections.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("selection_rule", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # Candidates table
    op.create_table(
        "candidates",
        sa.Column("id", sa.String(255), primary_key=True),
        sa.Column("contest_id", sa.String(255), sa.ForeignKey("contests.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # Accepted encrypted ballots table
    op.create_table(
        "accepted_encrypted_ballots",
        sa.Column("leaf_index", sa.BigInteger(), primary_key=True),
        sa.Column("election_id", sa.String(255), sa.ForeignKey("elections.id"), nullable=False),
        sa.Column("credential_nullifier", sa.Text(), nullable=False),
        sa.Column("credential_proof_b64url", sa.Text(), nullable=False),
        sa.Column("engine_ballot_b64url", sa.Text(), nullable=False),
        sa.Column("engine_proofs_b64url", sa.Text(), nullable=False),
        sa.Column("engine_record_version", sa.String(100), nullable=False),
        sa.Column("request_digest", sa.Text(), nullable=False),
        sa.Column("committed_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.UniqueConstraint("election_id", "credential_nullifier", name="uq_election_nullifier"),
        sa.UniqueConstraint("election_id", "leaf_index", name="uq_election_leaf"),
    )

    # Checkpoint outbox table
    op.create_table(
        "checkpoint_outbox",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("election_id", sa.String(255), sa.ForeignKey("elections.id"), nullable=False),
        sa.Column("leaf_index", sa.BigInteger(), nullable=False),
        sa.Column("checkpoint_bytes", sa.Text(), nullable=False),
        sa.Column("checkpoint_digest", sa.Text(), nullable=False),
        sa.Column("acknowledged", sa.Boolean(), server_default=sa.text("FALSE"), nullable=False),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # Witness acknowledgements table
    op.create_table(
        "witness_acknowledgements",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("election_id", sa.String(255), sa.ForeignKey("elections.id"), nullable=False),
        sa.Column("checkpoint_digest", sa.Text(), nullable=False),
        sa.Column("witness_signature", sa.Text(), nullable=False),
        sa.Column("witness_key_id", sa.String(255), nullable=False),
        sa.Column("sequence", sa.BigInteger(), nullable=False),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # Tally proofs table
    op.create_table(
        "tally_proofs",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("election_id", sa.String(255), sa.ForeignKey("elections.id"), nullable=False),
        sa.Column("proof_b64url", sa.Text(), nullable=False),
        sa.Column("total_ballots", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # Published results table
    op.create_table(
        "published_results",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("election_id", sa.String(255), sa.ForeignKey("elections.id"), nullable=False),
        sa.Column("manifest_digest", sa.Text(), nullable=False),
        sa.Column("tally", postgresql.JSONB(), nullable=False),
        sa.Column("total_ballots", sa.Integer(), nullable=False),
        sa.Column("privacy_limited", sa.Boolean(), server_default=sa.text("FALSE"), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("auditor_signature", sa.Text(), nullable=False),
    )

    # Election events table
    op.create_table(
        "election_events",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("election_id", sa.String(255), sa.ForeignKey("elections.id"), nullable=False),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("from_state", sa.String(100), nullable=True),
        sa.Column("to_state", sa.String(100), nullable=False),
        sa.Column("transition_digest", sa.Text(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # Immutable row trigger on accepted_encrypted_ballots
    op.execute("""
    CREATE OR REPLACE FUNCTION deny_ballot_mutation()
    RETURNS TRIGGER AS $$
    BEGIN
        RAISE EXCEPTION 'Accepted encrypted ballots are immutable and permanent';
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_deny_ballot_update
    BEFORE UPDATE ON accepted_encrypted_ballots
    FOR EACH ROW EXECUTE FUNCTION deny_ballot_mutation();

    CREATE TRIGGER trg_deny_ballot_delete
    BEFORE DELETE ON accepted_encrypted_ballots
    FOR EACH ROW EXECUTE FUNCTION deny_ballot_mutation();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_deny_ballot_delete ON accepted_encrypted_ballots;")
    op.execute("DROP TRIGGER IF EXISTS trg_deny_ballot_update ON accepted_encrypted_ballots;")
    op.execute("DROP FUNCTION IF EXISTS deny_ballot_mutation;")

    op.drop_table("election_events")
    op.drop_table("published_results")
    op.drop_table("tally_proofs")
    op.drop_table("witness_acknowledgements")
    op.drop_table("checkpoint_outbox")
    op.drop_table("accepted_encrypted_ballots")
    op.drop_table("candidates")
    op.drop_table("contests")
    op.drop_table("manifest_versions")
    op.drop_table("elections")

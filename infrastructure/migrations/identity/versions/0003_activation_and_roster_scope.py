"""Add account activation tokens and class scope to roster corrections."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003_activation_and_roster_scope"
down_revision: Union[str, None] = "0002_recovery_consumed_at"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "account_activations",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(255), nullable=False, unique=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="PENDING"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column("roster_corrections", sa.Column("class_id", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("roster_corrections", "class_id")
    op.drop_table("account_activations")

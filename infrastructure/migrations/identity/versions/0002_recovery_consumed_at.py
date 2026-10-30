"""Add one time recovery consumption timestamp.

Revision ID: 0002_recovery_consumed_at
Revises: 0001_identity
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0002_recovery_consumed_at"
down_revision: Union[str, None] = "0001_identity"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "recovery_requests",
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("recovery_requests", "consumed_at")

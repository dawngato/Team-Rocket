"""Add user-controlled display name and contact phone to identity profiles."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0005_profile_attributes"
down_revision: Union[str, None] = "0004_notification_delivery_status"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("display_name", sa.String(length=80), nullable=True))
    op.add_column("users", sa.Column("phone_number", sa.String(length=16), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "phone_number")
    op.drop_column("users", "display_name")

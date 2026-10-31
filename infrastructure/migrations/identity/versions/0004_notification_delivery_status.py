"""Track delivery acceptance for one-time account lifecycle tokens."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004_notification_delivery_status"
down_revision: Union[str, None] = "0003_activation_and_roster_scope"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for table in ("invitations", "recovery_requests", "account_activations"):
        op.add_column(table, sa.Column("delivery_status", sa.String(50), nullable=False, server_default="PENDING"))


def downgrade() -> None:
    for table in ("account_activations", "recovery_requests", "invitations"):
        op.drop_column(table, "delivery_status")

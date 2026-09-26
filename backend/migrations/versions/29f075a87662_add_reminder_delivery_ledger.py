"""add reminder delivery ledger

Revision ID: 29f075a87662
Revises: 2e9ad836cb47
Create Date: 2026-09-25 21:00:32.156504
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "29f075a87662"
down_revision: str | None = "2e9ad836cb47"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "notification_deliveries",
        sa.Column("meeting_id", sa.Uuid(), nullable=False),
        sa.Column("recipient_id", sa.Uuid(), nullable=False),
        sa.Column("channel", sa.String(length=20), nullable=False),
        sa.Column("minutes_before", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("channel IN ('email', 'telegram')", name="ck_delivery_channel"),
        sa.CheckConstraint("status IN ('claimed', 'sent', 'failed')", name="ck_delivery_status"),
        sa.CheckConstraint("minutes_before IN (60, 5)", name="ck_delivery_offset"),
        sa.ForeignKeyConstraint(
            ["meeting_id"],
            ["meetings.id"],
        ),
        sa.ForeignKeyConstraint(
            ["recipient_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "meeting_id", "recipient_id", "channel", "minutes_before", name="uq_reminder_delivery"
        ),
    )


def downgrade() -> None:
    op.drop_table("notification_deliveries")

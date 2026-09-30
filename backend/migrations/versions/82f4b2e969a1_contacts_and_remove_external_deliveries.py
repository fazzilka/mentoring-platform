"""Add user contacts and remove obsolete external-delivery tables.

Revision ID: 82f4b2e969a1
Revises: 4b71fc8aeb17
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "82f4b2e969a1"
down_revision: str | None = "4b71fc8aeb17"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("telegram_username", sa.String(32), nullable=True))
    op.add_column("users", sa.Column("phone_number", sa.String(16), nullable=True))
    op.drop_table("notification_deliveries")
    op.drop_table("telegram_connections")


def downgrade() -> None:
    op.create_table(
        "telegram_connections",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("chat_id", sa.String(64), nullable=True, unique=True),
        sa.Column("link_token_hash", sa.String(64), nullable=True, unique=True),
        sa.Column("link_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), primary_key=True),
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
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.UniqueConstraint("user_id"),
    )
    op.create_table(
        "notification_deliveries",
        sa.Column("meeting_id", sa.Uuid(), nullable=False),
        sa.Column("recipient_id", sa.Uuid(), nullable=False),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("minutes_before", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), primary_key=True),
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
        sa.ForeignKeyConstraint(["meeting_id"], ["meetings.id"]),
        sa.ForeignKeyConstraint(["recipient_id"], ["users.id"]),
        sa.UniqueConstraint(
            "meeting_id", "recipient_id", "channel", "minutes_before", name="uq_reminder_delivery"
        ),
    )
    op.drop_column("users", "phone_number")
    op.drop_column("users", "telegram_username")

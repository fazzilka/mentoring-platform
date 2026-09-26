"""align_lab_2_domain_contract

Revision ID: 4b71fc8aeb17
Revises: 29f075a87662
Create Date: 2026-09-26 15:45:45.687565
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "4b71fc8aeb17"
down_revision: str | None = "29f075a87662"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("meeting_reflections", sa.Column("next_step", sa.Text(), nullable=True))
    op.create_unique_constraint(
        "uq_meeting_reflection_user", "meeting_reflections", ["meeting_id", "author_user_id"]
    )
    op.add_column("meetings", sa.Column("cancelled_by", sa.Uuid(), nullable=True))
    op.create_foreign_key("fk_meeting_cancelled_by", "meetings", "users", ["cancelled_by"], ["id"])
    op.add_column(
        "mentor_assignments",
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.add_column(
        "mentor_profiles",
        sa.Column("experience_years", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column("notifications", sa.Column("meeting_id", sa.Uuid(), nullable=True))
    op.add_column(
        "notifications",
        sa.Column("type", sa.String(length=50), server_default="system", nullable=False),
    )
    op.add_column("notifications", sa.Column("read_at", sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key(
        "fk_notification_meeting", "notifications", "meetings", ["meeting_id"], ["id"]
    )
    op.add_column(
        "users", sa.Column("first_name", sa.String(length=100), server_default="", nullable=False)
    )
    op.add_column(
        "users", sa.Column("last_name", sa.String(length=100), server_default="", nullable=False)
    )
    op.add_column(
        "users",
        sa.Column(
            "timezone", sa.String(length=100), server_default="Europe/Moscow", nullable=False
        ),
    )
    op.drop_constraint("ck_mentor_status", "mentor_profiles", type_="check")
    op.create_check_constraint(
        "ck_mentor_status", "mentor_profiles", "status IN ('active', 'inactive', 'departed')"
    )
    op.create_check_constraint(
        "ck_mentor_experience_years", "mentor_profiles", "experience_years >= 0"
    )
    op.create_check_constraint(
        "ck_meeting_duration", "meetings", "duration_minutes IN (60, 75, 90)"
    )
    op.execute("UPDATE mentor_assignments SET started_at = created_at")
    op.execute(
        "UPDATE users SET first_name = left(split_part(name, ' ', 1), 100), "
        "last_name = left(CASE WHEN strpos(name, ' ') > 0 "
        "THEN substr(name, strpos(name, ' ') + 1) ELSE '' END, 100)"
    )
    op.execute("UPDATE notifications SET read_at = updated_at WHERE is_read = true")


def downgrade() -> None:
    if op.get_bind().scalar(sa.text("SELECT EXISTS (SELECT 1 FROM users)")):
        raise NotImplementedError(
            "Downgrade is allowed only on an empty disposable database; new fields would be lost."
        )
    op.drop_constraint("ck_meeting_duration", "meetings", type_="check")
    op.drop_constraint("ck_mentor_experience_years", "mentor_profiles", type_="check")
    op.drop_constraint("ck_mentor_status", "mentor_profiles", type_="check")
    op.create_check_constraint(
        "ck_mentor_status", "mentor_profiles", "status IN ('active', 'departed')"
    )
    op.drop_column("users", "timezone")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
    op.drop_constraint("fk_notification_meeting", "notifications", type_="foreignkey")
    op.drop_column("notifications", "read_at")
    op.drop_column("notifications", "type")
    op.drop_column("notifications", "meeting_id")
    op.drop_column("mentor_profiles", "experience_years")
    op.drop_column("mentor_assignments", "started_at")
    op.drop_constraint("fk_meeting_cancelled_by", "meetings", type_="foreignkey")
    op.drop_column("meetings", "cancelled_by")
    op.drop_constraint("uq_meeting_reflection_user", "meeting_reflections", type_="unique")
    op.drop_column("meeting_reflections", "next_step")

"""initial domain schema

Revision ID: 2e9ad836cb47
Revises:
Create Date: 2026-09-25 20:55:08.809964
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "2e9ad836cb47"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("avatar_url", sa.String(length=2048), nullable=True),
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_table(
        "auth_sessions",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("refresh_token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("refresh_token_hash"),
    )
    op.create_index(op.f("ix_auth_sessions_user_id"), "auth_sessions", ["user_id"], unique=False)
    op.create_table(
        "availability_slots",
        sa.Column("mentor_id", sa.Uuid(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
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
        sa.CheckConstraint("status IN ('free', 'pending', 'booked')", name="ck_slot_status"),
        sa.CheckConstraint("duration_minutes IN (60, 75, 90)", name="ck_slot_duration"),
        sa.ForeignKeyConstraint(
            ["mentor_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_mentor_slot_start", "availability_slots", ["mentor_id", "starts_at"], unique=False
    )
    op.create_table(
        "mentor_assignments",
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("mentor_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_reason", sa.String(length=100), nullable=True),
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
        sa.CheckConstraint("status IN ('active', 'ended')", name="ck_assignment_status"),
        sa.ForeignKeyConstraint(
            ["mentor_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["student_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_mentor_assignments_mentor_id"), "mentor_assignments", ["mentor_id"], unique=False
    )
    op.create_index(
        op.f("ix_mentor_assignments_student_id"), "mentor_assignments", ["student_id"], unique=False
    )
    op.create_index(
        "uq_active_student_assignment",
        "mentor_assignments",
        ["student_id"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )
    op.create_table(
        "mentor_profiles",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("about", sa.Text(), nullable=False),
        sa.Column("specialization", sa.String(length=30), nullable=False),
        sa.Column("skills", sa.JSON(), nullable=False),
        sa.Column("experience", sa.Text(), nullable=False),
        sa.Column("company", sa.String(length=160), nullable=False),
        sa.Column("position", sa.String(length=160), nullable=False),
        sa.Column("timezone", sa.String(length=100), nullable=False),
        sa.Column("default_meeting_url", sa.String(length=2048), nullable=True),
        sa.Column("accepting_students", sa.Boolean(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
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
        sa.CheckConstraint(
            "specialization IN ('Backend', 'Frontend', 'ML', 'DevOps')",
            name="ck_mentor_specialization",
        ),
        sa.CheckConstraint("status IN ('active', 'departed')", name="ck_mentor_status"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_table(
        "notifications",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False),
        sa.Column("deduplication_key", sa.String(length=200), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("deduplication_key", name="uq_notification_deduplication"),
    )
    op.create_index(op.f("ix_notifications_user_id"), "notifications", ["user_id"], unique=False)
    op.create_table(
        "student_profiles",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("about", sa.Text(), nullable=False),
        sa.Column("current_level", sa.String(length=100), nullable=False),
        sa.Column("direction", sa.String(length=100), nullable=False),
        sa.Column("learning_goal", sa.Text(), nullable=False),
        sa.Column("technologies", sa.JSON(), nullable=False),
        sa.Column("wants_to_learn", sa.Text(), nullable=False),
        sa.Column("timezone", sa.String(length=100), nullable=False),
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
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_table(
        "telegram_connections",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("chat_id", sa.String(length=64), nullable=True),
        sa.Column("link_token_hash", sa.String(length=64), nullable=True),
        sa.Column("link_expires_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("chat_id"),
        sa.UniqueConstraint("link_token_hash"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_table(
        "user_roles",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.CheckConstraint("role IN ('student', 'mentor')", name="ck_user_roles_role"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "role", name="uq_user_roles_user_role"),
    )
    op.create_table(
        "meetings",
        sa.Column("assignment_id", sa.Uuid(), nullable=False),
        sa.Column("slot_id", sa.Uuid(), nullable=False),
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("mentor_id", sa.Uuid(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("meeting_url", sa.String(length=2048), nullable=True),
        sa.Column("cancellation_reason", sa.String(length=160), nullable=True),
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
        sa.CheckConstraint(
            "status IN ('pending', 'confirmed', 'completed', 'cancelled')", name="ck_meeting_status"
        ),
        sa.ForeignKeyConstraint(
            ["assignment_id"],
            ["mentor_assignments.id"],
        ),
        sa.ForeignKeyConstraint(
            ["mentor_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["slot_id"],
            ["availability_slots.id"],
        ),
        sa.ForeignKeyConstraint(
            ["student_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_meetings_mentor_id"), "meetings", ["mentor_id"], unique=False)
    op.create_index(op.f("ix_meetings_slot_id"), "meetings", ["slot_id"], unique=False)
    op.create_index(op.f("ix_meetings_student_id"), "meetings", ["student_id"], unique=False)
    op.create_index(
        "uq_open_meeting_slot",
        "meetings",
        ["slot_id"],
        unique=True,
        postgresql_where=sa.text("status IN ('pending', 'confirmed')"),
    )
    op.create_table(
        "meeting_reflections",
        sa.Column("meeting_id", sa.Uuid(), nullable=False),
        sa.Column("author_user_id", sa.Uuid(), nullable=False),
        sa.Column("author_role", sa.String(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
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
        sa.CheckConstraint(
            "author_role IN ('student', 'mentor')", name="ck_reflection_author_role"
        ),
        sa.ForeignKeyConstraint(
            ["author_user_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["meeting_id"],
            ["meetings.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("meeting_id", "author_role", name="uq_meeting_reflection_author"),
    )
    op.create_index(
        op.f("ix_meeting_reflections_meeting_id"),
        "meeting_reflections",
        ["meeting_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_meeting_reflections_meeting_id"), table_name="meeting_reflections")
    op.drop_table("meeting_reflections")
    op.drop_index(
        "uq_open_meeting_slot",
        table_name="meetings",
        postgresql_where=sa.text("status IN ('pending', 'confirmed')"),
    )
    op.drop_index(op.f("ix_meetings_student_id"), table_name="meetings")
    op.drop_index(op.f("ix_meetings_slot_id"), table_name="meetings")
    op.drop_index(op.f("ix_meetings_mentor_id"), table_name="meetings")
    op.drop_table("meetings")
    op.drop_table("user_roles")
    op.drop_table("telegram_connections")
    op.drop_table("student_profiles")
    op.drop_index(op.f("ix_notifications_user_id"), table_name="notifications")
    op.drop_table("notifications")
    op.drop_table("mentor_profiles")
    op.drop_index(
        "uq_active_student_assignment",
        table_name="mentor_assignments",
        postgresql_where=sa.text("status = 'active'"),
    )
    op.drop_index(op.f("ix_mentor_assignments_student_id"), table_name="mentor_assignments")
    op.drop_index(op.f("ix_mentor_assignments_mentor_id"), table_name="mentor_assignments")
    op.drop_table("mentor_assignments")
    op.drop_index("ix_mentor_slot_start", table_name="availability_slots")
    op.drop_table("availability_slots")
    op.drop_index(op.f("ix_auth_sessions_user_id"), table_name="auth_sessions")
    op.drop_table("auth_sessions")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")

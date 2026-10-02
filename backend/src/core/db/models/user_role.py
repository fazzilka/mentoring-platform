import uuid

from sqlalchemy import CheckConstraint, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from src.core.db.db import Base
from src.core.db.models.common import UUIDPrimaryKey


class UserRole(UUIDPrimaryKey, Base):
    __tablename__ = "user_roles"
    __table_args__ = (
        CheckConstraint("role IN ('student', 'mentor')", name="ck_user_roles_role"),
        UniqueConstraint("user_id", "role", name="uq_user_roles_user_role"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    role: Mapped[str]

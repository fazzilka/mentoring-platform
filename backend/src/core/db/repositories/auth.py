import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.db.models import AuthSession, MentorProfile, StudentProfile, User, UserRole


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    return await db.get(User, user_id)


async def get_session(db: AsyncSession, session_id: uuid.UUID) -> AuthSession | None:
    return await db.get(AuthSession, session_id)


async def get_session_by_hash(db: AsyncSession, token_hash: str) -> AuthSession | None:
    result = await db.execute(
        select(AuthSession).where(AuthSession.refresh_token_hash == token_hash).with_for_update()
    )
    return result.scalar_one_or_none()


async def get_roles(db: AsyncSession, user_id: uuid.UUID) -> list[str]:
    return list(await db.scalars(select(UserRole.role).where(UserRole.user_id == user_id)))


async def add_role(db: AsyncSession, user_id: uuid.UUID, role: str) -> None:
    db.add(UserRole(user_id=user_id, role=role))
    if role == "student":
        db.add(StudentProfile(user_id=user_id))
    else:
        db.add(MentorProfile(user_id=user_id))

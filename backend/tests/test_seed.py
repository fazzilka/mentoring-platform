import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from src.models import Meeting, User, UserRole
from src.seed import seed_platform


@pytest.mark.asyncio
async def test_platform_seed_is_idempotent_and_has_dual_role(db: AsyncSession) -> None:
    await seed_platform(db, "test-seed-password")
    first_count = await db.scalar(select(func.count(User.id)))
    first_meetings = await db.scalar(select(func.count(Meeting.id)))
    user = await db.scalar(select(User).where(User.email == "dual@example.com"))
    assert user
    original_hash = user.password_hash
    await seed_platform(db, "different-test-password")
    assert await db.scalar(select(func.count(User.id))) == first_count
    assert await db.scalar(select(func.count(Meeting.id))) == first_meetings
    assert user.password_hash == original_hash
    user.first_name = "Изменённое имя"
    await db.commit()
    await seed_platform(db, "new-test-password", reset_passwords=True)
    assert user.password_hash != original_hash
    assert user.first_name == "Изменённое имя"
    assert set(await db.scalars(select(UserRole.role).where(UserRole.user_id == user.id))) == {
        "student",
        "mentor",
    }

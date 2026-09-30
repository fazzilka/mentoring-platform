import asyncio
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from src.config.config import get_settings
from src.core.db.db import get_session
from src.core.db.models import (
    AuthSession,
    AvailabilitySlot,
    Meeting,
    MentorAssignment,
    MentorProfile,
    Notification,
    StudentProfile,
    User,
    UserRole,
)
from src.main import app

from tests.test_platform import headers, person


@pytest.mark.asyncio
async def test_concurrent_requests_reserve_slot_once() -> None:
    engine = create_async_engine(get_settings().database_url, poolclass=NullPool)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    identities = []

    async def independent_session() -> AsyncIterator[AsyncSession]:
        async with factory() as db:
            yield db

    try:
        async with factory() as db:
            mentor = await person(db, "mentor")
            identities.append(mentor.id)
            students = [await person(db, "student"), await person(db, "student")]
            identities.extend(student.id for student in students)
            for student in students:
                db.add(MentorAssignment(student_id=student.id, mentor_id=mentor.id))
            slot = AvailabilitySlot(
                mentor_id=mentor.id,
                starts_at=datetime.now(UTC) + timedelta(days=3),
                duration_minutes=60,
            )
            db.add(slot)
            await db.commit()
        app.dependency_overrides[get_session] = independent_session
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            responses = await asyncio.gather(
                *[
                    client.post(
                        "/api/v1/meetings",
                        headers=headers(student),
                        json={"availability_slot_id": str(slot.id)},
                    )
                    for student in students
                ]
            )
            assert sorted(response.status_code for response in responses) == [201, 409]
        async with factory() as db:
            assert (
                await db.scalar(select(func.count(Meeting.id)).where(Meeting.slot_id == slot.id))
                == 1
            )
            stored = await db.get(AvailabilitySlot, slot.id)
            assert stored and stored.status == "pending"
    finally:
        app.dependency_overrides.clear()
        async with factory() as db:
            for model, column in (
                (Notification, Notification.user_id),
                (Meeting, Meeting.mentor_id),
                (AvailabilitySlot, AvailabilitySlot.mentor_id),
                (MentorAssignment, MentorAssignment.mentor_id),
                (AuthSession, AuthSession.user_id),
                (MentorProfile, MentorProfile.user_id),
                (StudentProfile, StudentProfile.user_id),
                (UserRole, UserRole.user_id),
                (User, User.id),
            ):
                await db.execute(delete(model).where(column.in_(identities)))
            await db.commit()
        await engine.dispose()

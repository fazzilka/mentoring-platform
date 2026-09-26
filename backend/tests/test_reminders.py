import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from src.core.config import get_settings
from src.models import (
    AvailabilitySlot,
    Meeting,
    MentorAssignment,
    Notification,
    NotificationDelivery,
    TelegramConnection,
    User,
)
from src.services import reminders


@pytest.mark.asyncio
async def test_reminders_are_not_sent_twice(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    sent: list[str] = []
    monkeypatch.setattr(
        reminders, "send_email", lambda address, _subject, _body: sent.append(address)
    )
    monkeypatch.setattr(get_settings(), "telegram_bot_token", "test-only-token")

    def failed_telegram(_chat: str, _body: str) -> None:
        raise RuntimeError("test-only-token must never be logged")

    monkeypatch.setattr(reminders, "send_telegram", failed_telegram)
    engine = create_async_engine(get_settings().database_url, poolclass=NullPool)
    try:
        async with engine.connect() as connection:
            transaction = await connection.begin()
            factory = async_sessionmaker(
                bind=connection, expire_on_commit=False, join_transaction_mode="create_savepoint"
            )
            async with factory() as db:
                student = User(
                    id=uuid.uuid4(),
                    name="Ученик",
                    email="reminder-student@example.com",
                    password_hash="test",
                )
                mentor = User(
                    id=uuid.uuid4(),
                    name="Наставник",
                    email="reminder-mentor@example.com",
                    password_hash="test",
                )
                db.add_all([student, mentor])
                await db.flush()
                db.add_all(
                    [
                        TelegramConnection(user_id=student.id, chat_id="test-student"),
                        TelegramConnection(user_id=mentor.id, chat_id="test-mentor"),
                    ]
                )
                assignment = MentorAssignment(
                    id=uuid.uuid4(), student_id=student.id, mentor_id=mentor.id, status="active"
                )
                slot = AvailabilitySlot(
                    id=uuid.uuid4(),
                    mentor_id=mentor.id,
                    starts_at=datetime.now(UTC) + timedelta(minutes=4),
                    duration_minutes=60,
                    status="booked",
                )
                db.add_all([assignment, slot])
                await db.flush()
                meeting = Meeting(
                    id=uuid.uuid4(),
                    assignment_id=assignment.id,
                    slot_id=slot.id,
                    student_id=student.id,
                    mentor_id=mentor.id,
                    starts_at=slot.starts_at,
                    duration_minutes=60,
                    status="confirmed",
                    meeting_url="https://telemost.yandex.ru/j/1234567890",
                )
                db.add(meeting)
                await db.commit()
                now = datetime.now(UTC)
                await reminders.send_due_reminders(db, now)
                await reminders.send_due_reminders(db, now)
                assert len(sent) == 4
                deliveries = await db.scalar(
                    select(func.count(NotificationDelivery.id)).where(
                        NotificationDelivery.meeting_id == meeting.id
                    )
                )
                notifications = await db.scalar(
                    select(func.count(Notification.id)).where(
                        Notification.user_id.in_([student.id, mentor.id])
                    )
                )
                assert deliveries == 8
                assert notifications == 4
                assert "reminder_delivery_failed channel=telegram" in caplog.text
                assert "test-only-token" not in caplog.text
            await transaction.rollback()
    finally:
        await engine.dispose()

import logging
import smtplib
import uuid
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

import httpx
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.integrations.email.client import send_email
from src.integrations.telegram.client import send_telegram
from src.models import Meeting, Notification, NotificationDelivery, TelegramConnection, User

logger = logging.getLogger(__name__)


async def due_meetings(db: AsyncSession, now: datetime) -> list[Meeting]:
    return list(
        await db.scalars(
            select(Meeting).where(
                Meeting.status == "confirmed",
                Meeting.starts_at > now,
                Meeting.starts_at <= now + timedelta(minutes=60),
            )
        )
    )


async def claim_delivery(
    db: AsyncSession, meeting_id: uuid.UUID, user_id: uuid.UUID, channel: str, offset: int
) -> uuid.UUID | None:
    delivery_id = uuid.uuid4()
    result = await db.execute(
        insert(NotificationDelivery)
        .values(
            id=delivery_id,
            meeting_id=meeting_id,
            recipient_id=user_id,
            channel=channel,
            minutes_before=offset,
            status="claimed",
        )
        .on_conflict_do_nothing(constraint="uq_reminder_delivery")
        .returning(NotificationDelivery.id)
    )
    await db.commit()
    return result.scalar_one_or_none()


async def mark_delivery(db: AsyncSession, delivery_id: uuid.UUID, sent: bool) -> None:
    delivery = await db.get(NotificationDelivery, delivery_id)
    if delivery:
        delivery.status = "sent" if sent else "failed"
        delivery.sent_at = datetime.now(UTC) if sent else None
        await db.commit()


async def create_web_notification(
    db: AsyncSession, meeting: Meeting, user_id: uuid.UUID, offset: int
) -> None:
    key = f"meeting:{meeting.id}:user:{user_id}:before:{offset}"
    await db.execute(
        insert(Notification)
        .values(
            id=uuid.uuid4(),
            user_id=user_id,
            title="Скоро встреча с наставником",
            body=f"Напоминание за {offset} минут до встречи. Проверьте время в расписании.",
            is_read=False,
            deduplication_key=key,
        )
        .on_conflict_do_nothing(constraint="uq_notification_deduplication")
    )
    await db.commit()


async def send_due_reminders(db: AsyncSession, now: datetime | None = None) -> None:
    now = now or datetime.now(UTC)
    for meeting in await due_meetings(db, now):
        for offset in (60, 5):
            if meeting.starts_at > now + timedelta(minutes=offset):
                continue
            for user_id in (meeting.student_id, meeting.mentor_id):
                await create_web_notification(db, meeting, user_id, offset)
                user = await db.get(User, user_id)
                if user is None:
                    continue
                local_time = meeting.starts_at.astimezone(ZoneInfo(user.timezone))
                body = (
                    f"Напоминание за {offset} минут до встречи.\n"
                    f"Ученик: {meeting.student_name}\nНаставник: {meeting.mentor_name}\n"
                    f"Дата и время: {local_time:%d.%m.%Y %H:%M} ({user.timezone})\n"
                    f"Длительность: {meeting.duration_minutes} минут."
                )
                if meeting.meeting_url:
                    body = f"{body}\nТелемост: {meeting.meeting_url}"
                email_delivery = await claim_delivery(db, meeting.id, user_id, "email", offset)
                if email_delivery:
                    try:
                        send_email(user.email, "Напоминание о встрече", body)
                    except OSError, TimeoutError, smtplib.SMTPException:
                        logger.warning(
                            "reminder_delivery_failed channel=email delivery_id=%s", email_delivery
                        )
                        await mark_delivery(db, email_delivery, False)
                    else:
                        await mark_delivery(db, email_delivery, True)
                if not get_settings().telegram_bot_token:
                    continue
                connection = await db.scalar(
                    select(TelegramConnection).where(TelegramConnection.user_id == user_id)
                )
                if connection and connection.chat_id:
                    telegram_delivery = await claim_delivery(
                        db, meeting.id, user_id, "telegram", offset
                    )
                    if telegram_delivery:
                        try:
                            send_telegram(connection.chat_id, body)
                        except OSError, RuntimeError, httpx.HTTPError:
                            logger.warning(
                                "reminder_delivery_failed channel=telegram delivery_id=%s",
                                telegram_delivery,
                            )
                            await mark_delivery(db, telegram_delivery, False)
                        else:
                            await mark_delivery(db, telegram_delivery, True)

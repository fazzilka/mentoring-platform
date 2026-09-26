import argparse
import asyncio
import logging
import os
import secrets
from datetime import UTC, datetime, timedelta
from uuid import NAMESPACE_URL, UUID, uuid5

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.database import engine, session_factory
from src.core.security import hash_password
from src.dao import auth as users
from src.models import (
    AuthSession,
    AvailabilitySlot,
    Meeting,
    MentorAssignment,
    MentorProfile,
    Notification,
    StudentProfile,
    User,
)


async def seed_demo_users(db: AsyncSession) -> dict[str, UUID]:
    identities: dict[str, UUID] = {}
    for role, identity, first_name, last_name in (
        ("student", UUID("11111111-1111-4111-8111-111111111111"), "Олег", "Митин"),
        ("mentor", UUID("22222222-2222-4222-8222-222222222222"), "Дмитрий", "Волков"),
    ):
        user = await users.get_user(db, identity)
        if user is None:
            user = User(
                id=identity,
                name=f"{first_name} {last_name}",
                first_name=first_name,
                last_name=last_name,
                email=f"lab2-{role}@example.com",
                password_hash=hash_password(secrets.token_urlsafe(32)),
            )
            db.add(user)
            await db.flush()
            await users.add_role(db, identity, role)
        identities[role] = identity
    await db.commit()
    return identities


async def main() -> None:
    parser = argparse.ArgumentParser(description="Local development seed")
    parser.add_argument(
        "--reset-passwords", action="store_true", help="Reset only seeded demo accounts"
    )
    arguments = parser.parse_args()
    if get_settings().environment not in {"local", "test"}:
        raise RuntimeError("Demo seed разрешён только в local/test")
    try:
        async with session_factory() as db:
            password = os.environ.get("DEMO_PASSWORD", "")
            if len(password) < 8:
                raise RuntimeError("Задайте DEMO_PASSWORD длиной не менее 8 символов")
            await seed_platform(db, password, reset_passwords=arguments.reset_passwords)
            logging.info(
                "Development seed готов; аккаунты @example.com: "
                "student, backend, frontend, ml, devops, dual, pupil"
            )
    finally:
        await engine.dispose()


async def seed_platform(db: AsyncSession, password: str, *, reset_passwords: bool = False) -> None:
    """Explicit, idempotent local fixtures; never resets existing user data."""

    def identity(key: str) -> UUID:
        return uuid5(NAMESPACE_URL, f"mentoring-platform:lab5:{key}")

    for key, name, specialization in (
        ("student", "Олег Митин", None),
        ("backend", "Дмитрий Волков", "Backend"),
        ("frontend", "Анна Лебедева", "Frontend"),
        ("ml", "Илья Ким", "ML"),
        ("devops", "Елена Орлова", "DevOps"),
        ("dual", "Алексей Морозов", "Backend"),
        ("pupil", "Мария Соколова", None),
    ):
        existing = await db.get(User, identity(key))
        if existing:
            if reset_passwords:
                if existing.email != f"{key}@example.com":
                    raise RuntimeError("Seed аккаунт изменён; сброс пароля отменён")
                existing.password_hash = hash_password(password)
                for session in await db.scalars(
                    select(AuthSession).where(AuthSession.user_id == existing.id)
                ):
                    session.revoked_at = datetime.now(UTC)
            continue
        first, last = name.split(" ")
        db.add(
            User(
                id=identity(key),
                name=name,
                first_name=first,
                last_name=last,
                email=f"{key}@example.com",
                password_hash=hash_password(password),
            )
        )
        await db.flush()
        roles = (
            ["student", "mentor"] if key == "dual" else ["mentor" if specialization else "student"]
        )
        for role in roles:
            await users.add_role(db, identity(key), role)
        await db.flush()
        if specialization:
            mentor = await db.scalar(
                select(MentorProfile).where(MentorProfile.user_id == identity(key))
            )
            assert mentor
            mentor.specialization = specialization
            mentor.about = (
                f"Помогаю выстроить план развития в {specialization}, "
                "разобраться в рабочих задачах и подготовиться к собеседованию."
            )
            mentor.skills = {
                "Backend": ["Python", "FastAPI", "PostgreSQL"],
                "Frontend": ["React", "TypeScript", "CSS"],
                "ML": ["Python", "PyTorch", "MLflow"],
                "DevOps": ["Docker", "Linux", "Kubernetes"],
            }[specialization]
            mentor.company = "Яндекс"
            mentor.position = "Senior Engineer"
            mentor.experience_years = 7
            mentor.default_meeting_url = "https://telemost.yandex.ru/j/1234567890"
        if "student" in roles:
            student = await db.scalar(
                select(StudentProfile).where(StudentProfile.user_id == identity(key))
            )
            assert student
            student.direction = "Backend"
            student.level = "Junior"
            student.goal = "Уверенно проектировать и разрабатывать web-сервисы"
            student.technologies = ["Python", "SQL"]
            student.about = "Изучаю разработку и хочу систематизировать практические знания."
        db.add(
            Notification(
                id=identity(f"welcome:{key}"),
                user_id=identity(key),
                title="Добро пожаловать",
                body="Заполните профиль и начните работу с наставником.",
            )
        )
    now = datetime.now(UTC)
    for mentor_key in ("backend", "frontend", "ml", "devops", "dual"):
        for index in range(4):
            slot_id = identity(f"free:{mentor_key}:{index}")
            if not await db.get(AvailabilitySlot, slot_id):
                db.add(
                    AvailabilitySlot(
                        id=slot_id,
                        mentor_id=identity(mentor_key),
                        starts_at=now + timedelta(days=index + 1, hours=2),
                        duration_minutes=(60, 75, 90, 60)[index],
                        status="free",
                    )
                )
    assignment_id = identity("pupil-assignment")
    if not await db.get(MentorAssignment, assignment_id):
        db.add(
            MentorAssignment(
                id=assignment_id,
                student_id=identity("pupil"),
                mentor_id=identity("dual"),
                status="active",
            )
        )
    await db.flush()
    for index, status in enumerate(("pending", "confirmed", "completed", "cancelled")):
        meeting_id = identity(f"meeting:{index}")
        if await db.get(Meeting, meeting_id):
            continue
        starts = (
            now + timedelta(days=index + 2) if status != "completed" else now - timedelta(days=1)
        )
        slot_id = identity(f"meeting-slot:{index}")
        db.add(
            AvailabilitySlot(
                id=slot_id,
                mentor_id=identity("dual"),
                starts_at=starts,
                duration_minutes=60,
                status="pending"
                if status == "pending"
                else "booked"
                if status == "confirmed"
                else "free",
            )
        )
        await db.flush()
        db.add(
            Meeting(
                id=meeting_id,
                assignment_id=assignment_id,
                slot_id=slot_id,
                student_id=identity("pupil"),
                mentor_id=identity("dual"),
                starts_at=starts,
                duration_minutes=60,
                status=status,
                meeting_url="https://telemost.yandex.ru/j/1234567890",
            )
        )
    await db.commit()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    asyncio.run(main())

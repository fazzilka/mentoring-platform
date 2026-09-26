import uuid
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.security import create_access_token, hash_token
from src.models import (
    AuthSession,
    AvailabilitySlot,
    Meeting,
    MentorAssignment,
    MentorProfile,
    StudentProfile,
    User,
    UserRole,
)
from src.seed import seed_demo_users


async def person(db: AsyncSession, role: str, *, both: bool = False) -> User:
    identity = uuid.uuid4()
    user = User(
        id=identity,
        name=f"Тестовый {role}",
        first_name="Тестовый",
        last_name=role,
        email=f"{identity}@example.com",
        password_hash="not-a-login-credential",
    )
    db.add(user)
    await db.flush()
    for item in ["student", "mentor"] if both else [role]:
        db.add(UserRole(user_id=user.id, role=item))
        if item == "student":
            db.add(StudentProfile(user_id=user.id))
        else:
            db.add(
                MentorProfile(
                    user_id=user.id, default_meeting_url="https://telemost.yandex.ru/j/lab2"
                )
            )
    await db.commit()
    db.add(
        AuthSession(
            id=user.id,
            user_id=user.id,
            refresh_token_hash=hash_token(str(user.id)),
            expires_at=datetime.now(UTC) + timedelta(days=1),
        )
    )
    await db.commit()
    return user


def headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user.id, user.id)}"}


async def assign(client: AsyncClient, student: User, mentor: User) -> str:
    response = await client.post(
        "/api/v1/assignments", headers=headers(student), json={"mentor_id": str(mentor.id)}
    )
    assert response.status_code == 201, response.text
    return str(response.json()["id"])


async def slot(client: AsyncClient, mentor: User, days: int = 7) -> str:
    response = await client.post(
        "/api/v1/slots",
        headers=headers(mentor),
        json={
            "starts_at": (datetime.now(UTC) + timedelta(days=days)).isoformat(),
            "duration_minutes": 75,
        },
    )
    assert response.status_code == 201, response.text
    assert response.json()["state"] == "free"
    return str(response.json()["id"])


async def request(client: AsyncClient, student: User, slot_id: str) -> str:
    response = await client.post(
        "/api/v1/meetings", headers=headers(student), json={"availability_slot_id": slot_id}
    )
    assert response.status_code == 201, response.text
    assert response.json()["status"] == "pending"
    return str(response.json()["id"])


async def test_development_identity_is_rejected(client: AsyncClient, db: AsyncSession) -> None:
    assert (await client.get("/api/v1/mentors")).status_code == 401
    assert (
        await client.get("/api/v1/mentors", headers={"X-Development-User-Id": "invalid"})
    ).status_code == 401
    assert (
        await client.get("/api/v1/mentors", headers={"X-Development-User-Id": str(uuid.uuid4())})
    ).status_code == 401
    user = await person(db, "student")
    assert (
        await client.get("/api/v1/mentors", headers={"X-Development-User-Id": str(user.id)})
    ).status_code == 401
    schema = (await client.get("/openapi.json")).json()
    assert "/api/v1/auth/login" in schema["paths"]
    assert not any("/telegram" in path for path in schema["paths"])


async def test_catalog_and_profiles(client: AsyncClient, db: AsyncSession) -> None:
    student = await person(db, "student", both=True)
    mentor = await person(db, "mentor")
    saved = await client.put(
        "/api/v1/profiles/mentor/me",
        headers=headers(mentor),
        json={
            "specialization": "DevOps",
            "experience_years": 5,
            "skills": ["Docker"],
            "default_meeting_url": "https://telemost.yandex.ru/j/lab2",
        },
    )
    assert saved.status_code == 200, saved.text
    response = await client.get("/api/v1/mentors?specialization=DevOps", headers=headers(student))
    assert response.status_code == 200
    assert [item["user_id"] for item in response.json()] == [str(mentor.id)]
    assert (
        await client.get(f"/api/v1/mentors/{mentor.id}", headers=headers(student))
    ).status_code == 200
    response = await client.put(
        "/api/v1/profiles/student/me",
        headers=headers(student),
        json={"level": "Junior", "goal": "Освоить FastAPI", "technologies": ["Python"]},
    )
    assert response.status_code == 200, response.text
    assert response.json()["goal"] == "Освоить FastAPI"
    assert (
        await client.get("/api/v1/profiles/mentor/me", headers=headers(student))
    ).status_code == 200


async def test_assignment_has_service_and_database_protection(
    client: AsyncClient, db: AsyncSession
) -> None:
    student = await person(db, "student")
    mentor = await person(db, "mentor")
    await assign(client, student, mentor)
    assert (
        await client.post(
            "/api/v1/assignments", headers=headers(student), json={"mentor_id": str(mentor.id)}
        )
    ).status_code == 409
    student_id, mentor_id = student.id, mentor.id
    db.add(MentorAssignment(student_id=student_id, mentor_id=mentor_id, status="active"))
    with pytest.raises(IntegrityError):
        await db.commit()
    await db.rollback()


async def test_availability_crud_and_overlap(client: AsyncClient, db: AsyncSession) -> None:
    mentor = await person(db, "mentor")
    slot_id = await slot(client, mentor)
    listed = await client.get(f"/api/v1/mentors/{mentor.id}/slots", headers=headers(mentor))
    starts_at = listed.json()[0]["starts_at"]
    overlap = await client.post(
        "/api/v1/slots",
        headers=headers(mentor),
        json={"starts_at": starts_at, "duration_minutes": 60},
    )
    assert overlap.status_code == 409
    updated = await client.put(
        f"/api/v1/slots/{slot_id}",
        headers=headers(mentor),
        json={
            "starts_at": (datetime.now(UTC) + timedelta(days=8)).isoformat(),
            "duration_minutes": 90,
        },
    )
    assert updated.status_code == 200, updated.text
    assert (
        await client.delete(f"/api/v1/slots/{slot_id}", headers=headers(mentor))
    ).status_code == 204


@pytest.mark.parametrize("duration", [0, 30, 61, 120])
async def test_invalid_duration(client: AsyncClient, db: AsyncSession, duration: int) -> None:
    mentor = await person(db, "mentor")
    result = await client.post(
        "/api/v1/slots",
        headers=headers(mentor),
        json={
            "starts_at": (datetime.now(UTC) + timedelta(days=7)).isoformat(),
            "duration_minutes": duration,
        },
    )
    assert result.status_code == 422


async def test_request_confirm_cancel_and_history(client: AsyncClient, db: AsyncSession) -> None:
    student = await person(db, "student")
    mentor = await person(db, "mentor")
    await assign(client, student, mentor)
    slot_id = await slot(client, mentor)
    meeting_id = await request(client, student, slot_id)
    assert (
        await client.post(
            "/api/v1/meetings", headers=headers(student), json={"availability_slot_id": slot_id}
        )
    ).status_code == 409
    assert (
        await client.delete(f"/api/v1/slots/{slot_id}", headers=headers(mentor))
    ).status_code == 409
    assert (
        await client.post(f"/api/v1/meetings/{meeting_id}/confirm", headers=headers(student))
    ).status_code == 403
    result = await client.post(f"/api/v1/meetings/{meeting_id}/confirm", headers=headers(mentor))
    assert result.status_code == 200, result.text
    assert result.json()["meeting_url"] == "https://telemost.yandex.ru/j/lab2"
    assert (
        await client.post(f"/api/v1/meetings/{meeting_id}/reject", headers=headers(mentor))
    ).status_code == 409
    result = await client.post(
        f"/api/v1/meetings/{meeting_id}/cancel",
        headers=headers(student),
        json={"reason": "Изменились планы"},
    )
    assert result.status_code == 200, result.text
    assert result.json()["cancelled_by"] == str(student.id)
    assert result.json()["cancellation_reason"] == "Изменились планы"
    freed_slot = await db.get(AvailabilitySlot, uuid.UUID(slot_id))
    assert freed_slot is not None
    assert freed_slot.state == "free"
    assert (
        await client.post(f"/api/v1/meetings/{meeting_id}/cancel", headers=headers(student))
    ).status_code == 409
    await request(client, student, slot_id)
    assert len((await client.get("/api/v1/meetings", headers=headers(student))).json()) == 2


async def test_wrong_mentor_and_no_assignment(client: AsyncClient, db: AsyncSession) -> None:
    student = await person(db, "student")
    mentor = await person(db, "mentor")
    other = await person(db, "mentor")
    slot_id = await slot(client, other)
    assert (
        await client.post(
            "/api/v1/meetings", headers=headers(student), json={"availability_slot_id": slot_id}
        )
    ).status_code == 409
    await assign(client, student, mentor)
    assert (
        await client.post(
            "/api/v1/meetings", headers=headers(student), json={"availability_slot_id": slot_id}
        )
    ).status_code == 403
    assert (
        await client.post(
            "/api/v1/meetings",
            headers=headers(student),
            json={"availability_slot_id": str(uuid.uuid4())},
        )
    ).status_code == 404


async def test_rejection_and_departure(client: AsyncClient, db: AsyncSession) -> None:
    student = await person(db, "student")
    mentor = await person(db, "mentor")
    await assign(client, student, mentor)
    slot_id = await slot(client, mentor)
    meeting_id = await request(client, student, slot_id)
    response = await client.post(f"/api/v1/meetings/{meeting_id}/reject", headers=headers(mentor))
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"
    await request(client, student, slot_id)
    assert (
        await client.post("/api/v1/profiles/mentor/depart", headers=headers(mentor))
    ).status_code == 204
    history = (await client.get("/api/v1/assignments/me", headers=headers(student))).json()
    assert history[0]["status"] == "ended"
    assert history[0]["end_reason"] == "mentor_departed"
    assert all(
        item["status"] == "cancelled"
        for item in (await client.get("/api/v1/meetings", headers=headers(student))).json()
    )
    new_mentor = await person(db, "mentor")
    await assign(client, student, new_mentor)
    assert len((await client.get("/api/v1/assignments/me", headers=headers(student))).json()) == 2


async def test_reflection_privacy_and_edit(client: AsyncClient, db: AsyncSession) -> None:
    student = await person(db, "student")
    mentor = await person(db, "mentor")
    outsider = await person(db, "student")
    await assign(client, student, mentor)
    meeting_id = await request(client, student, await slot(client, mentor))
    endpoint = f"/api/v1/meetings/{meeting_id}/reflections"
    assert (
        await client.post(endpoint, headers=headers(student), json={"summary": "Ещё рано"})
    ).status_code == 409
    meeting = await db.get(Meeting, uuid.UUID(meeting_id))
    assert meeting is not None
    meeting.status = "completed"
    await db.commit()
    own = await client.post(
        endpoint,
        headers=headers(student),
        json={"summary": "Разобрали транзакции", "next_step": "Написать тесты"},
    )
    assert own.status_code == 201, own.text
    assert (
        await client.post(endpoint, headers=headers(student), json={"summary": "Повтор"})
    ).status_code == 409
    mentor_note = await client.post(
        endpoint, headers=headers(mentor), json={"summary": "Подготовить упражнения"}
    )
    assert mentor_note.status_code == 201
    assert len((await client.get(endpoint, headers=headers(student))).json()) == 1
    assert len((await client.get(endpoint, headers=headers(mentor))).json()) == 2
    assert (await client.get(endpoint, headers=headers(outsider))).status_code == 404
    edit_endpoint = f"/api/v1/reflections/{own.json()['id']}"
    assert (
        await client.put(edit_endpoint, headers=headers(mentor), json={"summary": "Чужое"})
    ).status_code == 403
    edited = await client.put(
        edit_endpoint, headers=headers(student), json={"summary": "Изучили блокировки"}
    )
    assert edited.status_code == 200, edited.text
    assert edited.json()["summary"] == "Изучили блокировки"
    assert (
        await client.post(endpoint, headers=headers(student), json={"summary": "   "})
    ).status_code == 422


async def test_notification_read_state(client: AsyncClient, db: AsyncSession) -> None:
    student = await person(db, "student")
    mentor = await person(db, "mentor")
    await assign(client, student, mentor)
    await request(client, student, await slot(client, mentor))
    items = (await client.get("/api/v1/notifications", headers=headers(mentor))).json()
    assert len(items) == 1
    assert items[0]["read_at"] is None
    endpoint = f"/api/v1/notifications/{items[0]['id']}/read"
    assert (await client.post(endpoint, headers=headers(student))).status_code == 404
    response = await client.post(endpoint, headers=headers(mentor))
    assert response.status_code == 200
    read_at = response.json()["read_at"]
    assert read_at is not None
    assert (await client.post(endpoint, headers=headers(mentor))).json()["read_at"] == read_at
    assert (
        await client.post("/api/v1/notifications/read-all", headers=headers(mentor))
    ).status_code == 204


async def test_two_meetings_per_week(client: AsyncClient, db: AsyncSession) -> None:
    student = await person(db, "student")
    mentor = await person(db, "mentor")
    await assign(client, student, mentor)
    start = datetime.now(UTC) + timedelta(days=14)
    start = start.replace(hour=10, minute=0, second=0, microsecond=0)
    start -= timedelta(days=start.weekday())
    for hour, expected in [(10, 201), (12, 201), (14, 409)]:
        created = await client.post(
            "/api/v1/slots",
            headers=headers(mentor),
            json={"starts_at": start.replace(hour=hour).isoformat(), "duration_minutes": 60},
        )
        assert created.status_code == 201
        result = await client.post(
            "/api/v1/meetings",
            headers=headers(student),
            json={"availability_slot_id": created.json()["id"]},
        )
        assert result.status_code == expected


async def test_profile_creation_and_duplicate(client: AsyncClient, db: AsyncSession) -> None:
    user = User(
        id=uuid.uuid4(),
        name="Анна Иванова",
        first_name="Анна",
        last_name="Иванова",
        email=f"{uuid.uuid4()}@example.com",
        password_hash="not-a-login-credential",
    )
    db.add(user)
    await db.flush()
    db.add_all(
        [UserRole(user_id=user.id, role="student"), UserRole(user_id=user.id, role="mentor")]
    )
    db.add(
        AuthSession(
            id=user.id,
            user_id=user.id,
            refresh_token_hash=hash_token(str(user.id)),
            expires_at=datetime.now(UTC) + timedelta(days=1),
        )
    )
    await db.commit()
    for role in ("student", "mentor"):
        endpoint = f"/api/v1/profiles/{role}/me"
        assert (await client.get(endpoint, headers=headers(user))).status_code == 404
        created = await client.post(
            endpoint, headers=headers(user), json={"about": "Учусь и помогаю"}
        )
        assert created.status_code == 201, created.text
        assert (await client.post(endpoint, headers=headers(user), json={})).status_code == 409
        assert (await client.get(endpoint, headers=headers(user))).json()[
            "about"
        ] == "Учусь и помогаю"


async def test_seed_is_idempotent(db: AsyncSession) -> None:
    first = await seed_demo_users(db)
    second = await seed_demo_users(db)
    assert first == second
    for role, identity in first.items():
        user = await db.get(User, identity)
        assert user is not None
        assert user.first_name and user.last_name and user.password_hash
        assert role in (await db.scalars(select(UserRole.role).where(UserRole.user_id == identity)))


async def test_confirm_requires_telemost_and_copies_url(
    client: AsyncClient, db: AsyncSession
) -> None:
    student = await person(db, "student")
    mentor = await person(db, "mentor")
    await assign(client, student, mentor)
    meeting_id = await request(client, student, await slot(client, mentor))
    profile = await db.scalar(select(MentorProfile).where(MentorProfile.user_id == mentor.id))
    assert profile is not None
    profile.default_meeting_url = None
    await db.commit()
    endpoint = f"/api/v1/meetings/{meeting_id}/confirm"
    assert (await client.post(endpoint, headers=headers(mentor))).status_code == 409
    profile.default_meeting_url = "https://telemost.yandex.ru/j/original"
    await db.commit()
    confirmed = await client.post(endpoint, headers=headers(mentor))
    assert confirmed.status_code == 200
    profile.default_meeting_url = "https://telemost.yandex.ru/j/changed"
    await db.commit()
    read = await client.get(f"/api/v1/meetings/{meeting_id}", headers=headers(student))
    assert read.json()["meeting_url"] == "https://telemost.yandex.ru/j/original"


async def test_cannot_assign_inactive_or_self(client: AsyncClient, db: AsyncSession) -> None:
    student = await person(db, "student", both=True)
    mentor = await person(db, "mentor")
    profile = await db.scalar(select(MentorProfile).where(MentorProfile.user_id == mentor.id))
    assert profile is not None
    profile.status = "inactive"
    await db.commit()
    response = await client.post(
        "/api/v1/assignments", headers=headers(student), json={"mentor_id": str(mentor.id)}
    )
    assert response.status_code == 409
    response = await client.post(
        "/api/v1/assignments", headers=headers(student), json={"mentor_id": str(student.id)}
    )
    assert response.status_code == 400


async def test_database_prevents_duplicate_booking(client: AsyncClient, db: AsyncSession) -> None:
    student = await person(db, "student")
    mentor = await person(db, "mentor")
    assignment_id = await assign(client, student, mentor)
    slot_id = await slot(client, mentor)
    meeting_id = await request(client, student, slot_id)
    meeting = await db.get(Meeting, uuid.UUID(meeting_id))
    assert meeting is not None
    db.add(
        Meeting(
            student_id=student.id,
            mentor_id=mentor.id,
            assignment_id=uuid.UUID(assignment_id),
            slot_id=uuid.UUID(slot_id),
            starts_at=meeting.starts_at,
            duration_minutes=75,
            status="pending",
        )
    )
    with pytest.raises(IntegrityError):
        await db.commit()
    await db.rollback()


@pytest.mark.parametrize("starts_at", ["2020-01-01T12:00:00+00:00", "2030-01-01T12:00:00"])
async def test_past_or_naive_slot(client: AsyncClient, db: AsyncSession, starts_at: str) -> None:
    mentor = await person(db, "mentor")
    result = await client.post(
        "/api/v1/slots",
        headers=headers(mentor),
        json={"starts_at": starts_at, "duration_minutes": 60},
    )
    assert result.status_code == (400 if "+00:00" in starts_at else 422)

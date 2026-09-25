from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from typing import cast

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from src.core.config import get_settings
from src.core.database import get_session
from src.main import app


@pytest.fixture
async def client(monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[AsyncClient]:
    monkeypatch.setenv("JWT_SECRET", "test-only-secret-that-is-not-used-in-production")
    get_settings.cache_clear()
    engine = create_async_engine(get_settings().database_url, poolclass=NullPool)
    async with engine.connect() as connection:
        transaction = await connection.begin()
        factory = async_sessionmaker(
            bind=connection, expire_on_commit=False, join_transaction_mode="create_savepoint"
        )

        async def test_session() -> AsyncIterator[AsyncSession]:
            async with factory() as session:
                yield session

        app.dependency_overrides[get_session] = test_session
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as http:
            yield http
        app.dependency_overrides.clear()
        await transaction.rollback()
    await engine.dispose()
    get_settings.cache_clear()


async def register(client: AsyncClient, name: str, email: str, role: str) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": email, "password": "long-test-password", "initial_role": role},
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, str], response.json())


def headers(tokens: dict[str, str]) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


@pytest.mark.asyncio
async def test_auth_refresh_logout_and_roles(client: AsyncClient) -> None:
    tokens = await register(client, "Олег", "oleg-test@example.com", "student")
    me = await client.get("/api/v1/auth/me", headers=headers(tokens))
    assert me.status_code == 200
    assert me.json()["roles"] == ["student"]
    role = await client.post("/api/v1/auth/roles", json={"role": "mentor"}, headers=headers(tokens))
    assert role.status_code == 200
    assert set(role.json()["roles"]) == {"student", "mentor"}
    refreshed = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )
    assert refreshed.status_code == 200
    assert (
        await client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    ).status_code == 401
    assert (await client.get("/api/v1/auth/me", headers=headers(tokens))).status_code == 401
    new_tokens = refreshed.json()
    assert (
        await client.post("/api/v1/auth/logout", headers=headers(new_tokens))
    ).status_code == 204
    assert (await client.get("/api/v1/auth/me", headers=headers(new_tokens))).status_code == 401


@pytest.mark.asyncio
async def test_assignment_meeting_and_departure(client: AsyncClient) -> None:
    student = await register(client, "Мария", "maria-test@example.com", "student")
    mentor = await register(client, "Алексей", "alex-test@example.com", "mentor")
    mentor_id = (await client.get("/api/v1/auth/me", headers=headers(mentor))).json()["id"]
    profile = await client.put(
        "/api/v1/profiles/mentor/me",
        headers=headers(mentor),
        json={
            "about": "Помогаю изучать backend",
            "specialization": "Backend",
            "skills": ["Python", "FastAPI"],
            "experience": "8 лет",
            "company": "Технологии",
            "position": "Senior Backend Engineer",
            "timezone": "Europe/Moscow",
            "default_meeting_url": "https://telemost.yandex.ru/j/1234567890",
            "accepting_students": True,
        },
    )
    assert profile.status_code == 200, profile.text
    assert (await client.get("/api/v1/mentors", headers=headers(student))).status_code == 200
    assignment = await client.post(f"/api/v1/assignments/{mentor_id}", headers=headers(student))
    assert assignment.status_code == 201, assignment.text
    assert (
        await client.post(f"/api/v1/assignments/{mentor_id}", headers=headers(student))
    ).status_code == 409
    starts_at = (datetime.now(UTC) + timedelta(days=7)).isoformat()
    slot = await client.post(
        "/api/v1/slots",
        headers=headers(mentor),
        json={"starts_at": starts_at, "duration_minutes": 60},
    )
    assert slot.status_code == 201, slot.text
    slot_id = slot.json()["id"]
    meeting = await client.post(
        "/api/v1/meetings", headers=headers(student), json={"slot_id": slot_id}
    )
    assert meeting.status_code == 201, meeting.text
    meeting_id = meeting.json()["id"]
    assert (
        await client.post("/api/v1/meetings", headers=headers(student), json={"slot_id": slot_id})
    ).status_code == 409
    confirmed = await client.post(f"/api/v1/meetings/{meeting_id}/confirm", headers=headers(mentor))
    assert confirmed.status_code == 200, confirmed.text
    assert confirmed.json()["meeting_url"] == "https://telemost.yandex.ru/j/1234567890"
    assert (
        await client.post(f"/api/v1/meetings/{meeting_id}/cancel", headers=headers(student))
    ).status_code == 200
    assert (
        await client.post("/api/v1/profiles/mentor/depart", headers=headers(mentor))
    ).status_code == 204
    history = await client.get("/api/v1/assignments/me", headers=headers(student))
    assert history.status_code == 200
    assert history.json()[0]["end_reason"] == "mentor_departed"


@pytest.mark.asyncio
async def test_student_cannot_request_third_meeting_in_one_week(client: AsyncClient) -> None:
    student = await register(client, "Анна", "anna-limit@example.com", "student")
    mentor = await register(client, "Дмитрий", "dmitry-limit@example.com", "mentor")
    mentor_id = (await client.get("/api/v1/auth/me", headers=headers(mentor))).json()["id"]
    assert (
        await client.post(f"/api/v1/assignments/{mentor_id}", headers=headers(student))
    ).status_code == 201

    week_start = datetime.now(UTC) + timedelta(days=7)
    week_start = week_start.replace(hour=10, minute=0, second=0, microsecond=0)
    week_start -= timedelta(days=week_start.weekday())
    for hour, expected_status in [(10, 201), (12, 201), (14, 409)]:
        slot = await client.post(
            "/api/v1/slots",
            headers=headers(mentor),
            json={
                "starts_at": week_start.replace(hour=hour).isoformat(),
                "duration_minutes": 60,
            },
        )
        assert slot.status_code == 201, slot.text
        meeting = await client.post(
            "/api/v1/meetings",
            headers=headers(student),
            json={"slot_id": slot.json()["id"]},
        )
        assert meeting.status_code == expected_status, meeting.text

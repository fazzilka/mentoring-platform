import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import get_settings
from src.core.security import hash_token, jwt_secret
from src.models import AuthSession, User


async def register(http: AsyncClient, role: str = "student") -> tuple[str, str]:
    email = f"{uuid.uuid4()}@example.com"
    response = await http.post(
        "/api/v1/auth/register",
        json={
            "name": "Анна Смирнова",
            "email": email,
            "password": "test-password-123",
            "initial_role": role,
        },
    )
    assert response.status_code == 201, response.text
    assert "refresh_token" not in response.json()
    assert "HttpOnly" in response.headers["set-cookie"]
    assert "SameSite=lax" in response.headers["set-cookie"]
    return email, response.json()["access_token"]


async def test_registration_me_and_storage(client: AsyncClient, db: AsyncSession) -> None:
    email, token = await register(client)
    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["roles"] == ["student"]
    assert response.json()["first_name"] == "Анна"
    assert "password_hash" not in response.json()
    user = await db.scalar(select(User).where(User.email == email))
    assert user is not None and user.password_hash.startswith("$argon2id$")
    assert user.password_hash != "test-password-123"
    cookie = client.cookies.get("mentoring_refresh")
    session = await db.scalar(select(AuthSession).where(AuthSession.user_id == user.id))
    assert cookie and session and session.refresh_token_hash == hash_token(cookie)
    assert session.refresh_token_hash != cookie


async def test_duplicate_email_and_login(client: AsyncClient) -> None:
    email, _ = await register(client)
    duplicate = await client.post(
        "/api/v1/auth/register",
        json={
            "name": "Другой пользователь",
            "email": email.upper(),
            "password": "test-password-123",
            "initial_role": "mentor",
        },
    )
    assert duplicate.status_code == 409
    for candidate in (email, f"{uuid.uuid4()}@example.com"):
        response = await client.post(
            "/api/v1/auth/login", json={"email": candidate, "password": "wrong-password"}
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Неверный email или пароль"
    response = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": "test-password-123"}
    )
    assert response.status_code == 200


async def test_refresh_rotation_and_logout(client: AsyncClient) -> None:
    _, old_access = await register(client)
    old_cookie = client.cookies.get("mentoring_refresh")
    response = await client.post("/api/v1/auth/refresh")
    assert response.status_code == 200
    new_access = response.json()["access_token"]
    assert client.cookies.get("mentoring_refresh") != old_cookie
    assert (
        await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {old_access}"})
    ).status_code == 401
    assert (
        await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {new_access}"})
    ).status_code == 200
    assert (
        await client.post(
            "/api/v1/auth/refresh", headers={"Cookie": f"mentoring_refresh={old_cookie}"}
        )
    ).status_code == 401
    active_cookie = client.cookies.get("mentoring_refresh")
    assert (await client.post("/api/v1/auth/logout")).status_code == 204
    assert client.cookies.get("mentoring_refresh") is None
    assert (
        await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {new_access}"})
    ).status_code == 401
    assert (
        await client.post(
            "/api/v1/auth/refresh", headers={"Cookie": f"mentoring_refresh={active_cookie}"}
        )
    ).status_code == 401


@pytest.mark.parametrize("kind", ["expired", "revoked", "unknown", "missing"])
async def test_invalid_refresh(client: AsyncClient, db: AsyncSession, kind: str) -> None:
    await register(client)
    cookie = client.cookies.get("mentoring_refresh")
    assert cookie
    session = await db.scalar(
        select(AuthSession).where(AuthSession.refresh_token_hash == hash_token(cookie))
    )
    assert session
    if kind == "expired":
        session.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    if kind == "revoked":
        session.revoked_at = datetime.now(UTC)
    await db.commit()
    if kind == "unknown":
        client.cookies.clear()
        client.cookies.set("mentoring_refresh", "unknown")
    if kind == "missing":
        client.cookies.clear()
    assert (await client.post("/api/v1/auth/refresh")).status_code == 401


async def test_protected_routes_and_role_access(client: AsyncClient) -> None:
    assert (await client.get("/api/v1/auth/me")).status_code == 401
    assert (await client.get("/api/v1/mentors")).status_code == 401
    _, token = await register(client)
    headers = {"Authorization": f"Bearer {token}"}
    assert (await client.get("/api/v1/profiles/student/me", headers=headers)).status_code == 200
    assert (await client.get("/api/v1/profiles/mentor/me", headers=headers)).status_code == 403
    assert (
        await client.post(
            "/api/v1/slots",
            headers=headers,
            json={
                "starts_at": (datetime.now(UTC) + timedelta(days=1)).isoformat(),
                "duration_minutes": 60,
            },
        )
    ).status_code == 403


async def test_expired_or_forged_access(client: AsyncClient) -> None:
    _, token = await register(client)
    payload = jwt.decode(token, jwt_secret(), algorithms=["HS256"])
    payload["exp"] = datetime.now(UTC) - timedelta(seconds=1)
    expired = jwt.encode(payload, jwt_secret(), algorithm="HS256")
    for invalid in (expired, token + "broken", "not-a-jwt"):
        assert (
            await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {invalid}"})
        ).status_code == 401


async def test_auth_origin_guard(client: AsyncClient) -> None:
    assert (
        await client.post("/api/v1/auth/logout", headers={"Origin": "https://untrusted.example"})
    ).status_code == 403
    assert (
        await client.post("/api/v1/auth/logout", headers={"Origin": get_settings().frontend_origin})
    ).status_code == 204


async def test_only_current_account_can_be_edited(client: AsyncClient) -> None:
    _, token = await register(client, "mentor")
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "first_name": "Алина",
        "last_name": "Петрова",
        "email": f"{uuid.uuid4()}@example.com",
        "timezone": "Asia/Yekaterinburg",
        "avatar_url": None,
    }
    response = await client.put("/api/v1/auth/me", headers=headers, json=payload)
    assert response.status_code == 200
    assert response.json()["name"] == "Алина Петрова"
    assert response.json()["roles"] == ["mentor"]
    assert (
        await client.put(
            "/api/v1/auth/me", headers=headers, json={**payload, "user_id": str(uuid.uuid4())}
        )
    ).status_code == 422
    assert (await client.get("/api/v1/profiles/student/me", headers=headers)).status_code == 403


async def test_access_session_expiry_and_subject_mismatch(
    client: AsyncClient, db: AsyncSession
) -> None:
    _, token = await register(client)
    payload = jwt.decode(token, jwt_secret(), algorithms=["HS256"])
    payload["sub"] = str(uuid.uuid4())
    forged_subject = jwt.encode(payload, jwt_secret(), algorithm="HS256")
    assert (
        await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {forged_subject}"})
    ).status_code == 401
    cookie = client.cookies.get("mentoring_refresh")
    assert cookie
    session = await db.scalar(
        select(AuthSession).where(AuthSession.refresh_token_hash == hash_token(cookie))
    )
    assert session
    session.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    await db.commit()
    assert (
        await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    ).status_code == 401


@pytest.mark.parametrize("environment", ["local", "production"])
def test_secret_is_required_even_locally(monkeypatch: pytest.MonkeyPatch, environment: str) -> None:
    monkeypatch.setenv("JWT_SECRET", "")
    monkeypatch.setenv("ENVIRONMENT", environment)
    get_settings.cache_clear()
    try:
        with pytest.raises(RuntimeError, match="JWT_SECRET"):
            jwt_secret()
    finally:
        get_settings.cache_clear()

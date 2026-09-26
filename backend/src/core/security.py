import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

import jwt
from pwdlib import PasswordHash

from src.core.config import get_settings

password_hash = PasswordHash.recommended()


def jwt_secret() -> str:
    settings = get_settings()
    if (
        settings.jwt_secret
        and len(settings.jwt_secret) >= 32
        and not settings.jwt_secret.startswith("replace-with-")
    ):
        return settings.jwt_secret
    raise RuntimeError("JWT_SECRET must be set to a strong secret")


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, stored_hash: str) -> bool:
    return password_hash.verify(password, stored_hash)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def new_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def create_access_token(user_id: uuid.UUID, session_id: uuid.UUID) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": str(user_id),
            "sid": str(session_id),
            "iat": now,
            "exp": now + timedelta(minutes=settings.access_token_minutes),
        },
        jwt_secret(),
        algorithm="HS256",
    )


def decode_access_token(token: str) -> tuple[uuid.UUID, uuid.UUID]:
    secret = jwt_secret()
    payload = jwt.decode(
        token, secret, algorithms=["HS256"], options={"require": ["sub", "sid", "exp"]}
    )
    if not isinstance(payload["sub"], str) or not isinstance(payload["sid"], str):
        raise jwt.InvalidTokenError("Invalid identity claims")
    return uuid.UUID(payload["sub"]), uuid.UUID(payload["sid"])

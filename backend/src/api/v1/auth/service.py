import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from src.api.v1.auth.dto import RegistrationData, TokenPair, UserProfileData
from src.config.config import get_settings
from src.core.db.models import AuthSession, User
from src.core.db.repositories import auth as auth_dao
from src.core.errors import DomainError
from src.core.security import (
    create_access_token,
    hash_password,
    hash_token,
    new_refresh_token,
    verify_password,
)


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    def _issue_tokens(self, user: User) -> TokenPair:
        refresh_token = new_refresh_token()
        auth_session = AuthSession(
            id=uuid.uuid4(),
            user_id=user.id,
            refresh_token_hash=hash_token(refresh_token),
            expires_at=datetime.now(UTC) + timedelta(days=get_settings().refresh_token_days),
        )
        self._db.add(auth_session)
        return TokenPair(
            access_token=create_access_token(user.id, auth_session.id),
            refresh_token=refresh_token,
        )

    async def register(self, data: RegistrationData) -> TokenPair:
        if await auth_dao.get_user_by_email(self._db, data.email.lower()):
            raise DomainError(409, "Email уже зарегистрирован")
        user = User(
            name=data.name.strip(),
            email=data.email.lower(),
            password_hash=await run_in_threadpool(hash_password, data.password),
            first_name=data.name.strip().split()[0],
            last_name=" ".join(data.name.strip().split()[1:]),
        )
        try:
            self._db.add(user)
            await self._db.flush()
            await auth_dao.add_role(self._db, user.id, data.initial_role)
            tokens = self._issue_tokens(user)
            await self._db.commit()
        except IntegrityError as exc:
            await self._db.rollback()
            raise DomainError(409, "Email уже зарегистрирован") from exc
        return tokens

    async def login(self, email: str, password: str) -> TokenPair:
        user = await auth_dao.get_user_by_email(self._db, email.lower())
        if not user or not await run_in_threadpool(verify_password, password, user.password_hash):
            raise DomainError(401, "Неверный email или пароль")
        tokens = self._issue_tokens(user)
        await self._db.commit()
        return tokens

    async def refresh(self, token: str) -> TokenPair:
        auth_session = await auth_dao.get_session_by_hash(self._db, hash_token(token))
        if (
            not auth_session
            or auth_session.revoked_at
            or auth_session.expires_at <= datetime.now(UTC)
        ):
            raise DomainError(401, "Недействительная refresh-сессия")
        user = await auth_dao.get_user(self._db, auth_session.user_id)
        if not user:
            raise DomainError(401, "Пользователь не найден")
        auth_session.revoked_at = datetime.now(UTC)
        tokens = self._issue_tokens(user)
        await self._db.commit()
        return tokens

    async def logout(self, token: str | None) -> None:
        if not token:
            return
        auth_session = await auth_dao.get_session_by_hash(self._db, hash_token(token))
        if auth_session and not auth_session.revoked_at:
            auth_session.revoked_at = datetime.now(UTC)
            await self._db.commit()

    async def roles(self, user: User) -> list[str]:
        return await auth_dao.get_roles(self._db, user.id)

    async def update_user(self, user: User, data: UserProfileData) -> list[str]:
        user.first_name = data.first_name
        user.last_name = data.last_name.strip()
        user.name = f"{user.first_name} {user.last_name}".strip()
        user.email = data.email.lower()
        user.telegram_username = data.telegram_username
        user.phone_number = data.phone_number
        user.timezone = data.timezone
        user.avatar_url = data.avatar_url
        try:
            await self._db.commit()
        except IntegrityError as exc:
            await self._db.rollback()
            raise DomainError(409, "Email уже зарегистрирован") from exc
        return await self.roles(user)

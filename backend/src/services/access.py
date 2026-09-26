import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.errors import DomainError
from src.dao import auth as auth_dao


async def require_role(db: AsyncSession, user_id: uuid.UUID, role: str) -> None:
    if role not in await auth_dao.get_roles(db, user_id):
        raise DomainError(403, f"Необходима роль {role}")

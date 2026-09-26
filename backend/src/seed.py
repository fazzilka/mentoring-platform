import asyncio
import logging
import secrets
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.database import engine, session_factory
from src.core.security import hash_password
from src.dao import auth as users
from src.models import User


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
    if get_settings().environment not in {"local", "test"}:
        raise RuntimeError("Demo seed разрешён только в local/test")
    try:
        async with session_factory() as db:
            identities = await seed_demo_users(db)
            for role, identity in identities.items():
                logging.info("lab2.demo_user %s %s", role, identity)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    asyncio.run(main())

from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from src.config.config import get_settings
from src.core.db.db import get_session
from src.main import app


@pytest.fixture
async def db() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine(get_settings().database_url, poolclass=NullPool)
    async with engine.connect() as connection:
        transaction = await connection.begin()
        factory = async_sessionmaker(
            bind=connection, expire_on_commit=False, join_transaction_mode="create_savepoint"
        )
        async with factory() as session:
            yield session
        await transaction.rollback()
    await engine.dispose()


@pytest.fixture
async def client(db: AsyncSession) -> AsyncIterator[AsyncClient]:
    async def test_session() -> AsyncIterator[AsyncSession]:
        yield db

    app.dependency_overrides[get_session] = test_session
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as http:
            yield http
    finally:
        app.dependency_overrides.clear()

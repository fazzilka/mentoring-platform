import asyncio

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from src.celery_app import celery_app
from src.core.config import get_settings
from src.services.reminders import send_due_reminders


async def run_reminders() -> None:
    engine = create_async_engine(get_settings().database_url, poolclass=NullPool)
    try:
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as session:
            await send_due_reminders(session)
    finally:
        await engine.dispose()


@celery_app.task(name="mentoring.scan_reminders")  # type: ignore[untyped-decorator]
def scan_reminders() -> None:
    asyncio.run(run_reminders())

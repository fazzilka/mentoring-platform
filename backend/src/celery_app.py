from celery import Celery
from celery.signals import setup_logging

from src.core.config import get_settings
from src.core.logging import configure_logging


def setup_task_logging(**kwargs: object) -> None:
    configure_logging()


setup_logging.connect(setup_task_logging)


settings = get_settings()

celery_app = Celery("mentoring_platform", broker=settings.celery_broker_url)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Moscow",
    enable_utc=True,
    control_queue_exclusive=True,
    event_queue_exclusive=True,
    beat_schedule={
        "scan-meeting-reminders": {
            "task": "mentoring.scan_reminders",
            "schedule": 60.0,
        }
    },
    imports=("src.tasks.reminders",),
)

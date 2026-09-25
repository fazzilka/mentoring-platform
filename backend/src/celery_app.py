from celery import Celery

from src.core.config import get_settings

settings = get_settings()

celery_app = Celery("mentoring_platform", broker=settings.celery_broker_url)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Moscow",
    enable_utc=True,
    beat_schedule={
        "scan-meeting-reminders": {
            "task": "mentoring.scan_reminders",
            "schedule": 60.0,
        }
    },
    imports=("src.tasks.reminders",),
)

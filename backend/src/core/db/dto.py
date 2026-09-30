from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class StudentProfileData:
    about: str
    level: str
    direction: str
    goal: str
    technologies: list[str]
    learning_interests: str


@dataclass(frozen=True)
class MentorProfileData:
    about: str
    specialization: str
    skills: list[str]
    experience_years: int
    company: str
    position: str
    default_meeting_url: str | None
    accepting_students: bool
    status: str


@dataclass(frozen=True)
class SlotData:
    starts_at: datetime
    duration_minutes: int

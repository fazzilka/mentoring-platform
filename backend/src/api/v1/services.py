from typing import Annotated

from fastapi import Depends

from src.api.v1.dependencies import DbSession
from src.services.assignment import MentorAssignmentService
from src.services.availability import AvailabilityService
from src.services.meeting import MeetingService
from src.services.notification import NotificationService
from src.services.profile import ProfileService
from src.services.reflection import ReflectionService


def profile_service(db: DbSession) -> ProfileService:
    return ProfileService(db)


def assignment_service(db: DbSession) -> MentorAssignmentService:
    return MentorAssignmentService(db)


def availability_service(db: DbSession) -> AvailabilityService:
    return AvailabilityService(db)


def meeting_service(db: DbSession) -> MeetingService:
    return MeetingService(db)


def reflection_service(db: DbSession) -> ReflectionService:
    return ReflectionService(db)


def notification_service(db: DbSession) -> NotificationService:
    return NotificationService(db)


type ProfileDep = Annotated[ProfileService, Depends(profile_service)]
type AssignmentDep = Annotated[MentorAssignmentService, Depends(assignment_service)]
type AvailabilityDep = Annotated[AvailabilityService, Depends(availability_service)]
type MeetingDep = Annotated[MeetingService, Depends(meeting_service)]
type ReflectionDep = Annotated[ReflectionService, Depends(reflection_service)]
type NotificationDep = Annotated[NotificationService, Depends(notification_service)]

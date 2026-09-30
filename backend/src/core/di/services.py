from typing import Annotated

from fastapi import Depends

from src.api.v1.assignments.service import MentorAssignmentService
from src.api.v1.auth.service import AuthService
from src.api.v1.availability.service import AvailabilityService
from src.api.v1.meetings.service import MeetingService
from src.api.v1.notifications.service import NotificationService
from src.api.v1.people.service import ProfileService
from src.api.v1.reflections.service import ReflectionService
from src.core.di.session import DbSession


def auth_service(db: DbSession) -> AuthService:
    return AuthService(db)


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
type AuthDep = Annotated[AuthService, Depends(auth_service)]

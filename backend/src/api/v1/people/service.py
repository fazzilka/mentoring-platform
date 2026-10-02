import uuid
from dataclasses import asdict

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.access import require_role
from src.core.db import repositories as dao
from src.core.db.dto import MentorProfileData, StudentProfileData
from src.core.db.models import (
    MentorProfile,
    StudentProfile,
    User,
)
from src.core.db.repositories import auth as auth_dao
from src.core.errors import DomainError


class ProfileService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def update_student_profile(self, user: User, data: StudentProfileData) -> StudentProfile:
        await require_role(self._db, user.id, "student")
        profile = await dao.student_profile(self._db, user.id)
        if profile is None:
            raise DomainError(404, "Профиль ученика не найден")
        for key, value in asdict(data).items():
            setattr(profile, key, value)
        await self._db.commit()
        await self._db.refresh(profile)
        return profile

    async def update_mentor_profile(self, user: User, data: MentorProfileData) -> MentorProfile:
        await require_role(self._db, user.id, "mentor")
        profile = await dao.mentor_profile(self._db, user.id, lock=True)
        if profile is None:
            raise DomainError(404, "Профиль наставника не найден")
        if data.status == "departed" or profile.status == "departed":
            raise DomainError(409, "Завершите работу через /profiles/mentor/depart")
        if data.status == "inactive" and await dao.mentor_students(self._db, user.id):
            raise DomainError(409, "Перед отключением профиля завершите активные назначения")
        for key, value in asdict(data).items():
            setattr(profile, key, value)
        await self._db.commit()
        await self._db.refresh(profile)
        return profile

    async def student_profile(self, user: User) -> StudentProfile:
        await require_role(self._db, user.id, "student")
        profile = await dao.student_profile(self._db, user.id)
        if profile is None:
            raise DomainError(404, "Профиль ученика не найден")
        return profile

    async def mentor_profile(self, user: User) -> MentorProfile:
        await require_role(self._db, user.id, "mentor")
        profile = await dao.mentor_profile(self._db, user.id)
        if profile is None:
            raise DomainError(404, "Профиль наставника не найден")
        return profile

    async def create_student_profile(self, user: User, data: StudentProfileData) -> StudentProfile:
        await require_role(self._db, user.id, "student")
        await dao.lock_user(self._db, user.id)
        if await dao.student_profile(self._db, user.id):
            raise DomainError(409, "Профиль ученика уже существует")
        profile = StudentProfile(user_id=user.id, **asdict(data))
        self._db.add(profile)
        await self._db.commit()
        return profile

    async def create_mentor_profile(self, user: User, data: MentorProfileData) -> MentorProfile:
        await require_role(self._db, user.id, "mentor")
        await dao.lock_user(self._db, user.id)
        if await dao.mentor_profile(self._db, user.id):
            raise DomainError(409, "Профиль наставника уже существует")
        if data.status == "departed":
            raise DomainError(409, "Нельзя создать завершённый профиль")
        profile = MentorProfile(user_id=user.id, **asdict(data))
        self._db.add(profile)
        await self._db.commit()
        return profile

    async def catalog(
        self, user: User, search: str | None, specialization: str | None
    ) -> list[tuple[MentorProfile, User]]:
        await require_role(self._db, user.id, "student")
        return await dao.catalog(self._db, search, specialization)

    async def mentor_details(self, user: User, mentor_id: uuid.UUID) -> tuple[MentorProfile, User]:
        await require_role(self._db, user.id, "student")
        profile = await dao.mentor_profile(self._db, mentor_id)
        person = await auth_dao.get_user(self._db, mentor_id)
        if profile is None or person is None:
            raise DomainError(404, "Наставник не найден")
        return profile, person

    async def mentor_details_with_contact(
        self, user: User, mentor_id: uuid.UUID
    ) -> tuple[MentorProfile, User, bool]:
        profile, person = await self.mentor_details(user, mentor_id)
        assignment = await dao.active_assignment(self._db, user.id)
        return profile, person, assignment is not None and assignment.mentor_id == mentor_id

    async def students(self, user: User) -> list[User]:
        await require_role(self._db, user.id, "mentor")
        return await dao.mentor_students(self._db, user.id)

    async def student_details(
        self, user: User, student_id: uuid.UUID
    ) -> tuple[StudentProfile, User]:
        await require_role(self._db, user.id, "mentor")
        assignment = await dao.active_assignment(self._db, student_id)
        if assignment is None or assignment.mentor_id != user.id:
            raise DomainError(404, "Ученик не найден")
        profile = await dao.student_profile(self._db, student_id)
        person = await auth_dao.get_user(self._db, student_id)
        if profile is None or person is None:
            raise DomainError(404, "Профиль ученика не найден")
        return profile, person

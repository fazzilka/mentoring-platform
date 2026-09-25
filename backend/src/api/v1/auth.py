from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from src.api.v1.dependencies import CurrentUserDep, DbSession, current_user_and_session
from src.dao import auth as auth_dao
from src.models import AuthSession, User
from src.schemas.auth import (
    CurrentUser,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    RoleRequest,
    TokenPair,
    UserUpdate,
)
from src.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenPair, status_code=201)
async def register(data: RegisterRequest, db: DbSession) -> TokenPair:
    return await auth_service.register(db, data)


@router.post("/login", response_model=TokenPair)
async def login(data: LoginRequest, db: DbSession) -> TokenPair:
    return await auth_service.login(db, data.email, data.password)


@router.post("/refresh", response_model=TokenPair)
async def refresh(data: RefreshRequest, db: DbSession) -> TokenPair:
    return await auth_service.refresh(db, data.refresh_token)


@router.post("/logout", status_code=204)
async def logout(
    identity: Annotated[tuple[User, AuthSession], Depends(current_user_and_session)], db: DbSession
) -> None:
    await auth_service.logout(db, identity[1])


@router.get("/me", response_model=CurrentUser)
async def me(user: CurrentUserDep, db: DbSession) -> CurrentUser:
    return CurrentUser.model_validate(user).model_copy(
        update={"roles": await auth_dao.get_roles(db, user.id)}
    )


@router.put("/me", response_model=CurrentUser)
async def update_me(data: UserUpdate, user: CurrentUserDep, db: DbSession) -> CurrentUser:
    email = data.email.lower()
    existing = await auth_dao.get_user_by_email(db, email)
    if existing and existing.id != user.id:
        raise HTTPException(409, "Email уже зарегистрирован")
    user.name = data.name.strip()
    user.email = email
    user.avatar_url = data.avatar_url
    await db.commit()
    return CurrentUser.model_validate(user).model_copy(
        update={"roles": await auth_dao.get_roles(db, user.id)}
    )


@router.post("/roles", response_model=CurrentUser)
async def add_role(data: RoleRequest, user: CurrentUserDep, db: DbSession) -> CurrentUser:
    roles = await auth_dao.get_roles(db, user.id)
    if data.role in roles:
        raise HTTPException(409, "Роль уже добавлена")
    await auth_dao.add_role(db, user.id, data.role)
    await db.commit()
    return CurrentUser.model_validate(user).model_copy(update={"roles": [*roles, data.role]})

from fastapi import APIRouter, HTTPException, Request, Response
from sqlalchemy.exc import IntegrityError

from src.api.v1.dependencies import CurrentUserDep, DbSession
from src.core.config import get_settings
from src.core.security import hash_token
from src.dao import auth as auth_dao
from src.schemas.auth import (
    AccessToken,
    CurrentUser,
    LoginRequest,
    RegisterRequest,
    TokenPair,
    UserUpdate,
)
from src.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])
COOKIE = "mentoring_refresh"
COOKIE_PATH = "/api/v1/auth"


def check_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    if origin is not None and origin != get_settings().frontend_origin:
        raise HTTPException(403, "Недопустимый Origin")


def token_response(response: Response, tokens: TokenPair) -> AccessToken:
    settings = get_settings()
    response.set_cookie(
        COOKIE,
        tokens.refresh_token,
        httponly=True,
        samesite="lax",
        secure=settings.refresh_cookie_secure or settings.environment == "production",
        path=COOKIE_PATH,
        max_age=settings.refresh_token_days * 86400,
    )
    response.headers["Cache-Control"] = "no-store"
    return AccessToken(
        access_token=tokens.access_token, expires_in=settings.access_token_minutes * 60
    )


@router.post("/register", response_model=AccessToken, status_code=201)
async def register(
    data: RegisterRequest, request: Request, response: Response, db: DbSession
) -> AccessToken:
    check_origin(request)
    return token_response(response, await auth_service.register(db, data))


@router.post("/login", response_model=AccessToken)
async def login(
    data: LoginRequest, request: Request, response: Response, db: DbSession
) -> AccessToken:
    check_origin(request)
    return token_response(response, await auth_service.login(db, data.email, data.password))


@router.post("/refresh", response_model=AccessToken)
async def refresh(request: Request, response: Response, db: DbSession) -> AccessToken:
    check_origin(request)
    token = request.cookies.get(COOKIE)
    if not token:
        raise HTTPException(401, "Refresh cookie отсутствует")
    return token_response(response, await auth_service.refresh(db, token))


@router.post("/logout", status_code=204)
async def logout(request: Request, response: Response, db: DbSession) -> None:
    check_origin(request)
    token = request.cookies.get(COOKIE)
    if token:
        session = await auth_dao.get_session_by_hash(db, hash_token(token))
        if session and not session.revoked_at:
            await auth_service.logout(db, session)
    response.delete_cookie(COOKIE, path=COOKIE_PATH)
    response.headers["Cache-Control"] = "no-store"


@router.get("/me", response_model=CurrentUser)
async def me(user: CurrentUserDep, db: DbSession, response: Response) -> CurrentUser:
    response.headers["Cache-Control"] = "no-store"
    return CurrentUser.model_validate(user).model_copy(
        update={"roles": await auth_dao.get_roles(db, user.id)}
    )


@router.put("/me", response_model=CurrentUser)
async def update_me(data: UserUpdate, user: CurrentUserDep, db: DbSession) -> CurrentUser:
    user.first_name = data.first_name
    user.last_name = data.last_name.strip()
    user.name = f"{user.first_name} {user.last_name}".strip()
    user.email = data.email.lower()
    user.timezone = data.timezone
    user.avatar_url = data.avatar_url
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(409, "Email уже зарегистрирован") from exc
    return CurrentUser.model_validate(user).model_copy(
        update={"roles": await auth_dao.get_roles(db, user.id)}
    )

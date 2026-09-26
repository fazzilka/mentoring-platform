import secrets

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from src.api.v1.dependencies import CurrentUserDep, DbSession
from src.core.config import get_settings
from src.models import TelegramConnection
from src.services import telegram as telegram_service

router = APIRouter(prefix="/telegram", tags=["telegram"])


class DeepLinkResponse(BaseModel):
    url: str


class ConnectionStatus(BaseModel):
    connected: bool


class TelegramChat(BaseModel):
    id: int
    type: str = "private"


class TelegramMessage(BaseModel):
    text: str = ""
    chat: TelegramChat


class TelegramUpdate(BaseModel):
    message: TelegramMessage | None = None


@router.post("/link", response_model=DeepLinkResponse)
async def link(user: CurrentUserDep, db: DbSession) -> DeepLinkResponse:
    return DeepLinkResponse(url=await telegram_service.create_deep_link(db, user))


@router.get("/status", response_model=ConnectionStatus)
async def status(user: CurrentUserDep, db: DbSession) -> ConnectionStatus:
    connection = await db.scalar(
        select(TelegramConnection).where(TelegramConnection.user_id == user.id)
    )
    return ConnectionStatus(connected=bool(connection and connection.chat_id))


@router.post("/webhook", status_code=204)
async def webhook(
    data: TelegramUpdate,
    db: DbSession,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
) -> None:
    expected = get_settings().telegram_webhook_secret
    if not expected or not x_telegram_bot_api_secret_token:
        raise HTTPException(403, "Webhook secret не настроен")
    if not secrets.compare_digest(expected, x_telegram_bot_api_secret_token):
        raise HTTPException(403, "Неверный webhook secret")
    message = data.message
    if message and message.chat.type == "private" and message.text.startswith("/start "):
        token = message.text.removeprefix("/start ").strip()
        await telegram_service.connect_from_start(db, token, str(message.chat.id))

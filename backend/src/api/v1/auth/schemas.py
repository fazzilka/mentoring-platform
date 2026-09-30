import re
from typing import Literal, Self
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    initial_role: Literal["student", "mentor"]

    @field_validator("name")
    @classmethod
    def nonblank_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Имя не должно быть пустым")
        first, *last = value.strip().split()
        if len(first) > 100 or len(" ".join(last)) > 100:
            raise ValueError("Имя и фамилия не должны превышать 100 символов")
        return value.strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(max_length=100)
    email: EmailStr
    telegram_username: str | None = Field(default=None, max_length=33)
    phone_number: str | None = Field(default=None, max_length=16)
    avatar_url: str | None = Field(default=None, max_length=2048)
    timezone: str

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise ValueError("Неизвестный часовой пояс") from exc
        return value

    @field_validator("telegram_username")
    @classmethod
    def valid_telegram(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        username = value.removeprefix("@")
        if not re.fullmatch(r"[A-Za-z0-9_]{5,32}", username):
            raise ValueError("Укажите Telegram username из 5–32 символов")
        return username

    @field_validator("phone_number")
    @classmethod
    def valid_phone(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        if not re.fullmatch(r"\+[1-9]\d{7,14}", value):
            raise ValueError("Укажите телефон в международном формате, например +79991234567")
        return value

    @field_validator("first_name")
    @classmethod
    def nonblank_first_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Имя не должно быть пустым")
        return value.strip()

    @model_validator(mode="after")
    def name_length(self) -> Self:
        if len(f"{self.first_name} {self.last_name.strip()}".strip()) > 160:
            raise ValueError("Полное имя не должно превышать 160 символов")
        return self


class AccessToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class CurrentUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: EmailStr
    telegram_username: str | None
    phone_number: str | None
    avatar_url: str | None
    roles: list[str] = Field(default_factory=list)
    first_name: str
    last_name: str
    timezone: str

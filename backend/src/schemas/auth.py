from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    initial_role: Literal["student", "mentor"]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class RoleRequest(BaseModel):
    role: Literal["student", "mentor"]


class UserUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    email: EmailStr
    avatar_url: str | None = Field(default=None, max_length=2048)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class CurrentUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: EmailStr
    avatar_url: str | None
    roles: list[str] = Field(default_factory=list)

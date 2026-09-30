from dataclasses import dataclass


@dataclass(frozen=True)
class RegistrationData:
    name: str
    email: str
    password: str
    initial_role: str


@dataclass(frozen=True)
class UserProfileData:
    first_name: str
    last_name: str
    email: str
    telegram_username: str | None
    phone_number: str | None
    avatar_url: str | None
    timezone: str


@dataclass(frozen=True)
class TokenPair:
    access_token: str
    refresh_token: str

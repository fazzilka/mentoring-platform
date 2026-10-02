from urllib.parse import urlparse


def validate_meeting_url(value: str) -> str:
    parsed = urlparse(value)
    if (
        value.strip() != value
        or parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username
        or parsed.password
    ):
        raise ValueError("Укажите корректную HTTPS-ссылку на встречу")
    return value

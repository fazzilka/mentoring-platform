# Mentoring Platform

Учебная web-платформа для взаимодействия учеников и наставников. Текущая версия — MVP лабораторной №5: основные данные frontend поступают из реального API и PostgreSQL.

## Возможности

У пользователя могут быть роли student и mentor одновременно. Role switch меняет только UI mode, не пользователя и не права.

- Ученик выбирает одного активного ментора. Самостоятельная смена не предусмотрена.
- Наставник видит учеников, управляет availability, подтверждает и отклоняет заявки.
- Встречи: 60/75/90 минут, Телемост, не более двух в неделю. Перенос — отмена и новая заявка; отменять могут оба участника.
- После completed-встречи доступны приватные reflections. Ученик видит свои; наставник — свои и заметки ученика по своим встречам.
- Прекращение наставничества в настройках закрывает назначения с mentor_departed, отменяет открытые встречи, позволяет выбрать нового ментора. История сохраняется.
- Web notifications: получение, прочтение одного и всех. Напоминания за 60 и 5 минут через email и подключённый Telegram.

Публичных рейтингов, чата, платежей и production deployment нет.

## Экраны

| Раздел | Маршруты |
| --- | --- |
| Auth | /login, /register |
| Student | /student/dashboard, /student/mentors, /student/mentors/:mentorId, /student/my-mentor, /student/meetings, /student/notes |
| Mentor | /mentor/dashboard, /mentor/students, /mentor/students/:studentId, /mentor/meetings, /mentor/availability, /mentor/notes |
| Common | /profile, /notifications, /settings; Not Found для неизвестных маршрутов |

## Стек и архитектура

Frontend: React, TypeScript strict, Vite, Mantine, React Router, Tabler Icons, Motion, Zod, TanStack Query.

```text
frontend/src/
  app/       router, providers, shell, theme, auth, API adapter
  pages/     композиция экранов
  features/  действия пользователя и формы с Zod validation
  entities/  domain types, UI, узкие gateway-контексты
  shared/    HTTP client, общие UI и небольшие утилиты
backend/
  src/
    api/v1/       маршруты и зависимости
    core/         настройки, database, security, logging
    models/       SQLAlchemy models
    schemas/      request/response validation
    dao/          database queries
    services/     правила и permissions
    tasks/        Celery reminder scanner
    integrations/ SMTP и Telegram clients
    seed.py       явный development seed
    main.py
    celery_app.py
  migrations/versions/
  tests/
deploy/            Prometheus, Loki, Promtail, Grafana provisioning
docs/screenshots/  реальные снимки интерфейса
```

Единый HTTP client обрабатывает сетевые ошибки и 401/403/404/409/422/500. Auth client выполняет refresh и повтор защищённого запроса при 401. Access token только в памяти, refresh — HttpOnly cookie; reload восстанавливает сессию через refresh/me. TanStack Query кэширует серверные данные отдельно для пользователя; мутации инвалидируют кэш, logout очищает его. API adapter преобразует response contracts в UI types. Страницы используют узкие entity gateways; fetch не вызывается в компонентах. Старый demo adapter используется только тестами, в приложение не подключён.

Backend: Python 3.14, uv, FastAPI, Pydantic Settings, SQLAlchemy 2, asyncpg, Alembic, Argon2, JWT, Celery, RabbitMQ. Слои: API → services → DAO → models. Permissions проверяются сервером, не только UI.

### Модель БД

User связан с UserRole, StudentProfile, MentorProfile, AuthSession. MentorAssignment хранит историю закреплений; partial unique index разрешает одно активное назначение ученика. AvailabilitySlot принадлежит наставнику, Meeting связан со слотом и назначением. Row locks и unique index предотвращают конкурентное бронирование. MeetingReflection принадлежит автору и встрече. Notification хранит web-события, NotificationDelivery — уникальный ключ meeting/user/channel/offset. TelegramConnection хранит chat_id и hash одноразового токена.

## Полный local stack

Нужны Docker с Compose; для запуска вне Docker — uv и Node.js 22+.

```bash
cp .env.example .env
# Задайте JWT_SECRET в .env; сгенерировать: openssl rand -hex 32
docker compose config --quiet
docker compose up -d --build
```

JWT_SECRET должен быть случайной строкой не менее 32 символов. Production-секрета по умолчанию нет. .env не коммитить. Миграции выполняет сервис migrate до запуска backend; seed автоматически не запускается.

### Development seed

Перед первым seed задайте свой пароль (не менее 8 символов):

```bash
read -s DEMO_PASSWORD
export DEMO_PASSWORD
make seed
unset DEMO_PASSWORD
```

Seed разрешён только при ENVIRONMENT=local/test, идемпотентен и не сбрасывает пароли/профили существующих пользователей. Используйте пароль первого seed.

Если development-пароль утрачен, задайте новый DEMO_PASSWORD через environment и явно выполните
`docker compose exec -e DEMO_PASSWORD backend python -m src.seed --reset-passwords`.
Флаг меняет только пароли исходных seed-аккаунтов и отзывает их сессии; профили, встречи и история сохраняются. Аккаунты с изменённым email не сбрасываются.

Аккаунты: student@example.com без ментора; backend@example.com, frontend@example.com, ml@example.com, devops@example.com — наставники; dual@example.com — обе роли; pupil@example.com — ученик dual-role наставника. Создаются availability, meetings всех четырёх статусов, notifications. Это реальные development-записи БД, не mock source frontend.

| Сервис | Адрес |
| --- | --- |
| Frontend | http://localhost:5173 |
| API docs | http://localhost:8000/docs |
| Health / metrics | http://localhost:8000/health, http://localhost:8000/metrics |
| PostgreSQL | localhost:5432; DB/user/password mentoring — только local |
| RabbitMQ | localhost:5672; UI http://localhost:15672, mentoring/mentoring |
| Mailpit | SMTP localhost:1025; UI http://localhost:8025 |
| Prometheus | http://localhost:9090 |
| Loki | http://localhost:3100 |
| Grafana | http://localhost:3000, admin/admin — только local |

FRONTEND_PORT и BACKEND_PORT можно изменить в root .env. Compose задаёт соответствующий CORS origin и API URL. Используйте один hostname (localhost), чтобы refresh cookie работала корректно.

```bash
make logs
docker compose ps
make infra-down
```

infra-down сохраняет volumes; не удаляйте их, если нужна история.

## Environment и отдельный запуск

Root .env.example — Compose. backend/.env.example — запуск backend вне Docker:

- DATABASE_URL, CELERY_BROKER_URL;
- JWT_SECRET, ACCESS_TOKEN_MINUTES (15), REFRESH_TOKEN_DAYS (30), REFRESH_COOKIE_SECURE;
- FRONTEND_ORIGIN — единственный разрешённый CORS origin;
- SMTP_HOST, SMTP_PORT, SMTP_FROM;
- TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, TELEGRAM_WEBHOOK_SECRET — необязательные, без них Telegram недоступен;
- ENVIRONMENT=local, DEBUG=false.

Frontend: VITE_API_URL (default /api/v1); BACKEND_URL для Vite proxy (default http://localhost:8000).

```bash
make setup
docker compose up -d postgres rabbitmq mailpit
cp backend/.env.example backend/.env
# Замените JWT_SECRET placeholder на свой секрет
make migrate
make backend
# Другой терминал:
make frontend
```

Worker и beat запускаются в отдельных терминалах из backend:

```bash
uv run celery -A src.celery_app.celery_app worker --loglevel=info
uv run celery -A src.celery_app.celery_app beat --loglevel=info
# После передачи DEMO_PASSWORD через environment:
uv run python -m src.seed
```

## Напоминания, Telegram и observability

Beat каждую минуту отправляет задачу в RabbitMQ. Worker сканирует подтверждённые будущие встречи. Пропущенный порог догоняется: встреча, созданная менее чем за 5 минут, получает оба напоминания. Email содержит имена, дату/время в часовом поясе получателя, длительность и Телемост. Mailpit принимает письма локально, не отправляя наружу.

Delivery key фиксируется до внешней отправки; повтор задачи не создаёт дубль. Семантика at-most-once, не exactly-once: сбой после claim может потерять доставку; failed-записи автоматически не повторяются. Ошибки канала логируются без токенов и не отменяют встречу или доставку другим каналом.

Telegram: задайте параметры бота и настройте доступный по HTTPS webhook /api/v1/telegram/webhook с secret_token = TELEGRAM_WEBHOOK_SECRET. Telegram не может обращаться к localhost без внешнего HTTPS-туннеля. В настройках нажмите «Подключить Telegram», откройте deep-link бота. Токен одноразовый, действует 15 минут, в БД хранится hash. Привязка только из личного чата. Отсутствие Telegram не мешает email.

Метрики: request count с HTTP status и latency по route templates, без query strings/пользовательских ID. Приложение и worker пишут JSON logs; Promtail отправляет Docker logs в Loki. Datasources Prometheus/Loki provisioned в Grafana. Большого dashboard нет.

## Миграции и проверки

```bash
cd backend
uv sync --frozen
uv run alembic upgrade head
uv run ruff format --check .
uv run ruff check .
uv run mypy
uv run pytest

cd ../frontend
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Backend tests требуют PostgreSQL с миграциями и JWT_SECRET. Используйте отдельную БД через DATABASE_URL. Большинство tests изолированы транзакциями; concurrency test использует независимые соединения и удаляет только собственные записи. CI: push любой ветки, PR в main; CD отсутствует.

## Порядок демонстрации

1. Регистрация или вход student: dashboard без ментора.
2. Каталог → поиск/фильтр → детали → подтверждение выбора. После reload «Мой ментор»; второе active assignment запрещено.
3. Выбрать свободный слот и отправить заявку.
4. В другом профиле браузера войти выбранным наставником, подтвердить/отклонить заявку; у ученика обновится статус.
5. Добавить/удалить свободный слот. Занятый удалить нельзя.
6. Отменить встречу, проверить сохранённую историю.
7. pupil и dual: completed meeting, reflection create/edit и permissions.
8. Уведомления: прочесть одно/все, reload.
9. Mailpit и worker/beat: подтвердить встречу на ближайшие минуты.
10. Настройки наставника → прекратить наставничество. У ученика появляется предупреждение, доступен новый выбор, история сохранена.
11. Mobile drawer, logout, redirect с protected route на login.

## Лабораторные работы

- №1 «Интерфейс приложения и каркас frontend»: Mantine, Router, responsive, mock/demo-данные; screenshots lab-01.
- №2: backend, database model, migrations, CRUD и domain rules.
- №3: app/pages/features/entities/shared, gateways, Zod, loading/error/empty/success.
- №4: Argon2, JWT, refresh sessions с hash, HttpOnly cookie, authorization.
- №5: real domain API, TanStack Query, seed, reminders, observability. Fake scenario switch удалён; состояния определяются БД. Реальные screenshots: docs/screenshots/lab-05/.

UI: system font, off-white background, тонкие borders, умеренная translucency, press feedback; springs без bounce, reduced motion/transparency/contrast. Desktop sidebar, mobile header + drawer.

## Git workflow

Интеграционная ветка dev, основная main. Рабочие ветки feature/MENT-XXX-description, fix/MENT-XXX-description, security/MENT-XXX-description; интеграция через PR. Conventional Commits с scope. develop не используется.

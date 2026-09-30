# Mentoring Platform

Учебная web-платформа для взаимодействия учеников и наставников. Текущая версия — MVP лабораторной №5: основные данные frontend поступают из реального API и PostgreSQL.

## Возможности

У пользователя могут быть роли student и mentor одновременно. Role switch меняет только UI mode, не пользователя и не права.

- Ученик выбирает одного активного ментора. Самостоятельная смена не предусмотрена.
- Наставник видит учеников, управляет availability, подтверждает и отклоняет заявки.
- Встречи: 60/75/90 минут, не более двух в неделю. Ученик запрашивает свободный слот, наставник подтверждает со ссылкой на HTTPS-сервис; наставник также может назначить встречу закреплённому ученику. Перенос — отмена и новая встреча; отменять могут оба участника.
- Контакты (Telegram username, телефон и email) редактируются в профиле и видны только закреплённой паре. Переписка ведётся вне приложения; Telegram Bot и доставка уведомлений в мессенджеры не используются.
- После completed-встречи доступны приватные reflections. Ученик видит свои; наставник — свои и заметки ученика по своим встречам.
- Прекращение наставничества в настройках закрывает назначения с mentor_departed, отменяет открытые встречи, позволяет выбрать нового ментора. История сохраняется.
- Уведомления только внутри сайта: новые заявки, изменения встреч, завершение наставничества; прочтение одного и всех сохраняется в БД.

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
    api/v1/       auth, people, assignments, availability,
                  meetings, reflections, notifications
                  (в каждом домене: router, schemas, service)
    config/       настройки приложения из environment
    core/db/      SQLAlchemy models, repositories, DTO, session
    core/di/      зависимости FastAPI: session и сервисы
    core/         общие проверки доступа, security, errors, logging
    main.py
  migrations/versions/
  tests/
deploy/            Prometheus, Loki, Promtail, Grafana provisioning
docs/screenshots/  реальные снимки интерфейса
```

Единый HTTP client обрабатывает сетевые ошибки и 401/403/404/409/422/500. Auth client выполняет refresh и повтор защищённого запроса при 401. Access token только в памяти, refresh — HttpOnly cookie; reload восстанавливает сессию через refresh/me. TanStack Query кэширует серверные данные отдельно для пользователя; мутации инвалидируют кэш, logout очищает его. API adapter преобразует response contracts в UI types. Страницы используют узкие entity gateways; fetch не вызывается в компонентах. Во frontend нет mock-адаптера или локальных пользовательских данных.

Backend: Python 3.14, uv, FastAPI, Pydantic Settings, SQLAlchemy 2, asyncpg, Alembic, Argon2, JWT. Структура адаптирована по предметным областям: `router.py` обрабатывает HTTP, `schemas.py` описывает вход и ответ, `service.py` содержит правила и транзакционные операции; репозитории и ORM-модели лежат в `core/db`. FastAPI Dependencies собираются в `core/di`. Сервисы пока используют `AsyncSession` напрямую как границу транзакции: отдельный Unit of Work не добавлен, поскольку здесь нет нескольких источников данных и он лишь дублировал бы интерфейс сессии. Permissions проверяются сервером, не только UI. URL API и схема БД при этом переносе не менялись.

### Модель БД

User связан с UserRole, StudentProfile, MentorProfile, AuthSession. MentorAssignment хранит историю закреплений; partial unique index разрешает одно активное назначение ученика. AvailabilitySlot принадлежит наставнику, Meeting связан со слотом и назначением. Row locks и unique index предотвращают конкурентное бронирование. MeetingReflection принадлежит автору и встрече. Notification хранит события и состояние прочтения внутри сайта. Исторические миграции сохранены; актуальная миграция удаляет `telegram_connections` и `notification_deliveries` из схемы.

## Полный local stack

Нужны Docker с Compose; для запуска вне Docker — uv и Node.js 22+.

```bash
cp .env.example .env
# Задайте JWT_SECRET в .env; сгенерировать: openssl rand -hex 32
docker compose config --quiet
docker compose up -d --build
```

JWT_SECRET должен быть случайной строкой не менее 32 символов. Production-секрета по умолчанию нет. .env не коммитить. Миграции выполняет сервис migrate до запуска backend. Тестовые пользователи не создаются при запуске: свои аккаунты зарегистрируйте на **http://localhost:5173/register**.

| Сервис | Адрес |
| --- | --- |
| Frontend | http://localhost:5173 |
| API docs | http://localhost:8000/docs |
| Health / metrics | http://localhost:8000/health, http://localhost:8000/metrics |
| PostgreSQL | localhost:5432; DB/user/password mentoring — только local |
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

### Подключение DataGrip

1. Убедитесь, что Docker Desktop запущен. В корне проекта выполните `docker compose up -d postgres` и `docker compose ps postgres`. Сервис должен быть healthy.
2. В DataGrip откройте окно **Database** → **+** → **Data Source** → **PostgreSQL**. Если DataGrip предложит скачать драйвер PostgreSQL, нажмите **Download**.
3. Укажите **Host** `localhost`, **Port** `5432`, **User** `mentoring`, **Password** `mentoring`, **Database** `mentoring`. Тип авторизации — **User & Password**. URL эквивалентен `jdbc:postgresql://localhost:5432/mentoring`. Это только локальные учебные реквизиты из Compose, не production-секрет.
4. Нажмите **Test Connection**, затем **OK**. Разверните базу `mentoring` → схему `public` → **Tables**. Если таблицы не видны, проверьте выбор схемы `public` в свойствах data source и обновите дерево.
5. Откройте **New Query Console** для этой базы и выполните один из запросов ниже через кнопку **Run**. DataGrip позволяет открыть таблицу двойным щелчком и посмотреть строки без SQL.

Если Connection refused: проверьте `docker compose ps postgres`, порт 5432 и что DataGrip запущен на том же компьютере. Если authentication failed: сверьте реквизиты с `docker-compose.yml`. Если таблиц нет: поднимите миграции `docker compose up -d migrate` или весь stack `docker compose up -d --build`.

```sql
-- Пользователи и роли без просмотра password_hash
SELECT u.name, u.email, string_agg(r.role, ', ' ORDER BY r.role) AS roles
FROM users AS u
LEFT JOIN user_roles AS r ON r.user_id = u.id
GROUP BY u.id, u.name, u.email
ORDER BY u.created_at DESC;

-- Текущее и завершённое наставничество
SELECT s.name AS student, m.name AS mentor, a.status, a.end_reason, a.started_at, a.ended_at
FROM mentor_assignments AS a
JOIN users AS s ON s.id = a.student_id
JOIN users AS m ON m.id = a.mentor_id
ORDER BY a.started_at DESC;

-- Встречи и их статусы, время показано по Москве
SELECT s.name AS student, m.name AS mentor, t.status,
       t.starts_at AT TIME ZONE 'Europe/Moscow' AS starts_at_msk,
       t.duration_minutes
FROM meetings AS t
JOIN users AS s ON s.id = t.student_id
JOIN users AS m ON m.id = t.mentor_id
ORDER BY t.starts_at DESC;

-- Свободные слоты и внутренние уведомления
SELECT m.name AS mentor, v.status, v.starts_at AT TIME ZONE 'Europe/Moscow' AS starts_at_msk
FROM availability_slots AS v JOIN users AS m ON m.id = v.mentor_id
ORDER BY v.starts_at DESC LIMIT 20;

SELECT u.name, n.title, n.is_read, n.created_at
FROM notifications AS n JOIN users AS u ON u.id = n.user_id
ORDER BY n.created_at DESC LIMIT 20;
```

Поля и настройка PostgreSQL data source описаны в [документации DataGrip](https://www.jetbrains.com/help/datagrip/postgresql.html); выбор схем — в [Schemas](https://www.jetbrains.com/help/datagrip/schemas.html), выполнение SQL — в [Run a query](https://www.jetbrains.com/help/datagrip/run-a-query.html).

## Environment и отдельный запуск

Root .env.example — Compose. backend/.env.example — запуск backend вне Docker:

- DATABASE_URL;
- JWT_SECRET, ACCESS_TOKEN_MINUTES (15), REFRESH_TOKEN_DAYS (30), REFRESH_COOKIE_SECURE;
- FRONTEND_ORIGIN — единственный разрешённый CORS origin;
- ENVIRONMENT=local, DEBUG=false.

Frontend: VITE_API_URL (default /api/v1); BACKEND_URL для Vite proxy (default http://localhost:8000).

```bash
make setup
docker compose up -d postgres
cp backend/.env.example backend/.env
# Замените JWT_SECRET placeholder на свой секрет
make migrate
make backend
# Другой терминал:
make frontend
```

## Уведомления и observability

Уведомления создаются в рамках действий на сайте и хранятся в PostgreSQL. Внешние доставки, подключение мессенджеров и фоновые напоминания отсутствуют; очередь сообщений и почтовый сервис не требуются.

Метрики: request count с HTTP status и latency по route templates, без query strings/пользовательских ID. Приложение пишет JSON logs; Promtail отправляет Docker logs в Loki. Datasources Prometheus/Loki provisioned в Grafana. Большого dashboard нет.

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

Зарегистрируйте два аккаунта — ученика и наставника. Для одновременного входа используйте разные профили браузера. Проверьте созданные записи в `users`, `mentor_assignments` и `meetings` через DataGrip.

1. Регистрация или вход student: dashboard без ментора.
2. Каталог → поиск/фильтр → детали → подтверждение выбора. После reload «Мой ментор»; второе active assignment запрещено.
3. Выбрать свободный слот и отправить заявку.
4. В другом профиле браузера войти выбранным наставником, подтвердить/отклонить заявку; при подтверждении указать HTTPS-ссылку на встречу. У ученика обновится статус и появится ссылка.
5. Наставник может самостоятельно назначить встречу закреплённому ученику на свободное время. Оба видят её в расписании.
6. Добавить/удалить свободный слот. Занятый удалить нельзя.
7. Отменить встречу, проверить сохранённую историю.
8. После завершённой встречи проверить приватные заметки и permissions.
9. Уведомления: прочесть одно/все, reload.
10. Настройки наставника → прекратить наставничество. У ученика появляется предупреждение, доступен новый выбор, история сохранена.
11. Mobile drawer, logout, redirect с protected route на login.

## Лабораторные работы

- №1 «Интерфейс приложения и каркас frontend»: Mantine, Router, responsive, mock/demo-данные; screenshots lab-01.
- №2: backend, database model, migrations, CRUD и domain rules.
- №3: app/pages/features/entities/shared, gateways, Zod, loading/error/empty/success.
- №4: Argon2, JWT, refresh sessions с hash, HttpOnly cookie, authorization.
- №5: real domain API, TanStack Query, web notifications, observability. Fake scenario switch удалён; состояния определяются БД. Реальные screenshots: docs/screenshots/lab-05/.

UI: system font, off-white background, тонкие borders, умеренная translucency, press feedback; springs без bounce, reduced motion/transparency/contrast. Desktop sidebar, mobile header + drawer.

## Git workflow

Интеграционная ветка dev, основная main. Рабочие ветки feature/MENT-XXX-description, fix/MENT-XXX-description, security/MENT-XXX-description; интеграция через PR. Conventional Commits с scope. develop не используется.

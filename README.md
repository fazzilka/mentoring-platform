# Mentoring Platform

Учебная web-платформа для взаимодействия учеников и наставников. Ученик выбирает одного ментора, записывается на встречи и сохраняет приватные заметки. Наставник видит учеников, подтверждает заявки и управляет доступностью. Один пользователь может иметь обе роли.

## Лабораторная работа №1

**«Интерфейс приложения и каркас frontend».**

Lab 1 реализовала интерфейс на mock/demo-данных. После Lab 3 domain-данные поступают через узкие gateways и сохраняются в localStorage. В текущей Lab 4 вход, регистрация и основные данные аккаунта подключены к backend; встречи, наставники и остальные учебные данные ещё демонстрационные.

Для текущего frontend нужны backend и PostgreSQL. Порядок запуска описан в разделе «Лабораторная работа №4» ниже.

### Запуск

Нужны Node.js 22+ и npm:

```bash
cd frontend
npm ci
npm run dev
```

Откройте <http://localhost:5173> и зарегистрируйте аккаунт. Пароль — от 8 символов. Доступна только выбранная роль; обе роли доступны только пользователю, которому обе назначены в БД.

Если порт занят: `npm run dev -- --port 5176`.

### Экраны

| Раздел | Экраны и маршруты |
|---|---|
| Auth | Login `/login`, Register `/register` |
| Student | Dashboard `/student/dashboard`, Mentor Catalog `/student/mentors`, Mentor Details `/student/mentors/:mentorId`, My Mentor `/student/my-mentor`, Meetings `/student/meetings`, Notes `/student/notes` |
| Mentor | Dashboard `/mentor/dashboard`, My Students `/mentor/students`, Student Details `/mentor/students/:studentId`, Meetings `/mentor/meetings`, Availability `/mentor/availability`, Notes `/mentor/notes` |
| Common | Profile `/profile`, Notifications `/notifications`, Settings `/settings`, Not Found для неизвестного маршрута |

### Сценарии ученика

Внизу `/student/dashboard` есть переключатель:

1. **Без ментора:** кнопка «Найти наставника», доступен каталог.
2. **Есть ментор:** карточка наставника и «Мой ментор» в навигации; другого выбрать нельзя.
3. **Ментор ушёл:** назначение завершено с `mentor_departed`, показано предупреждение и можно выбрать нового наставника.

Переключатель служит только для демонстрации преподавателю, не является реальной бизнес-функцией и не удаляет историю встреч и заметок.

### Взаимодействия

- Поиск наставника по имени, компании и навыкам, фильтры Backend / Frontend / ML / DevOps.
- Профиль наставника, свободные слоты, выбор через confirmation modal и сохранение назначения.
- Запрос встречи с текущим ментором и отмена без удаления истории. Длительность — 60/75/90 минут; не более двух встреч с одним наставником в неделю.
- Подтверждение и отклонение mock-заявок наставником. При подтверждении фиксируется текущая ссылка Телемоста: изменение профиля не меняет ссылку старой встречи.
- Создание свободного времени с проверкой будущей даты и пересечений, удаление только свободных слотов.
- Сохранение и редактирование reflections после завершённых встреч. Ученик видит свои заметки; наставник — свои и заметки учеников по общим встречам. Публичных оценок нет.
- Переключение ролей, редактирование профиля, отметка всех внутренних уведомлений прочитанными, имитация входа/выхода и persistence после reload.

Email, Telegram, фоновые задачи и реальные напоминания frontend не использует. Пространство ученика и пространство наставника имеют собственные встречи: переключение роли не означает вход под аккаунтом выбранного наставника.

### Mock-state и структура

Стек: React 19, TypeScript strict, Vite, Mantine, React Router, Tabler Icons, Motion; в Lab 3 добавлен Zod.

Текущая структура после Lab 3:

```text
frontend/
├── src/
│   ├── app/                      # router, providers, shell, theme, styles, adapter
│   ├── pages/                    # композиция экранов
│   ├── features/                 # пользовательские действия и формы
│   ├── entities/                 # доменные типы и узкие gateway models
│   ├── shared/                   # универсальные ui и lib
│   └── main.tsx                  # точка входа React
├── package.json
└── package-lock.json
```

`app/adapters/demo/data.ts` создаёт четырёх наставников, трёх учеников, встречи разных статусов, историю назначений, свободные и занятые слоты, уведомления, reflections и профили обеих ролей. Централизованный demo gateway управляет данными; каждый экран подписывается только на нужные ему domain gateways.

Демонстрационные domain-данные хранятся в браузере под ключом `mentoring-domain-demo:<user-id>`. Для сброса удалите этот ключ через DevTools → Application → Local Storage и перезагрузите страницу. Это не сбрасывает серверную auth-сессию: для неё используйте «Выйти». Если localStorage недоступен, demo-данные не сохраняются после reload.

### Дизайн и responsive

Светлая тема, system font, off-white фон, спокойный accent, тонкие borders и минимальные shadows. Translucency ограничена навигацией и floating surfaces. Press feedback мгновенный, Motion springs без bounce. Учитываются reduced motion, reduced transparency и повышенный контраст.

Desktop — sidebar, tablet — компактный sidebar, mobile — header и drawer. Проверяемые ширины: 1440, 1024, 768 и 390 px.

### Проверки

```bash
cd frontend
npm run lint
npm run typecheck
npm run build
```

Для ручной проверки переключите три сценария, выберите ментора, запросите и отмените встречу. В режиме наставника обработайте одну из его заявок, добавьте/удалите свободный слот. Сохраните и отредактируйте заметку, измените профиль, прочитайте уведомления и перезагрузите страницу.

### Скриншоты

Настоящие браузерные снимки находятся в `docs/screenshots/lab-01/`:

| Файл | Состояние |
|---|---|
| `01-student-dashboard-no-mentor.png` | Ученик без наставника |
| `02-mentor-catalog.png` | Каталог |
| `03-mentor-details.png` | Профиль наставника |
| `04-student-dashboard-with-mentor.png` | Ученик с наставником |
| `05-student-meetings.png` | Заявка на встречу |
| `06-mentor-dashboard.png` | Обзор наставника |
| `07-mentor-students.png` | Ученики |
| `08-mentor-availability.png` | Свободное время |
| `09-notifications.png` | Внутренние уведомления |
| `10-mobile-dashboard.png` | Mobile dashboard, 390 px |

## Остальная структура проекта

`backend/` содержит FastAPI backend Lab 2, модели, Alembic и тесты. `deploy/` и `docker-compose.yml` — конфигурацию локальной инфраструктуры. `.github/workflows/ci.yml` — проверки backend и frontend. Они не нужны для запуска frontend Lab 1/3.

Основная ветка — `main`, изменения поступают через PR. Сообщения коммитов — Conventional Commits; рабочие ветки — `feature/MENT-XXX-description`, `fix/MENT-XXX-description`, `security/MENT-XXX-description`.

## Лабораторная работа №2

**«Backend, модель базы данных и CRUD».** Frontend Lab 1 не меняется и продолжает использовать mock-data. API Lab 2 работает с настоящим PostgreSQL, а не с in-memory хранилищем.

Стек: Python 3.14, uv, FastAPI, Pydantic, Pydantic Settings, SQLAlchemy 2 async, asyncpg и Alembic. Проверки — pytest, pytest-asyncio, ruff и mypy.

### Архитектура backend

```text
backend/
├── src/
│   ├── api/v1/           # тонкие HTTP-обработчики и dependency wiring
│   ├── core/             # конфигурация, сессия БД и доменные ошибки
│   ├── models/           # ORM-модели, по файлу на сущность
│   ├── schemas/          # Pydantic Create / Update / Response
│   ├── dao/              # SQL-запросы и блокировки записей
│   ├── services/         # бизнес-правила и транзакционные границы
│   │   └── dto.py        # dataclass-ввод сервисов без Pydantic
│   ├── seed.py           # идемпотентные development-пользователи
│   └── main.py           # сборка FastAPI, обработка ошибок, health
├── migrations/versions/
├── tests/
├── pyproject.toml
└── uv.lock
```

Обработчик вызывает сервис, сервис использует DAO; SQL не находится в HTTP-слое. Сервисы назначений, доступности, встреч и reflections разделены по ответственности, получают сессию через FastAPI Depends и не импортируют FastAPI/Pydantic. Commit выполняется в сервисе, незавершённая транзакция откатывается при закрытии request dependency. Существующая структура адаптирована без подключения дополнительного DI-фреймворка.

### Модель данных

| Модель | Основные поля и связи |
|---|---|
| `User` | UUID, unique email, password_hash, first_name, last_name, avatar_url, timezone, created_at, updated_at |
| `UserRole` | user_id → User, роль student / mentor; unique (user_id, role), обе роли допустимы |
| `StudentProfile` | unique user_id → User, about, level, direction, goal, technologies, learning_interests |
| `MentorProfile` | unique user_id → User, about, specialization, skills, experience_years, company, position, default_meeting_url, accepting_students, status: active / inactive / departed |
| `MentorAssignment` | student_id и mentor_id → User, status, started_at, ended_at, end_reason; история сохраняется |
| `AvailabilitySlot` | mentor_id → User, starts_at с timezone, duration_minutes: 60 / 75 / 90, state: free / pending / booked |
| `Meeting` | student_id, mentor_id, assignment_id, availability_slot_id, starts_at, duration_minutes, status, meeting_url, cancelled_by → User, cancellation_reason, timestamps |
| `MeetingReflection` | meeting_id → Meeting, author_id → User, summary, next_step, timestamps; unique (meeting_id, author_id) |
| `Notification` | user_id → User, nullable meeting_id → Meeting, type, title, message, nullable read_at, created_at; только внутренние уведомления |

Один ментор имеет много учеников, а у ученика одновременно максимум одно активное назначение. Это защищено partial unique index PostgreSQL `uq_active_student_assignment`, а не только проверкой сервиса. Второй partial unique index `uq_open_meeting_slot` не допускает двух pending/confirmed встреч на одном слоте. Для запросов используются row locks, для длительности и статусов — CHECK constraints.

Миграции прежнего этапа не переписаны. Новая ревизия `4b71fc8aeb17` дополняет существующую initial migration. Для совместимости SQLAlchemy synonyms отображают `level → current_level`, `goal → learning_goal`, `learning_interests → wants_to_learn`, `state → status`, `availability_slot_id → slot_id`, `author_id → author_user_id`, `summary → text`, `message → body`. API Lab 2 использует новые имена; прежние колонки и данные сохранены.

### Запуск PostgreSQL и backend

```bash
docker compose up -d postgres
cd backend
uv sync --frozen
uv run alembic upgrade head
uv run python -m src.seed
uv run uvicorn src.main:app --reload --port 8003
```

По умолчанию PostgreSQL доступен на `localhost:5432`, database/user — `mentoring`; параметры локального окружения описаны в `backend/.env.example`. Для другой базы задайте `DATABASE_URL` или используйте свой локальный `backend/.env` (не коммитить). Swagger: <http://localhost:8003/docs>, health: <http://localhost:8003/health> → `{"status":"ok"}`.

### Идентификация пользователя

В Lab 2 использовался временный `X-Development-User-Id`. В Lab 4 этот механизм удалён: все domain endpoints требуют JWT и действующую AuthSession. Подстановка чужого UUID в заголовок не даёт доступа.

Seed создаёт двух пользователей с профилями и случайными, не публикуемыми password_hash; пароли для входа не выдаются. Повторный запуск не создаёт дублей и не перезаписывает пользовательские изменения:

- Student: `11111111-1111-4111-8111-111111111111`.
- Mentor: `22222222-2222-4222-8222-222222222222`.

После входа укажите access token через Swagger Authorize. Например:

```bash
curl http://localhost:8003/api/v1/mentors \
  -H 'Authorization: Bearer <access-token>'
```

Auth endpoints подключены в Lab 4. Telegram endpoints не подключены. Для лабораторных достаточно PostgreSQL и uvicorn: не запускайте Celery worker/beat. Email, Telegram и Celery reminders в текущей работе не используются.

### API и бизнес-правила

Все маршруты находятся под `/api/v1`:

- `GET /mentors`, `GET /mentors/{id}` — каталог, поиск по имени и фильтр специализации.
- `GET /profiles/student/me`, `POST /profiles/student/me`, `PUT /profiles/student/me` — чтение, создание и полная замена своего профиля ученика.
- `GET /profiles/mentor/me`, `POST /profiles/mentor/me`, `PUT /profiles/mentor/me` — профиль наставника. Уход выполняется отдельным `POST /profiles/mentor/depart`, завершающим назначения и открытые встречи с сохранением истории.
- `GET /assignments/me`, `POST /assignments` с `mentor_id` — история и выбор наставника; самостоятельной смены или удаления назначения нет.
- `GET /students`, `GET /students/{id}` — ученики текущего наставника.
- `GET /mentors/{id}/slots`, `POST /slots`, `PUT /slots/{id}`, `DELETE /slots/{id}` — доступность. Создание/изменение только в будущем, без пересечений. Занятый слот или слот, связанный с историей встреч, удалять нельзя.
- `GET /meetings`, `GET /meetings/{id}`, `POST /meetings` с `availability_slot_id` — встречи участника. Запись только к текущему активному наставнику по free-слоту, максимум два раза в неделю (границы недели UTC).
- `POST /meetings/{id}/confirm`, `/reject`, `/complete`, `/cancel` — переходы статусов. Confirm/reject/complete выполняет наставник; cancel — любой участник, с необязательным `reason`.
- `GET /meetings/{id}/reflections`, `POST /meetings/{id}/reflections`, `PUT /reflections/{id}` — приватные reflections по завершённым встречам. Ученик видит свои; наставник — свои и ученика. Редактировать можно только свою.
- `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all` — только уведомления текущего пользователя, отметка чтения идемпотентна.

Request: слот free → pending, встреча pending. Confirm: встреча confirmed, слот booked, текущий `default_meeting_url` копируется в `meeting_url`. Reject допускается только для pending, переводит встречу в cancelled и освобождает будущий слот. Cancel не удаляет встречу и также освобождает слот, если его время ещё не наступило. Completed допустим только после окончания confirmed-встречи. Перенос — отмена и новая запись; отдельного reschedule endpoint нет. Удаление встреч, назначений и reflections не предусмотрено, чтобы не терять историю.

Ошибки: `400` — неверный бизнес-ввод, `401` — отсутствующая/недействительная auth-сессия, `403` — недостаточные права, `404` — запись отсутствует или недоступна пользователю, `409` — конфликт состояния, `422` — ошибка Pydantic-валидации.

### Миграции и тесты

```bash
cd backend
uv sync --frozen
uv run ruff format --check .
uv run ruff check .
uv run mypy
uv run alembic upgrade head
uv run pytest
uv run alembic check
```

Интеграционные тесты требуют настоящую PostgreSQL с применёнными миграциями. Каждый тест выполняется в транзакции с savepoints и откатывает свои записи. Рекомендуется отдельная локальная база; задавайте `DATABASE_URL` для всех команд проверки, чтобы не использовать рабочие данные.

На **пустой одноразовой базе** проверяется цикл:

```bash
uv run alembic upgrade head
uv run alembic downgrade -1
uv run alembic upgrade head
```

Downgrade новой ревизии запрещён при наличии пользователей: удаление добавленных колонок потеряло бы данные. Старые миграции также нельзя откатывать на рабочей базе без резервной копии и отдельного решения.

## Лабораторная работа №3

**«Архитектура frontend и динамический интерфейс».** Все сценарии Lab 1 сохранены. Domain API остаётся демонстрационным адаптером; настоящая auth добавлена отдельно в Lab 4, внешней доставки уведомлений нет.

### Упрощённый Feature-Sliced подход

| Слой | Ответственность |
|---|---|
| `app` | Сборка приложения: `router.tsx`, `AppProviders`, `GatewayProvider`, `AppLayout`, theme, global styles, состояния страниц и demo adapter |
| `pages` | Композиция экранов из entities, features и shared; локальные фильтры/вкладки |
| `features` | Действия: auth-form, switch-role, search/filter/assign-mentor, request/cancel/manage-meeting-request, manage-availability, write-reflection, edit-profile, mark-notifications-read |
| `entities` | user, mentor, student, assignment, availability, meeting, reflection, notification. По каждой сущности — реальные types и gateway model; domain UI добавляется только при необходимости |
| `shared` | Только универсальные `ui` (Surface, PageHeader, skeleton, empty state и т. п.) и `lib` (подписка на gateway, обработка ошибок форм). Доменных типов и действий здесь нет |

Строгие правила полного FSD не вводятся: допускаются понятные связи сущностей и композиция связанных features. Каждый новый модуль имеет конкретного потребителя; пустые каталоги «на будущее» не создаются.

### Mock adapter и gateways

`PlatformGateway` — типизированный контракт адаптера: `getSnapshot`, `subscribe`, асинхронный `load` и команды в snapshot. Его текущая реализация — `app/adapters/demo/gateway.ts`, обычное хранилище без зависимости от React. Оно выполняет demo-правила и persistence. `storage.ts` проверяет сохранённый JSON через Zod; повреждённые данные безопасно заменяются начальным demo-state.

`GatewayProvider` принимает реализацию адаптера и предоставляет восемь узких domain gateways. Например, `useMentorGateway` предоставляет список наставников, `useMeetingGateway` — встречи и их операции. React подписывается через `useSyncExternalStore`; snapshot кэшируется между изменениями. UI больше не импортирует глобальный `usePlatformState` и не знает о localStorage или backend endpoint.

В Lab 5 реализацию адаптера можно заменить на API-backed gateway через параметр `GatewayProvider`, не меняя контракты форм и страниц. В Lab 4 domain demo-state изолирован ключом `mentoring-domain-demo:<user-id>`; в нём нет токенов или признака авторизации.

### Формы и типы

Zod schemas находятся рядом со своими features: вход, регистрация, редактирование профилей, создание доступности, запрос встречи и reflection. Проверяются email, длина пароля/текстов, имя, URL аватара и Телемоста, timezone, будущая дата, длительность 60/75/90 и непустая заметка. Ошибки отображаются рядом с полями; adapter также проверяет команды и бизнес-конфликты.

TypeScript strict сохраняется, `any` не используется. Доменные типы разделены по entities. Роли, специализации и статусы объявляются в одном месте; union types выводятся из соответствующих `as const` списков.

### Состояния и UI guards

Все data-driven routes используют `DataPage`: загрузка → success либо понятная ошибка с кнопкой повтора. Пустые списки имеют свои предметные empty states. Для показа общих состояний без удаления данных добавьте к любому такому маршруту:

- `?demoView=loading` — skeleton;
- `?demoView=error` — ошибка demo adapter и «Попробовать снова»;
- `?demoView=empty` — пустое состояние и возврат к данным;
- без параметра — обычная работа с сохранёнными demo-данными.

При смене маршрута предыдущий результат загрузки не показывается на новом экране. Незавершённая загрузка не обновляет размонтированный экран. Повтор снимает демонстрационный параметр и запускает загрузку заново.

Student/mentor routes проверяют доступность роли и соответствие UI режима. Прямой переход синхронизирует UI mode с маршрутом; при отсутствии роли происходит redirect. После Lab 4 ProtectedRoute проверяет AuthProvider, а roles берутся из `/auth/me`. Настоящие права на данные проверяются backend независимо от UI mode.

### Дизайн и проверка

Сохранены system font, off-white фон, thin borders и спокойный accent. Переключатель роли выделен в feature с коротким Motion spring без bounce и мгновенным press feedback. Универсальный `Dialog` сохраняет контекст действия, trapping/возврат фокуса и использует короткий fade без масштабирования из произвольной точки; при reduced motion переход отключается. Mobile navigation использует Drawer. Translucency ограничена toolbar/navigation/dialogs. Reduced motion отключает перемещения и press scaling, reduced transparency делает поверхности непрозрачными и отключает blur overlay.

```bash
cd frontend
npm ci
npm run dev
npm run lint
npm run typecheck
npm run build
```

Лёгкие unit-тесты: `npm test` — встроенный Node test runner с `tsx` для TypeScript. Проверяются Zod schemas, стабильность snapshot/подписка, назначения, бронирование/отмена, история, persistence, повреждённое хранилище и повтор загрузки.

Проверка вручную: сценарии ученика, поиск/фильтрация/назначение, запрос и отмена встречи, подтверждение/отклонение, доступность, редактирование reflections и профиля, чтение уведомлений, reload и переключение ролей. Дополнительно — состояния `demoView`, invalid form inputs, keyboard focus и Drawer на ширинах 1440/1024/768/390 px. Отдельная тяжёлая e2e-инфраструктура не добавляется.

## Лабораторная работа №4

**«Authentication и authorization».** Настоящие регистрация, вход, восстановление и завершение сессии. Полная интеграция domain API отложена: каталог, назначения, встречи, доступность, заметки и уведомления на frontend остаются demo-данными. Основные данные аккаунта сохраняются через `PUT /auth/me`.

### Запуск

Из корня проекта, в каждом терминале backend задайте один и тот же JWT_SECRET через окружение либо локальный `backend/.env`. Пример генерации (не публикуйте полученное значение):

```bash
export JWT_SECRET="$(openssl rand -hex 32)"
docker compose up -d postgres
cd backend
uv sync --frozen
uv run alembic upgrade head
uv run uvicorn src.main:app --reload --port 8000
```

В другом терминале:

```bash
cd frontend
npm ci
npm run dev
```

Открывайте именно <http://localhost:5173>. `FRONTEND_ORIGIN` backend должен точно совпадать с origin браузера: scheme, hostname и port. Для другого backend-порта задайте `BACKEND_URL=http://localhost:8003` при запуске Vite. Vite проксирует `/api` на backend; в production нужен аналогичный same-origin reverse proxy. При прямом доступе можно задать `VITE_API_URL`, но origin должен быть разрешён backend и cookie должны оставаться same-site.

JWT_SECRET обязателен во всех окружениях: минимум 32 символа, без шаблонного значения. Отсутствующий/некорректный секрет останавливает запуск API. Не коммитьте `.env`. В CI создаётся одноразовый тестовый секрет. `ACCESS_TOKEN_MINUTES` по умолчанию 15 (1–60), `REFRESH_TOKEN_DAYS` — 30 (1–90). В production обязательны HTTPS и `ENVIRONMENT=production`: refresh cookie всегда Secure; локально для HTTPS можно включить `REFRESH_COOKIE_SECURE=true`.

### Auth API

Все маршруты имеют существующий префикс `/api/v1`:

| Метод | Маршрут | Назначение |
|---|---|---|
| POST | `/auth/register` | name, email, password, initial_role; создаёт аккаунт с одной ролью |
| POST | `/auth/login` | email + password |
| POST | `/auth/refresh` | получает refresh только из cookie, ротирует сессию |
| POST | `/auth/logout` | отзывает текущую cookie-сессию, удаляет cookie; access не нужен |
| GET | `/auth/me` | аккаунт, роли, основные данные; Bearer JWT |
| PUT | `/auth/me` | редактирование только собственного аккаунта; роли/id не принимаются |

Пароли хешируются Argon2id. В БД хранится только SHA-256 hash случайного refresh token; `AuthSession` уже создана существующей initial migration. Access JWT содержит sub, sid, iat, exp; каждая защищённая операция проверяет подпись, срок, владельца сессии, срок сессии и отзыв. Refresh ротируется: старая сессия отзывается, повторное использование отклоняется. Logout доступен даже с истёкшим access token. Refresh не возвращается в JSON: только HttpOnly, SameSite=Lax cookie с узким path `/api/v1/auth`. Cookie-операции проверяют Origin; CORS разрешает только `FRONTEND_ORIGIN`. Ответы с токенами и `/auth/me` не кешируются.

Frontend `app/auth` содержит memory-only auth client, AuthProvider и ProtectedRoute. Reload вызывает refresh → me; localStorage не определяет авторизацию и не содержит токенов/пароля. Клиент объединяет параллельные refresh, обновляет access перед истечением и повторяет защищённый запрос один раз после 401. Ошибка восстановления из-за недоступного сервера показывается с повтором. Role switch меняет только UI mode и доступен только для server-side roles; второго User он не создаёт.

Backend независимо проверяет роль и владение профилем, назначением, встречей, доступностью и рефлексией. Student видит только собственные reflections; mentor — reflections участников своих встреч. История назначений не даёт постороннему mentor доступа к чужой встрече. OAuth, email verification, password reset, 2FA и внешняя доставка уведомлений не реализуются.

Проверки: `uv run ruff format --check .`, `uv run ruff check .`, `uv run mypy`, `uv run pytest` (JWT_SECRET и отдельная PostgreSQL с миграциями); frontend — `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Тесты auth проверяют регистрацию, дубликаты email, пароль, cookie/hash, JWT/session expiry, rotation/replay, logout, me, роль, Origin и обязательность секрета. Domain-тесты работают через JWT, без development bypass.

Выбор password hashing и cookie-флагов соответствует рекомендациям [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) и [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html). Это учебный auth foundation, не готовый публичный deployment: rate limiting и аудит безопасности потребуют отдельной работы.

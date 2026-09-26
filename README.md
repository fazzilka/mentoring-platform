# Mentoring Platform

Учебная web-платформа для взаимодействия учеников и наставников. Ученик выбирает одного ментора, записывается на встречи и сохраняет приватные заметки. Наставник видит учеников, подтверждает заявки и управляет доступностью. Один пользователь может иметь обе роли.

## Лабораторная работа №1

**«Интерфейс приложения и каркас frontend».**

Frontend работает только на mock/demo-данных, без запросов к backend domain API. Изменения выполняются в demo adapter и сохраняются в localStorage. После Lab 3 интерфейс получает данные через узкие gateways, подключённые через React Context. Вход и регистрация имитируются, пароли не сохраняются — это не настоящая авторизация.

В репозитории присутствует backend предыдущего этапа. Он не изменяется в рамках Lab 1. Для демонстрации frontend не нужны backend, база данных и Docker.

### Запуск

Нужны Node.js 22+ и npm:

```bash
cd frontend
npm ci
npm run dev
```

Откройте <http://localhost:5173> и нажмите «Войти в демо». Можно также ввести любой корректный email и пароль от 8 символов или пройти demo-регистрацию. Обе роли доступны сразу; начальная роль при регистрации определяет первый экран.

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

Данные хранятся в текущем браузере под ключом `mentoring-lab-01-v1`. Для сброса удалите этот ключ через DevTools → Application → Local Storage и перезагрузите страницу. Если localStorage недоступен, приложение работает без сохранения после reload.

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

### Временный current-user stub

Полноценная авторизация отложена до Lab 4. В Lab 2 заголовок `X-Development-User-Id` явно выбирает существующего пользователя в `api/v1/development.py`. Он **не удостоверяет личность**, разрешён только при `ENVIRONMENT=local` или `test` и не подходит для публичного deployment. При замене на настоящую auth достаточно заменить `CurrentUserDep`; сервисы не знают о заголовке.

Seed создаёт двух пользователей с профилями и случайными, не публикуемыми password_hash; пароли для входа не выдаются. Повторный запуск не создаёт дублей и не перезаписывает пользовательские изменения:

- Student: `11111111-1111-4111-8111-111111111111`.
- Mentor: `22222222-2222-4222-8222-222222222222`.

В Swagger укажите UUID в поле заголовка каждого domain endpoint. Например:

```bash
curl http://localhost:8003/api/v1/mentors \
  -H 'X-Development-User-Id: 11111111-1111-4111-8111-111111111111'
```

JWT/refresh и Telegram endpoints прежнего этапа не подключены к приложению Lab 2. Существующие файлы более поздних лабораторных сохранены, но в этой работе не развиваются. Не запускайте Celery worker/beat для демонстрации Lab 2; достаточно PostgreSQL и uvicorn. Email, Telegram и Celery reminders не участвуют в domain API Lab 2.

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

Ошибки: `400` — неверный бизнес-ввод/нет development header, `403` — недостаточные права, `404` — запись отсутствует или недоступна пользователю, `409` — конфликт состояния, `422` — ошибка Pydantic-валидации. `401` появится с реальной auth в Lab 4.

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

**«Архитектура frontend и динамический интерфейс».** Все сценарии Lab 1 сохранены. Backend Lab 2 не подключён: никаких domain API запросов, JWT или доставки внешних уведомлений.

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

В Lab 5 реализацию адаптера можно заменить на API-backed gateway через параметр `GatewayProvider`, не меняя контракты форм и страниц. Это пока только граница замены, а не реализованный сетевой клиент. Ключ localStorage `mentoring-lab-01-v1` сохранён для совместимости с Lab 1.

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

Student/mentor routes проверяют доступность роли и соответствие UI режима. Прямой переход в другой раздел синхронизирует demo-режим с маршрутом, как в Lab 1; при отсутствии роли происходит redirect. Это навигационные guards, **не настоящая авторизация**. Вход по-прежнему имитируется.

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

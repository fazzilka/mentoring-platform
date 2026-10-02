.PHONY: setup infra-up infra-down migrate backend frontend test lint logs

setup:
	cd backend && uv sync --frozen
	cd frontend && npm ci

infra-up:
	docker compose up -d

infra-down:
	docker compose down

migrate:
	cd backend && uv run alembic upgrade head

backend:
	cd backend && uv run uvicorn src.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

test:
	cd backend && uv run pytest
	cd frontend && npm test

lint:
	cd backend && uv run ruff format --check .
	cd backend && uv run ruff check .
	cd backend && uv run mypy
	cd frontend && npm run lint
	cd frontend && npm run typecheck

logs:
	docker compose logs -f --tail=200

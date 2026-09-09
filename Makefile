SHELL := /bin/bash
.PHONY: setup dev down logs migrate seed test typecheck integration e2e mobile-check backup restore-check reset-db
setup:
	@test -f .env || cp .env.example .env
	docker compose build
	docker compose up -d
	docker compose run --rm migrate pnpm db:seed
	bash infrastructure/scripts/ddev-route.sh
dev:
	docker compose up -d --build
down:
	docker compose down
logs:
	docker compose logs -f --tail=100
migrate:
	docker compose run --rm migrate
seed:
	docker compose run --rm migrate pnpm db:seed
test:
	docker compose run --rm migrate pnpm test
typecheck:
	docker compose run --rm migrate pnpm typecheck
integration:
	docker compose run --rm migrate pnpm test:integration
e2e:
	bash infrastructure/scripts/browser-tests.sh
mobile-check:
	docker compose run --rm migrate sh -c 'pnpm --filter @aing/mobile typecheck && pnpm --filter @aing/mobile export'
backup:
	bash infrastructure/scripts/backup.sh
restore-check:
	bash infrastructure/scripts/restore-check.sh "$(FILE)"
reset-db:
	@echo 'This deletes only the AING application database and Redis volumes.'
	@read -r -p 'Type DELETE-AING to continue: ' answer; test "$$answer" = DELETE-AING
	docker compose down -v
	$(MAKE) setup

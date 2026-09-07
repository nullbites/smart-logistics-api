.PHONY: setup db-up db-down migrate seed test dev build package docker-build clean

setup:
	bash scripts/bootstrap.sh

db-up:
	docker compose up -d db

db-down:
	docker compose down

migrate:
	npx prisma migrate deploy

seed:
	npx prisma db seed

test:
	npm test

dev:
	npm run dev

build:
	npm run build

package: build
	bash scripts/package-release.sh

docker-build:
	docker build -t smart-logistics-api:local .

clean:
	rm -rf dist release coverage *.tar.gz

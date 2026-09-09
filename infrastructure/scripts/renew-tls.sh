#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
docker compose --env-file .env.production -f infrastructure/production/compose.yml --profile tls run --rm certbot renew --webroot -w /var/www/certbot --quiet
docker compose --env-file .env.production -f infrastructure/production/compose.yml exec -T nginx nginx -s reload

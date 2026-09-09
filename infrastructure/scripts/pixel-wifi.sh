#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
export AING_WIFI_HOST=${AING_WIFI_HOST:-192.168.1.30}
docker compose -f docker-compose.yml -f infrastructure/compose.wifi.yml up -d --no-deps nginx
curl --fail --silent --show-error "http://$AING_WIFI_HOST:8090/api/health"

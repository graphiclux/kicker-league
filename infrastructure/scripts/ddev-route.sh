#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
command -v mkcert >/dev/null
mkdir -p .local-certs
mkcert -cert-file .local-certs/anditsnogood.crt -key-file .local-certs/anditsnogood.key anditsnogood.ddev.site
# Keep source configuration in DDEV's global directory so DDEV restarts retain it.
mkdir -p "$HOME/.ddev/traefik/custom-global-config" "$HOME/.ddev/traefik/certs"
cp infrastructure/nginx/ddev-route.yaml "$HOME/.ddev/traefik/custom-global-config/anditsnogood.yaml"
cp .local-certs/anditsnogood.crt .local-certs/anditsnogood.key "$HOME/.ddev/traefik/certs/"
docker cp infrastructure/nginx/ddev-route.yaml ddev-router:/mnt/ddev-global-cache/traefik/config/anditsnogood.yaml
docker cp .local-certs/anditsnogood.crt ddev-router:/mnt/ddev-global-cache/traefik/certs/anditsnogood.crt
docker cp .local-certs/anditsnogood.key ddev-router:/mnt/ddev-global-cache/traefik/certs/anditsnogood.key

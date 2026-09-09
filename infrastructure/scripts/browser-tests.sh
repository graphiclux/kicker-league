#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
router_ip=$(docker inspect ddev-router --format '{{(index .NetworkSettings.Networks "ddev_default").IPAddress}}')
docker run --rm --network ddev_default --add-host "anditsnogood.ddev.site:${router_ip}" \
  -e TEST_IGNORE_HTTPS_ERRORS=true -e PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
  -v aing-playwright:/ms-playwright -v "$PWD:/workspace" -w /workspace \
  aing-migrate sh -c 'pnpm exec playwright install --with-deps chromium && pnpm test:e2e'

# Cloudflare Tunnel

This runs a named Cloudflare Tunnel in its own Compose project and forwards the public hostname to the existing Nginx gateway over Docker’s private `aing_default` network. Cloudflare provides HTTPS at the edge; Nginx continues routing `/api`, Socket.IO, and the Next.js website.

## One-time Cloudflare setup

In Cloudflare Zero Trust, create a **remotely managed tunnel** named `aing-local`, add a public hostname `aing.hostsites.me`, and set its service to `http://nginx:80`. Copy the tunnel token into the project’s ignored `.env.cloudflare` file:

```dotenv
CLOUDFLARE_TUNNEL_TOKEN=eyJ...
```

The Cloudflare account must manage the `hostsites.me` zone. The public hostname automatically creates or updates the DNS record; no port forwarding or router changes are needed.

Start it from the repository root:

```sh
docker compose -f docker-compose.yml -f infrastructure/cloudflare/compose.yml --env-file .env.cloudflare up -d cloudflared
```

Check it:

```sh
docker compose -f docker-compose.yml -f infrastructure/cloudflare/compose.yml --env-file .env.cloudflare logs --tail=50 cloudflared
curl -fsS https://aing.hostsites.me/api/health
```

The tunnel container uses the existing `nginx` service on `aing_default`; it does not expose another local port. Keep the app stack and this tunnel running on the Mac. For a hosted deployment, use the OVH production Compose stack instead of tunneling a laptop.

After the hostname is reachable, set these values in `.env` and recreate API/web so cookies, CORS, and mobile links use the public origin:

```dotenv
WEB_URL=https://aing.hostsites.me
CORS_ORIGINS=https://aing.hostsites.me
EXPO_PUBLIC_API_URL=https://aing.hostsites.me/api
EXPO_PUBLIC_SOCKET_URL=https://aing.hostsites.me
```

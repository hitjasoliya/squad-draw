# Squad Draw — Real-Time Collaborative Whiteboard

Squad Draw is a full-stack real-time collaborative drawing application built as a **three-service architecture** (`web`, `ws-server`, `auth-service`) running behind an **nginx reverse proxy** on a single **AWS EC2** instance via **Docker Compose**.

**Live demo**: [http://13.233.44.210](http://13.233.44.210) · **Repo**: [github.com/hitjasoliya/squad-draw](https://github.com/hitjasoliya/squad-draw)

Users create rooms, draw together on a shared whiteboard with live canvas sync and cursor tracking, manage memberships and roles, and chat in real time.

---

## 🏛 Architecture

```
                         Browser (same-origin httpOnly cookie: squad_session)
                                          │
                                 ┌────────▼─────────┐
                                 │ nginx (:80)      │  reverse proxy + WebSocket upgrade
                                 │  / → web:3000    │
                                 │  /socket.io/ → ws-server:8080
                                 └───┬───────────┬──┘
                          /api/auth/*│           │ WebSocket (same-origin /socket.io)
                              ┌──────▼─────┐   ┌───▼───────────┐
                              │ auth-service│  │ ws-server     │  Socket.IO 4.8.3
                              │ Express 5   │  │ Socket.IO     │  + @socket.io/redis-adapter
                              │ owns users  │  └───┬───────────┘
                              └──────┬──────┘      │
                                     │        ┌────▼─────┐
                             ┌───────▼────────▼──────────┐
                             │  Postgres 17 (Shared DB)  │
                             │  Redis 7 (adapter + rate  │
                             │  limits + token cache)    │
                             └───────────────────────────┘
```

### Services (zero shared code)

1. **`nginx`** — single entry point on port 80. Proxies the web app and `/socket.io/` to ws-server with WebSocket upgrade headers, so browsers talk to one origin; ports 3000/8080 are not exposed publicly.
2. **`web/` (Next.js 16 + React 19 + Turbopack)** — frontend, dashboard, dual-canvas whiteboard (RoughJS), responsive mobile UI (bottom toolbar, chat sheet, dashboard overview sheet), Zustand stores, stateless `proxy.ts` auth gate.
3. **`ws-server/` (Node 24 + Socket.IO 4.8.3)** — real-time engine: shapes, chat, presence, cursor tracking. `@socket.io/redis-adapter` for horizontal scaling, Postgres advisory-locked cleanup crons, stateless JWT handshake.
4. **`auth-service/` (Node 24 + Express 5)** — owns `users` writes: bcrypt hashing, 30-day HS256 JWTs with `users.token_version` revocation, Redis-backed rate limiting, `node-pg-migrate` migrations.

---

## 🚀 Features

- **Stateless JWT auth** — opaque `sessions` table removed; 30-day HS256 JWTs (`jose`) verified in `proxy.ts` with zero DB hits; single-active-token via `token_version`.
- **Real-time collaboration** — shapes, chat, presence, and cursors broadcast through Socket.IO rooms (Redis adapter ready for multi-node).
- **Dual-canvas rendering** — committed shapes on a static canvas, live preview on a dynamic canvas (RoughJS), pan/zoom viewport with world→screen cursor transform.
- **Responsive mobile UI** — tool bar becomes a scrollable bottom bar, chat opens as a sheet with scrim + Escape/click-outside close, room overview renders as a bottom sheet on the dashboard.
- **Self-healing room links** — joining is idempotent server-side and the room page joins on mount, so `/room/:id` works from any entry path (share links, typed URLs, address-bar copies); already-a-member is a no-op 200.
- **Single-write shape persistence** — every draw persists exactly once (fixed a bug that inserted each shape twice via WS + REST); WS is the real-time path, REST is the socket-down fallback.
- **Postgres advisory locks** — cleanup crons (30-day shapes, 3-day messages) never double-run across ws instances.
- **Redis-backed rate limiting** — auth endpoints, mutation routes, and WS handshakes.
- **JSONB shape storage** — Rough.js vector data lives in `shapes.data_from_rough_js`, read/written whole.

---

## 📁 Repository Layout

```
squad-draw/
├── web/              # Next.js 16 frontend + stores + canvas + API routes
├── ws-server/        # Socket.IO real-time server + Redis adapter
├── auth-service/     # Express 5 auth service + node-pg-migrate migrations
├── deploy/           # Dockerfiles ×3, docker-compose.yml, nginx.conf, ec2-setup.sh
├── docs/adr/         # ADR 0001 (3-service architecture), 0002 (stateless auth)
├── CONTEXT.md        # Domain glossary
└── PLAN.md           # Migration plan & settled decisions
```

---

## 🔑 Environment Variables

All secrets live in `deploy/.env` on the host; `docker-compose.yml` reads them. Examples in `deploy/.env.example`.

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `JWT_SECRET` | all | HS256 signing secret |
| `POSTGRES_USER/PASSWORD/DB` | postgres | Postgres credentials (random per deployment) |
| `DATABASE_URL` | services | `postgres://…` connection string |
| `REDIS_URL` | services | `redis://…` connection string |
| `AUTH_SERVICE_URL` | web | `http://auth-service:4000` (internal) |
| `NEXT_PUBLIC_WEBSOCKET_URL` | web (build-time) | WS origin; same-origin through nginx (`http://13.233.44.210`) |
| `NEXT_PUBLIC_BASE_URL` | web | public app URL |
| `ORIGIN_URL` | ws-server | allowed CORS origin |

---

## 🛠 Local Development

Prerequisites: Node 24+, pnpm 9+, Postgres 17, Redis 7.

```bash
git clone https://github.com/hitjasoliya/squad-draw.git
cd squad-draw

# envs
cp deploy/.env.example deploy/.env
cp deploy/.env.example web/.env.local
cp deploy/.env.example ws-server/.env
cp deploy/.env.example auth-service/.env

# install + migrate + run (three terminals)
pnpm install
pnpm -C auth-service migrate:up
pnpm -C auth-service dev        # :4000
pnpm -C ws-server dev           # :8080
pnpm -C web dev                 # :3000
```

For the real-time sync to work locally, point `web/.env.local` at your local ws-server:
`NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:8080`.

---

## 🐳 Docker Deployment (single EC2 box)

```
deploy/
├── docker-compose.yml    # postgres, redis, auth-service, ws-server, web, nginx
├── Dockerfile.web / .ws-server / .auth-service   # multi-stage node:24-alpine
├── nginx.conf            # :80 → web + /socket.io → ws-server (WS upgrade)
└── ec2-setup.sh          # one-shot: docker, 2GB swap, clone, .env, build, healthcheck
```

```bash
# fresh box (Ubuntu 22.04+/24.04+):
scp deploy/ec2-setup.sh ubuntu@<IP>:~/
ssh ubuntu@<IP> "bash ~/ec2-setup.sh"

# or rebuild/restart on an existing box:
ssh ubuntu@<IP>
cd squad-draw && cd deploy
docker compose up -d --build
```

**Recommended AWS layout**: `t4g.medium`/`c7i-flex.large` (2 vCPU / 4 GB), 20 GiB gp3, 2 GB swap, Elastic IP, security group: `22` (SSH, restrict to your IP) + `80` (nginx). 3000/8080/4000 stay closed — nginx is the only public door. The GitHub Actions workflow in `.github/workflows/deploy.yml` is currently disabled; deploys are done over SSH (`git pull`/rsync + `docker compose up -d --build`).

---

## 📄 License

[MIT License](LICENSE)

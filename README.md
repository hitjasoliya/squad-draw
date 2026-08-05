# Squad Draw — Scalable Real-Time Collaborative Whiteboard

Squad Draw is a production-grade, full-stack real-time collaborative drawing application designed as a **3-service decoupled architecture** (`web`, `ws-server`, and `auth-service`). Users can create rooms, collaborate on whiteboards with real-time canvas sync and cursor tracking, manage room memberships, and participate in group chat.

---

## 🏛 Architecture Overview

```
                        Browser (same-origin httpOnly cookie: squad_session)
                                           │
                              ┌────────────▼─────────────┐
                              │  web/ (Next.js 16)       │
                              │  API routes + proxy      │
                              └────┬───────────────┬─────┘
                     /api/auth/*   │               │ WebSocket (JWT token in cookie)
                           ┌───────▼─────┐    ┌────▼──────────┐
                           │ auth-service│    │ ws-server     │  Socket.IO 4.8.3
                           │ Express 5   │    │ Socket.IO     │  + @socket.io/redis-adapter
                           │ owns users  │    └────┬──────────┘
                           └───────┬─────┘         │
                                   │         ┌─────▼─────┐
                           ┌───────▼─────────▼───────────┐
                           │  Postgres 17 (Shared DB)    │
                           │  Redis 7 (Adapter + Limits  │
                           │  + token_version cache)     │
                           └─────────────────────────────┘
```

### Standalone Microservices (Zero Shared Code)

1. **`web/` (Next.js 16.3.0 + React 19 + Turbopack)**: Frontend UI, dashboard, whiteboard dual-canvas (RoughJS), client store (Zustand), stateless Next.js `proxy.ts` gate, and Redis token-bucket rate-limiting middleware for mutation routes. Reverse-proxies `/api/auth/*` traffic to `auth-service`.
2. **`ws-server/` (Node.js 24 + Socket.IO 4.8.3)**: Real-time event engine with `@socket.io/redis-adapter` for multi-node horizontal scaling, Postgres advisory-locked cleanup crons (`pg_try_advisory_lock`), and stateless zero-DB JWT handshake verification.
3. **`auth-service/` (Node.js 24 + Express 5)**: Dedicated authentication engine owning `users` table writes, password hashing (bcrypt), token version management, rate-limited auth routes, and DB schema migrations via `node-pg-migrate`.

---

## 🚀 Key Features & Performance Optimizations

- **Stateless JWT Auth (`users.token_version`)**: Opaque `sessions` table completely eliminated. Replaced with 30-day HS256 JWTs signed with `jose`. Single active device session enforcement is guaranteed by incrementing `users.token_version` on login/logout and checking against Redis `auth:tv:{userId}` cache.
- **Zero-Latency Middleware Proxy**: `web/src/proxy.ts` verifies JWT signatures statelessly in CPU using `jose` (<0.1ms), eliminating 100% of internal loopback HTTP fetches.
- **Stateless WS Handshake**: `ws-server` validates JWT signatures on connection with zero database queries.
- **Dual-Canvas Rendering Engine**: Separates committed vector shapes (`staticCanvasRef`) from active drawing previews and remote cursor overlays (`dynamicCanvasRef`), preserving a silky 60 FPS ($< 16\text{ms}$) interaction loop.
- **Horizontal WS Event Scalability**: `@socket.io/redis-adapter` synchronizes room presence, live cursor tracking, shape actions, and chat across distributed WebSocket instances via Redis Pub/Sub.
- **Postgres Advisory Locks (`pg_try_advisory_lock`)**: Prevents cron race conditions for periodic background data maintenance (message and shape cleanup) across multiple WS server replicas.
- **Redis-Backed Rate Limiting**: Distributed token-bucket limiters protect auth endpoints (signin 10/15m, signup 5/1h), mutation API routes (30/m), and WS connections (20/10m).
- **JSONB Vector Data Storage**: Rough.js vector parameters are stored directly inside PostgreSQL `JSONB` columns (`shapes.data_from_rough_js`), avoiding sparse relational table overhead.
- **Tuned Database Connection Pools**: Max connections configured per tier (web: 10, ws: 5, auth: 5) with a strict 5-second `statement_timeout`.

---

## 🔄 Architecture Evolution: V1 → V2 → V3

| Feature / Layer | Monorepo Prototype (V1) | Monorepo Optimization (V2) | Current Production Architecture (V3) |
| :--- | :--- | :--- | :--- |
| **Service Layout** | Monorepo (`turbo` / `pnpm-workspace`) | Monorepo (`apps/web`, `apps/ws-server`) | **3 Standalone Services** (`web`, `ws-server`, `auth-service`) |
| **Auth Strategy** | BetterAuth Framework | Database `sessions` table (opaque hex tokens) | **Stateless 30-day HS256 JWT + `token_version`** |
| **Auth Engine** | Embedded in Next.js API | Embedded in Next.js API | **Standalone `auth-service` (Express 5)** |
| **Frontend Stack** | Next.js 15 (webpack) | Next.js 15.3.5 | **Next.js 16.3.0 (Turbopack) + React 19** |
| **WS Handshake** | DB query against `sessions` table | DB query against `sessions` table | **Stateless JWT Signature Verification (`jose`)** |
| **WS Scaling** | Single-instance socket | Single-instance socket | **Socket.IO + `@socket.io/redis-adapter`** |
| **Background Crons** | Unlocked `setInterval` | Unlocked `setInterval` | **Postgres Advisory Locks (`pg_try_advisory_lock`)** |
| **Rate Limiting** | None | None | **Redis-backed Token Buckets** |
| **Deployment** | GCP VM (Nginx + PM2) | GCP VM (Nginx + PM2) | **AWS EC2 (Docker Compose + GitHub Actions)** |

---

## 📁 Repository Layout

```
squad-draw/
├── web/              # Next.js 16 frontend + Zustand stores + RoughJS canvas + API proxies
├── ws-server/        # Socket.IO 4.8.3 real-time collaboration server + Redis adapter
├── auth-service/     # Express 5 authentication service + node-pg-migrate migrations
├── deploy/           # Dockerfiles (x3) + docker-compose.yml + ec2-setup.sh + .env.example
├── docs/             # ADRs and baseline/post-migration smoke test logs
│   └── adr/          # ADR 0001 (3-Service Architecture) & ADR 0002 (Stateless Auth)
├── CONTEXT.md        # Domain glossary & Ubiquitous Language definitions
└── PLAN.md           # Architectural refactoring plan & settled engineering decisions
```

---

## 🔑 Environment Contract

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `JWT_SECRET` | All Services | Secret key used to sign and verify HS256 JWT tokens |
| `DATABASE_URL` | All Services | PostgreSQL 17 connection string (`postgres://user:pass@host:5432/dbname`) |
| `REDIS_URL` | All Services | Redis 7 connection string (`redis://host:6379`) |
| `AUTH_SERVICE_URL` | `web/` | Internal URL for web to proxy auth calls (`http://auth-service:4000`) |
| `NEXT_PUBLIC_WEBSOCKET_URL` | `web/` | Browser WebSocket URL for client connection (`http://localhost:8080`) |
| `NEXT_PUBLIC_BASE_URL` | `web/` | Browser public URL (`http://localhost:3000`) |
| `ORIGIN_URL` | `ws-server/` | Allowed CORS origin for WebSocket connections (`http://localhost:3000`) |

---

## 🛠 Local Development Setup

### Prerequisites
- **Node.js**: `>=24 LTS`
- **pnpm**: `9+`
- **PostgreSQL**: `17`
- **Redis**: `7`

### Running Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/hit-7624/squad-draw.git
   cd squad-draw
   ```

2. **Configure environment variables**:
   ```bash
   cp deploy/.env.example .env
   cp deploy/.env.example web/.env.local
   cp deploy/.env.example ws-server/.env
   cp deploy/.env.example auth-service/.env
   ```

3. **Install dependencies**:
   ```bash
   pnpm install
   ```

4. **Run DB Migrations**:
   ```bash
   cd auth-service
   pnpm migrate:up
   cd ..
   ```

5. **Start all services**:
   ```bash
   # Option A: Run services concurrently in separate terminals
   pnpm dev:auth  # Port 4000 (Express 5 Auth Service)
   pnpm dev:ws    # Port 8080 (Socket.IO Real-time Engine)
   pnpm dev:web   # Port 3000 (Next.js 16 Web Frontend)
   ```

6. **Build all services**:
   ```bash
   pnpm build
   ```

---

## 🐳 Docker & Single-EC2 Deployment

The application is containerized into multi-stage `node:24-alpine` Docker builds and orchestrated with Docker Compose.

### Running with Docker Compose
```bash
cp deploy/.env.example .env
docker compose -f deploy/docker-compose.yml up -d --build
```

### AWS EC2 Provisioning (`ec2-setup.sh`)
For single-command provisioning on an AWS EC2 instance (Ubuntu 24.04 LTS):
```bash
ssh -i ~/.ssh/your-key.pem ubuntu@<EC2_PUBLIC_IP>
bash deploy/ec2-setup.sh
```

### GitHub Actions Auto-Deploy
Pushes to `main` trigger `.github/workflows/deploy.yml` which SSHs into the AWS EC2 host, pulls code, rebuilds containers, and performs healthcheck verification.

---

## 📄 License
[MIT License](LICENSE)

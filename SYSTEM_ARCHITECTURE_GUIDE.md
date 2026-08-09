# SquadDraw — End-to-End System Architecture & Interview Guide

---

## 🏛️ 1. Executive Summary & Architecture Overview

SquadDraw is an enterprise-grade, real-time collaborative digital whiteboard platform engineered with a decoupled **Three-Service Microservice Architecture**. It separates static web application serving, stateless authentication operations, and stateful real-time WebSocket communication into dedicated, independently scalable backend applications fronted by an Nginx reverse proxy on an AWS EC2 instance.

### Architecture Map

```
                         Browser (Same-Origin HTTP-Only Cookie: squad_session)
                                          │
                                 ┌────────▼─────────┐
                                 │  Nginx Proxy     │  Port 80 (Only Public Entrypoint)
                                 │  / → web:3000    │  HTTP / WebSockets Protocol Upgrade
                                 │  /socket.io/ → ws│
                                 └───┬───────────┬──┘
                          /api/auth/*│           │ WebSockets (/socket.io/)
                             ┌──────▼─────┐   ┌──▼────────────┐
                             │auth-service│   │   ws-server   │  Socket.IO Engine
                             │ Express 5  │   │   Node.js 24  │  + Redis Pub/Sub Adapter
                             └──────┬─────┘   └──┬────────────┘
                                    │            │
                            ┌───────▼────────────▼──────┐
                            │   PostgreSQL 17 (Shared)  │  Data Persistence
                            │   Redis 7 (Shared Cache)  │  Adapter, Locks & Rate Limits
                            └───────────────────────────┘
```

### Core Design Philosophy
* **Decoupled Workloads**: High-frequency real-time drawing traffic does not block CPU-heavy password hashing or Next.js server-side rendering.
* **Shared Database, Zero Shared Code**: Database tables are shared across services, but each service operates as an independent node with zero imported code dependencies, enabling effortless multi-host distribution.
* **Single Entrypoint Security**: Only Nginx port 80 is exposed publicly. All microservices communicate over an isolated internal container network.

---

## 📦 2. Microservice Responsibilities

### Service 1: `web` (Frontend & Route Gateway)
* **Framework**: Next.js 16 (App Router), React 19, Turbopack, Tailwind CSS, Zustand.
* **Responsibilities**:
  * Renders application pages, user dashboards, and whiteboard room canvas interfaces.
  * Enforces edge-level route protection using Next.js Edge Middleware.
  * Houses the dual-canvas vector rendering engine.
  * Handles client-side real-time state synchronization via Zustand stores.

### Service 2: `auth-service` (Identity Provider)
* **Framework**: Express 5 on Node.js 24.
* **Responsibilities**:
  * Sole owner of write operations to the `users` PostgreSQL table.
  * Handles password hashing (`bcrypt`) and user verification.
  * Issues and validates 30-day stateless HS256 JWT tokens.
  * Enforces single active session management via integer token versions.
  * Implements Redis-backed fixed-window rate limiting for authentication routes.

### Service 3: `ws-server` (Real-Time Engine)
* **Framework**: Node.js 24 with Socket.IO 4.8.3.
* **Responsibilities**:
  * Manages persistent full-duplex WebSocket connections.
  * Performs stateless JWT cryptographic handshake verification.
  * Broadcasts live shapes, messages, and remote cursor positions across active room channels.
  * Uses `@socket.io/redis-adapter` for multi-node horizontal scaling.
  * Executes non-blocking background cleanup crons using PostgreSQL non-blocking advisory locks.

---

## 🔐 3. Authentication & Token Security Architecture

### Stateless JWT Verification
* Authentication is handled statelessly via an HTTP-Only, SameSite cookie named `squad_session`.
* Tokens are signed using the HS256 algorithm with a 30-day expiration window.
* Claims stored within the token payload:
  * `sub`: Unique User UUID.
  * `name`, `email`, `image`: Profile display metadata.
  * `tv`: Token Version integer counter.
* **Zero-DB Signature Validation**: Next.js edge middleware and the WebSocket server verify the token signature cryptographically without querying PostgreSQL, preserving sub-millisecond route transition performance.

### Single Active Session & Instant Token Revocation
* Each user record maintains a `token_version` integer in PostgreSQL.
* Upon sign-in or sign-out, the server increments `token_version` by 1 and caches the new value in Redis under `auth:tv:{userId}` with a 30-day Time-To-Live (TTL).
* During session checks, the server compares the `tv` claim stored inside the user's JWT payload against the active integer in Redis. If the values mismatch, the session is rejected immediately.
* This architecture grants instant token revocation across all devices without requiring a stateful database session table.

### Multi-Tier Rate Limiting
* Protects against brute-force attacks using Redis fixed-window counters:
  * **Signup Endpoint**: Maximum 5 attempts per IP per hour.
  * **Signin Endpoint**: Maximum 10 attempts per IP per 15 minutes.
  * **Session Endpoint**: Maximum 60 attempts per IP per minute.
  * **WebSocket Handshake**: Maximum 20 connection attempts per IP per 10 minutes.
* **Graceful Degradation**: Rate-limit middleware fails open if Redis experiences a connection outage, ensuring legitimate users retain system access.

---

## 🎨 4. Two-Canvas Rendering & Geometry Engine

### Static vs Dynamic Canvas Separation
Redrawing thousands of complex vector shapes on every mouse movement introduces severe rendering lag. SquadDraw solves this by splitting the whiteboard DOM into two stacked canvas layers:

```
               ┌────────────────────────────────────────────────────────┐
               │                  HTML Container Div                    │
               │  ┌──────────────────────────────────────────────────┐  │
               │  │ Static Canvas (Layer 0 - Background)             │  │
               │  │  - Holds all committed vector shapes.            │  │
               │  │  - Redrawn ONLY on viewport pan/zoom or WS event.│  │
               │  └──────────────────────────────────────────────────┘  │
               │  ┌──────────────────────────────────────────────────┐  │
               │  │ Dynamic Canvas (Layer 1 - Transparent Foreground)│  │
               │  │  - Holds active stroke / shape preview.          │  │
               │  │  - Cleared & redrawn on every 60 FPS drag frame. │  │
               │  └──────────────────────────────────────────────────┘  │
               └────────────────────────────────────────────────────────┘
```

### Coordinate Space Transformations
To ensure shapes render identically across varying client screen dimensions, resolution scale factors, and zoom levels, all shapes are persisted in **World Space**.

* **Screen Space to World Space Transformation**:
  $$\text{World}_X = \frac{\text{Screen}_X - \text{offsetX}}{\text{scale}}$$
  $$\text{World}_Y = \frac{\text{Screen}_Y - \text{offsetY}}{\text{scale}}$$

* **World Space to Screen Space Transformation**:
  $$\text{Screen}_X = \text{World}_X \cdot \text{scale} + \text{offsetX}$$
  $$\text{Screen}_Y = \text{World}_Y \cdot \text{scale} + \text{offsetY}$$

### Trigonometric Vector Calculations
* **Arrowhead Generation**: When drawing directional arrows, the engine computes the primary line angle using inverse tangent ($\text{atan2}$). Arrowhead wings are placed at positive and negative 30-degree angles ($\pi / 6$ radians) relative to the primary line vector.
* **Cursor-Centered Focal Zooming**: Plain viewport scaling zooms toward the top-left origin $(0,0)$, causing elements under the cursor to jump away. The engine adjusts horizontal and vertical pan offsets in proportion to cursor position during scale changes, locking the focal point under the user's cursor.

---

## ⚡ 5. Real-Time Synchronization & Distributed Operations

### Single-Write Shape Persistence Strategy
To eliminate duplicate database entries while maintaining instant local feedback:
1. When WebSockets are connected, shape completion triggers an emission over the socket connection. The WebSocket server persists the shape to PostgreSQL and broadcasts the new shape to all other clients in the room.
2. If WebSockets are disconnected, the client falls back to a REST API POST call, ensuring zero shape data loss during network degradation.

### Optimistic Chat Delivery
When a user sends a chat message:
1. The message payload is constructed locally with a client timestamp and immediately emitted over WebSockets to room participants for zero-latency rendering.
2. The server asynchronously writes the message row into PostgreSQL.

### Distributed Cleanup Crons with Non-Blocking Advisory Locks
* **Problem**: In a multi-node cluster, running scheduled background cleanup jobs (deleting 30-day-old shapes and 3-day-old chat messages) across multiple container instances causes duplicate query execution and database lock contention.
* **Solution**: Before executing deletions, the cron attempts to acquire a non-blocking PostgreSQL advisory lock (`pg_try_advisory_lock`). Exactly one server node acquires the lock and runs the query, while all other instances skip execution silently.

---

## 📡 6. Redis Pub/Sub & Multi-Node Horizontal Scaling

### Redis Pub/Sub Mechanics
* Redis Pub/Sub operates as an in-memory, zero-persistence messaging broker delivering sub-5-millisecond message delivery across cluster nodes.
* Because Redis subscriber connections enter a dedicated listening state that locks them out of standard data commands (`GET`, `SET`), Socket.IO initializes **two distinct Redis TCP connections**: a Publisher Client (`pubClient`) and a Subscriber Client (`subClient`).

### Horizontal WebSocket Cluster Scaling
1. User A connects to WebSocket Server Instance 1.
2. User B connects to WebSocket Server Instance 2.
3. User A draws a shape in Room 100.
4. Instance 1 publishes the event to Redis Pub/Sub on channel `socket.io#/#room-100#`.
5. Instance 2 receives the message via its subscriber client, identifies User B's active socket, and forwards the shape payload down User B's WebSocket connection.

---

## 🐳 7. DevOps, Infrastructure & Deployment

### Production Deployment Stack
* **Cloud Infrastructure**: Single AWS EC2 instance (Ubuntu LTS) with 2 GB configured Linux swap space to handle container compilation memory demands.
* **Reverse Proxy**: Nginx 1.27 listening on Port 80, proxying `/` to Next.js and upgrading `/socket.io/` connections to WebSockets.
* **Container Isolation**: Docker Compose orchestrating 6 isolated services (`postgres`, `redis`, `auth-service`, `ws-server`, `web`, `nginx`).

### Multi-Stage Docker Builds
* Next.js uses standalone build outputs in a multi-stage Alpine Dockerfile. Unneeded node modules and build-time tools are pruned from the final image, reducing image size by over 70%.

---

## 📈 8. Production Scaling Matrix

| Workload Target | Primary Scaling Bottleneck | System Scaling Action |
| :--- | :--- | :--- |
| **`web` Frontend** | CPU-bound Server-Side Rendering | Offload static assets to AWS CloudFront CDN / S3; auto-scale container instances behind an ALB. |
| **`auth-service`** | CPU-intensive `bcrypt` hashing | Offload password hashing to Node worker threads; implement PgBouncer database connection pooling. |
| **`ws-server`** | Linux File Descriptors & RAM | Enforce ALB sticky sessions; scale nodes horizontally using Redis Cluster Pub/Sub; tune OS `ulimit`. |
| **PostgreSQL Database** | Read query load | Implement Primary-Replica replication; route read queries (`SELECT shapes`) to Read Replicas. |
| **Redis Cache** | Single-core CPU limitations | Transition from standalone Redis to AWS ElastiCache Cluster Mode Enabled with Multi-AZ auto-failover. |

---

## 💡 9. Key Interview Talking Points

### System Architecture
> *"SquadDraw is designed as a three-service architecture: Next.js handles frontend rendering, Express manages user credentials, and Socket.IO handles WebSockets. By separating stateful real-time connections from HTTP APIs, drawing traffic never blocks page loads or authentication operations."*

### Performance Optimization
> *"To maintain 60 FPS drawing performance, we built a dual-canvas engine. Finished drawings live on a static background canvas and are only redrawn during viewport transformations. Active stroke previews live on a separate transparent foreground canvas that clears every frame."*

### Security & Authentication
> *"We use stateless 30-day HS256 JWT tokens checked at the edge without database hits. For instant token revocation upon logout or password resets, we maintain an integer token version counter in Redis that invalidates outdated JWT payloads instantly."*

### Scalability Strategy
> *"Our WebSocket cluster is horizontally scale-ready via `@socket.io/redis-adapter`. When multiple WebSocket servers run behind a load balancer, drawing events publish across Redis Pub/Sub channels to reach users connected to any server node seamlessly."*

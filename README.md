# ⚡ BriskRoute

<div align="center">
  <img src="https://user-images.githubusercontent.com/35027979/205498891-b75dc404-3232-4929-b216-823aa7373b71.png" alt="ElysiaJS Logo" width="280" />
  <p><h3>Edge-Native, Blazing-Fast High-Throughput API Gateway</h3></p>

  [![Bun Version](https://img.shields.io/badge/Bun-v1.3%2B-blue?logo=bun&logoColor=white&color=black)](https://bun.sh)
  [![Framework](https://img.shields.io/badge/Framework-ElysiaJS-red?logo=elysia&color=E65100)](https://elysiajs.com)
  [![Database](https://img.shields.io/badge/Database-SQLite-blue?logo=sqlite&logoColor=white&color=003B57)](https://sqlite.org)
  [![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
</div>

---

**BriskRoute** is a lightweight, zero-dependency infrastructure block designed to intercept, filter, authorize, and route massive traffic volumes with minimal memory allocation. Powered by **Bun** and **ElysiaJS**, it matches the performance of Go and FastAPI pipelines while preserving strict, end-to-end TypeScript safety.

## 🚀 Key Features

*   **Ultra-Fast Reverse Proxy:** Non-blocking connection proxying using optimized native `Bun.fetch()`.
*   **Longest Prefix Matching:** Dynamic route resolution backed by highly indexed embedded SQLite tables.
*   **Stateful Memory Buffering:** In-memory configuration seeding and token execution verification.
*   **Pre-emptive Rate Limiting:** High-speed IP tracking running directly on the connection layer before expensive auth parsing.
*   **Cryptographic Verification:** Sub-millisecond JWT decoding lifecycle attachments.

---

## 🗺️ Architectural Workflow

Every request hitting the entry gate traverses a strict non-blocking lifecycle pipeline:

```mermaid
graph TD
    %% Custom Styling
    classDef default fill:#1e1e2e,stroke:#cdd6f4,stroke-width:1px,color:#cdd6f4;
    classDef gate fill:#f9e2af,stroke:#fab387,stroke-width:2px,color:#11111b;
    classDef error fill:#f38ba8,stroke:#eba0ac,stroke-width:1px,color:#11111b;
    classDef success fill:#a6e3a1,stroke:#94e2d5,stroke-width:2px,color:#11111b;

    Client([ Inbound Client Request ]) --> Rate[STAGE 1: Rate Limiter <br> Check via Bun.cache]
    
    Rate -->|Limit Breached| E429[⚠️ 429 Too Many Requests]
    Rate -->|Pass| Auth[STAGE 2: Authentication <br> JWT Verified & Derived]
    
    Auth -->|Invalid Token| E401[🔒 401 Unauthorized]
    Auth -->|Verified| Route[STAGE 3: Route Resolution <br> Longest Prefix via SQLite]
    
    Route -->|No Match| E404[🚫 404 Not Found]
    Route -->|Resolved| Clean[STAGE 4: Header Stripping <br> Clear hop-by-hop footprints]
    
    Clean --> Forward[🚀 Native Fetch Forward]
    Forward --> Upstream[[ Upstream Microservice ]]

    %% Class Assigning
    class Rate,Auth,Route,Clean gate;
    class E429,E401,E404 error;
    class Forward,Upstream success;
```

---

## 🛠️ Tech Stack & Dependencies

*   **Runtime Engine:** Bun 1.3+ (Built on WebKit's JavaScriptCore)
*   **Web Standard:** ElysiaJS (TypeBox data validation ecosystem)
*   **Engine Storage:** Built-in `bun:sqlite` (Running WAL mode for safe concurrent performance)
*   **Encryption Engine:** `@elysiajs/jwt`

---

## 🏁 Quick Start

### Prerequisites
Verify that your machine is running a modern Bun runtime instance:
```bash
bun --version
```

### Installation
Instantly pull and link lockfile bindings without network bloating:
```bash
bun install
```

### Running Pipelines
Launch with hot-reload watch environments active for micro-service iteration:
```bash
bun run dev
```

Compile hooks and optimize memory profiles for high-performance production runtimes:
```bash
bun run start
```
The gateway listens at: `http://localhost:3000`

---

## ⚙️ Environment Variables

Tailor operational metrics via root environments or `.env` parameters:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Gateway listener port bound to the loopback. |
| `JWT_SECRET` | `replace-with-secure-secret` | Cryptographic signature validation key. |
| `DEFAULT_UPSTREAM` | `http://localhost:4000` | Automated fallback seed for the baseline `/api` routing prefix. |
| `BRISKTROUTE_DB_PATH` | `.data/briskroute.sqlite` | SQLite state storage node path (Automatically git-ignored). |
| `RATE_LIMIT_WINDOW_MS`| `60000` | Sizing block for traffic window calculations. |
| `RATE_LIMIT_MAX` | `120` | Threshold of maximum allowed atomic queries within window. |

---

## 📡 Operational Control Interface

### 1. Gateway Verification
```bash
curl http://localhost:3000/_gateway/health
```
**Response (`200 OK`):**
```json
{
  "status": "ok",
  "service": "BriskRoute"
}
```

### 2. Runtime Dynamic Route Registration
Registers an explicit routing map inside the state engines instantly:
```bash
curl -X POST http://localhost:3000/_gateway/routes \
  -H 'content-type: application/json' \
  -d '{"prefix":"/api","target":"http://localhost:4000"}'
```
**Response (`201 Created`):**
```json
{
  "prefix": "/api",
  "target": "http://localhost:4000"
}
```

> **Prefix Resolution Engine:** Routing applies a strict longest-prefix strategy. If `/api` maps to server A, and `/api/users` maps to server B, an incoming request targeting `/api/users/profile` is cleanly isolated and mapped directly to server B.

---

## 🔒 Security & Boundary Control

### Header Cleansing Strategy
To prevent architectural footprint leakages and protect internal networks, the proxy engine automatically scrubs hop-by-hop bindings from outgoing streams:
*   `connection`, `keep-alive`, `te`, `trailer`
*   `proxy-authenticate`, `proxy-authorization`
*   `transfer-encoding`, `upgrade`, `host`

### Token Requirements
Endpoints mounted past root validation require authentic Bearer headers:
```text
Authorization: Bearer <jwt_payload_token>
```
Claims are parsed to guarantee state parameters match:
```json
{
  "sub": "user-id-string",
  "scope": "optional-authorization-scope"
}
```

---

## 📊 Performance Benchmarks

Conducted locally using `autocannon` targeting loopback adapters.
*   **Engine Specs:** Bun `1.3.14-canary.1` (Single process allocation, SQLite WAL engine active, Rate-limiting lifted to avoid active test interference).

### 📈 Throughput Profiles (Higher is Better)

| Target Pipeline | Concurrency | Pipeline | Requests / Second | Visual Distribution |
| :--- | :---: | :---: | :---: | :--- |
| **Direct Target Upstream** (`/health`) | 100 | 10 | **11,176 rps** | `🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵` |
| **Gateway Native Diagnostics** (`/_gateway/health`) | 100 | 10 | **5,014 rps** | `🔵🔵🔵🔵🔵🔵` |
| **Authenticated Proxy** (`/api/health`) | 10 | 1 | **11,857 rps** | `🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢` |
| **Authenticated Proxy** (`/api/health`) | 50 | 1 | **12,387 rps** | `🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢` |
| **Authenticated Proxy** (`/api/health`) | 100 | 1 | **12,158 rps** | `🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢` |

### ⏱️ P99 Latency Distributions (Lower is Better)

| Target Pipeline | Concurrency | P99 Tail Latency | Visual Latency Bar |
| :--- | :---: | :---: | :--- |
| **Direct Target Upstream** (`/health`) | 100 | **105.00 ms** | `🟡🟡🟡🟡🟡🟡🟡` |
| **Gateway Native Diagnostics** (`/_gateway/health`) | 100 | **228.00 ms** | `🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴` |
| **Authenticated Proxy** (`/api/health`) | 10 | **2.00 ms** | `🟢` |
| **Authenticated Proxy** (`/api/health`) | 50 | **8.00 ms** | `🟢` |
| **Authenticated Proxy** (`/api/health`) | 100 | **16.00 ms** | `🟢🟢` |

> **Systems Engineering Finding:** Pipelined proxy tasks with `-p 10` introduced internal thread queuing over loopback adapters. Standard keep-alive operations sustain an exceptional `~12,000 rps` threshold with tail latency effectively capped below `16 ms` under high concurrency.

---

## 🛡️ Compilation & Structural Assurance

Ensure full production reliability before deployment pipelines execute:

```bash
bun run typecheck       # Enforce strict TypeScript compilation checks
bun test                # Run unit suites verifying prefix resolution blocks
```

---

## 📂 Project Component Schema

```text
src/
├── config/
│   ├── database.ts        # Database instantiation and WAL configuration
│   └── database.test.ts   # Integrity suites for index validation
├── plugins/
│   ├── auth.ts            # Fast cryptographic validation token parsing
│   └── rateLimit.ts       # Connection-level safety gate tracking
├── routes/
│   └── proxy.ts           # Reverse routing and header scrubbing controls
└── index.ts               # Core execution hook
scripts/
├── jwt-token.ts           # Token generation helpers for load simulations
└── upstream.ts            # High-speed echo environment for benchmarking
```

---
*Built with speed, safety, and modern runtime architecture.*
# Low-Code API Orchestration Platform

A configuration-driven platform for exposing REST APIs that validate incoming
requests, invoke one or more downstream vendor APIs, transform/merge the
results, and return a standardized response — all defined through JSON
configuration, with **no code changes** required to add a new integration.

## Why this exists

Modern enterprises integrate with many third-party APIs (banks, KYC/KYB
providers, payment gateways, government systems). Hand-writing and maintaining
bespoke integration code for every provider doesn't scale. This platform lets
you describe an integration once, as data, and the engine executes it.

## Core concept

You define a **workflow config**: an HTTP method + path, an optional request
JSON Schema, an ordered list of **steps** (each a downstream HTTP call with
request/response field mappings and an optional condition), and a final
**response mapping**. The platform:

1. Matches an incoming request to a workflow config by method + path.
2. Validates the request body against the config's JSON Schema.
3. Runs each step in order — skipping steps whose `condition` isn't met,
   mapping fields from the running execution context into the vendor payload,
   calling the vendor over HTTP (with timeout + retry/backoff), and mapping
   the vendor's response back into the execution context under `steps.<name>`.
4. Builds the final response via the config's `response.mapping`, drawing from
   `body`, `query`, `params`, and any `steps.<name>.<field>` produced above.

New/updated/deleted configs take effect immediately via the admin API — no
server restart.

## Architecture

```
                          ┌─────────────────────┐
                          │      Express app      │
                          └──────────┬────────────┘
                                     │
     ┌───────────┬───────────────┬──┴───────┬──────────────┐
     │           │               │          │              │
  public/    /admin/apis      /mock/*   dynamicRouter   requestLogger,
 (web UI,   (CRUD + test    (mock       (catch-all:     rateLimiter,
  static)    run, ajv        vendor      match config    errorHandler
             validation)     endpoints)  by method+path) (cross-cutting)
                 │                            │
                 ▼                            ▼
      ┌─────────────────────┐      ┌─────────────────────┐
      │   workflowRegistry    │◄────│   requestValidator    │
      │  (in-memory map,       │     │  (ajv, per-config      │
      │   backed by config/*   │     │   request schema)      │
      │   JSON files)          │     └───────────┬────────────┘
      └────────────────────────┘                 │
                                                   ▼
                                     ┌───────────────────────────┐
                                     │    orchestrator/executor    │
                                     │  for each step:               │
                                     │   evaluate condition           │
                                     │   → fieldMapper (request)      │
                                     │   → vendorClient (retry)       │
                                     │   → fieldMapper (response)      │
                                     │  then final response mapping    │
                                     └──────────────────────────────────┘
```

Layers (`src/`):

| Layer | Responsibility |
|---|---|
| `domain/` | `WorkflowConfig` types + the JSON Schema that validates a config document itself |
| `config-store/` | File-based persistence (`config/*.json`) + in-memory registry keyed by `METHOD path` and by `id` |
| `validation/` | ajv-based validators — one for incoming request payloads (per-config schema), one for workflow configs themselves |
| `mapping/` | Dot-path field mapper (`get`/`set`) with `default` values and named `transform`s (`toUpperCase`, `toNumber`, ...); pluggable via `registerTransform` |
| `http-client/` | axios-based vendor client (auth header injection, `${ENV_VAR}` interpolation, timeout) + exponential-backoff retry (5xx/network errors only — 4xx are treated as valid business responses) |
| `orchestrator/` | The execution engine: runs steps in order, evaluates `condition`s against the running context, applies field mappings, honors per-step `onError: fail\|continue` |
| `dynamic-router/` | Single Express middleware that looks up a config by method+path and runs it |
| `admin-api/` | CRUD API (`/admin/apis`) to define/list/update/delete workflow configs, guarded by an API key |
| `mock-vendors/` | In-process mock vendor endpoints (PAN, GST, Aadhaar, profile, OCR, fraud, face-match) so the sample configs run end-to-end with no real third parties |
| `middleware/` | Standardized response envelope, centralized error handler, request/trace logging, auth (API key / JWT) enforcement for generated endpoints, rate limiting |
| `docs/` | OpenAPI spec for the static surface (health, admin API), served via Swagger UI at `/docs` |
| `public/` | A static single-page web UI (vanilla JS, no build step) served directly by Express — dashboard, visual workflow editor, config viewer, and a test console. See [Web UI](#web-ui) below. |

## Getting started

```bash
npm install
npm run dev        # starts on http://localhost:3000 (ts-node-dev, auto-reload)
```

Open `http://localhost:3000/` for the visual workflow editor/dashboard, or
`http://localhost:3000/docs` for the API reference.

Other scripts: `npm run build` (compile to `dist/`), `npm start` (run compiled
output), `npm test` (Jest unit + integration suite), `npm run lint`.

Environment variables (all optional, sensible defaults for local dev):

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `CONFIG_DIR` | `./config` | Where workflow config JSON files are read/written |
| `ADMIN_API_KEY` | `dev-admin-key` | Required `x-api-key` header for `/admin/apis/*` and for workflows with `auth.type: "apiKey"` |
| `JWT_SECRET` | `dev-jwt-secret` | Verifies bearer tokens for workflows with `auth.type: "jwt"` |
| `RATE_LIMIT_PER_MINUTE` | `300` | Global per-IP rate limit |
| `LOG_LEVEL` | `info` | pino log level |
| `SELF_BASE_URL` | `http://localhost:$PORT` | Used by the sample configs to reach the in-process mock vendors; a real deployment points each step's `vendor.baseUrl` at the actual third-party API instead |

## Defining a new API (no code required)

`POST /admin/apis` (with header `x-api-key: <ADMIN_API_KEY>`) with a body like:

```json
{
  "id": "verify-pan",
  "version": 1,
  "method": "POST",
  "path": "/verify-pan",
  "auth": { "type": "none" },
  "request": {
    "schema": {
      "type": "object",
      "required": ["pan"],
      "properties": { "pan": { "type": "string", "pattern": "^[A-Z]{5}[0-9]{4}[A-Z]$" } }
    }
  },
  "steps": [
    {
      "name": "verifyPan",
      "type": "http",
      "vendor": {
        "baseUrl": "https://vendor-a.example.com",
        "method": "POST",
        "path": "/verify",
        "auth": { "type": "apiKey", "headerName": "x-api-key", "value": "${VENDOR_A_KEY}" },
        "timeoutMs": 3000,
        "retry": { "attempts": 3, "backoffMs": 200 }
      },
      "requestMapping": [{ "from": "body.pan", "to": "pan" }],
      "responseMapping": [
        { "from": "body.status", "to": "panStatus" },
        { "from": "body.name", "to": "panName" }
      ]
    },
    {
      "name": "fetchGst",
      "type": "http",
      "condition": { "field": "steps.verifyPan.panStatus", "equals": "VALID" },
      "vendor": {
        "baseUrl": "https://vendor-b.example.com",
        "method": "POST",
        "path": "/gst"
      },
      "requestMapping": [{ "from": "body.pan", "to": "pan" }],
      "responseMapping": [{ "from": "body.gstin", "to": "gstin" }]
    }
  ],
  "response": {
    "mapping": [
      { "from": "steps.verifyPan.panStatus", "to": "panStatus" },
      { "from": "steps.fetchGst.gstin", "to": "gst.gstin" }
    ]
  }
}
```

`POST /verify-pan` is live immediately — no restart, no deploy.

Full field reference and validation rules: [`src/domain/workflowConfig.ts`](src/domain/workflowConfig.ts) / [`src/domain/workflowConfigSchema.ts`](src/domain/workflowConfigSchema.ts).

There's also a "test run" endpoint that executes a workflow without going
through its public route or auth, and returns the response plus a per-step
execution trace — this is what the Test Console (below) uses:

```bash
curl -X POST http://localhost:3000/admin/apis/verify-pan/test \
  -H 'x-api-key: dev-admin-key' -H 'Content-Type: application/json' \
  -d '{"pan":"ABCDE1234F"}'
```
```json
{
  "success": true,
  "traceId": "...",
  "data": {
    "response": { "panStatus": "VALID", "panName": "SAMPLE NAME", "gst": { "...": "..." } },
    "stepLogs": [
      { "name": "verifyPan", "skipped": false, "status": "ok", "durationMs": 9 },
      { "name": "fetchGst", "skipped": false, "status": "ok", "durationMs": 2 }
    ]
  }
}
```

## Web UI

A visual workflow editor is bundled at `http://localhost:3000/` — a static,
build-free vanilla-JS SPA (`public/`) served directly by Express, that drives
the admin API (`src/admin-api/`):

| View | Route | What it does |
|---|---|---|
| Dashboard | `#/` | Lists all registered workflows with summary stats |
| Editor | `#/editor`, `#/editor/:id` | Form-driven builder for a `WorkflowConfig` — auth, request schema, ordered steps (vendor call, request/response field mappings, condition, retry, `onError`), and the final response mapping. Produces the exact JSON shape `POST /admin/apis` expects, then creates or updates via the admin API |
| Viewer | `#/view/:id` | Read-only workflow detail page with a rendered step-by-step flow diagram |
| Test Console | `#/console`, `#/console/:id` | Picks a workflow, sends a sample request body against `POST /admin/apis/:id/test`, and displays the response alongside per-step execution logs |

## Example use cases (bundled as sample configs)

All three examples from the assignment spec are included as ready-to-run
configs in [`config/`](config/), wired against the mock vendors in
[`src/mock-vendors/routes.ts`](src/mock-vendors/routes.ts):

### 1. `POST /verify-pan` — [`config/verify-pan.json`](config/verify-pan.json)
Verify PAN via Vendor A; if valid, fetch GST details from Vendor B.

```bash
curl -X POST http://localhost:3000/verify-pan -H 'Content-Type: application/json' \
  -d '{"pan":"ABCDE1234F"}'
```
```json
{
  "success": true,
  "traceId": "...",
  "data": {
    "panStatus": "VALID",
    "panName": "SAMPLE NAME",
    "gst": { "gstin": "29ABCDE1234F1Z5", "legalName": "SAMPLE BUSINESS PVT LTD", "filingStatus": "ACTIVE" }
  }
}
```

### 2. `POST /validate-aadhaar` — [`config/validate-aadhaar.json`](config/validate-aadhaar.json)
Validate Aadhaar via Vendor A; if successful, fetch profile from Vendor B and merge.

```bash
curl -X POST http://localhost:3000/validate-aadhaar -H 'Content-Type: application/json' \
  -d '{"aadhaar":"123456789012"}'
```
```json
{
  "success": true,
  "traceId": "...",
  "data": {
    "aadhaarStatus": "VALID",
    "profile": { "name": "SAMPLE PERSON", "dob": "1990-01-01", "address": "Sample Address, IN" }
  }
}
```

### 3. `POST /onboard` — [`config/onboard.json`](config/onboard.json)
OCR extract → fraud check → face match → aggregate result.

```bash
curl -X POST http://localhost:3000/onboard -H 'Content-Type: application/json' \
  -d '{"documentId":"doc-123"}'
```
```json
{
  "success": true,
  "traceId": "...",
  "data": {
    "name": "SAMPLE PERSON",
    "documentType": "PASSPORT",
    "ocrConfidence": 0.97,
    "riskLevel": "LOW",
    "faceMatchPassed": true
  }
}
```

## Standardized response format

Success: `{ "success": true, "traceId": "...", "data": { ... } }`
Error: `{ "success": false, "traceId": "...", "error": { "code": "...", "message": "...", "details": [...] } }`

Every response carries an `x-trace-id` header / `traceId` field (propagated
from an inbound `x-trace-id` header if present) that also tags the structured
pino logs for that request, including a per-step execution log
(`{ name, skipped, status, durationMs, error? }`) — useful for tracing a
multi-vendor call chain end-to-end.

## Error handling

- **Request validation failures** → `400 VALIDATION_ERROR` with field-level details, before any vendor is called.
- **Invalid workflow config** (on create/update, or a malformed file at startup) → `400`/skipped-with-log, respectively — validated against the config JSON Schema.
- **Vendor 4xx** responses are treated as legitimate business data (e.g. "PAN invalid") and flow into `responseMapping` normally.
- **Vendor 5xx / network errors** are retried with exponential backoff per the step's `retry` config; once exhausted, the step fails.
- **A failed step** either fails the whole request (`502 UPSTREAM_STEP_FAILED`, the default) or is skipped and logged (`onError: "continue"`), depending on the step's policy.

## Auth & rate limiting

- `/admin/apis/*` always requires `x-api-key: <ADMIN_API_KEY>`.
- Generated endpoints can set `auth: { type: "none" | "apiKey" | "jwt" }` per workflow.
- A global rate limiter caps requests per IP per minute (`RATE_LIMIT_PER_MINUTE`).

## API docs

Interactive Swagger UI at `GET /docs` (covers `/health` and the admin API;
generated endpoints are configured at runtime and documented generically in
this README rather than enumerated in the static spec).

## Docker

```bash
docker compose up --build
```

Runs the platform (and its in-process mock vendors) on `:3000`, with `./config`
mounted so workflow configs persist outside the container. Not yet verified
against a live Docker build — review the [`Dockerfile`](Dockerfile) /
[`docker-compose.yml`](docker-compose.yml) if you rely on it in CI.

## Tests

```bash
npm test
```

- **Unit**: field mapper (dot-path get/set, defaults, transforms), condition
  evaluator, retry/backoff (retryable vs. non-retryable errors), workflow
  config schema validation, and the executor (sequential steps, conditional
  skip, response merge, `onError: continue`) — all mocked at the HTTP layer
  with `nock`.
- **Integration**: a real listening server exercising all three example
  workflows end-to-end against the in-process mock vendors, plus the admin
  CRUD lifecycle (create → immediately callable → update semantics → delete →
  404), via `supertest`.


## Bonus features implemented

- **Visual workflow editor** — see [Web UI](#web-ui) above (`public/`)
- Swagger/OpenAPI docs (`/docs`)
- API Key (admin + per-workflow) and JWT (per-workflow) auth
- Rate limiting
- Docker + docker-compose

## Not implemented (out of scope for this pass)

Real versioned/rollback-able workflow configs (a `version` field exists on
`WorkflowConfig` but isn't currently read or enforced anywhere), a metrics
endpoint, Kubernetes manifests, CI/CD pipeline, plugin architecture,
webhooks, scheduled execution, response caching, parallel step execution,
path-parameter routing. The step/mapping/registry abstractions were designed
so most of these could be added incrementally without a rewrite.

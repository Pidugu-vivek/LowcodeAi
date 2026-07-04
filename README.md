# Low-Code API Orchestration Platform

A configuration-driven platform that lets you expose REST APIs by describing
them in YAML/JSON — request validation, downstream vendor calls, field
mapping, conditional execution, retries, and response shaping — without
writing integration code.

## Status

Project scaffold in progress. See commit history for phase-by-phase build-out.

## Stack

- Node.js + TypeScript, Express
- Zod (config schema) + Ajv (request payload validation)
- Axios (downstream HTTP calls)
- Pino (structured logging)
- Swagger UI (API docs)
- Jest + Supertest (tests)
- Docker

## Development

```bash
npm install
npm run dev     # start with hot reload
npm run build    # compile to dist/
npm start        # run compiled server
npm test         # run test suite
```

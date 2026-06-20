# Spur Chat Agent

A mini AI customer-support chat widget for a fictional e-commerce store ("Example Store"), built as a take-home assignment. The backend is a Node.js + TypeScript + Express API backed by SQLite via `better-sqlite3`; the frontend is a SvelteKit (Svelte 5 runes) single-page app; Google Gemini powers the LLM responses.

---

## How to run it locally

### Prerequisites

- **Node.js 18 or later** (developed and tested on v26). Run `node --version` to check.
- **A free Gemini API key** — get one at [https://aistudio.google.com](https://aistudio.google.com) → "Get API key". No credit card required; the Gemini API has a genuinely free tier.

> **Note on API key format:** Generate a standard API key from AI Studio (it should start with `AIza`). Keys with an `AQ.` prefix are a newer format that the current `@google/genai` SDK does not accept — if a key you generated doesn't work, generate a new one from the same page.

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Open .env and set GEMINI_API_KEY=<your key>
npm run migrate   # creates the SQLite DB and applies schema migrations
npm run seed      # populates FAQ knowledge (safe to re-run)
npm run dev       # starts the Express server on http://localhost:3001
```

### Frontend (second terminal)

```bash
cd frontend
npm install
npm run dev       # starts the Vite dev server on http://localhost:5173
```

Open **http://localhost:5173** in your browser. The frontend talks to the backend at `http://localhost:3001` by default. To point it at a different backend, set `VITE_API_BASE_URL` in a `frontend/.env` file before running `npm run dev`.

---

## Database setup

Migrations live in `backend/src/db/migrations/` as plain numbered `.sql` files (`001_init.sql`, `002_faqs.sql`, …). The migration runner (`backend/src/db/migrate.ts`, invoked by `npm run migrate`) creates a `schema_migrations` table on first run and records each filename after applying it — so the command is safe to re-run at any time and only applies files that haven't been applied yet.

`npm run seed` runs `backend/src/db/seed.ts`, which deletes all existing FAQ rows and re-inserts 12 entries across five topics (shipping, orders, returns, payments, support) in a single transaction. It is idempotent by design — re-running it resets FAQ content to the canonical seed state without needing to wipe the whole database.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `PORT` | Port the Express server listens on | `3001` |
| `NODE_ENV` | Runtime environment (`development` / `production` / `test`) | `development` |
| `DATABASE_PATH` | Path to the SQLite file; parent directory is created automatically | `./data/spur_chat.db` |
| `GEMINI_API_KEY` | Your Google Gemini API key — **required, no default** | — |
| `GEMINI_MODEL` | Gemini model used for chat responses | `gemini-2.5-flash` |
| `LLM_MAX_TOKENS` | Maximum tokens in a single LLM response | `400` |
| `LLM_TIMEOUT_MS` | Milliseconds before an LLM request is aborted | `15000` |
| `MAX_MESSAGE_LENGTH` | Maximum characters accepted in a user message (longer messages are truncated, not rejected) | `2000` |
| `MAX_HISTORY_MESSAGES` | How many past messages to include as context in each LLM call | `20` |
| `CORS_ORIGINS` | Comma-separated list of allowed CORS origins | `http://localhost:5173` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend API | `http://localhost:3001` |

The frontend has no `.env.example` because `VITE_API_BASE_URL` is the only variable and the default is hardcoded as a fallback in `frontend/src/lib/api.ts`. Create `frontend/.env` and set it only when deploying to a non-local backend.

---

## Architecture overview

```
HTTP request
    │
    ▼
chat.routes.ts          (Express Router — validates input, mounts middleware)
    │
    ▼
chat.controller.ts      (reads validated req, writes res — no business logic)
    │
    ▼
conversation.service.ts (core orchestration: resolve/create conversation,
    │                    persist messages, build history, call LLM, handle errors)
    ├── knowledge.service.ts   (fetches FAQs from DB, formats into prompt block)
    └── llm/
        ├── llm.service.ts     (builds system prompt, calls provider)
        ├── llm.provider.ts    (LlmProvider interface + LlmError class)
        └── gemini.provider.ts (implements LlmProvider using @google/genai)
            │
repositories/           (thin data-access layer — SQL only, no business logic)
    ├── conversation.repository.ts
    ├── message.repository.ts
    └── faq.repository.ts
            │
db/                     (better-sqlite3 client, migration runner, seed script)
```

### Why the LlmProvider interface?

`llm.provider.ts` defines a `LlmProvider` interface with a single method: `generateReply(params)`. The concrete provider is instantiated in one place at the top of `llm.service.ts`:

```ts
const provider: LlmProvider = new GeminiProvider();
```

This is the only line you change to swap providers. During development, the project started with an `AnthropicProvider` implementing the same interface. Switching to Gemini meant writing `gemini.provider.ts` and changing that one line — no other file in the stack was touched. That's not a theoretical benefit; it happened.

### Why is there a `channel` column on `conversations`?

The `conversations` table has a `channel TEXT NOT NULL DEFAULT 'web'` column. It's not used for anything today — all conversations come through the chat widget and are stored as `'web'`. It's there as a pre-built extension point: plugging in a WhatsApp or Instagram channel adapter later only requires setting `channel` when creating the conversation row. No schema migration needed at that point.

### Why are FAQs stored in the database instead of hardcoded in the prompt?

The system prompt injects FAQ content by calling `faqRepository.findAll()` on every request. This means:

- Updating FAQ answers requires re-running `npm run seed`, not deploying new code.
- An admin UI (not built yet) could edit FAQ rows and have the changes take effect on the next request without any deployment.
- The knowledge base stays separate from the prompt logic, so the two can evolve independently.

---

## LLM integration notes

**Provider and model:** Google Gemini via `@google/genai`. The model defaults to `gemini-2.5-flash` and is configurable via `GEMINI_MODEL`.

**System prompt construction** (`llm.service.ts`): A static base prompt defines the agent persona — a concise, friendly support agent for Example Store, instructed to use FAQ knowledge for accuracy, admit when it doesn't know something rather than inventing policy, and redirect unrelated requests (e.g. "write me code") back to support topics. On every request, `getKnowledgeBasePrompt()` fetches all FAQ rows from the database and formats them as a markdown block grouped by topic, which is appended to the base prompt. The combined string is passed to Gemini as `systemInstruction`.

**Conversation history:** The last `MAX_HISTORY_MESSAGES` messages are fetched chronologically, with the newest user message excluded (it's passed as the `userMessage` parameter, not as history). The app stores sender as `'user'` or `'ai'`; Gemini's API uses `'user'` and `'model'`. The mapping is applied in `gemini.provider.ts` when building the `contents` array.

**Guardrails in place:**

| Guardrail | Mechanism |
|---|---|
| Max output length | `maxOutputTokens` in Gemini request config (default: 400 tokens) |
| Request timeout | `httpOptions.timeout` in Gemini request config (default: 15 000 ms) |
| Long input messages | Truncated to `MAX_MESSAGE_LENGTH` characters in `conversation.service.ts` — the user gets a note appended to the reply informing them |
| LLM failures | Caught in `conversation.service.ts`; each `LlmError.kind` (`auth`, `rate_limit`, `timeout`, `invalid_request`, `unknown`) maps to a distinct friendly message returned to the client — the real error is logged server-side only |
| Unhandled rejections | `process.on('unhandledRejection')` and `process.on('uncaughtException')` log rather than crash, as a backstop behind the Express error handler |

---

## Trade-offs and what I'd do with more time

**No automated tests.** There are no unit or integration tests. The service and repository layers are structured to be testable (pure functions, explicit dependencies), but no test suite exists. I'd add integration tests for the repository layer against a real SQLite in-memory database, and unit tests for `conversation.service.ts` with a mock `LlmProvider`.

**No streaming.** Replies come back as one complete JSON object once the Gemini call finishes. The pending-bubble UI already exists on the frontend (the three-dot typing indicator), so plugging in server-sent events or a streaming fetch would be mostly a backend and `api.ts` change. I'd do this next — a 5-second blank wait before any text appears is a meaningful UX gap.

**No API-layer rate limiting.** There's no per-IP or per-session rate limiting in the Express layer. The Gemini free tier has its own limits, but a bad actor could exhaust them. I'd add a lightweight token-bucket or sliding-window rate limiter (e.g. `express-rate-limit`) on the `/chat/message` route.

**SQLite on ephemeral hosting.** The SQLite database is a local file (`./data/spur_chat.db`). Render's free tier uses ephemeral storage — the file may not survive a redeploy or instance restart. For this demo that's acceptable; for anything production-facing I'd switch to a hosted Postgres instance (Neon or Supabase both have free tiers) and update the repository layer accordingly.

**No FAQ admin UI.** FAQ content is managed entirely through `npm run seed`. Updating a single answer requires editing `seed.ts` and re-running the script, which also resets all other FAQs. A simple CRUD admin route (protected by a secret header or basic auth) would be a better interface.

**Provider switch during development.** The project was initially built against Anthropic Claude. The switch to Gemini was a real decision made during development: Anthropic's API requires phone verification to activate even a free trial, which adds friction for anyone trying to run this submission. Gemini's free tier requires only a Google account. The `LlmProvider` interface made the switch a one-file addition (`gemini.provider.ts`) and a one-line change (`llm.service.ts`). There was also a transient issue where Google AI Studio briefly generated API keys with an `AQ.` prefix that the `@google/genai` SDK rejected; generating a new standard-format key resolved it.

---

## Deployment

The backend is intended for deployment to [Render](https://render.com) and the frontend to [Vercel](https://vercel.com).

**Live URL:** _To be added once deployed._

Key environment variables to set in the hosting dashboard:

- Render (backend): `GEMINI_API_KEY`, `NODE_ENV=production`, `CORS_ORIGINS=<your Vercel frontend URL>`
- Vercel (frontend): `VITE_API_BASE_URL=<your Render backend URL>`

# Ledger

Ledger is an AI-assisted tax platform for CPA firm staff and their clients: staff prioritize work, review return fields with full provenance back to source documents, verify or correct AI values, and collaborate in threads; clients see a first-run portal with one clear next step. This repo is a case-study prototype — Flask, Postgres, and the React SPA ship in a single container, with a deterministic seeded dataset so every deep link and walkthrough stays reproducible. The app opens on `/welcome`, a persona picker that stands in for login; every view is also directly deep-linkable via `?as=<membership_id>`.

## Quick tour

Open the app → pick a persona.

- **Dana Reyes** (`mem_dana_preparer`) — ranked Today queue and provenance review on the Northwind return
- **Marcus Hale** (`mem_marcus_reviewer`) — Dashboard **Needs review** filter
- **Priya Anand** (`mem_priya_admin` / `mem_priya_taxpayer`) — Firm overview strip and her personal return (one user, two memberships)
- **Alex Northwind** (`mem_alex_owner`) — a quiet in-progress return at `/portal/clt_northwind`
- **Morgan Meridian** (`mem_morgan_taxpayer`) — first-run portal with one clear next step and the simulated upload loop

Hosted: `https://YOUR-APP.onrender.com` (or local links below). Hero deep link:

`/returns/ret_northwind_2025/fields/fld_1040_l1a?as=mem_dana_preparer`

## Challenge coverage

| # | Challenge | Where to click |
| --- | --- | --- |
| 01 | Traceability / provenance ribbon | `/welcome` → **Dana** → **Returns** → **Northwind Traders** → line **1a**, or the hero deep link above. Click a violet value; the document pane highlights the source box. |
| 02 | Recursive field → field chain | Same return → line **9** (total income). Expand inputs into **1a** and **2b**; breadcrumb `chain` stays in the URL. |
| 03 | Client first-run | `/welcome` → **Morgan Meridian** → `/portal/clt_meridian?as=mem_morgan_taxpayer`. Dominant **Next step** card above the fold. |
| 04 | AI affordances + verify / correct | Any violet (`ai_extracted` / `ai_calculated`) field on Northwind. **How did you get this?** / **Correct this**; field detail → **Mark verified**. Corrections persist via `AiCorrection`. |
| 05 | Roles | Header **Firm / Client** toggle + side-filtered identity menu. Priya: switch `mem_priya_admin` ↔ `mem_priya_taxpayer` — nav, landing, and status copy change. |
| 06 | Dual status + cross-role upload loop | Staff vs client labels from one `ReturnStatus` enum (`StatusPill`). As Morgan, **Upload your W-2** then **Upload your 1099-INT** → return advances `docs_requested` → `docs_received`. Switch to Dana; refresh Returns / Documents. |
| 07 | Priority dashboard | **Dana**: Today top-5 + “**N** more this week,” ranked by computed urgency (overdue High can outrank fresh Critical). **Marcus**: **Needs review**. **Priya** (`?as=mem_priya_admin`): Firm overview above Today; staff-load row drills into `?owner=<user_id>`. |
| 08 | Collaboration / outstanding requests | Northwind → field **13** (QBI) → **Discussion** — client-visible thread + outstanding K-1 request. |
| 09 | Document search at scale | **Documents** — search, type, status, and client filters, composable with pagination (50/page; ~323 seeded docs). |
| 10 | Role-filtered permissions | As Dana, Documents → **W-2 — Beta LLC** → **Discussion** (internal thread). Same doc as Alex (`?as=mem_alex_owner`) — internal thread absent. |

## What’s genuine vs simulated

**Genuinely wired**

- Flask 3 + SQLAlchemy 2.0 + Pydantic v2 API on Postgres 16; Docker image serves the built SPA from the same process
- Deterministic `flask seed` dataset (hero return `ret_northwind_2025`, volume docs, tasks, threads)
- Document list search, type/status/client filters, and pagination
- Field verify / correct state transitions with correction audit records
- Role-scoped visibility enforced in services (tasks, threads/messages) — not only in the UI
- Recursive `GET /api/fields/<id>/trace` (field → transform → provenances or nested fields)
- Fulfillment flow: request → document created → related tasks closed → return status advanced when nothing outstanding remains (all server-side)
- Firm overview aggregates (`GET /api/firm/overview`) — returns-by-status, overdue/blocked/awaiting-client, staff load

**Simulated**

- Documents are seeded HTML page renders served at `/api/pages/<id>/html` — no OCR, no PDF pipeline
- AI outputs are deterministic seeded / stub-shaped data (`is_simulated: true` on annotations); the demo runs with `AI_MODE=stub`
- No real authentication — the `/welcome` persona picker and `?as=` param stand in for login; authorization is still enforced server-side per membership

## Design notes

- Two-color identity: ink + paper + seal. Violet (`--machine`), flag, and pending are data-bound signals only — violet exclusively marks machine-generated content.
- IBM Plex Mono tabular numerals for money, line refs, dates, and IDs.
- Status labels split by audience (staff vs client) from one `ReturnStatus` enum.
- Traceability is a transform DAG (field → transform → provenance or nested field), not a flat link.
- Provenance bboxes are page percentages over HTML-rendered documents.

## Run

### Docker (one process)

```bash
docker compose up --build
# first boot, load the demo dataset:
docker compose exec web flask seed
```

Open [http://localhost:8000](http://localhost:8000). Reseeding resets all demo state.

### Local (three terminals)

```bash
# 1 — Postgres
docker compose up -d db

# 2 — API (from backend/)
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp -n ../.env.example ../.env
export $(grep -v '^#' ../.env | xargs)
flask --app wsgi seed
flask --app wsgi run --port 8000 --debug

# 3 — UI (separate terminal; proxies /api → :8000)
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). `flask seed` drops and recreates tables — reseeding resets all demo state.

### Package for submission

```bash
./scripts/package.sh
# writes ledger-submission.zip at repo root
```

`scripts/package.sh` is the only sanctioned way to produce a submission zip. It excludes `.venv`, `node_modules`, `dist`, `__pycache__`, `.env`, `__MACOSX`, `*.tsbuildinfo`, and `.git`, then refuses to emit a zip that still contains `.venv` or `.env`.

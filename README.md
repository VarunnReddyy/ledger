# Ledger

Ledger is an AI-assisted tax platform for CPA firm staff and their clients: staff prioritize work, review return fields with full provenance back to source documents, verify or correct AI values, and collaborate in threads; clients see a first-run portal with one clear next step. This repo is a case-study prototype — the React app talks to a real Flask/Postgres API over `/api`, with a deterministic seeded dataset so every deep link and walkthrough stays reproducible.

## Challenge coverage

| Challenge | Where to click |
| --- | --- |
| Traceability / provenance ribbon | Returns → **Northwind Traders** → line **1a** (wages), or open the deep link below. Click a violet value; the document pane highlights the source box. |
| Recursive field → field chain | Same return → line **9** (total income). Expand inputs into **1a** and **2b**; breadcrumb `chain` stays in the URL. |
| AI affordances (`--machine` violet) | Any `ai_extracted` / `ai_calculated` field on the Northwind return. Violet edge, dotted underline, “How did you get this?” / “Correct this.” |
| Verify / correct + audit trail | Field detail → **Mark verified** or **Correct this**. Corrections persist via `AiCorrection` and reload on the field. |
| Document search / filter / pagination (challenge 09) | **Documents** — search box, type/status filters, paginated table (~320+ seeded docs). |
| Client first-run (challenge 03) | Header role switcher → membership for **Meridian** (or `/portal/clt_meridian`). Dominant **Next step** card above the fold. |
| Cross-role live loop — fulfill a request as the Meridian client, refresh as Dana: status, request checklist, and document list all reflect it. | As **Morgan** (`?as=mem_morgan_taxpayer`), **Upload your W-2** then **Upload your 1099-INT**. Switch to **Dana**, refresh Returns / Meridian thread / Documents. |
| Dual role + audience labels | Switch **Priya** between Firm admin and “My personal return.” Nav, landing page, and status copy change with the membership. |
| Role-filtered permissions (server-side) | As **Dana**, open Documents → **W-2 — Beta LLC** → **Discussion** (internal thread). Open the same doc as **Alex** (`?as=mem_alex_owner`) — internal thread is absent. |
| Collaboration / outstanding requests | Field **13** (QBI) → **Discussion** — client-visible thread + outstanding K-1 request. |
| Priority work queue | **Dashboard** as Dana (ranked tasks). As **Marcus** (reviewer), toggle **Needs review**. |
| Manager vs preparer dashboard: switch Dana ↔ Priya (Firm admin). | **Dashboard** as **Priya** (`?as=mem_priya_admin`) — Firm overview above Today. Preparers (Dana) do not see it. |

## What’s genuine vs simulated

**Genuinely wired**

- Flask 3 + SQLAlchemy 2.0 + Pydantic v2 API on Postgres 16
- Deterministic `flask seed` dataset (hero return `ret_northwind_2025`, volume docs, tasks, threads)
- Document list search, type/status filters, and pagination
- Field verify / correct state transitions with correction audit records
- Role-scoped visibility enforced in services (tasks, threads/messages) — not only in the UI
- Recursive `GET /api/fields/<id>/trace` (field → transform → provenances or nested fields)

**Simulated**

- Documents are seeded HTML page renders served at `/api/pages/<id>/html` — no OCR, no PDF pipeline
- AI outputs are deterministic seeded / stub-shaped data (`is_simulated: true` on annotations). `AI_MODE=live` exists as an interface (Anthropic, same schemas, stub fallback) but the demo runs `stub`
- No real authentication — the header role switcher (`?as=<membership_id>`) stands in for login

## Run

### Docker (one process)

```bash
docker compose up --build
# first boot, load the demo dataset:
docker compose exec web flask seed
```

Open [http://localhost:8000](http://localhost:8000).

### Local (API + Vite)

```bash
# Postgres
docker compose up -d db

# API
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp -n ../.env.example ../.env
export $(grep -v '^#' ../.env | xargs)
flask --app wsgi:app seed
flask --app wsgi:app run --host 127.0.0.1 --port 8000
```

```bash
# UI (separate terminal) — proxies /api → :8000
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Deep links (hero field)

With the default preparer membership:

- Wages (sum of two W-2s + provenance ribbon):  
  `/returns/ret_northwind_2025/fields/fld_1040_l1a?as=mem_dana_preparer`
- Total income (recursive field inputs):  
  `/returns/ret_northwind_2025/fields/fld_1040_l9?as=mem_dana_preparer`
- Client first-run:  
  `/portal/clt_meridian?as=mem_morgan_taxpayer`

## Package for submission

```bash
./scripts/package.sh
# writes ledger-submission.zip at repo root
```

The script excludes `.venv`, `node_modules`, `dist`, `__pycache__`, `.env`, `__MACOSX`, `*.tsbuildinfo`, and `.git`, then refuses to emit a zip that still contains `.venv` or `.env`.

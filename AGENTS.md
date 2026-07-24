# AGENTS.md — Working rules for this repository

> Read this file in full before generating code. Every rule here exists because
> breaking it costs us a graded criterion in the case study.

---

## 1. What this project is

A greenfield AI-powered tax platform serving both CPA firm staff and their
clients. It is a **case-study prototype**: the frontend is the deliverable, the
backend exists to make the frontend honest.

Two consequences that govern every decision:

- **Real interactions beat real infrastructure.** A working click-through with
  fabricated data scores higher than a correct system with no interface.
- **Never fake the client.** The React app makes real HTTP calls, handles real
  loading and error states, and reads real URLs. Only the *data* is invented.
  Do not import seed JSON directly into a component — always go through the API.

---

## 2. Stack — fixed, do not substitute

| Layer    | Choice                                            |
| -------- | ------------------------------------------------- |
| Backend  | Flask 3 + SQLAlchemy 2.0 (declarative, typed)     |
| DB       | PostgreSQL 16 (SQLite fallback for local dev)     |
| Schemas  | Pydantic v2 — the single source of API truth      |
| Frontend | React 18 + TypeScript (strict) + Vite             |
| Routing  | React Router v6 (data routers)                    |
| Styling  | Tailwind CSS + CSS custom properties for tokens   |
| State    | TanStack Query for server state; `useState` local |
| Icons    | lucide-react                                      |
| Deploy   | Single Docker image; Flask serves the built SPA   |

**Do not add** Next.js, Redux, styled-components, Material UI, Chakra, or any
component library that ships its own visual identity. Radix UI primitives are
permitted for accessibility (dialog, popover, tooltip) but must be styled
entirely by us.

---

## 3. Non-negotiable code rules

### TypeScript

- `strict: true`. **No `any`.** Use `unknown` and narrow.
- No non-null assertions (`!`). Handle the null case.
- Types for API payloads live in `src/lib/types.ts` and mirror the Pydantic
  schemas exactly. If you change one, change the other in the same commit.
- Components are function declarations with explicitly typed props interfaces.
- No default exports except route components.

### Python

- SQLAlchemy 2.0 style only: `Mapped[...]` + `mapped_column(...)`. Never the
  legacy `Column()` assignment style.
- Full type hints on every function signature.
- Routes do three things: parse input, call a service, serialize output. All
  logic lives in `app/services/`. A route body over ~15 lines is a bug.
- Never return an ORM object from a route. Always serialize through Pydantic.

### Both

- No commented-out code. No `TODO` without a name and a reason.
- No magic strings for domain values — use the enums in `app/enums.py` and their
  mirrored TS union types.
- Prefer deleting code to adding flags.

---

## 4. Identifiers are human-readable, on purpose

Primary keys are prefixed strings, not UUIDs or integers:

```
usr_dana_reyes      clt_northwind      ret_northwind_2025
doc_w2_acme         fld_1040_l1        tsk_missing_1099
```

Rationale: URLs become self-documenting, deep links are demoable, and debugging
a traceability graph by eye is possible. `/returns/ret_northwind_2025/fields/fld_1040_l1`
tells you everything. This directly serves the deep-linking requirement.

---

## 5. Design tokens — the visual system

Defined once in `src/styles/tokens.css` as CSS custom properties, exposed to
Tailwind via `theme.extend`. **Never write a raw hex value in a component.**

### Palette

| Token           | Hex       | Role                                        |
| --------------- | --------- | ------------------------------------------- |
| `--ink`         | `#12211F` | Primary text; near-black with a green cast  |
| `--paper`       | `#FBFAF7` | App background                              |
| `--ledger`      | `#E8F0E9` | Zebra striping on dense tables              |
| `--rule`        | `#DDE0DA` | Hairlines, borders, dividers                |
| `--seal`        | `#0B6E4F` | Brand green; verified state; primary action |
| `--flag`        | `#B4460E` | Blocking issues, overdue, destructive       |
| `--pending`     | `#B7791F` | Awaiting action, warnings                   |
| `--machine`     | `#5B4B8A` | **AI-generated content. Reserved.**         |

**The `--machine` violet is load-bearing.** It appears nowhere in the UI except
on content a model produced. Never use it for decoration, branding, links, or
any human-authored element. A user must be able to learn "violet means the
computer wrote this" in ten seconds and have that rule never break. This single
constraint carries most of the affordance and AI-trust requirements.

### Type

- **Instrument Sans** — all UI text, labels, prose.
- **IBM Plex Mono** — every numeral that represents money, a line reference, a
  date, or an ID. Tabular figures, right-aligned in tables. Tax figures must
  align down the column; this is a functional choice, not a stylistic one.

### Signature element

The **provenance ribbon**: clicking a value on the return draws an animated
connector from the field to a highlighted region on the source document in the
adjacent pane. This is the one moment of visual boldness in the product.
Everything else stays quiet so it lands. Respect `prefers-reduced-motion` by
snapping instead of animating.

### Quality floor (no exceptions)

Keyboard focus is always visible. Every interactive element is reachable by tab.
Dialogs trap focus. Layout works down to 768px. Motion respects
`prefers-reduced-motion`.

---

## 6. Field state is the backbone

`ReturnField.state` drives the entire interaction language. Every state has
exactly one visual treatment, applied identically everywhere it appears:

| State             | Meaning                        | Treatment                                  |
| ----------------- | ------------------------------ | ------------------------------------------ |
| `ai_extracted`    | Pulled from a document by AI   | Violet edge marker, dotted underline        |
| `ai_calculated`   | Derived by AI from other values| Violet edge marker, ƒ glyph                 |
| `client_answered` | Supplied by the taxpayer       | Neutral, person glyph                       |
| `verified`        | A human reviewed and confirmed | Solid ink, green check, no marker           |
| `locked`          | Cannot change; reason required | Muted, lock glyph, tooltip explains why     |
| `empty`           | Awaiting a value               | Dashed outline, invites action              |

Rules: locked fields **always** carry a `locked_reason` and surface it on hover.
Anything violet **always** offers "how did you get this?" and "correct this."
A field never changes visual treatment based on which screen it appears on.

---

## 7. Writing in the interface

Sentence case everywhere. Active voice. Buttons name their outcome — "Send
request," never "Submit." The verb on the button is the verb in the resulting
toast. Empty states tell the user what to do next; they are never just "No
items." Errors say what happened and how to fix it, and never apologize.

Never expose internal vocabulary to clients. Staff see "Pending reviewer
sign-off"; the client sees "We're reviewing your return." Same underlying
status, two audiences, one source of truth.

---

## 8. Layout of the repo

```
backend/app/
  models/        SQLAlchemy — persistence shape only, no logic
  schemas/       Pydantic — the API contract
  services/      All business logic. Testable without Flask.
  api/           Thin blueprints. Parse, delegate, serialize.
  seed/          Deterministic dataset generation
frontend/src/
  routes/        One file per URL. Data loading lives here.
  components/    Reusable. No data fetching inside.
  lib/           API client, types, formatters, hooks
  styles/        tokens.css and nothing else
```

Components never fetch. Routes fetch and pass down. This keeps the component
library reusable across the six screens and stops the affordance system from
fragmenting.

---

## 9. The AI layer

All model interaction goes through `app/services/ai.py`. Every function returns
a Pydantic-validated object, never a raw string.

Two modes, one interface, controlled by `AI_MODE`:

- `stub` (default) — returns deterministic fabricated responses. The demo must
  be fully functional in this mode with no API key and no network.
- `live` — calls the real Anthropic API, validates against the same schema, and
  falls back to the stub on any error.

Callers must not be able to tell which mode is active. Never add a code path
that exists only in one mode.

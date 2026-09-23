# ready-lets-go

A packing-list generator: describe a trip (nights, climate, accommodation, transport, activities) and get back a categorised list of what to bring.

## Commands

Scripts live in `package.json`. Run `npm run typecheck` and `npm test` before calling any change done.

## Layout

An npm workspaces monorepo. `packages/core` is the packing-list generator and depends on nothing; `packages/api` and `packages/web` both depend on it, and nothing depends on them. Keep it that way: vendor SDKs, HTTP and database code belong in `api`, never in `core`.

## Architecture

Inside `packages/core`, data flows one way: `types.ts` -> `catalog.ts` -> `generate.ts` -> `format.ts`, with `index.ts` as the package's public surface and `demo.ts` as the terminal entry point behind `npm start`.

- `types.ts` — the trip vocabulary (`Climate`, `Accommodation`, `Transport`, `Activity`, `Category`) and the `Trip` and `Item` shapes. New vocabulary starts here.
- `conditions.ts` — small reusable predicates (`inClimate`, `perNight`, `doing`, ...) that decide whether an item applies to a trip.
- `catalog.ts` — the packing items themselves, each with an `appliesTo` predicate built from `conditions.ts`. Adding an item means adding an entry here, not adding logic elsewhere.
- `generate.ts` — filters the catalog against a trip.
- `format.ts` — renders the result for the terminal.

Anything not exported from `index.ts` is private to the package.

Prefer expressing a new packing rule as a condition in `conditions.ts` plus a catalog entry. Reach for bespoke logic inside `generate.ts` only when a rule genuinely cannot be phrased as a per-item predicate.

## Module resolution

TypeScript is set to `NodeNext`, so relative imports carry a `.js` extension even though the source file is `.ts` (`import { format } from "./format.js"`).

## Docs

- `CONTEXT.md` — the domain glossary. Use these words in code and conversation; sharpen it when a term is settled.
- `docs/adr/` — why the stack and the data model are the way they are. Read before proposing a different database, auth provider, or rendering model.
- `docs/wayfinding.md` — the active maps, for work too big for one session.

## Issue tracker

Work is tracked on Trello, not GitHub Issues. Read `docs/agents/issue-tracker.md` before picking up, creating, updating, commenting on, or closing a ticket, and before starting work that a ticket should exist for.

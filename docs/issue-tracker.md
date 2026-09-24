# Issue tracker: Trello

This project tracks work on the Trello board **Ready Lets Go**, reached with the `trello` CLI. There are no GitHub Issues here; never open one.

Every command takes `--board "Ready Lets Go"`. Lists and cards are addressed by name, so quote names that contain spaces. Add `--format json` when you need to parse the output; the default output is meant for humans.

`trello <topic> --help` and `trello <topic>:<command> --help` are the source of truth for flags.

Most commands take a card by `--id`, but `card:move` and `card:assign` do not: addressing a card by `--card` means passing `--board` and `--list` (the list it is in *now*) alongside it, and `--id` alone fails with a 400. `card:assign` also wants a Trello username, which `trello board:members --board "Ready Lets Go"` prints. Note that the CLI exits 0 on that failure, so check the output rather than the exit code.

## The board

Cards flow left to right through these lists:

| List | Meaning |
| --- | --- |
| `Maps` | Wayfinder maps, not tasks — see below |
| `Backlog` | Captured, not yet scheduled |
| `To Do` | Agreed and ready to pick up |
| `In Progress` | Someone is working on it right now |
| `Done` | Shipped |

## Working a ticket

1. See what is available: `trello card:list --board "Ready Lets Go" --list "To Do"`.
2. Read the one you are taking: `trello card:get-by-id --id <card id>`, or `trello search --board "Ready Lets Go" --query "<words from the title>"` to find its ID.
3. Claim it before writing code: `trello card:move --board "Ready Lets Go" --list "To Do" --card "<card name>" --to "In Progress"`, then `trello card:assign` with the same addressing flags.
4. Record anything the next reader would want — a decision, a blocker, the branch name: `trello card:comment --id <card id> --text "..."`.
5. Move it to `Done` once the work is merged and `npm run typecheck` and `npm test` pass. Ask the human first if you are unsure the work is finished.

## Capturing new work

When you find work that is out of scope for what you are doing, file it rather than widening the change:

```
trello card:create --board "Ready Lets Go" --list "Backlog" \
  --name "Short imperative title" \
  --description "What is wrong or wanted, and where in the code it lives."
```

Put new work in `Backlog`. `To Do` means a human has agreed to it, so moving a card there is their call.

## Wayfinding operations

A big, foggy effort is charted as a **map** card with **ticket** cards hanging off it. Trello has no native parent/child or blocking relationships, so this board expresses them by convention.

- **Maps** live in the `Maps` list, labelled `wayfinder:map`. The card body holds the destination, notes, decisions so far, the fog, and an index linking every ticket.
- **Tickets** are ordinary cards labelled `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling` or `wayfinder:task`. Each body opens with a `Map:` link back to its map and a `## Question` section.
- **Blocking** is a `## Blocked by` section at the end of a ticket body, listing the cards that must close first.
- **The frontier is the board itself.** A blocked ticket sits in `Backlog`; it moves to `To Do` when the last thing blocking it reaches `Done`. So `trello card:list --board "Ready Lets Go" --list "To Do"` is the frontier query, and wayfinder tickets are the one exception to the rule that only a human moves a card into `To Do` — the map is the agreement.
- **Claim before working**: `trello card:assign` and move the card to `In Progress`.
- **Resolve** by commenting the answer on the ticket, moving it to `Done`, and adding a one-line gist plus link under the map's `Decisions so far`. The detail stays on the ticket; the map only ever points at it.

Checklist items cannot be created from the CLI (`card:check-item` only toggles existing ones), which is why the map indexes its tickets in the card body rather than as a checklist.

## Boundaries

Creating cards, commenting, and moving a card between lists is ordinary work — go ahead. Confirm with the human first before deleting a card, archiving a list, renaming a list, or changing anything on a board other than **Ready Lets Go**.

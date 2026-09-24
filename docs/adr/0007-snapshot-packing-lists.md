# A packing list is a snapshot, and overrides are two tables

A saved packing list could have been recomputed from the catalogue on every read, which would have carried every later catalogue improvement into every existing list. We chose to snapshot instead: generating a list copies each item's name, category, note and quantity into rows of its own, and the list records the `CATALOGUE_VERSION` it was built against. Recomputing would mean that improving an item reshapes a list somebody is halfway through packing, and the quantities were computed from that trip's length at that moment anyway. The improvement path [ADR 0004](./0004-catalogue-overrides.md) cared about comes back as an explicit action: the version stamp says a list is behind, and a diff against a fresh generation says what changed, on the user's terms rather than mid-pack.

The second decision is that a user's changes to the catalogue live in two tables, not one. `user_item` holds an added item — a complete definition carrying its own stored condition from [ADR 0006](./0006-stored-conditions-for-user-items.md). `catalogue_override` holds one row per user and catalogue item, carrying `hidden` plus nullable name, category, note and quantity fields as a sparse patch. A single table with a `kind` column would leave most columns null on most rows, and the rule that a hidden item cannot also carry a quantity would live only in application code. Splitting them lets the database state it, and the unique index on `(user_id, item_id)` makes two conflicting overrides of one item impossible rather than merely unlikely.

## Consequences

Snapshot rows duplicate text that also exists in the catalogue. That is intended: they are historical records, not a cache, which is why they hold no foreign key back to `user_item` — deleting an added item cannot take a chunk out of a list already packed. It is also why every deletion in this schema is a hard delete: history is preserved by the copies, so no table needs a `deleted_at` and no query needs to remember to filter on it.

Because a list's rows have no inherent order in Postgres, each carries a `position` assigned at generation. Without it a list quietly reorders itself between reads, and re-deriving order from the live catalogue would break the snapshot for the same reason re-reading names would.

`CATALOGUE_VERSION` is bumped by hand, and nothing enforces it. It sits directly above the catalogue array for that reason. A missed bump means a list is not offered an update it could have had — a stale list, not a broken one.

Catalogue items now carry a stable `id` slug, separate from the display name, because an override and a tick both need something to point at that survives rewording an item.

Identity follows [ADR 0002](./0002-firebase-auth-on-aws.md): every table carries the Firebase `sub` as `text not null` with no foreign key, and there is no users table. Firebase's default account linking keeps one account per email address, so linking a Google sign-in to an existing password account preserves the `sub` and needs no migration here. The alternative Firebase setting, a separate account per provider, would produce two ids for one person and would need one.

Writes assume no interactive transactions, which the Neon HTTP driver does not offer. Creating a list is two statements in a `db.batch()` — the list row, then one multi-row insert — so the list's id is generated in TypeScript rather than by Postgres. Reading a generated id back before inserting the items would be exactly the interactive pattern the driver lacks.

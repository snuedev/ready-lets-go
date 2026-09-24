# User-added items express their condition as stored data, not code

A catalogue item decides when it applies with an `appliesTo` function, and a user-added item is a database row, which cannot hold a function. We chose to keep both: catalogue items stay TypeScript, user items carry a stored condition, and `packages/core` gains a `compile` function turning a stored condition into the same `(trip) => boolean` the generator already expects. Copying the catalogue into the database to unify the two was rejected in [ADR 0004](./0004-catalogue-overrides.md), and giving user items no conditions at all was rejected because an app whose own catalogue can express a rule the user cannot is insulting to the user. So the ceiling is the same for both, in a deliberately shallow shape:

```
StoredCondition  = a list of situations   -> the item applies if ANY situation matches
                                             (an empty list means it always applies)
Situation        = a list of tests        -> a situation matches if ALL its tests hold
Test             = "<trip field> is one of / is none of <values>"
                   or a nights threshold ("at least n" / "at most n")
```

Every one of the 57 items in today's catalogue fits this shape, including the six that need "or" across two different trip fields, which is the evidence that it is enough for real packing rules. There is no general "not": because every trip vocabulary is a small closed set, "is none of" says everything a negation would, and it keeps a stored condition flat enough to read. Nesting deeper than situation-then-test is not available. A quantity rule gets the same treatment, as a mode and a number — `fixed n`, or `n per night` with an optional cap — defaulting to one per night.

## Consequences

Nothing already in `packages/core` changes: `Item`, `generate`, `format` and `conditions.ts` stay as they are, and the package only gains the stored-condition types and `compile`. Because a condition arriving over the wire is untrusted, `packages/api` validates it with Zod at the boundary and hands `core` only well-formed data, which keeps `core` dependency-free at the price of a seam nothing but code review enforces: the Zod schema and the `core` types must be kept in step by hand.

A stored condition is read whole and written whole, so it lives in a single `jsonb` column rather than normalised rows. That also avoids a delete-and-reinsert across two tables on every save, which would want the transaction the Neon HTTP driver does not offer.

An override may add an item with any condition, and may change an existing item's name, category, note or quantity — but not its condition. Rewriting a built-in rule means hiding that item and adding your own, which costs the user nothing now that their conditions are as expressive as the catalogue's, and avoids freezing a stored edit against a built-in rule that has since been rewritten.

Trip vocabulary will keep growing, so `compile` treats a value it does not recognise as simply not matching and never throws: a stale condition must not break someone's packing list. Adding vocabulary is always safe; removing or renaming a value is a migration written on purpose.

The difficulty this decision does not solve is the interface. Choosing full expressiveness moves the hard part out of the data model and into the screen where someone builds "camping or at a festival, but not in winter" out of dropdowns. That risk belongs to the packing-screen prototype.

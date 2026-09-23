# The catalogue stays code; user changes are overrides

Once users can add their own items, the built-in catalogue could have been copied into each user's account on sign-up, or moved into the database wholesale. We chose to keep the catalogue in TypeScript and store only each user's differences as overrides, combined at generation time into an effective catalogue. Copying would freeze every existing user out of later improvements to the catalogue, and moving it into the database would discard the `appliesTo` conditions, which are functions and do not fit in a column.

## Consequences

There is no single table that is "the catalogue": reading a user's items always means base plus overrides. A user-added item cannot carry a TypeScript function, so how it expresses its condition is an open question, tracked on the map.

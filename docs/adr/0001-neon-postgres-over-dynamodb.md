# Neon serverless Postgres, not DynamoDB

DynamoDB is the default database on Lambda and would be cheaper and simpler to provision, but it requires the access patterns to be designed before the data is modelled. This app's data is plainly relational (a user has trips, a trip has a packing list, a user has overrides on a shared catalogue) and the app does not exist yet, so the access patterns are not yet known. We chose Neon serverless Postgres with Drizzle as the query layer: ordinary SQL keeps future questions cheap to ask, and Drizzle keeps the schema and the TypeScript types as a single definition.

## Consequences

Postgres over Lambda needs care that DynamoDB would not: connections cannot be held open across invocations in the usual way, so the HTTP or serverless driver is used rather than a raw connection. It also puts a third account (alongside AWS and Firebase) in the stack.

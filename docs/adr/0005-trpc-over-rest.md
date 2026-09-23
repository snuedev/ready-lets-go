# tRPC over Hono, with REST left available

Both ends of this app are TypeScript in one repo, which is the narrow case where tRPC's end-to-end type inference applies: the web app calls API procedures directly and types flow through without a schema written twice or API docs to keep in sync. We chose it over plain REST, and rejected GraphQL as far more machinery than one client needs. tRPC runs on top of Hono inside a single Lambda, so plain REST routes can be added alongside it if anything outside this repo ever needs to call the API.

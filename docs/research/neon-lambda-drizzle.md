# Running Neon Postgres from Lambda with Drizzle

Research for [Trello GhVZxk6T](https://trello.com/c/GhVZxk6T). Context: Node Lambda behind tRPC/Hono, deployed with SST v3, personal-scale traffic.

**Recommendation in one line: use the HTTP driver (`drizzle-orm/neon-http` over `@neondatabase/serverless`) with the pooled `-pooler` connection string, and run migrations from CI with `drizzle-kit migrate` against the direct (non-pooler) string.**

## The problem this is all solving

Postgres was designed for long-lived connections. A client opens a TCP connection, does a TLS handshake, authenticates, and then keeps that connection open for hours while it runs queries. Opening one is expensive — Neon measures it at roughly 8 network round trips ([Choosing your connection method](https://neon.com/docs/connect/choose-connection)).

Lambda breaks both halves of that assumption. There is no long-lived process to hold a connection, and a burst of traffic means a burst of new containers each wanting its own connection. Neon's answer is two different drivers plus a pooler in front of the database, and picking between them is the whole of this ticket.

## HTTP driver vs WebSocket driver

Both ship in the same npm package, `@neondatabase/serverless`. They differ in how they carry a query to the database.

### The HTTP driver (`neon()`)

Each query is one ordinary HTTPS request to a Neon endpoint that speaks SQL. There is no connection to open, keep alive, or close — it is `fetch` under the hood. Neon puts it at about 3 round trips versus about 8 for TCP ([Choosing your connection method](https://neon.com/docs/connect/choose-connection)).

```ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const db = drizzle({ client: neon(process.env.DATABASE_URL!) });
```

([Drizzle: Neon](https://orm.drizzle.team/docs/connect-neon))

**The catch, and it is the one thing to know before choosing:** there are no interactive transactions. Drizzle's `db.transaction(async (tx) => ...)` does not work — it throws outright. From Drizzle's own source, `drizzle-orm/src/neon-http/session.ts`:

```ts
override async transaction<T>(...): Promise<T> {
  throw new Error('No transactions support in neon-http driver');
}
```

([drizzle-orm/src/neon-http/session.ts](https://github.com/drizzle-team/drizzle-orm/blob/main/drizzle-orm/src/neon-http/session.ts))

"Interactive" means a transaction where you read a row, decide something in TypeScript, and then write based on that decision — all inside one atomic unit. HTTP cannot do that, because each request is independent and the database will not hold a transaction open waiting for your function to think.

What you *do* get is `db.batch()`: a fixed list of queries, sent in one request, run as one all-or-nothing transaction. The same file shows `batch()` delegating to the driver's `client.transaction(builtQueries)`, which the Neon docs call a "single, non-interactive transaction" ([Neon serverless driver](https://neon.com/docs/serverless/serverless-driver)). So atomic multi-statement writes are available; you just have to know all the statements up front.

### The WebSocket driver (`Pool` / `Client`)

This speaks the real Postgres wire protocol tunnelled over a WebSocket, so it is a drop-in replacement for `pg`. Sessions, interactive transactions, `LISTEN`/`NOTIFY` — everything works.

```ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });
```

Node has no built-in WebSocket in the versions this driver targets, hence the extra `ws` dependency and the `neonConfig.webSocketConstructor` line ([Drizzle: Neon](https://orm.drizzle.team/docs/connect-neon)).

The price is a rule that is easy to get wrong. Neon's docs are blunt: "WebSocket connections can't outlive a single request. That means `Pool` or `Client` objects must be connected, used and closed within a single request handler" ([Neon serverless driver](https://neon.com/docs/serverless/serverless-driver), [README](https://github.com/neondatabase/serverless#readme)). You must create the pool inside the handler and close it before returning — which throws away the one benefit a pool normally gives you.

### Which one here

HTTP. This app does not need interactive transactions today, and `db.batch()` covers atomic writes when it does. Neon's own decision page puts HTTP under "single, independent queries" and WebSocket under "multi-step, interactive transactions" ([Choosing your connection method](https://neon.com/docs/connect/choose-connection)).

The switch is cheap later: both drivers produce a `db` object with the same Drizzle query API, so moving is a change to one file plus whatever code assumed `db.transaction()` existed.

## Connection reuse when Lambda freezes a container

Here is the mechanic, because it is the thing that makes people reach for a pool and then get burned.

Lambda runs your module's top-level code once, in the **Init** phase, then calls your handler. When the handler returns, "Lambda freezes the execution environment." On the next request it thaws the same environment and calls the handler again — a "warm start." Crucially: "Objects declared outside of the function's handler method remain initialized... if your Lambda function establishes a database connection, instead of reestablishing the connection, the original connection is used in subsequent invocations" ([Lambda execution environment lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)).

So module-scope reuse is real and AWS recommends it. Three caveats matter:

1. **Frozen means frozen.** Between invocations your process gets no CPU. Timers do not fire, keepalive packets are not sent, and a socket the server closed in the meantime looks fine to your code until you try to use it. AWS puts it as "background processes or callbacks... resume if Lambda reuses the execution environment" — resume, not continue. Neon names the failure mode directly: client-side pooling "can cause 'zombie' connections when instances are abruptly frozen or destroyed" ([Using Neon from elastic serverless platforms](https://neon.com/docs/guides/serverless-connection-pooling)).
2. **Environments do not last.** "Lambda terminates execution environments every few hours... even for functions that are invoked continuously" ([Lambda lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)).
3. **A container serves one request at a time.** Concurrency comes from more containers, not more connections per container, so a pool size above 1 buys nothing inside a single Lambda.

With the HTTP driver all three stop being your problem. There is no socket to go stale, so the `neon()` client is safe at module scope and the thing being reused is the underlying HTTPS/TLS connection that `fetch` keeps in its agent — a cache that repairs itself if it goes bad.

```ts
// db.ts — module scope, created once per container
export const db = drizzle({ client: neon(process.env.DATABASE_URL!) });
```

Note the init budget: the Init phase is capped at 10 seconds ([Lambda lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)), so never put an `await` on a real query at module scope.

## Is a connection pooler needed at this size?

**Use the `-pooler` connection string anyway.** It is free, it is a hostname change, and it is what Neon calls the default choice.

Neon runs PgBouncer in transaction mode in front of every project. Adding `-pooler` to the endpoint hostname routes through it:

```
ep-cool-darkness-123456.us-east-2.aws.neon.tech         # direct
ep-cool-darkness-123456-pooler.us-east-2.aws.neon.tech  # pooled
```

The pooler accepts up to 10,000 client connections and multiplexes them onto the compute's real `max_connections`, which on the smallest 0.25 CU compute is 104 ([Connection pooling](https://neon.com/docs/connect/connection-pooling)).

At personal-scale traffic you will never approach 104. The argument for the pooler is not steady-state load, it is the bad day: a retry storm, a crawler, or Lambda scaling out means N containers each wanting a connection, and 104 is not a large number when N is set by someone else's traffic. The pooler is insurance that costs nothing.

What you give up is session-level state, which transaction-mode pooling cannot support: `SET`/`RESET`, `LISTEN`/`NOTIFY`, `PREPARE`/`DEALLOCATE`, temporary tables, and session-level advisory locks ([Connection pooling](https://neon.com/docs/connect/connection-pooling)). None of that is reachable from the HTTP driver anyway, so for the app path this costs nothing.

It does matter for migrations — see below.

## Schema and migrations

Drizzle splits the job in two, and the split is the part worth understanding.

**Schema** is ordinary TypeScript that you import in both your app and your tooling:

```ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

**Migrations** are handled by `drizzle-kit`, a separate CLI, configured by `drizzle.config.ts` with `dialect`, `schema`, `out` and `dbCredentials` ([Drizzle config](https://orm.drizzle.team/docs/drizzle-config-file)). The workflow that fits this project:

- `drizzle-kit generate` — diffs the TypeScript schema against the last snapshot and writes a numbered `.sql` file into `out`. Commit these; they are the audit trail.
- `drizzle-kit migrate` — applies the pending files and records them in a migrations table.
- `drizzle-kit push` — skips the files and reshapes the database to match the schema directly. Drizzle recommends it for "rapid prototyping" only ([Migrations overview](https://orm.drizzle.team/docs/migrations)).

Two practical points for Neon specifically:

1. **Drizzle Kit connects on its own.** It "automatically picks available database driver from your current project based on the provided `dialect`" and uses its own connection logic, not your app's ([Drizzle config](https://orm.drizzle.team/docs/drizzle-config-file)). So the driver choice above does not constrain migrations at all.
2. **Point migrations at the direct, non-pooler string.** Neon lists "schema migrations" and `CREATE INDEX CONCURRENTLY` under direct connections ([Choosing your connection method](https://neon.com/docs/connect/choose-connection)), because DDL often wants session-level behaviour that transaction-mode PgBouncer will not give it.

So: two secrets. `DATABASE_URL` (pooled) for the Lambda, `DATABASE_URL_UNPOOLED` (unpooled) for `drizzle-kit`. With SST v3 those are `sst.Secret` resources; only the pooled one gets linked to the function.

Run migrations from CI as a deploy step, not from the Lambda. Drizzle's runtime `migrate()` exists and the docs list it for serverless, but running it in a request handler means every cold container races to migrate, inside a 10-second init budget, holding locks. Not worth it here.

## First request after scale to zero

Neon suspends an idle compute after **5 minutes** by default and reactivates it "within a few hundred milliseconds" on the next query ([Scale to zero](https://neon.com/docs/introduction/scale-to-zero)). On the Free plan the 5 minutes is fixed and cannot be disabled; Launch can disable it; Scale makes it configurable from 1 minute to always-on ([Configuring scale to zero](https://neon.com/docs/guides/scale-to-zero-guide)).

The query **waits, it does not fail** — the docs describe connecting as an action that activates an idle compute, with reactivation automatic. But two things follow:

- **Do not set a tight query timeout.** A few hundred milliseconds of wake-up on top of normal latency will trip an aggressively short timeout, and it will look like a flaky database when it is working as designed.
- **Expect a stacked cold start.** A low-traffic personal app hits the worst case routinely: Lambda cold start (AWS says "under 100 ms to over 1 second", [Lambda lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)) plus Neon wake-up. Roughly a second on the first request after a quiet spell, then fast. That is the deal you accepted by choosing two scale-to-zero services, and for a personal app it is the right deal.

One more detail worth filing away: when the compute restarts, "session context resets," clearing temporary data and prepared statements ([Configuring scale to zero](https://neon.com/docs/guides/scale-to-zero-guide)). Another reason a long-lived WebSocket pool is a liability here and stateless HTTP is not.

## Summary

| Question | Answer |
| --- | --- |
| Which driver | `drizzle-orm/neon-http` — unless you need interactive transactions |
| Interactive `db.transaction()` | Not available on HTTP; throws. Use `db.batch()` for atomic multi-statement writes |
| Connection reuse | Create the `db` at module scope; HTTP has no socket to go stale across a freeze |
| Pooler | Yes, use `-pooler` for the app. Costs nothing, protects against the bad day |
| Migrations | `drizzle-kit generate` + `migrate` from CI, against the **direct** (non-pooler) string |
| After scale to zero | First query waits a few hundred ms, does not fail. Do not set tight timeouts |

## Sources

- [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver)
- [Neon: Choosing your connection method](https://neon.com/docs/connect/choose-connection)
- [Neon: Connection pooling](https://neon.com/docs/connect/connection-pooling)
- [Neon: Using Neon from highly elastic serverless platforms](https://neon.com/docs/guides/serverless-connection-pooling)
- [Neon: Scale to zero](https://neon.com/docs/introduction/scale-to-zero)
- [Neon: Configuring scale to zero](https://neon.com/docs/guides/scale-to-zero-guide)
- [Neon: Connect from AWS Lambda](https://neon.com/docs/guides/aws-lambda)
- [@neondatabase/serverless README](https://github.com/neondatabase/serverless#readme) and [CONFIG.md](https://github.com/neondatabase/serverless/blob/main/CONFIG.md)
- [Drizzle: Neon](https://orm.drizzle.team/docs/connect-neon)
- [Drizzle: Migrations](https://orm.drizzle.team/docs/migrations)
- [Drizzle: Config file](https://orm.drizzle.team/docs/drizzle-config-file)
- [drizzle-orm/src/neon-http/session.ts](https://github.com/drizzle-team/drizzle-orm/blob/main/drizzle-orm/src/neon-http/session.ts)
- [AWS: Understanding the Lambda execution environment lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)

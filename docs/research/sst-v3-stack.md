# Research: SST v3 for a tRPC Lambda, a static SPA, and secrets

Ticket: [SST v3 for a tRPC Lambda, a static SPA, and secrets](https://trello.com/c/tBSjMHrX)
Date: 2026-09-19. Sources are the official SST docs (sst.dev), linked inline.

## The short version

SST v3 is not "CloudFormation with a nicer API" any more — it's built on Pulumi/Terraform
providers and deploys by talking to AWS directly. For our stack we need exactly three
components plus one secret per piece of config:

| What we want | SST v3 component |
| --- | --- |
| Hono + tRPC on Lambda behind HTTP | `sst.aws.Function` with `url: true`, or `sst.aws.ApiGatewayV2` |
| Vite + React SPA on S3/CloudFront | `sst.aws.StaticSite` |
| Neon connection string, Firebase service account | `sst.Secret` |
| (optional) one domain for both | `sst.aws.Router` |

Everything lives in one `sst.config.ts` at the repo root, and an environment is just a
*stage* — a string you pass to the CLI.

## 1. The API: Function URL or API Gateway?

Hono ships an AWS Lambda adapter, and SST's own Hono guide uses a plain Lambda **function
URL** rather than API Gateway:

```js
async run() {
  const bucket = new sst.aws.Bucket("MyBucket");

  new sst.aws.Function("Hono", {
    url: true,
    link: [bucket],
    handler: "src/index.handler",
  });
}
```

with the handler being `export const handler = handle(app)` from `hono/aws-lambda`
([Hono on AWS](https://sst.dev/docs/start/aws/hono/)).

A function URL is a plain HTTPS endpoint AWS gives the Lambda directly. It has no request
cost of its own and no extra hop, which is why SST reaches for it first. The trade-off is
that you lose the things API Gateway adds: per-route throttling, usage plans, request
validation, WAF attachment, and a nicer story for many separate handlers.

The alternative is `sst.aws.ApiGatewayV2`, where you declare routes explicitly:

```ts
const api = new sst.aws.ApiGatewayV2("MyApi");

api.route("GET /", "src/get.handler");
api.route("$default", "src/default.handler");
```

`$default` is the catch-all — it matches anything no other route claimed. That is the route
you want for a framework like Hono that does its own routing
([ApiGatewayV2](https://sst.dev/docs/component/aws/apigatewayv2/)). Both expose `.url`.

**Recommendation for us:** start with `sst.aws.Function` + `url: true`. tRPC is a single
POST/GET surface under one prefix; Hono routes it internally, so API Gateway's routing table
would contain exactly one entry (`$default`) and buy us nothing. Moving to ApiGatewayV2
later is a small config change, not a rewrite.

## 2. The SPA: `sst.aws.StaticSite`

`StaticSite` runs a build command, uploads the output directory to an S3 bucket, and puts a
CloudFront distribution in front of it. It exposes a single `url` output — the custom domain
if you set one, otherwise the generated CloudFront URL
([StaticSite](https://sst.dev/docs/component/aws/static-site/)).

```js
{
  build: {
    command: "npm run build",
    output: "dist"
  }
}
```

Two SPA-specific details from the component reference:

- `indexPage` defaults to `"index.html"` and only applies to the root of the site.
- `errorPage: "index.html"` makes CloudFront serve the app shell for 403/404s, so
  client-side routing works on a hard refresh of `/trips/123`. **Set this** — without it a
  deep link returns a CloudFront error page, which is the classic first bug people hit with
  an SPA on S3.

## 3. How the web build learns the API URL

This is the part where SST has two mechanisms and only one of them works for us.

**Linking** (`link: [...]`) is SST's typed wiring: it grants IAM permissions and makes the
resource readable as `Resource.MyThing` at runtime
([Linking](https://sst.dev/docs/linking/)). For a *frontend*, though, the docs are explicit:
SST injects links into `process.env` under an `SST_RESOURCE_` prefix, and **"Links are only
available on the server of your frontend."** A Vite SPA has no server. So linking is the
wrong tool for the browser bundle.

**Environment variables** are the right tool. `StaticSite.environment` values are available
both "in the build process when running `build.command`" and "locally while running your site
through `sst dev`". Vite only exposes variables prefixed `VITE_` to browser code via
`import.meta.env`:

```js
{
  environment: {
    BUCKET_NAME: bucket.name,
    VITE_STRIPE_PUBLISHABLE_KEY: "pk_test_123"
  }
}
```

So we pass `VITE_API_URL: api.url`. SST resolves that value (it's a lazy "output", not a
plain string yet at config-evaluation time) before running the build, so the real deployed
URL ends up baked into the JS bundle. SST also generates `src/sst-env.d.ts` with types for
the Vite variables, so `import.meta.env.VITE_API_URL` is typed rather than `any`.

Consequence worth knowing: because the URL is **baked in at build time**, changing the API
URL means rebuilding the web package. SST handles that automatically on deploy, but it
explains why the SPA can't "discover" the API at runtime.

The same reasoning is why **you must never put a `sst.Secret` in `StaticSite.environment`**
— anything the browser can read is public. Firebase's *web* config (API key, project ID)
is fine there; it's designed to be public. The Firebase *service account* is not.

### CORS, or avoiding it

With a separate CloudFront domain for the SPA and a function-URL domain for the API, the
browser makes cross-origin requests and you must configure CORS on the function URL.

The tidier alternative is `sst.aws.Router`: one CloudFront distribution, one domain, paths
split between components ([Router](https://sst.dev/docs/component/aws/router/)):

```ts
const router = new sst.aws.Router("MyRouter", {
  domain: "example.com"
});

const myFunction = new sst.aws.Function("MyFunction", {
  handler: "src/api.handler",
  url: {
    router: { instance: router, path: "/api" }
  }
});
```

Same origin means no CORS preflight at all, and the SPA can call a relative `/api` path.
Worth adopting once we have a domain; not worth blocking the walking skeleton on.

## 4. Secrets: how a CLI-set value reaches Lambda

`sst.Secret` is a component you declare in config and then fill in from the CLI
([Secret](https://sst.dev/docs/component/secret/),
[CLI](https://sst.dev/docs/reference/cli/)):

```sh
sst secret set DatabaseUrl "postgres://..."
sst secret set DatabaseUrl "postgres://prod..." --stage production
sst secret set Key < file.txt
sst secret load ./secrets.env
sst secret list --stage production
```

The mechanism, quoting the docs: "Secrets are encrypted and stored in an S3 Bucket in your
AWS account." When a function links a secret, the value is "encrypted and included in the
bundle. They are then decrypted synchronously when your function starts up by the SST SDK."

Three things follow from that, and they matter:

1. **The secret is not a Lambda environment variable.** It travels inside the function
   bundle, encrypted. So it doesn't count against Lambda's 4 KB environment-variable limit,
   and it isn't visible in the AWS console's env-var list. You read it as
   `Resource.DatabaseUrl.value`.
2. **Changing a secret requires a redeploy** to take effect — unless you're running
   `sst dev`, where SST feeds the new value through without one. The docs say changes
   "require deployment if you're not running `sst dev`".
3. **Secrets are per-stage.** `sst secret set X --stage production` and the same name in
   your personal stage are different values. `--fallback` sets a default used by any stage
   that hasn't got its own — the docs call this out as "useful for PR environments that are
   auto-deployed".

For us that means: `DatabaseUrl` (Neon, per-stage — ideally a separate Neon branch per
stage) and `FirebaseServiceAccount` (the JSON key, if we use the Admin SDK server-side).
Note that *verifying* a Firebase ID token only needs Google's public certs and the project
ID, so we may only need the project ID as plain config, not a secret at all. Worth
confirming when we build auth.

## 5. `sst dev` locally — and Neon and Firebase

`sst dev` starts a multiplexer: tabs for deploying resources, running functions, and running
the frontend dev server ([CLI](https://sst.dev/docs/reference/cli/)).

The Lambda side is SST's "Live" mode, and the mechanism is worth understanding because it
explains all the caveats ([Live](https://sst.dev/docs/live/)):

1. SST deploys a **stub** Lambda to AWS in place of your real function.
2. Your machine opens a WebSocket to an AWS AppSync Events endpoint.
3. A real invocation hits the stub; the stub publishes the event payload.
4. Your machine receives it and runs your actual code locally as a Node.js Worker.
5. The response goes back through AppSync; the stub returns it to the caller.

So your **real code runs on your laptop** with your breakpoints, your `console.log`, and
instant reloads — but it is reached through a genuinely deployed AWS endpoint.

**Does this work with Neon?** Yes, and better than the alternative. Neon is a managed
Postgres reached over the public internet, so there's no VPC involved. That sidesteps the
one big Live limitation the docs flag: "Local functions cannot access VPC resources by
default; you must configure either a bastion tunnel or VPN." This is a genuine point in
Neon's favour over RDS-in-a-VPC for a solo developer.

**Does this work with Firebase Auth?** Yes — Firebase is an outbound HTTPS call to Google.
Nothing about Live changes that; your local process makes the call with the same credentials
the deployed function would use, because linked secrets are available in dev too.

Two warnings from the docs, both real:

- If you kill `sst dev`, the **stubs stay deployed** and will time out trying to reach your
  offline machine. Run `sst deploy` to put the real functions back.
- Therefore: "only use `sst dev` in your personal stage." Never point it at production.

For the SPA, `StaticSite` isn't deployed at all in dev — SST just runs the dev command
(`dev.command`, default `"npm run dev"`, `autostart` defaults to true) with the environment
variables injected. `dev.url` supplies a placeholder URL so nothing is `undefined`.

There's also `sst shell`, which runs any command with linked resources and secrets in its
environment — that's how we'll run Drizzle migrations against the right Neon branch:

```sh
sst shell -- npm run db:migrate
sst shell --stage production -- npm run db:migrate
```

## 6. Stages = environments

A stage is "like an environment — separate versions of your app"
([Basics](https://sst.dev/docs/basics/)). Stage resolution, per the CLI reference:

1. No `--stage`? SST uses your machine's username.
2. If that username is `root`, `admin`, `prod`, `dev`, or `production`, it prompts instead.
3. The choice is saved in `.sst/stage` and reused. Override with `--stage` or `SST_STAGE`.

Resource names are prefixed with app name + stage, so stages are fully isolated — separate
Lambdas, buckets, distributions, secrets.

The guardrails live in `app()` ([Config](https://sst.dev/docs/reference/config/)):

```ts
app(input) {
  return {
    removal: input.stage === "production" ? "retain" : "remove",
    protect: input.stage === "production",
  };
}
```

- `removal: "retain"` keeps S3/DynamoDB on `sst remove` so you can't delete data by accident.
  Default is `"retain"`; `"remove"` tears everything down, which is what you want for a
  throwaway personal stage.
- `protect: true` makes `sst remove` refuse to run at all.

Proposed mapping for us:

| Stage | Purpose | Neon | Notes |
| --- | --- | --- | --- |
| `sabra` (personal) | daily dev, `sst dev` | own Neon branch | `removal: "remove"` |
| `production` | the real thing | Neon main | `protect: true`, `removal: "retain"` |

Add a `staging` stage only when there's something to stage for.

## 7. Monorepo layout

SST's own monorepo guide uses npm workspaces with `sst.config.ts` at the root and an
`infra/` folder splitting the config into files, dynamically imported
([Set up a monorepo](https://sst.dev/docs/set-up-a-monorepo/)):

```ts title="sst.config.ts"
async run() {
  const storage = await import("./infra/storage");
  await import("./infra/api");

  return {
    MyBucket: storage.bucket.name
  };
}
```

The dynamic `await import()` is not stylistic — SST evaluates `run()` inside its own runtime,
and top-level imports of infra modules would execute before that context exists.

Our `packages/core`, `packages/api`, `packages/web` maps onto this cleanly; `core` matches
their `packages/core`, `api` matches `packages/functions`.

## 8. A worked `sst.config.ts` sketch

Single file to start with; split into `infra/` when it gets long.

```ts
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "ready-lets-go",
      home: "aws",
      providers: { aws: { region: "eu-west-2" } },
      removal: input.stage === "production" ? "retain" : "remove",
      protect: input.stage === "production",
    };
  },

  async run() {
    const databaseUrl = new sst.Secret("DatabaseUrl");
    const firebaseServiceAccount = new sst.Secret("FirebaseServiceAccount");

    const api = new sst.aws.Function("Api", {
      handler: "packages/api/src/lambda.handler",
      url: {
        cors: {
          allowOrigins: ["*"],
          allowMethods: ["GET", "POST", "OPTIONS"],
          allowHeaders: ["content-type", "authorization"],
        },
      },
      link: [databaseUrl, firebaseServiceAccount],
      environment: { NODE_OPTIONS: "--enable-source-maps" },
      nodejs: { sourcemap: true },
    });

    const web = new sst.aws.StaticSite("Web", {
      path: "packages/web",
      build: { command: "npm run build", output: "dist" },
      errorPage: "index.html",
      environment: {
        VITE_API_URL: api.url,
        VITE_FIREBASE_PROJECT_ID: "ready-lets-go",
      },
      dev: { command: "npm run dev" },
    });

    return { api: api.url, web: web.url };
  },
});
```

And the API entry point:

```ts
// packages/api/src/lambda.ts
import { handle } from "hono/aws-lambda";
import { app } from "./app.js";

export const handler = handle(app);
```

```ts
// packages/api/src/db.ts
import { Resource } from "sst";
import { neon } from "@neondatabase/serverless";

export const sql = neon(Resource.DatabaseUrl.value);
```

Remember the project's `NodeNext` rule: relative imports carry `.js` even in `.ts` sources.

First-run sequence:

```sh
npx sst@latest init
npx sst secret set DatabaseUrl "postgres://..."
npx sst secret set FirebaseServiceAccount < service-account.json
npx sst dev
# later
npx sst secret set DatabaseUrl "postgres://prod..." --stage production
npx sst deploy --stage production
```

## Open questions

- Does `StaticSite` accept `link`? The component reference doesn't document a `link` prop,
  and it wouldn't help us anyway (no server), but worth a glance if we ever add SSR.
- Custom domain + `Router` — needs a registered domain and a Route 53 hosted zone; defer.
- Whether Firebase token verification needs the service account at all, or just the public
  certs and project ID. Decide when building auth.
- Lambda cold start with the Neon serverless driver over HTTP vs a pooled TCP connection —
  measure rather than guess.

## Sources

- [Function component](https://sst.dev/docs/component/aws/function/)
- [ApiGatewayV2 component](https://sst.dev/docs/component/aws/apigatewayv2/)
- [StaticSite component](https://sst.dev/docs/component/aws/static-site/)
- [Router component](https://sst.dev/docs/component/aws/router/)
- [Secret component](https://sst.dev/docs/component/secret/)
- [Linking](https://sst.dev/docs/linking/)
- [Live (`sst dev`)](https://sst.dev/docs/live/)
- [CLI reference](https://sst.dev/docs/reference/cli/)
- [Config reference (`app()` / `run()`)](https://sst.dev/docs/reference/config/)
- [Set up a monorepo](https://sst.dev/docs/set-up-a-monorepo/)
- [Hono on AWS](https://sst.dev/docs/start/aws/hono/)
- [Basics](https://sst.dev/docs/basics/)

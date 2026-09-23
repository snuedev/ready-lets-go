# Verifying a Firebase ID token inside a Lambda

Research note for [Verify a Firebase ID token inside a Lambda](https://trello.com/c/ko3NNHKk), a ticket on the [stack map](https://trello.com/c/YzFPLEUy). Background: [ADR 0002](../adr/0002-firebase-auth-on-aws.md).

**Recommendation: use `jose` plus Google's published signing keys, not `firebase-admin`.** Detail and the numbers behind that are below.

## The short version of how this works

A Firebase ID token is a JWT — a JSON payload with a signature stapled to it. Google signs it with a private key that only Google has. Google publishes the matching *public* keys at a stable URL. Anyone holding a public key can check "did the holder of the private key sign this exact payload?" without asking Google anything.

That is why the Lambda never has to call Firebase per request: the proof of genuineness travels inside the token. The only network call is fetching the public keys, and those change rarely enough to cache for hours.

Firebase's own docs describe exactly this split: use the Admin SDK, *or* "use a third-party JWT library" and do the checks yourself.[^verify]

## What must be checked

Firebase lists these as mandatory. Missing any one of them turns verification into decoration.[^verify]

| Claim | Where | Requirement |
| --- | --- | --- |
| `alg` | header | `RS256` |
| `kid` | header | matches one of Google's published keys |
| signature | — | verifies against that key |
| `exp` | payload | in the future |
| `iat` | payload | in the past |
| `auth_time` | payload | in the past |
| `aud` | payload | equals the Firebase project ID |
| `iss` | payload | `https://securetoken.google.com/<projectId>` |
| `sub` | payload | non-empty string; this is the user's `uid` |

Pinning `alg` to `RS256` matters more than it looks. A JWT library that trusts the token's own `alg` header can be talked into accepting `alg: none` or into treating the public key as an HMAC secret. `jose` takes an explicit `algorithms` option for this; pass it.[^josetypes]

Google's signing keys live at
`https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com` (X.509 certificates) or, in standard JWKS form,
`https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`.[^verify]

## `firebase-admin` vs `jose`

Measured on 2026-09-19, Node v24.19.0, npm-installed into an empty project.

| | `firebase-admin` 14.4.0 | `jose` 6.2.12 |
| --- | --- | --- |
| Published tarball, unpacked | 1.42 MB, 244 files | 0.21 MB, 80 files |
| Installed with dependencies | **85 MB, 5,861 files** | **412 KB, 81 files** |
| Direct runtime dependencies | 7 (`jsonwebtoken`, `jwks-rsa`, `google-auth-library`, `@firebase/database-compat`, ...) | **0** |
| `import` cost, warm disk (3 runs) | 103.5 / 101.8 / 100.7 ms | 26.8 / 25.1 / 28.7 ms |
| RSS after import | ~76 MB (baseline ~42 MB) | ~58 MB (baseline ~42 MB) |

Dependency counts are from the npm registry metadata for each package's `latest` version; sizes from `du` over a clean `npm install` of each package alone.

Two things to read carefully here.

**The 85 MB is not the tarball.** `firebase-admin` pulls in the whole Firebase surface — Realtime Database, Firestore's gRPC stack, Google's auth library — because it is one package for every Firebase product, and we want one function out of it. On Lambda that weight lands in two places: the deployment bundle (which Lambda downloads during a cold start[^lifecycle]) and the ~100 ms of module evaluation during `Init`.

**100 ms vs 25 ms is not the whole cold-start story, but it is the part we control.** AWS puts a typical cold start at "under 100 ms to over 1 second" and names "the size of the function package, in terms of imported libraries and dependencies" as a factor in init latency.[^lifecycle] Saving ~75 ms of import time on a cold start, on maybe <1% of invocations, is real but small; the smaller bundle and the 5,800 fewer files to bundle through SST's esbuild step are the more consistent wins.

**Credentials.** I expected `firebase-admin` to need a service-account key to verify. It does not: `initializeApp({ projectId })` with no credential at all gets as far as decoding the token (verified empirically — it returns `auth/argument-error` about the malformed JWT, not a credential error). So the credential argument does not decide this. But `checkRevoked: true` *does* call the Firebase backend, which Firebase itself calls "an expensive operation, requiring an extra network round trip",[^sessions] and that path would need credentials.

**Where `firebase-admin` would win:** if we later need to *manage* users from the backend — create them, set custom claims, revoke refresh tokens, list accounts. None of that is on the map. If it arrives, it is a separate dependency in a separate module, not a reason to carry the SDK in the request path today.

## How the keys get cached between invocations

Lambda freezes rather than destroys an execution environment after an invocation, and "objects declared outside of the function's handler method remain initialized".[^lifecycle] So a key cache held in module scope survives across invocations of the same environment for free — no Redis, no `/tmp`, no DynamoDB. It does *not* survive across concurrent environments, and AWS "terminates execution environments every few hours",[^lifecycle] so each environment will fetch the keys once. That is the right trade: a handful of fetches per environment lifetime, not one per request.

Google's endpoint tells you how long to cache. A live request on 2026-09-19 returned:

```
cache-control: public, max-age=22755, must-revalidate, no-transform
```

~6.3 hours. The value counts down towards the next key rotation, so it varies per request. Google's guidance is to respect it: "you can cache them using the cache directives of the HTTP response and, in the vast majority of cases, perform local validation much more efficiently".[^oidc]

The two libraries treat that header differently:

- **`firebase-admin`** parses `max-age` out of the response and caches until then (`lib/utils/jwt.js`: it reads `resp.headers['cache-control']`, finds `max-age`, and sets `publicKeysExpireAt = Date.now() + maxAge * 1000`). So it honours the full ~6 hours.
- **`jose`**'s `createRemoteJWKSet` ignores the header and uses its own `cacheMaxAge`, **default 600000 ms (10 minutes)**; `Infinity` disables expiry. It also has `cooldownDuration`, default 30000 ms — "time in milliseconds after a successful fetch before a missing key can trigger another fetch", which is what makes it re-fetch promptly when a token arrives signed by a key it has never seen, i.e. right after a Google rotation. `timeoutDuration` defaults to 5000 ms.[^remotejwks]

So with `jose` we should raise `cacheMaxAge` (six hours is defensible, and `cooldownDuration` covers the rotation case), and create the JWKS object **once at module scope**, not inside the handler — a per-request `createRemoteJWKSet` would throw the cache away every request and re-fetch, which is exactly the thing this ticket is trying to avoid.

`jose`'s `jwtVerify` covers `issuer`, `audience`, `algorithms`, `subject`, `clockTolerance`, `maxTokenAge` and `requiredClaims` as options.[^josetypes] It does **not** know about `auth_time` — that check is ours to write.

## Which claim identifies the user

`sub`. Nothing else.

The Admin SDK's own type definitions describe the payload precisely: `sub` is "the `uid` corresponding to the user who the ID token belonged to", and the `uid` property "is not actually in the JWT token claims itself. It is added as a convenience, and is set as the value of the `sub` property."[^decoded] So `sub` and `uid` are the same string; `uid` only exists if you go through `firebase-admin`. Verifying with `jose`, you read `sub`.

The rest of the payload, and why none of it is a key:

| Claim | What it is | Safe as a DB key? |
| --- | --- | --- |
| `sub` / `uid` | the Firebase user id | **Yes.** This is the one. |
| `email` | the user's email, if any | No — optional, and changeable |
| `email_verified` | whether that email is verified | No — a boolean, and it can flip |
| `phone_number` | if any | No — optional, changeable |
| `picture` | photo URL | No |
| `auth_time` | when the user actually signed in — *not* when this token was minted. "In a single session, the Firebase SDKs will refresh a user's ID tokens every hour. Each ID token will have a different `iat` value, but the same `auth_time` value." | No |
| `firebase.sign_in_provider` | `"google.com"`, `"password"`, `"anonymous"`, ... | No |
| `firebase.identities` | provider-specific identity details | No |

Google is blunt about the email trap: "you **shouldn't** use the `email` field in the ID token as a unique identifier for a user. Always use the `sub` field as it is unique to a Google Account even if the user changes their email address", and separately, of `email`: "the value of this claim may not be unique to this account and could change over time, therefore you shouldn't use this value as the primary identifier to link to your user record."[^oidc]

This matches ADR 0002 already: "every table references a user by the Firebase user id rather than by a foreign key." Concretely, the Neon column is `text` — Firebase `uid`s are strings of 1–128 characters[^manageusers] — and it should be `not null`, with no foreign key, because the row it would point at lives in Firebase.

One caveat worth knowing before it bites: `firebase.sign_in_provider` can be `"anonymous"`. An anonymous user gets a real `uid` and a valid token, so verification passes and rows get written under a `uid` nobody can ever sign back into unless the anonymous account is later linked. If we never enable anonymous sign-in, this is moot; if we do, the handler should decide deliberately whether an anonymous `sub` is allowed to write.

## What this means for our code

- One module — call it the verification seam ADR 0002 already describes — exporting something like `verifyIdToken(raw: string): Promise<{ userId: string }>`.
- Module scope: `createRemoteJWKSet(...)` with a raised `cacheMaxAge`, built once.
- Handler: `jwtVerify(token, JWKS, { algorithms: ["RS256"], issuer: \`https://securetoken.google.com/${projectId}\`, audience: projectId })`, then assert `sub` is a non-empty string and `auth_time` is in the past, then return `sub` as the user id.
- Everything downstream sees a user id string. Nothing else in the codebase imports `jose` or knows the word "Firebase".
- Not doing: revocation checking. It costs a network round trip per request,[^sessions] and tokens expire in an hour anyway.[^sessions] If we ever need instant sign-out, that is its own ticket.

## Open questions this did not answer

- Whether SST v3's esbuild bundling handles `jose`'s ESM cleanly in the Lambda target we pick — expected to be fine (zero deps, tree-shakeable ESM) but unverified here.
- Whether we want `clockTolerance`. Lambda clocks are NTP-synced, so probably not, but a few seconds costs nothing.

## Sources

[^verify]: Firebase, *Verify ID Tokens*. https://firebase.google.com/docs/auth/admin/verify-id-tokens
[^sessions]: Firebase, *Manage Session Cookies / session management*. https://firebase.google.com/docs/auth/admin/manage-sessions
[^manageusers]: Firebase, *Manage Users*. https://firebase.google.com/docs/auth/admin/manage-users
[^decoded]: `firebase-admin` 14.4.0 shipped type definitions, `lib/auth/token-verifier.d.ts`, interface `DecodedIdToken`. Reference page: https://firebase.google.com/docs/reference/admin/node/firebase-admin.auth.decodedidtoken
[^oidc]: Google Identity, *OpenID Connect*. https://developers.google.com/identity/openid-connect/openid-connect
[^lifecycle]: AWS, *Understanding the Lambda execution environment lifecycle*. https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html
[^remotejwks]: `jose` docs, `RemoteJWKSetOptions`. https://github.com/panva/jose/blob/main/docs/jwks/remote/interfaces/RemoteJWKSetOptions.md and `createRemoteJWKSet` https://github.com/panva/jose/blob/main/docs/jwks/remote/functions/createRemoteJWKSet.md
[^josetypes]: `jose` 6.2.12 shipped type definitions, `dist/types/types.d.ts` (`JWTClaimVerificationOptions`, `VerifyOptions`). Repo: https://github.com/panva/jose

Package metadata (versions, dependency lists, unpacked sizes) from the npm registry: https://registry.npmjs.org/firebase-admin/latest and https://registry.npmjs.org/jose/latest. Install sizes, import timings and the no-credential behaviour were measured locally on 2026-09-19, Node v24.19.0.

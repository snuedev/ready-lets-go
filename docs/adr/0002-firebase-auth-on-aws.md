# Firebase Auth, verified inside Lambda

The app is deployed entirely on AWS, so Cognito would be the locally obvious choice, and a reader may reasonably wonder why identity lives in someone else's cloud. We chose Firebase Auth for developer familiarity and its social sign-in support, both of which outweigh Cognito's proximity at this size. Firebase is not in the request path: the browser obtains a signed ID token, and the Lambda verifies it against Google's public keys.

## Consequences

Users live outside our database, so every table references a user by the Firebase user id rather than by a foreign key. Verification is the only place the API knows Firebase exists, which keeps a later move to a different provider to one module rather than a rewrite.

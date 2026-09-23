# Static Vite SPA, not Next.js on Lambda

Server rendering buys faster first paint and SEO, neither of which applies to an app whose every screen sits behind a login. We chose a static React app built with Vite and served from S3 and CloudFront, rather than Next.js deployed to Lambda, because it avoids the Next-on-Lambda adapter layer entirely and leaves a deployable with very few moving parts. It also suits Firebase Auth, which is designed around the browser holding the session.

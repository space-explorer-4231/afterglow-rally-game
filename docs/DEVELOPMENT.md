# Development and hosting

## Repository layout

| Path | Purpose |
| --- | --- |
| `source/src` | Editable React client, physics, vehicles, maps and UI |
| `source/server/src` | Node relay, shared room and race logic |
| `source/server/worker` | Cloudflare Durable Object adapter |
| `source/tests` and colocated tests | Regression tests |
| `source/scripts` | Original build, asset and diagnostic tools |
| `source-assets` | Asset checksums and the newer Nightfall model overlay |
| `scripts/restore-source-assets.mjs` | Prepare ignored runtime assets for source builds |
| `game-*.tar.gz`, `asset-manifest.json`, `unpack.cjs` | Legacy 1.36.1 compiled deployment and integrity checks |

The root `npm run build` remains the legacy archive unpacking operation. Use commands inside `source/` to compile editable code. Do not confuse the two versions or deploy a root bundle believing it contains the 1.38.2 source changes.

## Source setup

Run the README's commands from a normal clone with the archive blobs available. Asset preparation verifies the archive hashes, restores the compiled donor bundle and copies each checksummed runtime asset to ignored `source/public/`. It overwrites matching generated public assets but does not delete your other files. Keep edited asset masters outside that generated directory and update provenance and checksums for deliberate replacements.

The assets are roughly 250 MB. Restoring them reuses files already in repository archives; it is not an extra asset download. Review the media licenses before redistribution.

`npm run dev` serves the client with hot reload. Run the Node relay alongside it at port 8791; Vite proxies `/ws`. A production build is served by the relay itself at `http://localhost:8791/`. Set `HOST=127.0.0.1` for a local-only relay or use the existing default network binding deliberately when testing another device.

## Verification

- `npm run typecheck`: strict client types.
- `npm run check:web`: types, lint and web-focused tests; two Android-packaging files are excluded explicitly.
- `npm run check`: complete suite, including packaging tests requiring APK export artifacts.
- `npm --prefix server run build`: strict Node compilation.
- `npm run build`: production client and compression.

The web workflow does not certify Android exports, every rendered car/map pairing, physical devices or minimum frame rates. Dependency and lint warnings should be reported, not hidden. Keep protocol/race checks separate from rendered driving and real-device playtests.

## Cloudflare forks

The example `source/edge/wrangler.jsonc` intentionally uses a fork worker name and omits the owner's account ID. Supply your own account details and choose a unique worker name; never commit credentials.

After building `source/dist`, install dependencies in `source/edge`, run its `npm run check`, then use `npm run dev` or deploy explicitly to your own account. The Worker serves assets and routes `/ws` and health endpoints to one room coordinator. The configuration requires SQLite-backed Durable Objects. Free quotas are finite; do not enable paid plans merely to follow these instructions.

Live matches are in memory and can reset during deployments or runtime restarts. The SQLite binding does not mean matches are durably saved. Snapshot delivery and interpolation are separate from rendering FPS.

## Scope of this publication

The source snapshot follows the approved 1.38.2 game. Publishing the source and documentation does not retune the live game, alter paid services or change the deployed soundtrack. Existing scripts for asset research may require their original input masters; they are not all turnkey download tools. Android packaging remains separate work.

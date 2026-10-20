# Aeroline 1.30.1 — Road Run

Aeroline 1.30 addresses screenshot-reported contrast failures and unclear menu priority. Solo, Multiplayer and Car & Track are the large primary actions; Options/Credits are smaller. Explicit nested label colors fix dark text on green and white car names on cream, and car choices now expose their selected state. Keyboard/controller indices follow the visual order.

The five Speed Fleet bodies are replaced with adapted CC0 models: Innerscene's unbranded crossover/pickup/van and Spectral GT RS by JaronKBragg7337. Meridian is a lowered touring derivative. Sources, licenses, hashes and modifications ship in asset credits/manifest. Static wheel assemblies and decorative badges are removed; existing suspension-driven wheels remain. Ordinary/mobile variants are separately simplified to under 50k triangles each, batched by material and use reflective opaque glass to avoid per-car transmission passes. Handling and shared Cup scoring remain unchanged.

Ten loading illustrations rotate across transitions, retaining the original coast and all three 1.29 images. Six additional photographic-style original images cover canyon, snow, forest, night waterfront, storm coast and sunrise country roads. Only the selected background loads. These are illustrations, not exact gameplay representations. Harbor Ring has shorter blocks, warm terracotta/ochre/sage façades, varied awnings and warmer afternoon atmosphere; course and obstacle clearance remain intact.

Version 1.30.1 also makes the existing start gantry visible in free roam so the challenge start line can be found. Road Run replaces the badge card with a passive four-sector loop challenge in free roam, including multiplayer free roam. It displays sector durations, elapsed time, on-road accuracy and a local setup-specific best. A complete ordered forward lap with at least 90% road accuracy may save a best; pause/hidden tab/recovery/reverse/jump/teleport discontinuities discard partial runs. This is local practice telemetry, not a server-authoritative competitive score. Accuracy measures the road corridor, not painted-lane recognition.

Validation: strict client/server types and production builds pass; lint has no errors. Full suite: 2,190 passing executions (27 compiled-server repeats) and ten unchanged inherited Android APK export failures. Tests cover challenge timing/discontinuities/records, ten real image files, full/optimized fleet budgets and normals, updated loading/entry copy and Harbor instancing/clearance/cleanup. Four local WebSocket clients complete three Cup races with identical points/champion and automatic cleared next Cup. Asset/Brotli/range/HDR/NOS snapshots, host transfer and loading/voting/countdown/reset checks pass.

All current build files are compared byte-for-byte with the reconstructed deployment. Offline GLB projections inspect geometry only; browser PBR visuals, phone/controller interaction, FPS and human enjoyment remain unverified. The first procedural fleet iteration was discarded after silhouette inspection. No paid hosting change or contest submission. Public verification follows deployment.

## Play

Solo jumps into driving. Multiplayer → Start a race room → Copy invite link. The host starts the first race; three races decide the Club Cup champion. Subsequent races/Cups start automatically. Car & Track customizes a solo drive. No account or installation.

WASD/arrows drive; Shift / L3 / touch NOS boosts, with twelve released-button active-driving seconds to refill. Space / X / Square handbrake; double R / Y recovery; Esc / Menu pause. Car preview: drag, right stick or Alt+arrows. Road Run starts near/crossing the start line in free roam.

## Hosting

Node 24+: npm ci --omit=dev --ignore-scripts, npm run build, npm start. Render uses dev, health /health, protocol 1.30. Free instances may sleep; room/Cup state resets on service restart. Archives are SHA-256 verified. Editable source remains on the creator's desktop.

## Licenses

OpenRally and original fleet/forged wheel meshes: MIT. BMW body adapted from 2001 BMW M3 GTR by Dave Love SketchFab (Tyler_Dave), CC BY 4.0: https://sketchfab.com/3d-models/2001-bmw-m3-gtr-6bb4d180cd0d454ba62fbfae24fc5155 . License: https://creativecommons.org/licenses/by/4.0/ . Duplicate mesh passes and static wheel assemblies removed, transforms normalized. BMW does not sponsor or endorse the game. Full attribution ships in ASSET-CREDITS.md, BMW-M3-LICENSE.txt and THIRD-PARTY-NOTICES.md.

Developed by Mateusz Zalewski with AI assistance.


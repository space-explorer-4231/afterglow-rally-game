# Aeroline 1.29.0 — Road Club

The opening menu covered the scene, multiplayer used text-only car choices, and the lobby/pause screens had dense instructions and inconsistent colors. Aeroline 1.29 introduces Road Club: a bottom action dock, more open car framing, and a warm ivory/sea-green interface across the main screens.

Multiplayer now shows the actual selected 3D car with mouse/touch rotation, right-stick orbit and keyboard inspection. One demand-rendered preview uses local HDR reflections and bounded DPR; geometry caches remain shared. Quick room creation honors that selected car. Larger stage and room cards combine destination imagery with exact checkpoint-route diagrams. The lobby replaces long paragraphs with three Cup facts and optional controls/rules. Pause, Cup results and session tools share the same palette; creator/version metadata stays out of the front-facing screens while Credits retain attribution.

Three original loading backgrounds cover coastal sunset, alpine dusk and harbor night, refined toward photographic realism and debadged. Total WebP size is 800,390 bytes. These are illustrations, not gameplay screenshots. Current menu/driving music is Coastline Drive, an original 112 BPM procedural score with synthesized percussion, harmonic sections and speed/NOS layers. Saved volumes, user-gesture audio unlock, hidden/paused mute and teardown are handled in one shared-context lifecycle. Boosting above 88 km/h unlocks a local secret radio layer and badge without changing race performance or scoring.

Validation: strict client/server types and production builds; zero lint errors with inherited warnings. Full suite: 2,165 passing executions and ten inherited Android APK export failures; 27 passing executions repeat compiled server tests. New tests cover all fourteen car-preview captions, all six route previews, three loading-art variants, music/numerical behavior and local discovery. Four real WebSocket clients complete three Cup races with identical scores/champion and automatic Cup reset. Existing assets/Brotli/NOS synchronization, loading/voting/reset and host-transfer checks pass. The actual audio graph renders for 35 seconds in a test-only Web Audio emulator with finite samples, peak 0.305, no clipping, and silence after disposal. The emulator is not a shipping dependency.

All 294 current build files match the reconstructed deployment byte-for-byte. Browser visual/FPS, real device/controller interaction and listening quality still require hands-on verification. Automated/SSR checks are not a substitute for that playtest. No paid hosting changes. Public deployment checks follow release; no contest submission is performed.

## Play

Open Multiplayer → Start a race room, choose a car and share the room invite. The host starts the first race; three races decide the Club Cup champion and subsequent races/Cups start automatically after results. No accounts or installation. Custom rooms let you select destination and mode.

WASD/arrows drive; Shift / L3 / touch NOS boosts, with twelve released-button seconds to refill. Space / X / Square handbrake; double R / Y recovery; Esc / Menu pause. Car preview: drag, right stick or Alt+left/right arrows. Menu controls retain keyboard/gamepad focus. Credits retain creator and third-party asset attribution.

## Hosting

Node 24+: npm ci --omit=dev --ignore-scripts, npm run build, npm start. Render uses dev, health /health, protocol 1.29. Free instances may sleep; room/Cup state resets when the service restarts. Archives are SHA-256 verified. Editable source remains on the creator's desktop.

## Licenses

OpenRally and original fleet/forged wheel meshes: MIT. BMW body adapted from 2001 BMW M3 GTR by Dave Love SketchFab (Tyler_Dave), CC BY 4.0: https://sketchfab.com/3d-models/2001-bmw-m3-gtr-6bb4d180cd0d454ba62fbfae24fc5155 . License: https://creativecommons.org/licenses/by/4.0/ . Duplicate mesh passes and static wheel assemblies removed, transforms normalized. BMW does not sponsor or endorse the game. Full attribution ships in ASSET-CREDITS.md, BMW-M3-LICENSE.txt and THIRD-PARTY-NOTICES.md.

Developed by Mateusz Zalewski with AI assistance.

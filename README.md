# Aeroline 1.27.0

Opening the game required stage/mode/car setup, and multiplayer rounds stopped at results until the host intervened. This update makes Play launch a prepared easy drive, puts a preconfigured friend-race action before optional garage choices, and keeps races going in the same room.

Multiplayer creation/join now waits for acknowledged room membership before entering gameplay. Pending joins show connection feedback, duplicate launch clicks are ignored, server failures remain visible in the menu, and a one-minute timeout allows retry. Friend invite links retain direct joining. The starting grid adds a Copy invite link action with a selectable-link fallback.

Server-owned Time Attack rematches show results for ten seconds, then reset and begin the next shared countdown automatically. Late arrivals must finish loading; host migration does not control the timer. Manual resets cancel automatic starts, and room cleanup clears timers. Hosts can also choose Race again now. Existing race timing, checkpoint order and DNF validation remain.

NOS empty-to-full recharge is reduced from 30 to 12 released-button simulation seconds. The large driving guide no longer opens automatically; concise controls stay in the driving console and detailed help remains optional. Custom drive retains stage/car/mode selection.

Validation: strict client types, zero lint errors (inherited warnings remain), production client/server builds, 2,099 passing automated test executions with ten inherited missing Android APK export failures. Nineteen executions repeat compiled server tests. New tests cover automatic rematches, late loading/departures, manual cancellation, cleanup, direct Play and the primary friend-race action. A separate virtual-clock test runs sixty rematches over twenty simulated minutes without timer buildup. Real twelve-client WebSocket testing verifies shared results, host handoff and an automatic second countdown/GO. Public checks are recorded in the verification report.

This does not establish twenty minutes of human enjoyment, device FPS or phone/controller visual quality. A new friend playtest is still necessary. No paid hosting changes.


## Play

Play starts a prepared drive with automatic gears, AWD and ESP support. Multiplayer → Start a race room creates an Island race with an easy rally car. Copy the invite link for friends. The host starts the first race; subsequent races start automatically after the results. Free Roam and custom rooms remain available. No account or installation.

WASD/arrows drive, Space handbrake, hold Shift NOS, double R recovery, Esc pause. Controller: triggers/stick drive, X/Square handbrake, L3 NOS, Y recovery. Phones use touch controls. Races: one lap, gates in order, first finish wins, thirty seconds for remaining drivers.

## Hosting

Compiled client and relay. Node 24+: npm ci --omit=dev --ignore-scripts, npm run build, npm start. Render deploys dev, health /health, protocol 1.27. Free instances may sleep; rooms reset on restart. Archives are SHA-256 checked. Editable source stays on the creator's desktop.

## Licenses

OpenRally and original fleet/forged wheel meshes: MIT. BMW body adapted from 2001 BMW M3 GTR by Dave Love SketchFab (Tyler_Dave), CC BY 4.0: https://sketchfab.com/3d-models/2001-bmw-m3-gtr-6bb4d180cd0d454ba62fbfae24fc5155 . License: https://creativecommons.org/licenses/by/4.0/ . Duplicate mesh passes and static wheel assemblies removed, transforms normalized. BMW does not sponsor or endorse the game. Full attribution ships in ASSET-CREDITS.md, BMW-M3-LICENSE.txt and THIRD-PARTY-NOTICES.md.

Developed by Mateusz Zalewski with AI assistance.

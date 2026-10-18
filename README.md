# Aeroline 1.28.0 — Club Cup

Multiplayer had isolated one-lap results but no shared goal between races. Time Attack rooms now run Club Cup: a three-race championship with server-owned points, a shared champion and an automatic fresh Cup after the results break. No new accounts or setup are required.

Finishing positions earn 12/10/8/7/6/5/4/3/2/1/1/1 points; DNF earns zero. Scores commit once per completed room round, survive host migration and retain departed drivers for the current Cup. Abandoned starts do not consume a race. Late arrivals can score the remaining races. Ties use wins, finishes, total finish time and session ID. History is bounded to three twelve-driver fields; aborted rosters cannot accumulate stored entries. All-DNF Cups have no champion.

The existing driving standings show Cup race number, personal points/position and the points gap to the leader. Results use a blue championship table with a visible personal summary, six-row pages, points gained and a champion title after race three. Paging and next-race actions retain keyboard/gamepad navigation; the lobby explains the goal. Protocol 1.28 adds runtime-validated Cup data to shared race results.

Validation: strict client/server TypeScript and production builds, zero lint errors with inherited warnings, 2,137 passing full-suite executions and ten inherited missing Android APK export failures. Twenty-seven passing executions repeat compiled server tests. New tests exercise scoring idempotency, abandoned races, late arrivals, bounded history, tie breaks, reset behavior, malformed packets and HUD states. Twelve actual WebSocket clients complete three races, agree on every point/champion, and enter a new Cup automatically. Two concurrent twelve-client rooms run for 90 seconds, including a receiver paused for 45 seconds. Four-client lifecycle checks include leave/jump DNF, late spectator, rejected guest reset and host handoff; existing asset/NOS/rejoin/voting checks pass. Public verification follows deployment.

Limitations: synthetic clients do not measure rendering FPS or human enjoyment. Relay stress cadence was around 47 ms median under concurrent checks, not a guaranteed 30 Hz. Real phone/laptop/controller playtesting remains necessary. Physics is still client-simulated; Cup scoring is not cheat-proof. No paid hosting changes.

## Play

Open Multiplayer → Start a race room, copy the invite link, and send it to friends. The host starts the first race; the server starts subsequent races automatically after ten-second results breaks. Three races decide the Cup champion, then a fresh Cup begins. No account or installation. Late arrivals can score the remaining races; leaving/rejoining creates a new score identity.

WASD/arrows drive, Space handbrake, hold Shift NOS, double R recovery, Esc pause. Controller: triggers/stick drive, X/Square handbrake, L3 NOS, Y recovery. Phones use touch controls. Follow one lap of ordered gates; remaining drivers get thirty seconds after the first finish. NOS recharges in twelve released-button simulation seconds. ESP is enabled in the quick-start preset.

## Hosting

Compiled client and relay. Node 24+: npm ci --omit=dev --ignore-scripts, npm run build, npm start. Render deploys dev, health /health, protocol 1.28. Free instances may sleep; rooms/Cup points reset on restart. Archives are SHA-256 checked. Editable source stays on the creator's desktop.

## Licenses

OpenRally and original fleet/forged wheel meshes: MIT. BMW body adapted from 2001 BMW M3 GTR by Dave Love SketchFab (Tyler_Dave), CC BY 4.0: https://sketchfab.com/3d-models/2001-bmw-m3-gtr-6bb4d180cd0d454ba62fbfae24fc5155 . License: https://creativecommons.org/licenses/by/4.0/ . Duplicate mesh passes and static wheel assemblies removed, transforms normalized. BMW does not sponsor or endorse the game. Full attribution ships in ASSET-CREDITS.md, BMW-M3-LICENSE.txt and THIRD-PARTY-NOTICES.md.

Developed by Mateusz Zalewski with AI assistance.

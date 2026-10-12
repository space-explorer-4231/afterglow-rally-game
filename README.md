# Aeroline: Open Road Club

Version 1.21.0. Multiplayer driving game based on MIT-licensed OpenRally.

WASD/arrows to drive, Space handbrake, press R twice within two seconds to recover, Esc pause. Touch and gamepad supported. Friends join Multiplayer with the same room code without accounts.

This update adds a detailed BMW M3 Aero Drift, rebuilds the five Speed Fleet bodies and shared forged wheels, and gives all fourteen vehicles distinct live grip, brake, steering and stability profiles. Fast SUVs, trucks and the van pay for speed with weight, longer stopping distances and slower steering response. The BMW balances road grip with progressive RWD drift breakaway.

Drift Club adds optional 90-second free-roam heats. Controlled slides at 30–220 km/h and 12–65 degrees build multipliers; direction links earn bonuses. Straighten for 1.5 seconds to bank. Spins, rollovers, resets and long airtime lose the unbanked chain. Medals and per-car/per-map personal bests persist locally. Room scoreboards share each driver's personal heat score; starts are independent. These friendly client-reported scores are not cheat-proof.

## Hosting

Compiled client and relay server. Node 24+: npm ci --omit=dev --ignore-scripts, npm run build, npm start. Render deploys branch dev with health path /health. Free instances sleep and can take time to wake. Rooms reset on server restart. Client protocol 1.21 requires this server. Archives are SHA-256 checked before extraction.

## Validation

1,895 automated tests passed; ten pre-existing Android APK export tests fail. Client/server production builds passed. Real Rapier BMW grip/drift/recovery checks at 30/60/120 Hz passed. Heavy fleet braking tradeoffs and fourteen-car reverse bounds passed. Local relay stress with 24 simulated players in two concurrent rooms, including a receiver paused for 45 seconds, passed and preserved Drift Club scores. Asset transport, host handoff, reconnect churn and race lifecycle checks passed. Exact built files are verified against the packaged deployment. These tests do not measure device rendering performance; studio previews are offline renders.

## Licenses

OpenRally and original fleet/forged wheel meshes: MIT. BMW body adapted from 2001 BMW M3 GTR by Dave Love SketchFab (Tyler_Dave), CC BY 4.0: https://sketchfab.com/3d-models/2001-bmw-m3-gtr-6bb4d180cd0d454ba62fbfae24fc5155 . License: https://creativecommons.org/licenses/by/4.0/ . Duplicate mesh passes and static wheel assemblies removed, transforms normalized. BMW does not sponsor or endorse the game. Full attribution ships in ASSET-CREDITS.md, BMW-M3-LICENSE.txt and THIRD-PARTY-NOTICES.md. Source masters and editable implementation remain on the creator's desktop.

Developed by Mateusz Zalewski with AI assistance.
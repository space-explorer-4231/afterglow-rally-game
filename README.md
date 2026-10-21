# Aeroline 1.35.0

Public browser driving: solo practice and room-code multiplayer without accounts or installation.

## Spin catch and Boost Hunt

A universal grounded spin catch uses corrective yaw torque when a slide approaches over-rotation. Normal steering, small drift angles, suspension, traction, braking and optional ESP steering remain. It does not snap vehicle pose or linear velocity, and does not override airborne or overturned-body physics.

Boost Hunt is a local free-roam 90-second ring chase on all six maps. Chase amber road rings, collect 100 points times a combo up to five, and restore35% NOS on pickups (full NOS every fifth ring). Link rings within eight seconds. Three reusable visual rings guide the next targets without colliders or new asset downloads. Start/end and replay use the existing road HUD card. Pause/hidden tabs suspend the timer; recovery ends the current hunt. Local casual scores do not alter authoritative Cup results.

## Verification

Strict client types and production client/server builds pass. Full suite:2,282 pass and ten inherited Android APK export failures; no new lint messages. Physics checks cover fourteen cars in three drive modes, at30/60/120Hz, for severe slides in both directions, while existing drift checks remain. The84 car/map terrain simulations each run60 simulated seconds with no rollovers or invalid physics. Ten fresh browser game sessions use ten cars across six maps, closing the tab between sessions; test logs/screenshots record loading, controls, pause, Hunt and recovery smoke checks. They do not prove absence of every bug or establish real-device FPS.

## Play and hosting

WASD/arrows drive; Shift/L3/touch NOS boosts; Space handbrakes; double R recovers; Esc pauses. Start Boost Hunt from the road card in Free Roam. Node24+, dev branch, /health, protocol1.35. Render free instances may sleep; deployment restarts room state. No paid hosting change or contest submission.

## Licenses

OpenRally and original fleet/forged wheel meshes: MIT. BMW body adapted from 2001 BMW M3 GTR by Dave Love SketchFab (Tyler_Dave), CC BY 4.0: https://sketchfab.com/3d-models/2001-bmw-m3-gtr-6bb4d180cd0d454ba62fbfae24fc5155 . License: https://creativecommons.org/licenses/by/4.0/ . Duplicate mesh passes and static wheel assemblies removed, transforms normalized. BMW does not sponsor or endorse the game. Full attribution ships in ASSET-CREDITS.md, BMW-M3-LICENSE.txt and THIRD-PARTY-NOTICES.md.

Developed by Mateusz Zalewski with AI assistance.

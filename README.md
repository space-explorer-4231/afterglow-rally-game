# Aeroline: Open Road Club

Version 1.23.0 — Driving stability and thruster NOS update. Multiplayer driving game based on MIT-licensed OpenRally.

Drive with WASD/arrows, Space handbrake, hold Shift for NOS, press R twice within two seconds to recover, Esc pause. Controller: triggers/stick to drive, X/Square handbrake, hold L3 for NOS, Y/Triangle recovery. Phones have a hold-to-use NOS button. Friends join Multiplayer with a room code, without accounts.

## New in this update

Road Mastery expands free-roam goals into nine permanent personal badges per car and district. Explorer milestones: 1/5/15 km. Corner artist: 100/500/1,500 m of controlled drifts. Boost pilot: 2/5/10 seconds of moving NOS use. Bronze, silver and gold badges raise the driver rank from New arrival to District legend. Progress saves on the current device and browser. Pauses, spectating, airborne driving, reverse, stationary wheelspin and teleports do not earn progress. The card is passive and untimed; vehicles stay available to everyone. Progress is personal, not a shared or cheat-proof competition.

Every car starts a drive or a new race with two five-second NOS tanks. Hold the button in a forward gear, including from rest without pressing the accelerator; release to save fuel. NOS raises available wheel torque and the speed ceiling, with a bounded fuel-limited arcade acceleration impulse. Braking, reverse, handbrake, burnout, airborne and excessive-slip states inhibit boost and preserve fuel. Pausing does not use fuel. Free-roam recovery does not refill NOS. Remote exhaust effects use the synchronized active flag.

The BMW has wider speed-sensitive steering and controlled throttle-powered RWD slides. Extra drift power acts through driven tires. Progressive countersteering and yaw damping aid recovery. The previous automatic 360-degree routine and tangential drift thrust are removed: the driver steers the slide. A short garage description explains the handling.

Double-R recovery now persists across multiple physics steps until the render step consumes it. A held controller recovery button fires once until released. Touch NOS releases on cancel, lost pointer capture, hidden page or window blur.

## Existing game

Fourteen vehicles include the detailed BMW M3 Aero Drift and five rebalanced Speed Fleet bodies. Faster SUVs, trucks and the van trade speed for weight, stopping distance and steering response. Drift Club offers optional 90-second heats, banked combos, medals and saved personal bests. Room scoreboards show independently started personal heat scores.

## Hosting

Compiled client and relay server. Node 24+: npm ci --omit=dev --ignore-scripts, npm run build, npm start. Render deploys branch dev with health path /health. Free instances sleep and may take time to wake. Rooms reset on server restart. Client protocol 1.23 requires this server. Archives are SHA-256 checked before extraction. Editable source stays on the creator's desktop.

## Validation

1,976 automated tests pass; ten pre-existing Android APK export tests fail. Strict client types and client/server production builds pass. The handling matrix covers all fourteen cars, eight ABS/TCS/ESP combinations and 30/60/120 Hz (336 configurations), plus mirrored road corners and BMW gentle steering. Real Rapier tests at 30/60/120 Hz verify sustained BMW slides with net speed gain, steering authority, recovery and boost acceleration on all fourteen cars (42 car/rate combinations). Fuel exhaustion, partial steps, input blending, double-R latching, persistent badge tiers and teleport rejection are covered. Multiplayer checks include NOS on/off delivery, host transfer, reconnect churn, race loading/votes/countdown, and 24 simulated players in two rooms with a receiver paused for 45 seconds. Packaged current files are checked byte-for-byte. These checks do not measure device rendering performance; hands-on phone and controller driving remains necessary.

## Licenses

OpenRally and original fleet/forged wheel meshes: MIT. BMW body adapted from 2001 BMW M3 GTR by Dave Love SketchFab (Tyler_Dave), CC BY 4.0: https://sketchfab.com/3d-models/2001-bmw-m3-gtr-6bb4d180cd0d454ba62fbfae24fc5155 . License: https://creativecommons.org/licenses/by/4.0/ . Duplicate mesh passes and static wheel assemblies removed, transforms normalized. BMW does not sponsor or endorse the game. Full attribution ships in ASSET-CREDITS.md, BMW-M3-LICENSE.txt and THIRD-PARTY-NOTICES.md.

Developed by Mateusz Zalewski with AI assistance.

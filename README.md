# Aeroline 1.34.0

A public browser driving game: solo practice or shared room-code racing, without player accounts or installation.

## This release

Fifteen original loading illustrations shuffle every 7.7 seconds while preparation is underway; the original coastal artwork remains. Harbor Ring now has a detailed marina illustration in track selection. The loader covers asynchronous shader compilation and two final frames, and multiplayer readiness waits for physics, car visuals and renderer preparation. Repeated terrain compilation is reduced with a bounded cache. No artificial slideshow delay is added.

Shift boosts with available NOS during sliding, jumps, braking, handbraking and reverse. Short keyboard taps are preserved between simulation frames. Race starts and recovery still lock movement. Club-class acceleration and speed are closer across fourteen cars while body, drivetrain and suspension differences remain; loose-surface rear support improves control with ESP. BMW retains its asphalt drift behavior.

## Validation

All fourteen cars ran on all six map terrains for sixty simulated seconds each using real Rapier and the production contact solver: 84 combinations, 5,040 simulated seconds, zero invalid physics or rollovers. Same-bot route-progress spread narrowed substantially, including Snow from 1.917 to 1.097 and Highlands from 1.253 to 1.104. These are simplified-chassis terrain simulations, not manual playtests or a guarantee of equal lap times. Snow/Highlands retain route-following limitations. Browser/device FPS and audible playback are unmeasured. Ten inherited Android APK export failures remain separate from the web release. Desktop verification files record full checks, production builds and HTTP/WebSocket results.

## Play and hosting

WASD/arrows drive; Shift/L3/touch NOS boosts; Space/X/Square handbrakes; double R/Y recovers; Esc/Menu pauses. Multiplayer races award Club Cup points across three races. Node24+, dev branch, health /health, protocol1.34. Render free instances may sleep; room state resets on service restart. No paid hosting change or contest submission.

## Licenses

OpenRally and original fleet/forged wheel meshes: MIT. BMW body adapted from 2001 BMW M3 GTR by Dave Love SketchFab (Tyler_Dave), CC BY 4.0: https://sketchfab.com/3d-models/2001-bmw-m3-gtr-6bb4d180cd0d454ba62fbfae24fc5155 . License: https://creativecommons.org/licenses/by/4.0/ . Duplicate mesh passes and static wheel assemblies removed, transforms normalized. BMW does not sponsor or endorse the game. Full attribution ships in ASSET-CREDITS.md, BMW-M3-LICENSE.txt and THIRD-PARTY-NOTICES.md.

Developed by Mateusz Zalewski with AI assistance.

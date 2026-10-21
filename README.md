# Aeroline 1.33.1

A public browser driving game: solo practice or shared room-code racing, without player accounts or installation.

## This release

Home now has two primary choices: green Solo and red Multiplayer. Solo opens track/mode/car selection; multiplayer exposes car selection and map choices before creating a room. Options and Credits remain secondary. The BMW M3 is the initial car and live menu showcase. Selecting or reselecting every car restores ESP, ABS and TCS; each can still be switched off deliberately.

Double R and pause-menu recovery use the geographically nearest checkpoint in every mode and impose a three-second physics-time lock with a visible countdown. Race progress is preserved; a recovered competitive lap remains invalidated. Recovery cannot itself collect a checkpoint/NOS reward.

Reverse wheel force is 2.5 times its previous setting; the 25km/h reverse speed ceiling remains. Ordered race gates and free-roam Road Run sectors replenish 35% NOS capacity; halfway and finish replenish to full capacity. Repeated/wrong gates do not grant rewards.

Festival Radio attempts playback immediately and retries after a gesture if the browser blocks autoplay. It continues through menus, loading, pause and background instead of intentionally muting. Existing menu/game music volume settings remain authoritative. The ten-song order, looping, files and credits are unchanged. Browser/OS audio restrictions may still require the first interaction.

Harbor Ring gains connected paved urban blocks, service lanes, crossings, more planted trees, muted facade materials and stepped rooflines with matching roof colliders. Two or three decorative quad-rotor drones circle precomputed routes with animated propellers. Geometry/texture resources are shared and disposed. Scenery remains stylized browser 3D rather than matching illustrative loading art exactly.

## Validation

Strict client types pass; full automated check: 2,243 passing executions, ten unchanged inherited Android export failures. New checks cover ordered NOS rewards, geographically nearest checkpoints, three-second recovery at 30/60/120Hz, repeated selection of all fourteen cars, and reverse launch with all assists on across fourteen cars and all three drive modes. All 42 combinations exceed 19km/h within two seconds and stay straight. Existing reverse ceiling checks at 30/60/120Hz pass. Production/server builds and live HTTP/WebSocket checks are recorded in the desktop verification files. Soundtrack lifecycle tests cover pause/background/loading continuity, settings mute/resume and blocked autoplay gesture retry; the unused controller dependency is removed. No new lint messages relative to1.32. No actual-device rendering, audible playback or measured FPS validation is claimed.

## Play and hosting

WASD/arrows drive; Shift/L3/touch NOS boosts; Space/X/Square handbrakes; double R/Y recovers; Esc/Menu pauses. Multiplayer races award Club Cup points across three races. Node24+, dev branch, health /health, protocol1.33. Render free instances may sleep; room state resets on service restart. No paid hosting change or contest submission.

## Licenses

OpenRally and original fleet/forged wheel meshes: MIT. BMW body adapted from 2001 BMW M3 GTR by Dave Love SketchFab (Tyler_Dave), CC BY 4.0: https://sketchfab.com/3d-models/2001-bmw-m3-gtr-6bb4d180cd0d454ba62fbfae24fc5155 . License: https://creativecommons.org/licenses/by/4.0/ . Duplicate mesh passes and static wheel assemblies removed, transforms normalized. BMW does not sponsor or endorse the game. Full attribution ships in ASSET-CREDITS.md, BMW-M3-LICENSE.txt and THIRD-PARTY-NOTICES.md.

Developed by Mateusz Zalewski with AI assistance.


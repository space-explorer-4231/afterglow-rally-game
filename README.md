# Aeroline 1.36.1

Play at https://aeroline-road-club.aeroline-edge.workers.dev/ — solo practice and room-code multiplayer without player accounts or installation. The free Cloudflare deployment is live; Render is suspended after its free bandwidth allowance was exhausted. This repository retains the compatible optimized Node/Render build. No paid plan was enabled.

## Clearer driving, fewer overlays

Quick Drive starts a prepared car in one click. Solo and Multiplayer remain prominent; advanced settings stay secondary. Normal driving shows speed, boost and navigation. Optional Boost Hunt and Drift Club activities move into Pause, and short contextual tips introduce controls one at a time. Empty ghost/debug/radio panels no longer crowd the road.

The garage fits the actual selected model in a lit showroom, provides rotation and loading feedback, and keeps Start reachable. Custom-room Join actions remain visible, keyboard/controller focus follows selection, and cream surfaces use readable dark text. Touch controls use the same warm green/amber palette.

## Optional driver seat and weather

Settings offers a generic driver-seat cockpit with windshield and side-window frames, steering wheel and live instruments. Follow camera remains default; the ordinary camera cycle excludes driver seat. Clear skies remain default; optional rain responds to camera movement and scales with graphics quality without changing competitive grip.

Vegetation uses spatially bounded instance batches and a shared foliage texture sample. Close foliage fades near the camera; ordinary rolling tracks are lighter while sliding marks remain visible. Keyboard input resets on lost focus, and paused touch controls no longer cover menus.

## Verification

Strict types, targeted lint, regression tests, production client/server builds, local browser entry/cockpit/weather/touch/room tests and multiplayer protocol stress checks are recorded with the desktop source. Automated all-car/all-map physics simulation is separate from rendered driving coverage. The latest full run has 2,331 passing tests. Ten inherited Android APK export checks require unavailable packaging deliverables. Do not interpret this release as a guarantee of zero bugs or completed real-device certification.

## Controls and hosting

WASD/arrows drive; Shift/L3/touch NOS boosts while fuel remains; Space handbrakes; double R recovers to the nearest checkpoint with a three-second countdown; Esc pauses. Node 24+, dev branch, /health, protocol 1.36. Client telemetry and server snapshots use 20 Hz; presentation interpolates independently. Render free instances may sleep. No paid hosting change or contest submission.

## Licenses

OpenRally and original fleet/forged wheel meshes: MIT. BMW body adapted from 2001 BMW M3 GTR by Dave Love SketchFab (Tyler_Dave), CC BY 4.0: https://sketchfab.com/3d-models/2001-bmw-m3-gtr-6bb4d180cd0d454ba62fbfae24fc5155 . License: https://creativecommons.org/licenses/by/4.0/ . Duplicate mesh passes and static wheel assemblies removed, transforms normalized. BMW does not sponsor or endorse the game. Full attribution ships in ASSET-CREDITS.md, BMW-M3-LICENSE.txt and THIRD-PARTY-NOTICES.md.

Developed by Mateusz Zalewski with AI assistance.


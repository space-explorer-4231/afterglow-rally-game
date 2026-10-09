# AEROLINE 1.17 — Coastal District

Developed by **Mateusz Zalewski** with AI assistance, building on MIT-licensed [OpenRally](https://github.com/TensorDriftStudio/OpenRally). Play at https://afterglow-rally-game.onrender.com/ .

Drive freely or race friends in shared rooms without an account or installation. Eight cars, six maps. WASD/arrows drive; S/Down brakes then reverses; Space handbrake; R recover; C camera; Esc pause. V switches FWD/RWD/AWD; M automatic/manual; E/Q manual shifts; U KM/H/MPH; H opens the driving guide. Touch and gamepad controls remain supported.

Harbor Ring has three architectural families: photographed brick, white stucco and panel cladding, with balconies, window surrounds, shopfront awnings, roof parapets and mechanical details. Paved boulevards and photographed coastal trees, shrubs, lamps, benches and utility cabinets bring scale to the streets. Solid street furniture has simple fixed colliders, outside the racing corridor. Older maps gain corrected foliage color and wind-matched photographic cutout shadows.

Near trees retain the artist's three-dimensional leaf geometry. Far trees use eight transparent views rendered from that same model, with spatial culling and quality-dependent distances. Geometry is shared across street blocks. Reflection probes use the cheaper photographed distance representation and restore scene visibility afterward. Full-resolution material data channels are losslessly encoded; color compression and mesh quantization are lossy. Smaller original encoded images are retained where a conversion would enlarge them. Mobile variants explicitly reduce texture resolution. HTTP Brotli/gzip is lossless.

In **Multiplayer → Create Room → Time Attack**, drivers wait on the shared grid. The host selects **Start Race** after everyone loads, or a strict majority votes with at least three connected players. Ten drivers need six votes. The server owns the countdown; late arrivals spectate until the host selects **Return Everyone to Grid**. Free Roam stays immediate.

## Run locally or host

This repository contains compiled browser assets and the multiplayer relay. The complete editable project, original masters, research and test tools remain in the creator's Desktop/Game folder.

Node.js 24+:

```sh
npm ci --omit=dev --ignore-scripts
npm run build
npm start
```

Open http://localhost:8791 . Render supplies PORT; HOST defaults to 0.0.0.0. The existing Render service deploys `dev`, builds with `npm ci --omit=dev --ignore-scripts && npm run build`, starts with `npm start`, and checks `/health`. Free instances can sleep and take about a minute to wake. Rooms reset when the relay restarts. No paid hosting change is included.

SHA-256 validates all compiled archive layers. Source validation passes TypeScript and lint errors; 1,825 web/engine tests pass. Ten inherited signed-Android-export assertions fail because required APKs/Linux tools are absent. Those assertions were not weakened, and no Android APK is shipped. Actual local WebSocket room, host transfer, race vote and loading-gate checks pass. These tests do not establish ten-device GPU performance or perfect networking on every connection.

## Credits

OpenRally retains MIT licensing. Stradale GT is CC BY 4.0 by vicent091036. Added photographed models, materials and credited radio tracks are CC0. See ASSET-CREDITS.md, the bundled coastal PROVENANCE.json and THIRD-PARTY-NOTICES.md. Portable Blender is used only during preparation and is not shipped.

Patch 1.17.1 restores the shrub creator’s separate alpha mask; desktop and mobile foliage retain real leaf gaps instead of opaque cards. Both exports have automated coverage/opacity checks.

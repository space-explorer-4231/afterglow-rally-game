# AEROLINE 1.16 — Open Road Club

Developed by **Mateusz Zalewski** with AI assistance, building on MIT-licensed [OpenRally](https://github.com/TensorDriftStudio/OpenRally). Play at https://afterglow-rally-game.onrender.com/ .

Drive freely, learn to drift, and join friends without an account or installation. Eight cars and six maps. WASD/arrows drive; S/Down brakes then reverses; Space handbrake; R recover; Esc pause. V switches FWD/RWD/AWD; M automatic/manual; E/Q manual shifts; U KM/H/MPH; H driving guide. Touch and gamepad controls remain supported.

In **Multiplayer → Create Room → Time Attack**, everyone waits on the starting grid. The host selects **Start Race** after all maps load. With at least three connected players, a strict majority may vote to start: 2 of 3, 3 of 4, 6 of 10. Each player has one retractable vote. A server-owned three-second countdown shares one GO timestamp. Late arrivals watch the race until the host selects **Return Everyone to Grid**. Free Roam remains immediate; Gymkhana Blitz and Tag retain their arena round rules.

Harbor Ring gains clearer blue-white road shoulders, darker asphalt, pearl/slate facades and angle-dependent glass tint. Detailed window/slab instances use spatial bounds so the renderer can cull distant groups. Photographed PBR materials, HDR reflections and selectable desktop effects remain. Medium and above use the full-detail starter car; Low, mobile and remote cars use lighter geometry. Mobile reduced textures are explicit; Brotli restores original asset bytes.

## Hosting

This repository contains compiled browser assets and the multiplayer relay. The editable source, assets, originals, research and test runner are stored in the creator's Desktop/Game folder.

Node.js 24+:

```sh
npm ci --omit=dev --ignore-scripts
npm run build
npm start
```

Open http://localhost:8791 . Render supplies PORT; HOST defaults to 0.0.0.0. Existing Render service uses branch `dev`, build `npm ci --omit=dev --ignore-scripts && npm run build`, start `npm start`, health `/health`. The free instance can sleep and take roughly a minute to wake. Rooms reset when the server restarts. No hosting plan is changed.

SHA-256 hashes verify layered archives before extraction. Vehicle physics run on each player's device; the relay distributes snapshots and owns the Time Attack start gate. The 100-session test uses ten actual Rapier tire/suspension fixtures per session and ten connected WebSocket clients with sampled motion replay. It is not a browser/GPU benchmark, collision pileup test or guarantee of perfect behavior on every network.

## Credits

OpenRally code and supplied assets retain their MIT license. Stradale GT is CC BY 4.0 by vicent091036. Added photographed materials and driving-radio tracks are CC0. See ASSET-CREDITS.md and THIRD-PARTY-NOTICES.md for sources, adaptation details and dependency licenses. FFmpeg is used during local preparation and is not shipped.

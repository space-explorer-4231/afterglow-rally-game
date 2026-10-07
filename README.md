# Speedrunner: Drift District

Multiplayer browser driving game based on the MIT-licensed [OpenRally](https://github.com/TensorDriftStudio/OpenRally). Speedrunner version 1.9.0.

Drive freely, learn to drift, and join friends in shared rooms. WASD or arrows: drive. Space: handbrake. R: recover. Esc: pause. Touch and gamepad controls are supported. Choose Multiplayer and join the same room code; no account or installation is needed to play.

## Hosting package

This repository contains the compiled browser assets and multiplayer server needed to run the game. The complete editable development project is kept in the creator's local Game folder.

Install Node.js 24+, then run:

```sh
npm ci --omit=dev --ignore-scripts
npm run build
npm start
```

Open http://localhost:8791. A hosting platform supplies PORT; HOST defaults to 0.0.0.0. Render: use dev, Node, Free compute, build command npm ci --omit=dev --ignore-scripts && npm run build, start command npm start, and health check /health. Free instances sleep after inactivity and take time to wake. Rooms reset on server restarts.

Archive SHA-256 hashes are verified before extraction. Lightweight assets are used by default; original full-detail car models remain available in Very High graphics quality. Music uses compressed MP3 copies. Multiplayer relays player snapshots; driving simulation runs on each device.

## Licenses

OpenRally code and its supplied assets retain their MIT license. THIRD-PARTY-NOTICES.md contains dependency license notices. FFmpeg is used only during local asset preparation; its executable is not shipped.

Version 1.9.0 introduces Speedrunner: Drift District: instant free driving, corrected steering and slide recovery, assisted sustained Space drifting, road markings and textured hills. Render pacing and resolution changes now absorb stalls gradually. Original OpenRally engine and licensed assets remain credited in [asset credits](ASSET-CREDITS.md).

# AEROLINE: Open Road Club

Multiplayer browser driving game based on the MIT-licensed [OpenRally](https://github.com/TensorDriftStudio/OpenRally). Aeroline version 1.15.0.

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

OpenRally code and its supplied assets retain their MIT license. The added Stradale GT model is CC BY 4.0 by vicent091036; added photographed textures and driving-radio tracks are CC0. See ASSET-CREDITS.md for original sources, separate licenses and adaptation details. THIRD-PARTY-NOTICES.md contains dependency license notices. FFmpeg is used only during local asset preparation; its executable is not shipped.

Version 1.15.0 introduces AEROLINE / Open Road Club: a pearl-white and electric-blue identity, original coastal title/loading concept artwork, white glass menus and the Aero S1 livery. All six environments receive photographed CC0 gravel, snow or rock surface detail. Multiplayer now relays actual independent suspension hub positions and interpolates wheel spin across Euler boundaries. Desktop textures and title artwork use verified lossless WebP; model/HDR Brotli transport restores exact source bytes. Reduced-resolution mobile variants are explicit, and full-resolution originals remain available. Existing FWD/RWD/AWD, braking, burnouts, auto/manual controls, MPH/KMH, eight cars and six maps remain. Developed by Mateusz Zalewski with AI assistance. Source licenses are preserved in [asset credits](ASSET-CREDITS.md).

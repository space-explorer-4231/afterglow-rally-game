# Aeroline 1.18 — Coastal Streets

Developed by Mateusz Zalewski with AI assistance. Play at https://afterglow-rally-game.onrender.com/ .

Harbor now has larger planted boulevards, marked roadside pull-offs, drain grates and eight colored parked roadsters. The 98 KB static fleet model includes measured wheels and bounded instancing, without adding simulated drivers. Warmer coastal lighting and analytic contact shading improve grounding on the laptop profile. Architecture shares materials across spatial cells. Existing eight playable cars, six maps, physics, radio and multiplayer remain.

WASD/arrows drive; S/Down brakes then reverses; Space handbrake; R recover; C camera; V drivetrain; M auto/manual; E/Q gears; U MPH/KM/H; H guide. Multiplayer Time Attack waits for the host or a strict majority of three or more drivers, then all-loaded shared GO. Late arrivals spectate until reset. Free Roam stays untimed.

Verification: production client/server builds, strict TypeScript/lint and 1,831 passing source tests; ten inherited Android-export failures remain and no APK is shipped. Source and public asset/network checks are recorded with the project. Static occlusion is an approximation, not dynamic global illumination; this release does not claim commercial AAA fidelity or ten-device GPU performance.

Source, originals, provenance, tools, reports and portable packages remain in Desktop/Game. The separately licensed CC BY 4.0 visual car derivative and CC0 photographed scenery are attributed in [asset credits](ASSET-CREDITS.md). Free hosting runs independently of the owner's PC but may take around a minute to wake.

## Run locally or host

This repository contains compiled browser assets and the multiplayer relay. The complete editable project and original masters remain in Desktop/Game. With Node.js 24 or newer:

```sh
npm ci --omit=dev --ignore-scripts
npm run build
npm start
```

Open http://localhost:8791 . Render supplies PORT; HOST defaults to 0.0.0.0. The existing service deploys dev, checks /health and uses the same build/start commands. Rooms reset on relay restart. No paid hosting change is included.

The underlying [OpenRally](https://github.com/TensorDriftStudio/OpenRally) engine by TensorDrift Studio and contributors retains its MIT license. See ASSET-CREDITS.md and THIRD-PARTY-NOTICES.md for separately licensed content.

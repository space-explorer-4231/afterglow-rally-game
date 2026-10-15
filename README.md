# Aeroline 1.26.0

Friends reported sluggish driving and difficult first-time setup. This update targets smoother presentation, clearer onboarding and reusable boost.

- Default and medium desktop graphics now target 60 FPS with shadows/post-processing off. Untouched profiles migrate; deliberately saved choices remain. Race lobby and driving guide offer Easy driving (ESP on, ABS/TCS off, automatic/AWD) and Smooth graphics actions, plus basic controls.
- NOS recharges from empty to two five-second tanks in 30 seconds of released-button driving time. Holding boost prevents recharge. HUD explains readiness/recharge.
- Forward tire torque gains up to 10% at full throttle and the forward ceiling increases 8%; reverse remains bounded. Remove ESP's straight-line force penalty while retaining yaw and corner stabilization. Existing BMW/fleet handling limits remain passing.
- Remote playback uses the same local arrival clock as snapshots, measured jitter buffering, and integrated bounded extrapolation that freezes instead of rewinding during an outage. Honor custom ring capacity and reject stale timestamps.
- Quantize outgoing telemetry precision at the send boundary, bounding position error to half a millimetre. Representative JSON-size tests verify reduction; real savings vary.

Validation: strict client types, lint zero errors (inherited warnings remain), 2,087 passing test executions and ten inherited Android APK export failures. Fourteen passing executions repeat compiled server tests. Full fleet/assist/30–120 Hz Rapier coverage remains passing. New tests cover recharge, packet precision, bounded prediction, jitter playback, custom buffer capacity and quick setup. Production and real WebSocket checks are recorded in the local verification report.

These changes do not guarantee device FPS or eliminate internet latency. Hands-on friend/phone/controller playtesting is still needed. No paid hosting changes; public browser connections require the existing public relay.


## Play

Create a Multiplayer room, share its code or invite link, and join without accounts. Time Attack runs one shared lap with ordered gates, shared server timing and same-room rematches. Late arrivals spectate until the next round. Free Roam lets everyone explore.

WASD/arrows drive, Space handbrake, hold Shift NOS, double R recovery, Esc pause. Controller: triggers/stick drive, X/Square handbrake, L3 NOS, Y recovery. Phones use touch controls. Race lobby explains these controls and offers setup buttons.

## Hosting

Compiled client and relay. Node 24+: npm ci --omit=dev --ignore-scripts, npm run build, npm start. Render deploys dev, health /health, protocol 1.26. Free instances may sleep; rooms reset on restart. Archives are SHA-256 checked before extraction. Editable source stays on the creator's desktop.

## Licenses

OpenRally and original fleet/forged wheel meshes: MIT. BMW body adapted from 2001 BMW M3 GTR by Dave Love SketchFab (Tyler_Dave), CC BY 4.0: https://sketchfab.com/3d-models/2001-bmw-m3-gtr-6bb4d180cd0d454ba62fbfae24fc5155 . License: https://creativecommons.org/licenses/by/4.0/ . Duplicate mesh passes and static wheel assemblies removed, transforms normalized. BMW does not sponsor or endorse the game. Full attribution ships in ASSET-CREDITS.md, BMW-M3-LICENSE.txt and THIRD-PARTY-NOTICES.md.

Developed by Mateusz Zalewski with AI assistance.

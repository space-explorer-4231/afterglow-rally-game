# Aeroline 1.31.0 — UI, UX and driving audit

Custom multiplayer room JOIN controls now have a reserved, always-visible action area shared with community rooms. Long metadata wraps and phone actions use their own row. Full/update/connecting states explain availability; repeated joins are guarded before changing maps. Live room refresh preserves focus by room identity. Native Enter/Space, sliders and handled track-card keys retain the intended action; Touch Screen joins the controller control-guide tab cycle. Mode/credits panels shrink and scroll. Room deletion uses inline confirmation with timeout/cancel.

Menus use neutral stone, ink text and restrained blue actions. In-map driving, Road Run, Drift Club, race and room tools share translucent charcoal instruments with smaller radii/thin borders/no heavy shadows. Idle readouts hide empty detail while preserving useful instructions and actions. Inset controller focus does not move geometry or force white labels. Tested menu/HUD text roles exceed 4.5:1 contrast, including HUD surfaces over white scenery.

BMW recovery steering/yaw damping now honor ESP and the RWD role. NOS averages grounded contact normals instead of depending on the final wheel, and invalid/nonpositive time cannot apply forces or consume NOS. No speed/torque/grip buffs. Real Rapier numerical audit covers 14 cars × 8 assist masks × 30/60/120 solver Hz (336 combinations). Raw 30 Hz braking differs up to 6.74 m; shipping simulation stays fixed at 60 Hz.

Validation: strict client/server types and production builds pass. Full suite: 2,217 passing executions and ten unchanged inherited Android APK export failures. Lint has zero errors and existing warnings. Local two concurrent twelve-player rooms pass for 90 seconds, including a paused/resumed receiver. Four separate WebSocket clients complete three Cup races with identical points/champion and automatic cleared next Cup. Asset transport, NOS snapshots, host transfer and loading/voting/countdown/reset checks pass. All 315 current build files match the reconstructed bundle byte-for-byte.

Source/SSR/numerical checks cannot establish final device layout, visual comfort or driving enjoyment. Real phone/laptop/controller testing remains necessary. No paid hosting change or contest submission.

## Play

Solo jumps into driving. Multiplayer → Start a race room → Copy invite link. The host starts the first race; three races decide the Club Cup champion. Subsequent races/Cups start automatically. Car & Track customizes solo driving. No account or installation.

WASD/arrows drive; Shift / L3 / touch NOS boosts, with twelve released-button active-driving seconds to refill. Space / X / Square handbrake; double R / Y recovery; Esc / Menu pause. ESP defaults on. Car preview: drag, right stick or Alt+arrows. Road Run starts near/crossing the start line in free roam.

## Hosting

Node 24+: npm ci --omit=dev --ignore-scripts, npm run build, npm start. Render uses dev, health /health, protocol 1.31. Free instances may sleep; room/Cup state resets on service restart. Archives are SHA-256 verified. Editable source and three audit reports remain on the creator desktop.

## Licenses

OpenRally and original fleet/forged wheel meshes: MIT. BMW body adapted from 2001 BMW M3 GTR by Dave Love SketchFab (Tyler_Dave), CC BY 4.0: https://sketchfab.com/3d-models/2001-bmw-m3-gtr-6bb4d180cd0d454ba62fbfae24fc5155 . License: https://creativecommons.org/licenses/by/4.0/ . Duplicate mesh passes and static wheel assemblies removed, transforms normalized. BMW does not sponsor or endorse the game. Full attribution ships in ASSET-CREDITS.md, BMW-M3-LICENSE.txt and THIRD-PARTY-NOTICES.md.

Developed by Mateusz Zalewski with AI assistance.


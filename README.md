# Aeroline 1.32.0 — Horizon Festival

Festival Radio streams ten official NCS recordings in the requested order, then repeats. Starts at the first genuine title/loading interaction, respects saved menu/game volumes, pauses on hidden tab/pause, and preserves position. One media element streams one song at a time; no Spotify account/player. Autoplay rejection retries on the next gesture; failed media skips with a bounded count. Recordings are 160kbps MP3 (~45MB total), fully decoded for integrity. Exact sources, original/delivery hashes, durations and credits ship in audio/festival. Project owner confirmed game-use authorization; no signed license was independently verified. Why We Lose is the official ~3:33 NCS download, rather than the ~3:17 Spotify edit shown in the reference.

All five driving HUD positions remain. Drift Club gets combo/countdown states; Road Run gets current/completed sector styling and trail progress; the drive console has a circular 0–100 NOS charge meter plus both tanks and explicit ready/active/charging/empty states. Minimap and speed/rev dial use light faces and warm/green accents. Menus/fields/room controls follow the same ivory, coral, leaf green and orange palette. Keyboard/controller/touch equivalents remain.

All six maps receive three deterministic solar lookouts with PBR decks, planted beds, seating, supported footings and physical colliders outside the road corridor. Pass the amber minimap markers on the road to complete a local sightseeing trail, separate from Cup scoring. Two to five decorative aerial shuttles scale by quality and reuse precomputed paths/transforms. These are scenery, not racing NPCs. Harbor adds roof gardens, solar decks, sun fins, promenade pergolas/paths/seating using existing material batches. Mobile lighting retains biome variation. Maps remain stylized browser 3D; loading art is illustrative, not exact gameplay.

Validation: strict client/server types and production builds pass; full suite has 2,229 passing executions and ten unchanged inherited Android export failures. No new lint messages. Local 24-client/two-room 90-second stress, four-client three-race Cup, loading/voting/reset/host-handoff and assets/NOS synchronization checks pass. Local HTML plus41 assets (including all ten songs) match the build; twenty audio byte-range checks pass. Final deployment reconstruction is byte-compared. Real device rendering/listening/controls and FPS remain unverified; no measured 60FPS claim.

## Play

Solo starts a ready-to-drive car. Multiplayer → Start a race room → copy invite. Three races decide the Club Cup champion; next races/Cups start automatically. Car & Track customizes solo driving. No login or installation.

WASD/arrows drive; Shift/L3/touch NOS boosts with two five-second tanks, twelve released-button active-driving seconds to refill. Space/X/Square handbrake; double R/Y recovery; Esc/Menu pause; H/D-pad up guide. ESP defaults on. Four-sector Road Run and the amber lookout trail are local free-roam practice.

## Hosting

Node24+: npm ci --omit=dev --ignore-scripts, npm run build, npm start. Render uses dev, health /health, protocol1.32. Free instances may sleep; room/Cup state resets on restart. SHA256 archives verified. Editable source and original NCS downloads remain on the creator desktop. No paid hosting change or contest submission.

## Licenses

OpenRally and original fleet/forged wheel meshes: MIT. BMW body adapted from 2001 BMW M3 GTR by Dave Love SketchFab (Tyler_Dave), CC BY 4.0: https://sketchfab.com/3d-models/2001-bmw-m3-gtr-6bb4d180cd0d454ba62fbfae24fc5155 . License: https://creativecommons.org/licenses/by/4.0/ . Duplicate mesh passes and static wheel assemblies removed, transforms normalized. BMW does not sponsor or endorse the game. Full attribution ships in ASSET-CREDITS.md, BMW-M3-LICENSE.txt and THIRD-PARTY-NOTICES.md.

Developed by Mateusz Zalewski with AI assistance.


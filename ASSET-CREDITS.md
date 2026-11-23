# AEROLINE — asset credits

Aeroline is developed by **Mateusz Zalewski** with AI-assisted development. Custom game direction, Harbor Ring, driving assistance, scenery, interface and deployment belong to this project. The underlying **OpenRally** engine is by **TensorDrift Studio and contributors**, under its preserved MIT license. Original Speedrunner signs, stage artwork and the modular Harbor Ring scenery were created for this game. Third-party models, textures and music retain their separate attribution below.

## Stradale GT visual model (CC BY 4.0)

- Original: Ferrari 458 Italia by **vicent091036**, https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6
- Downloaded from pinned Three.js r185: https://raw.githubusercontent.com/mrdoob/three.js/r185/examples/models/gltf/ferrari.glb
- Author attribution: https://threejs.org/examples/webgl_materials_car.html
- License: **CC BY 4.0**, https://creativecommons.org/licenses/by/4.0/
- Three.js maintainers' license inventory: https://github.com/mrdoob/three.js/issues/23089
- Adaptations: separated chassis and animated wheels; removed badge surfaces; clearcoat, tinted glass, rubber/metal finishes; simplified and Draco-compressed geometry. Version 1.12 adds an original teal / graphite touring livery and copper rims by this project. Version 1.12.1 refines the lightweight cockpit geometry and graphite/copper leather. Earlier orange paint is retained in local backups.
- Derivatives: `models/vehicles/stradale-gt.glb`, `stradale-gt_opt.glb`, `stradale-gt-wheel.glb`. This model is licensed separately from the MIT engine and CC0 textures.
- Version 1.18 adds `models/vehicles/aero-parked.glb`, an assembled static derivative with all four measured wheels, simplified geometry, opaque parked glazing and original color variations. It reuses the same CC BY 4.0 source, attribution and license; it is not a new playable vehicle or a simulated traffic driver. Original playable models are unchanged.
- Original download and SHA-256 manifest are retained locally in `Game/research/graphics-1.10/`.

## Photographed PBR asphalt and HDR lighting

- Asphalt 02: Poly Haven, https://polyhaven.com/a/asphalt_02
  1K diffuse, OpenGL normal and roughness maps converted to WebP.
- Corrugated Iron: Dimitrios Savva and Jenelle van Heerden / Poly Haven,
  https://polyhaven.com/a/corrugated_iron
  1K albedo, OpenGL normal, roughness and metalness maps for the industrial depots.
- Rural Asphalt Road: Alexander Scholten / Poly Haven, https://polyhaven.com/a/rural_asphalt_road
  1K HDR image used for image-based lighting and vehicle reflections.
- License: CC0-1.0, https://polyhaven.com/license

## Urban material pack (1.12)

- Concrete Wall 006: Charlotte Baglioni (photography), Dario Barresi (processing), Poly Haven, https://polyhaven.com/a/concrete_wall_006
- Concrete Pavers 02: Poly Haven, https://polyhaven.com/a/concrete_pavers_02
- License: CC0-1.0, https://polyhaven.com/license
- OpenGL normals, diffuse and roughness maps resized to 512px desktop / 256px mobile WebP. Source checksums are verified before conversion. Original downloads and the optimized SHA-256 manifest are retained in `Game/research/graphics-1.12/`. Materials tile at two-metre scale on the Harbor Ring buildings and sidewalks.
- N8AO ambient occlusion: N8 Programs, MIT, https://github.com/N8python/n8ao. Enabled on desktop High and Very High through the existing React Three postprocessing package. Dependency notices retain its license.

## Driving radio

- Black Diamond — Joth, https://opengameart.org/content/black-diamond
- Final Hour — isaiah658, https://opengameart.org/content/final-hour
- Both creator pages designate CC0-1.0. Credits are retained voluntarily.
- Hosted derivatives: loudness balanced to -18 LUFS target / -2 dBTP ceiling,
  160 kbps MP3, 44.1 kHz. No commercial recordings or streaming services used.

The original downloads, SHA-256 hashes and source URLs are retained locally
in Game/research/cc0-originals and Game/research/cc0-imports.json.
The earlier Afterglow Drive and Redline Horizon original score is retained.

## Aeroline original identity and livery (1.15)

AEROLINE / Open Road Club, its blue-and-white SVG wordmark, Aero S1 pearl-white/electric-blue livery and interface are original contributions to this project. The Aero S1 retains the separately credited CC BY 4.0 Stradale geometry above; 1.15 changes paint and materials without modifying the compressed mesh bytes.

The coastal title/loading illustration was generated for this game with OpenAI image generation. It is concept artwork, not a gameplay screenshot. The original master and prompt are retained in Game/assets/aeroline and Game/docs/AEROLINE-1.15.md.

## Photographed terrain detail (1.15)

- Sandy Gravel 02: Poly Haven, https://polyhaven.com/a/sandy_gravel_02
- Snow 02: Poly Haven, https://polyhaven.com/a/snow_02
- Rock Boulder Dry: Poly Haven, https://polyhaven.com/a/rock_boulder_dry
- License: CC0-1.0, https://polyhaven.com/license
- Original 1K diffuse, OpenGL normal and roughness maps are encoded as lossless WebP at their original dimensions. Mobile variants are resized to 512px, then losslessly encoded. Desktop normal relief and photographed roughness are combined with existing terrain blending; mobile omits the extra normal samples. Original downloads, verified checksums and source URLs remain in Game/research/aeroline-materials and aeroline-assets-1.15.json.

## Coastal district collection (1.17)

Photographed CC0 geometry from Poly Haven:
- Island Tree 02 — Rob Tuytel and Rico Cilliers, https://polyhaven.com/a/island_tree_02
- Shrub 01 — authors retained in the source provenance manifest, https://polyhaven.com/a/shrub_01
- Painted Wooden Bench — Kirill Sannikov, https://polyhaven.com/a/painted_wooden_bench
- Street Lamp 01 — Josh Dean, https://polyhaven.com/a/street_lamp_01
- Utility Box 02 — James Ray Cock, https://polyhaven.com/a/utility_box_02

Photographed materials: Red Brick, White Stucco, Exterior Wall Cladding, Grass Ground and Rectangular Paving, https://polyhaven.com/ . Exact source URLs, author lists, download hashes and file sizes are retained in the bundled coastal asset provenance JSON and in Desktop/Game/research/graphics-1.17. License: CC0-1.0, https://polyhaven.com/license .

The tree uses the artist's LOD1, with conservative planar cleanup. Near geometry retains every leaf. Eight transparent views rendered from that source supply the distant cylindrical impostor. Bench, lamp, cabinet and shrub derivatives use error-bounded Meshoptimizer simplification and quantized geometry. Color WebP encoding is perceptually lossy; normal and roughness WebP are lossless at the selected dimensions. Mobile maps are explicitly resized to 512 pixels. HTTP Brotli/gzip compression is lossless. Original masters remain preserved.

The new coastal building families, shopfronts, balcony modules, streetscape layout and Harbor Coastal Market SVG are original project contributions by Mateusz Zalewski with AI assistance. Existing OpenRally and vehicle licenses remain applicable.

The shrub cutout in 1.17.1 combines the creator's CC0 diffuse and separate Alpha PNG from the same shrub_01 asset; the JPEG in the original glTF cannot carry opacity. Source files and verified hashes are preserved in the coastal provenance manifest.

## BMW M3 Aero Drift (1.21)
2001 BMW M3 GTR by Dave Love SketchFab (Tyler_Dave), https://sketchfab.com/3d-models/2001-bmw-m3-gtr-6bb4d180cd0d454ba62fbfae24fc5155 . Licensed CC BY 4.0, https://creativecommons.org/licenses/by/4.0/ . Adapted with duplicate mesh passes removed, static wheel/tire assemblies removed, preserved interior/livery and normalized gameplay transforms. New original Aero forged wheels. Original GLB retained in asset-sources/bmw-m3-gtr.glb. Source mirror: https://github.com/SulemanAsif0911/BMW-M3-History/blob/main/m3-gtr-e46-2001.glb . BMW does not sponsor or endorse this game.

The five rebuilt Speed Fleet coachworks and shared Aero forged wheels are original MIT project assets. Rebuild with scripts/build-aero-coachwork.mjs; BMW adaptation uses scripts/adapt-bmw-drift.py.

## Road Club presentation (1.29)
Original AI-generated coastal, alpine and harbor loading artwork: public/images/aeroline/club-coast.webp, club-alpine.webp and club-harbor.webp. Generated and refined for this project using OpenAI image generation; vehicle emblems removed. These are illustrative loading backgrounds, not gameplay screenshots or representations of exact playable vehicles/courses. Actual in-game models supply the interactive car preview; checkpoint data supplies the route diagrams.

Coastline Drive: original 112 BPM procedural instrumental composed and synthesized in src/utils/audio/clubScore.ts. Original melody, bass, chord voicings and synthesized percussion; no external music recordings or samples. Reactive driving/NOS layers and a local 88 Club variation. Prior recordings and their credits are preserved but do not play in the default menu/driving mix.

## Road Fleet and ten-image gallery (1.30)
Innerscene original unbranded models, CC0-1.0 (https://creativecommons.org/publicdomain/zero/1.0/):
- Charcoal five-door crossover SUV: https://www.innerscene.com/tools/library/3d-parts/charcoal-five-door-crossover-suv-a1996830 . Adapted as Voltline XR and a lowered touring-wagon derivative, Meridian RS.
- Crew-cab pickup with open bed: https://www.innerscene.com/tools/library/3d-parts/crew-cab-pickup-with-open-bed-4f02e0cc . Adapted as Ironclad Sprint.
- High-roof cargo panel van: https://www.innerscene.com/tools/library/3d-parts/high-roof-cargo-panel-van-c4d5145f . Adapted as Parcel GT.
Nightfall V8 body: Spectral GT RS by JaronKBragg7337, CC0-1.0: https://github.com/JaronKBragg7337/spectral-gt-rs .
Adaptations: axle/chassis fitting, fixed-body mesh batching, removed static wheel assemblies and decorative badges, paint changes, removed animations, error-bounded geometry simplification and quantized optimized versions. Shared original MIT Aero forged wheels animate through the game suspension. Source downloads and license evidence remain in asset-sources/road-fleet-1.30; hashes and URLs are in models/vehicles/speed-fleet-manifest.json. scripts/adapt-road-fleet.mjs rebuilds the current bodies. Historical coachwork credit above describes the older meshes, now replaced.

Six additional original AI-generated loading illustrations: club-canyon.webp, club-snow.webp, club-forest.webp, club-night.webp, club-storm.webp, club-sunrise.webp. Built-in OpenAI image generation; no outside photographs or music samples. Photographic automotive action scenes on canyon, snow, autumn forest, blue-hour waterfront, post-storm coast and sunrise country roads; fictional unbranded cars, no lettering, dark lower road area for UI. Prompts and source master paths are preserved in docs/ROAD_RUN_UPDATE.md. Ten-image rotation preserves coastal-drive.webp and all three 1.29 illustrations. These images are concept illustrations and do not depict exact in-game cars or maps.


## Festival Radio (1.32)

Music provided by NoCopyrightSounds. Recordings supplied through the official NCS catalog; the project owner confirmed game-use authorization on October 20, 2026. Exact recording sources and SHA-256 hashes are in audio/festival/manifest.json.

Music provided by NoCopyrightSounds. Artist and recording credits:

1. On & On — Cartoon, Jéja, Daniel Levi
Free download/stream and credit source: https://ncs.io/OnandOn

2. Cradles — Sub Urban
Free download/stream and credit source: https://ncs.io/Cradles

3. Royalty — Egzod, Maestro Chives, Neoni
Free download/stream and credit source: https://ncs.io/Royalty

4. Mortals (Slowed) — Warriyo, Slowed Sounds
Free download/stream and credit source: https://ncs.io/Mortals_Slowed

5. Why We Lose — Cartoon, Jéja, Coleman Trapp
Free download/stream and credit source: https://ncs.io/WhyWeLose

6. Waiting — Syn Cole, KAZHI
Free download/stream and credit source: https://ncs.io/s_waiting

7. Like A Melody — Cartoon, JOZELS, KAZHI
Free download/stream and credit source: https://ncs.io/LikeAMelody

8. Fearless (Slowed) — Lost Sky, Slowed Sounds
Free download/stream and credit source: https://ncs.io/Fearless_SL

9. Shine (Slowed) — Spektrem, Slowed Sounds
Free download/stream and credit source: https://ncs.io/Shine_SL

10. Fight In Me — Egzod, Lost Sky, Alaina Cross
Free download/stream and credit source: https://ncs.io/FightInMe

NCS usage information: https://ncs.io/usage-policy

## Aeroline 1.34 artwork
Five original AI-generated racing illustrations were created with OpenAI image generation for Aeroline: Marina boulevard, Castle chase, Canyon pursuit, Winter duel, and Harbor meet. Marina boulevard also supplies the Harbor Ring selection thumbnail. These are illustrative promotional/loading images, not screenshots of rendered gameplay. Source PNGs are preserved in ../asset-sources/art-1.34.0; scripts/import134Art.cjs reproduces the optimized WebP assets.

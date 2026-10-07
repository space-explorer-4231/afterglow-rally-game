# Speedrunner — added asset credits

Speedrunner is developed by **Mateusz Zalewski** with AI-assisted development. Custom game direction, Harbor Ring, driving assistance, scenery, interface and deployment belong to this project. The underlying **OpenRally** engine is by **TensorDrift Studio and contributors**, under its preserved MIT license. Original Speedrunner signs, stage artwork and the modular Harbor Ring scenery were created for this game. Third-party models, textures and music retain their separate attribution below.

## Stradale GT visual model (CC BY 4.0)

- Original: Ferrari 458 Italia by **vicent091036**, https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6
- Downloaded from pinned Three.js r185: https://raw.githubusercontent.com/mrdoob/three.js/r185/examples/models/gltf/ferrari.glb
- Author attribution: https://threejs.org/examples/webgl_materials_car.html
- License: **CC BY 4.0**, https://creativecommons.org/licenses/by/4.0/
- Three.js maintainers' license inventory: https://github.com/mrdoob/three.js/issues/23089
- Adaptations: separated chassis and animated wheels; removed badge surfaces; orange clearcoat, tinted glass, rubber/metal finishes; simplified and Draco-compressed geometry.
- Derivatives: `models/vehicles/stradale-gt.glb`, `stradale-gt_opt.glb`, `stradale-gt-wheel.glb`. This model is licensed separately from the MIT engine and CC0 textures.
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

## Driving radio

- Black Diamond — Joth, https://opengameart.org/content/black-diamond
- Final Hour — isaiah658, https://opengameart.org/content/final-hour
- Both creator pages designate CC0-1.0. Credits are retained voluntarily.
- Hosted derivatives: loudness balanced to -18 LUFS target / -2 dBTP ceiling,
  160 kbps MP3, 44.1 kHz. No commercial recordings or streaming services used.

The original downloads, SHA-256 hashes and source URLs are retained locally
in Game/research/cc0-originals and Game/research/cc0-imports.json.
The earlier Afterglow Drive and Redline Horizon original score is retained.

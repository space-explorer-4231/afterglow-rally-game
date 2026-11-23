import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoxGeometry, BufferGeometry, Float32BufferAttribute, CylinderGeometry, ExtrudeGeometry, Group, Mesh, MeshStandardMaterial, Shape, SphereGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

// Node export adapter: the meshes are authored here and use no DOM images.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(result => { this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`; this.onloadend?.(); }); }
};

const fleet = [
  { id: 'meridian_rs', type: 'wagon', w: 1.96, l: 4.7, roof: .9, rear: -1.85, front: .8, color: '#197c75', base: 2.92 },
  { id: 'voltline_xr', type: 'suv', w: 2.02, l: 4.65, roof: 1.2, rear: -1.55, front: .85, color: '#ddd8c9', base: 2.95 },
  { id: 'ironclad_sprint', type: 'pickup', w: 2.08, l: 4.95, roof: 1.1, rear: -.25, front: 1.05, color: '#d98027', base: 3.05 },
  { id: 'parcel_gt', type: 'van', w: 2.02, l: 4.85, roof: 1.55, rear: -2.05, front: 1.35, color: '#efcf4f', base: 3 },
  { id: 'nightfall_v8', type: 'muscle', w: 2, l: 4.75, roof: .72, rear: -.95, front: .6, color: '#643477', base: 2.88 },
];
const output = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/models/vehicles');

function build(spec) {
  const root = new Group(); root.name = spec.id;
  const paint = new MeshStandardMaterial({ name: 'Body_Color', color: spec.color, roughness: .3, metalness: .12 });
  const trim = new MeshStandardMaterial({ name: 'Satin_Trim', color: '#20272b', roughness: .55 });
  const glass = new MeshStandardMaterial({ name: 'Smoked_Glass', color: '#19313d', roughness: .12, metalness: .25 });
  const chrome = new MeshStandardMaterial({ name: 'Brushed_Metal', color: '#aab6bb', metalness: .85, roughness: .25 });
  const lamp = new MeshStandardMaterial({ name: 'Headlight_Lens', color: '#eff5ee', emissive: '#b8dce9', emissiveIntensity: .5, roughness: .2 });
  const red = new MeshStandardMaterial({ name: 'Taillight_Lens', color: '#a51f27', emissive: '#650509', emissiveIntensity: .3, roughness: .22 });
  const add = (geometry, material, x = 0, y = 0, z = 0, rotation = [0, 0, 0]) => {
    const mesh = new Mesh(geometry, material); mesh.position.set(x, y, z); mesh.rotation.set(...rotation); root.add(mesh); return mesh;
  };
  const box = (w, h, d, mat, x, y, z) => add(new BoxGeometry(w, h, d), mat, x, y, z);
  // A bevelled silhouette, including real wheel-arch cutouts, is extruded across the car.
  function profile(points, width, material) {
    const shape = new Shape(); shape.moveTo(...points[0]); points.slice(1).forEach(p => shape.lineTo(...p)); shape.closePath();
    const geometry = new ExtrudeGeometry(shape, { depth: width, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .025, bevelThickness: .025, curveSegments: 12 });
    // Shape coordinates are (longitudinal z, height); extrusion becomes lateral x.
    geometry.rotateY(-Math.PI / 2); geometry.translate(width / 2, 0, 0);
    return add(geometry, material);
  }
  const half = spec.l / 2, axle = spec.base / 2;
  const body = [[-half, -.17], [-half + .12, .24], [-half + .6, .4], [half - .65, .4], [half - .13, .25], [half, .02], [half - .05, -.17]];
  for (const center of [axle, -axle]) {
    body.push([center + .48, -.17]);
    for (let i = 0; i <= 16; i++) { const angle = i * Math.PI / 16; body.push([center + Math.cos(angle) * .48, -.38 + Math.sin(angle) * .55]); }
    body.push([center - .48, -.17]);
  }
  profile(body, spec.w - .1, paint);
  // Sloped windshield and rear quarter remain different for each body style.
  const cabin = [[spec.rear, .38], [spec.rear + .22, spec.roof - .08], [spec.front - .35, spec.roof], [spec.front, .38]];
  profile(cabin, spec.w * .82, paint);
  const pane = (vertices, reversed = false) => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position',new Float32BufferAttribute(vertices.flat(),3));
    geometry.setAttribute('uv',new Float32BufferAttribute([0,0,0,1,1,1,1,0],2));
    geometry.setIndex(reversed ? [0,2,1,0,3,2] : [0,1,2,0,2,3]);geometry.computeVertexNormals();add(geometry,glass);
  };
  for (const side of [-1,1]) {
    const rear = spec.type === 'van' ? .1 : spec.rear + .12;
    const x = side * (spec.w * .41 + .03);
    pane([[x,.45,rear],[x,spec.roof-.14,rear+.22],[x,spec.roof-.1,spec.front-.42],[x,.45,spec.front-.13]], side < 0);
  }
  const windowWidth = spec.w * .37;
  const frontSlope = .35 / (spec.roof - .38);
  const frontLowZ = spec.front - frontSlope * (.44 - .38) + .045;
  const frontHighZ = spec.front - frontSlope * (spec.roof - .09 - .38) + .045;
  pane([[-windowWidth,.44,frontLowZ],[windowWidth,.44,frontLowZ],
    [windowWidth,spec.roof-.09,frontHighZ],[-windowWidth,spec.roof-.09,frontHighZ]]);
  pane([[-windowWidth,.44,spec.rear-.04],[-windowWidth,spec.roof-.18,spec.rear+.18-.04],
    [windowWidth,spec.roof-.18,spec.rear+.18-.04],[windowWidth,.44,spec.rear-.04]]);
  profile([[spec.rear + .18, spec.roof - .1], [spec.rear + .23, spec.roof], [spec.front - .35, spec.roof + .035], [spec.front - .27, spec.roof - .04]], spec.w * .8, paint);
  // Window pillars and door handles ground the scale of the cabin.
  for (const side of [-1, 1]) {
    const x = side * spec.w * .405;
    for (const z of [spec.rear + .24, (spec.rear + spec.front) / 2, spec.front - .26]) box(.06, spec.roof - .36, .075, trim, x, (spec.roof + .36) / 2, z);
    box(.06, .075, .23, chrome, side * (spec.w / 2 - .025), .27, .3);
    if (spec.type !== 'muscle' && spec.type !== 'pickup') box(.06, .075, .23, chrome, side * (spec.w / 2 - .025), .27, -.85);
    box(.09, .07, spec.l - .3, trim, side * (spec.w / 2 - .01), -.14, 0);
    const mirror = add(new SphereGeometry(.13, 12, 8), paint, side * (spec.w / 2 + .035), .51, spec.front - .16); mirror.scale.set(1, .6, 1.3);
    box(.025, .09, .13, glass, side * (spec.w / 2 + .16), .51, spec.front - .18);
    // Arch surrounds follow the measured wheel locations, rather than hiding embedded wheels.
    for (const z of [-axle, axle]) {
      for (let i = 0; i < 12; i++) {
        const a = (i + .5) * Math.PI / 12;
        const strip = box(.065, .07, .13, trim, side * (spec.w / 2 - .03), -.38 + Math.sin(a) * .56, z + Math.cos(a) * .49);
        strip.rotation.x = a - Math.PI / 2;
      }
    }
  }
  box(spec.w * .8, .16, .08, trim, 0, .02, half + .005);
  box(spec.w * .84, .1, .09, trim, 0, -.13, half - .04);
  for (let i = -3; i <= 3; i++) box(.028, .12, .09, chrome, i * .12, .02, half + .02);
  for (const side of [-1, 1]) {
    box(.38, .12, .075, lamp, side * .67, .19, half - .035);
    box(.32, .1, .065, red, side * .68, .23, -half - .005);
    box(.25, .07, .04, chrome, side * .55, -.12, -half - .05);
    const exhaust = add(new CylinderGeometry(.045, .045, .13, 12), chrome, side * .53, -.14, -half - .03); exhaust.rotation.x = Math.PI / 2;
  }
  box(.3, .085, .02, chrome, 0, -.035, -half - .04);
  box(spec.w * .7, .12, .085, trim, 0, -.1, -half);
  if (spec.type === 'pickup') {
    // Open cargo bed: separate rails, ribbed floor and tailgate, not a covered coupe.
    box(spec.w * .8, .055, 1.82, trim, 0, .22, -1.18);
    for (const side of [-1, 1]) box(.14, .35, 1.85, paint, side * (spec.w / 2 - .13), .43, -1.2);
    box(spec.w * .8, .36, .09, paint, 0, .43, -half + .09);
    for (let i = -4; i <= 4; i++) box(.035, .035, 1.65, trim, i * .17, .26, -1.18);
  }
  if (spec.type === 'van') {
    for (const side of [-1, 1]) {
      box(.026, .035, 1.65, chrome, side * spec.w * .413, .8, -1.05);
      box(.04, .035, .38, trim, side * spec.w * .425, .66, -.6);
    }
    box(.025, 1.05, .04, trim, 0, .83, -2.085);
  }
  if (spec.type === 'wagon' || spec.type === 'suv') {
    for (const side of [-1, 1]) box(.035, .05, (spec.front - spec.rear) * .75, chrome, side * .61, spec.roof + .09, (spec.front + spec.rear) / 2);
    box(spec.w * .83, .045, .18, paint, 0, spec.roof - .03, spec.rear - .02);
  }
  if (spec.type === 'muscle') {
    box(.62, .085, 1.05, trim, 0, .43, 1.26);
    for (const x of [-.2, .2]) box(.1, .01, 1.16, chrome, x, .48, 1.2);
    box(spec.w * .86, .05, .24, trim, 0, .43, -half + .16);
  }
  if (spec.type === 'suv') {
    box(.65, .06, .025, lamp, 0, .27, half + .01);
    box(.58, .035, .035, trim, 0, .1, half + .045);
  }
  root.updateMatrixWorld(true);
  const batches = new Map();
  for (const mesh of root.children) {
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrixWorld);
    const batch = batches.get(mesh.material) ?? []; batch.push(geometry); batches.set(mesh.material, batch);
    mesh.geometry.dispose();
  }
  const merged = new Group(); merged.name = spec.id;
  for (const [material, geometries] of batches) {
    const geometry = mergeGeometries(geometries, false);
    if (!geometry) throw new Error('Vehicle material batch failed');
    merged.add(new Mesh(geometry, material)); geometries.forEach(g => g.dispose());
  }
  return merged;
}

await fs.mkdir(output, { recursive: true });
const manifest = [];
const preview = [];
for (const spec of fleet) {
  const scene = build(spec);
  const binary = await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: true });
  const target = path.join(output, `${spec.id}.glb`);
  await fs.writeFile(target, Buffer.from(binary));
  const render = scene.clone(true);
  const tire = new MeshStandardMaterial({ color: '#202326' }), rim = new MeshStandardMaterial({ color: '#bbc4c8' });
  for (const side of [-1,1]) for (const z of [-spec.base/2,spec.base/2]) {
    const wheel = new Mesh(new CylinderGeometry(spec.type === 'pickup' ? .38 : spec.type === 'suv' || spec.type === 'van' ? .36 : .34, spec.type === 'pickup' ? .38 : spec.type === 'suv' || spec.type === 'van' ? .36 : .34, .24, 20), tire);
    wheel.rotation.z = Math.PI/2; wheel.position.set(side*(spec.w-.14)/2,-.44,z); render.add(wheel);
    const disc = new Mesh(new CylinderGeometry(.23,.23,.025,16),rim);disc.rotation.z=Math.PI/2;disc.position.set(side*((spec.w-.14)/2+.13),-.44,z);render.add(disc);
  }
  render.updateMatrixWorld(true);
  preview.push({ id:spec.id,type:spec.type,meshes:render.children.map(mesh=>{
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();geometry.applyMatrix4(mesh.matrixWorld);
    return { color:mesh.material.color.getHexString(),positions:Array.from(geometry.getAttribute('position').array) };
  }) });
  manifest.push({ ...spec, bytes: binary.byteLength, meshCount: scene.children.length });
  scene.traverse(object => { if (object instanceof Mesh) object.geometry.dispose(); });
  console.log(`${spec.id}: ${binary.byteLength} bytes, ${scene.children.length} meshes`);
}
await fs.writeFile(path.join(output, 'SPEED-FLEET-LICENSE.txt'), 'Aeroline Speed Fleet: Meridian RS, Voltline XR, Ironclad Sprint, Parcel GT, Nightfall V8.\nOriginal procedural meshes authored for Aeroline, 2026.\nLicensed under the MIT license included with this project.\nRebuild from scripts/build-speed-fleet.mjs. No external model or texture sources.\n');
await fs.writeFile(path.join(output, 'speed-fleet-manifest.json'), JSON.stringify(manifest, null, 2));

await fs.writeFile(path.resolve(output,'../../../..','verification/fleet-geometry-preview.json'), JSON.stringify(preview));

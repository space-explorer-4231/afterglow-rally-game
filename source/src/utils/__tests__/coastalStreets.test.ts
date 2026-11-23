import {describe,it,expect,vi} from 'vitest';
import {CatmullRomCurve3,Vector3,Texture,InstancedMesh,MeshStandardMaterial,ShaderMaterial} from 'three';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {getBounds} from '@gltf-transform/functions';
import {MeshoptDecoder} from 'meshoptimizer';
import {HARBOR_BUILDINGS,HARBOR_PARKING} from '@/config/harborScenery';
import {HARBOR_RING_DATA} from '@/config/levels/harborRing';
import {getStageLighting} from '@/config/stageLighting';
import {buildHarborArchitecture} from '../harborArchitecture';
import {createHarborRenderResources} from '../harborRendering';
import {configureUrbanGeometry} from '@/components/environment/urbanMaterial';
import {BoxGeometry} from 'three';
import {harborGroundFootprints,createGroundOcclusionResources} from '../harborGroundOcclusion';
import {BufferGeometry,BufferAttribute,Matrix4} from 'three';
import {bakeStaticGeometry} from '../bakeStaticGeometry';

const heights=HARBOR_BUILDINGS.map(()=>8);
const course=new CatmullRomCurve3(HARBOR_RING_DATA.track.points.map(p=>new Vector3(p.x,0,p.z)),true,'catmullrom',.5).getPoints(2000);

describe('Coastal street expansion',()=>{
  it('bakes quantized glTF vertices into floats without clipping world-space metres or altering cached geometry',()=>{
    const source=new BufferGeometry();
    source.setAttribute('position',new BufferAttribute(new Int16Array([32767,0,-32767,0,32767,0]),3,true));
    source.setAttribute('normal',new BufferAttribute(new Int8Array([127,0,0,0,127,0]),3,true));
    const before=source.getAttribute('position').array.slice();
    const matrix=new Matrix4().makeScale(2,3,4);matrix.setPosition(10,8,-20);
    const baked=bakeStaticGeometry(source,matrix),positions=baked.getAttribute('position');
    expect(positions.array).toBeInstanceOf(Float32Array);expect(positions.normalized).toBe(false);
    expect([positions.getX(0),positions.getY(0),positions.getZ(0)]).toEqual([12,8,-24]);
    expect([positions.getX(1),positions.getY(1),positions.getZ(1)]).toEqual([10,11,-20]);
    expect(baked.getAttribute('normal').getX(0)).toBeCloseTo(1);
    expect(source.getAttribute('position').array).toEqual(before);
    expect(baked.boundingBox?.min.z).toBe(-24);source.dispose();baked.dispose();
  });
  it('keeps the entire parked-car footprint and its pull-off curbs away from racing and spawning',()=>{
    expect(HARBOR_PARKING.length).toBe(8);
    for(const p of HARBOR_PARKING){
      expect(Math.min(...course.map(v=>Math.hypot(v.x-p.x,v.z-p.z)))-Math.hypot(1.13,2.27)).toBeGreaterThan(9);
      expect(Math.hypot(p.x-20,p.z+100)).toBeGreaterThan(15);
    }
  });
  it('uses one material per finish across spatial cells, without losing instance dimensions',()=>{
    const textures=Array.from({length:15},()=>new Texture()),sign=new Texture();
    const originals=textures.map(t=>vi.spyOn(t,'dispose'));
    const parts=buildHarborArchitecture(heights);
    const resource=createHarborRenderResources(parts,textures,sign,'medium',false,false);
    expect(resource.materials).toHaveLength(16);expect(resource.textures).toHaveLength(25);
    let total=0;
    for(const child of resource.group.children){
      expect(child).toBeInstanceOf(InstancedMesh);
      if(!(child instanceof InstancedMesh))continue;
      expect(resource.materials).toContain(child.material);
      total+=child.count;
      if(child.material instanceof MeshStandardMaterial&&child.material.normalMap){
        const dimensions=child.geometry.getAttribute('urbanDimensions');
        expect(dimensions.count).toBe(child.count);
        for(let i=0;i<dimensions.count;i++)expect([dimensions.getX(i),dimensions.getY(i),dimensions.getZ(i)]
          .every(n=>Number.isFinite(n)&&n>0)).toBe(true);
      }
    }
    expect(total).toBe(parts.length);
    const disposal=resource.materials.map(m=>vi.spyOn(m,'dispose'));
    resource.dispose();resource.dispose();
    disposal.forEach(spy=>expect(spy).toHaveBeenCalledTimes(1));originals.forEach(spy=>expect(spy).not.toHaveBeenCalled());
    textures.forEach(t=>t.dispose());sign.dispose();
  });
  it('rejects partial PBR packs and invalid dimensions instead of sending NaNs to a shader',()=>{
    expect(()=>createHarborRenderResources([],[],new Texture(),'low',false,false)).toThrow();
    const geometry=new BoxGeometry();
    for(const dimensions of [new Float32Array([]),new Float32Array([1,2]),new Float32Array([1,NaN,2]),new Float32Array([1,0,2])])
      expect(()=>configureUrbanGeometry(geometry,dimensions)).toThrow();
    geometry.dispose();
  });
  it('grounds parked wheels in the actual exported model and bounds additional geometry',async()=>{
    await MeshoptDecoder.ready;
    const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
    const doc=await io.read('public/models/vehicles/aero-parked.glb');
    const bounds=getBounds(doc.getRoot().listScenes()[0]);
    expect(bounds.min[1]).toBeCloseTo(0,3);expect(bounds.max[1]).toBeGreaterThan(.9);expect(bounds.max[1]).toBeLessThan(1.4);
    expect(bounds.max[0]-bounds.min[0]).toBeCloseTo(2.2566,2);
    expect(bounds.max[2]-bounds.min[2]).toBeCloseTo(4.5311,2);
    const tire=doc.getRoot().listMeshes().flatMap(m=>m.listPrimitives()).find(p=>p.getMaterial()?.getName()==='Tires');
    expect(tire).toBeDefined();
    const positions=tire?.getAttribute('POSITION')?.getArray();expect(positions).toBeDefined();
    // Four separated tire clusters must survive simplification on both sides and axles.
    const clusters=new Set<string>();
    if(positions)for(let i=0;i<positions.length;i+=3)clusters.add((positions[i]<0?'L':'R')+(positions[i+2]<0?'B':'F'));
    expect(clusters).toEqual(new Set(['LF','RF','LB','RB']));
    const triangles=doc.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((s,p)=>s+(p.getIndices()?.getCount()??0)/3,0),0);
    // The damaged 14k export was rejected; preserve authored normals and shell seams.
    expect(triangles).toBeLessThan(160000);
    for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives())
      expect(Array.from(p.getAttribute('POSITION')?.getArray()??[]).every(Number.isFinite)).toBe(true);
  });
  it('adds bounded static contact shading with exactly one material and no render target',()=>{
    const footprints=harborGroundFootprints(heights),resources=createGroundOcclusionResources(footprints);
    expect(footprints).toHaveLength(68);
    expect(resources.material).toBeInstanceOf(ShaderMaterial);
    expect(resources.material.depthWrite).toBe(false);
    expect(resources.material.fragmentShader).toContain('smoothstep(-.05,vGroundParams.z,d)');
    for(const child of resources.group.children)if(child instanceof InstancedMesh){
      expect(child.material).toBe(resources.material);
      expect(child.geometry.getAttribute('groundParams').count).toBe(child.count);
    }
    const disposal=vi.spyOn(resources.material,'dispose');resources.dispose();resources.dispose();expect(disposal).toHaveBeenCalledTimes(1);
    expect(()=>harborGroundFootprints([])).toThrow();
    expect(()=>createGroundOcclusionResources([{x:0,y:0,z:0,w:1,d:1,feather:0,strength:.3}])).toThrow();
  });
  it('keeps other stages unchanged and balances coastal direct light against the fill',()=>{
    const coast=getStageLighting(HARBOR_RING_DATA.id,false),base=getStageLighting('level1',false);
    expect(base.directionalIntensity).toBe(2);expect(base.ambientIntensity).toBe(.3);
    expect(coast.directionalIntensity).toBeGreaterThan(base.directionalIntensity);
    expect(coast.ambientIntensity).toBeLessThan(base.ambientIntensity);
    expect(getStageLighting(HARBOR_RING_DATA.id,true).directionalIntensity).toBeLessThan(coast.directionalIntensity);
    expect(getStageLighting(HARBOR_RING_DATA.id,false)).toBe(coast);
  });
});

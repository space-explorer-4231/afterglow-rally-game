import {InstancedBufferAttribute, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, NoColorSpace, type BufferGeometry, type Texture} from 'three';

/** Preserve two-metre texture scale on instanced boxes, including narrow sills. */
export function configureUrbanMaterial(
  geometry: BufferGeometry,
  material: MeshStandardMaterial,
  dimensions: Float32Array,
  sources: readonly Texture[],
  anisotropy: number,
  tileMetres = 2,
): Texture[] {
  configureUrbanGeometry(geometry,dimensions);
  return configureUrbanSurface(material,sources,anisotropy,tileMetres);
}

/** Attach per-instance metre dimensions independently of a shared material. */
export function configureUrbanGeometry(geometry:BufferGeometry,dimensions:Float32Array):void{
  if(!dimensions.length||dimensions.length%3!==0||dimensions.some(n=>!Number.isFinite(n)||n<=0))
    throw new Error('Urban instances require finite positive metre dimensions.');
  geometry.setAttribute('urbanDimensions',new InstancedBufferAttribute(dimensions,3));
}

/** One owned texture/surface set can serve every spatial cell of the same finish. */
export function configureUrbanSurface(
  material:MeshStandardMaterial,sources:readonly Texture[],anisotropy:number,tileMetres=2,
):Texture[]{
  if(!Number.isFinite(tileMetres)||tileMetres<=0)throw new Error('Urban texture scale must be positive.');
  const textures=sources.map((source,index)=>{
    const texture=source.clone();
    texture.wrapS=texture.wrapT=RepeatWrapping;
    texture.colorSpace=index===0?SRGBColorSpace:NoColorSpace;
    texture.anisotropy=anisotropy;texture.needsUpdate=true;
    return texture;
  });
  [material.map,material.normalMap,material.roughnessMap]=textures;
  material.normalScale.set(0.55,0.55);
  material.onBeforeCompile=shader=>{
    shader.vertexShader='attribute vec3 urbanDimensions;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',`
      #include <uv_vertex>
      vec3 surfaceNormal = abs(normal);
      vec2 surfaceScale = surfaceNormal.x > 0.5 ? urbanDimensions.zy :
        (surfaceNormal.y > 0.5 ? urbanDimensions.xz : urbanDimensions.xy);
      vMapUv *= surfaceScale / ${tileMetres.toFixed(4)};
      vNormalMapUv *= surfaceScale / ${tileMetres.toFixed(4)};
      vRoughnessMapUv *= surfaceScale / ${tileMetres.toFixed(4)};
    `);
  };
  material.customProgramCacheKey=()=> `aeroline-urban-metres-${tileMetres}`;
  return textures;
}

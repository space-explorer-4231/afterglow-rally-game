import {DoubleSide,MeshDepthMaterial,RGBADepthPacking,type Texture,type IUniform} from 'three';

/** Shadow shader interface also accepts Three's actual ShaderLib.depth source in tests. */
export interface FoliageDepthShader {uniforms:Record<string,IUniform>;vertexShader:string;fragmentShader:string}
/** Match photographic luminance cutouts and wind in the sun's depth pass. */
export function patchFoliageDepthShader(shader:FoliageDepthShader,texture:Texture,broadleaf:boolean):void{
  shader.uniforms.u_time={value:0};shader.uniforms.u_tex={value:texture};
  shader.vertexShader='uniform float u_time; varying vec2 vFoliageUv;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
    vFoliageUv=uv;
    vec3 displaced=transformed;
    vec4 worldOrigin=instanceMatrix*vec4(0.,0.,0.,1.);
    float heightFactor=clamp(displaced.y/4.,.1,1.);
    float breeze=sin(u_time*${broadleaf?'2.4':'1.8'}+worldOrigin.x*.2+worldOrigin.z*.3)*${broadleaf?'.06':'.038'}*heightFactor;
    displaced.x+=breeze;displaced.z+=breeze*.6;
    vec4 mvPosition=modelViewMatrix*instanceMatrix*vec4(displaced,1.);
    gl_Position=projectionMatrix*mvPosition;
  `);
  shader.fragmentShader='varying vec2 vFoliageUv; uniform sampler2D u_tex;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`
    vec3 foliage=texture2D(u_tex,vFoliageUv).rgb;
    diffuseColor.a=max(foliage.r,max(foliage.g,foliage.b));
    #include <alphatest_fragment>
  `);
}
/** Owned depth material; shares the cached photograph without modifying or disposing it. */
export function createFoliageDepthMaterial(texture:Texture,broadleaf:boolean,register:(uniforms:Record<string,IUniform>)=>void):MeshDepthMaterial{
  const material=new MeshDepthMaterial({map:texture,alphaTest:.12,side:DoubleSide,depthPacking:RGBADepthPacking});
  material.onBeforeCompile=shader=>{patchFoliageDepthShader(shader,texture,broadleaf);register(shader.uniforms);};
  material.customProgramCacheKey=()=>`aeroline-foliage-depth-${broadleaf?'leaf':'pine'}-117`;
  return material;
}

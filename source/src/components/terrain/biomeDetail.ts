import type {MeshStandardMaterial,Texture} from 'three';
type MaterialShader=Pick<Parameters<MeshStandardMaterial['onBeforeCompile']>[0],'uniforms'|'fragmentShader'>;

/** Photographed surface relief and variable roughness, with one-sample mobile fallback. */
export function applyBiomeDetail(shader:MaterialShader,groundNormal:Texture,groundRoughness:Texture,rockNormal:Texture,mobile:boolean,paved:boolean):void {
  shader.uniforms.u_groundDetailNormal={value:groundNormal};
  shader.uniforms.u_groundDetailRoughness={value:groundRoughness};
  shader.uniforms.u_rockDetailNormal={value:rockNormal};
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
    uniform sampler2D u_groundDetailNormal;
    uniform sampler2D u_groundDetailRoughness;
    uniform sampler2D u_rockDetailNormal;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
    float measuredRoughness=texture2D(u_groundDetailRoughness,vWorldPosition.xz/2.5).r;
    ${paved?'':'roughnessFactor=clamp(mix(0.72,0.98,measuredRoughness),0.62,0.98);'}`);
  if(mobile)return;
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    vec3 groundDetail=texture2D(u_groundDetailNormal,vWorldPosition.xz/2.5).xyz*2.0-1.0;
    vec3 rockDetail=texture2D(u_rockDetailNormal,vWorldPosition.xz/3.0).xyz*2.0-1.0;
    float detailSlope=1.0-abs(vWorldNormal.y);
    vec3 relief=mix(groundDetail,rockDetail,smoothstep(0.25,0.65,detailSlope));
    vec3 detailTangent=abs(vWorldNormal.y)>0.9?vec3(1.0,0.0,0.0):normalize(cross(vec3(0.0,1.0,0.0),vWorldNormal));
    vec3 detailBitangent=normalize(cross(vWorldNormal,detailTangent));
    vec3 reliefWorld=normalize(vWorldNormal*max(0.25,relief.z)+detailTangent*relief.x*0.3+detailBitangent*relief.y*0.3);
    normal=normalize(mix(normal,(viewMatrix*vec4(reliefWorld,0.0)).xyz,0.65));`);
}

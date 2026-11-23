import type { MeshStandardMaterial } from 'three';

/** Instanced facade glazing with shaded interior depth, ceiling light and varied blinds. */
export function configureUrbanGlass(material: MeshStandardMaterial): void {
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec2 vRoomUv; varying float vRoomSeed;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vRoomUv=uv;
      vRoomSeed=fract(sin(dot(instanceMatrix[3].xz,vec2(12.9898,78.233)))*43758.5453);
    `);
    shader.fragmentShader = 'varying vec2 vRoomUv; varying float vRoomSeed;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec2 room=vRoomUv + normalize(vViewPosition).xy*.11;
      float edge=smoothstep(.04,.12,min(min(room.x,1.-room.x),min(room.y,1.-room.y)));
      float ceiling=smoothstep(.82,.9,room.y)*step(.18,room.x)*step(room.x,.82);
      float blind=vRoomSeed>.72 ? step(.38,room.y)*(.4+.6*step(.55,fract(room.y*15.))) : 0.;
      vec3 interior=mix(vec3(.04,.075,.10),vec3(.19,.25,.26),room.y);
      interior+=vec3(.28,.22,.13)*ceiling*step(.45,vRoomSeed);
      diffuseColor.rgb=mix(diffuseColor.rgb*.28,interior,edge);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.29,.31,.28),blind*.8);
      // A pale glass tint at grazing angles complements the real HDR environment reflection.
      float fresnel=pow(1.-abs(dot(normalize(vNormal),normalize(vViewPosition))),3.);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.24,.43,.58),fresnel*.45);
    `);
  };
  material.customProgramCacheKey = () => 'aeroline-facade-interiors-116';
}

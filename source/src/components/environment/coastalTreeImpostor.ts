import {MeshBasicMaterial,SRGBColorSpace,type Texture} from 'three';

/** Eight-view cylindrical foliage impostor, used only beyond the near geometry range. */
export function createCoastalTreeImpostor(source:Texture):{material:MeshBasicMaterial;texture:Texture}{
  const texture=source.clone();texture.colorSpace=SRGBColorSpace;texture.needsUpdate=true;
  const material=new MeshBasicMaterial({map:texture,alphaTest:.35,transparent:false,depthWrite:true});
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
      vec4 originWorld=modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
      vec2 direction=normalize(cameraPosition.xz-originWorld.xz+vec2(.00001));
      vec3 right=vec3(direction.y,0.,-direction.x);
      float treeScale=length(instanceMatrix[0].xyz);
      vec3 billboardWorld=originWorld.xyz+right*position.x*treeScale+vec3(0.,position.y*treeScale,0.);
      vec4 mvPosition=viewMatrix*vec4(billboardWorld,1.);
      gl_Position=projectionMatrix*mvPosition;
      float yaw=atan(-instanceMatrix[0].z,instanceMatrix[0].x);
      float angle=atan(direction.x,direction.y)-yaw;
      float frame=mod(floor(angle/6.28318530718*8.+.5),8.);
      vMapUv=(uv+vec2(mod(frame,4.),1.-floor(frame/4.)))/vec2(4.,2.);
    `);
  };
  material.customProgramCacheKey=()=> 'aeroline-coastal-impostor-8-v1';
  return {material,texture};
}
